# Workshop 02 : Incremental - Historique Clients avec MERGE

## Objectif

Créer un pipeline incrémental qui conserve l'historique des clients avec gestion des mises à jour (UPSERT) et optimisation FinOps.

## Concepts abordés

`type: "incremental"` = Table incrémentale avec MERGE automatique (uniqueKey) = Insert ou Update selon la clé
`${when(incremental(), ...)}` = Condition mode incremental
`${self()}` = Référence à la table elle-même
`pre_operations` = SQL exécuté avant l'INSERT/MERGE
`post_operations` = SQL exécuté après l'INSERT/MERGE
`--full-refresh` = Forcer une recréation complète
`vars` dans `dataform.json` = Variables d'environnement
`--vars = Surcharger les variables en CLI
`${dataform.projectConfig.vars.xxx}` = Utiliser une variable d'env
Partitioning = Optimisation FinOps par colonne date
Clustering = Optimisation FinOps par colonnes fréquemment filtrées


---

## Architecture du pipeline
```
raw_data.customers
        ↓
stg_02_customers_prepared (partitionné + clusterisé)
        ↓
    assertions
        ↓
customers_history (INCREMENTAL + partitionné + clusterisé)
```

---

## Notions théoriques

### Concepts Data

#### Type `incremental` et MERGE

Avec `type: "incremental"` et `uniqueKey`, Dataform génère automatiquement un MERGE SQL :
```sql
MERGE INTO table_cible
USING table_source
ON cible.key = source.key
WHEN MATCHED THEN UPDATE ...
WHEN NOT MATCHED THEN INSERT ...
```

Cela permet d'insérer les nouvelles lignes et de mettre à jour les lignes existantes sans dupliquer.

#### Partitioning

**Définition** : Découpe une table en segments physiques basés sur une colonne (généralement une date).

**Avantage** : BigQuery scanne uniquement les partitions nécessaires lors des requêtes avec filtre sur la colonne de partition.

**Exemple** :
```sql
-- Sans filtre partition : scan toute la table
SELECT * FROM table

-- Avec filtre partition : scan uniquement les partitions concernées
SELECT * FROM table WHERE DATE(date_column) >= '2024-01-01'
```

**Coût** : Gratuit ! Pas de coût supplémentaire pour partitionner une table.

#### Clustering

**Définition** : Trie et regroupe physiquement les données par colonnes spécifiées (jusqu'à 4 colonnes).

**Avantage** : Réduit les bytes scannés lors de filtres sur les colonnes clusterisées.

**Exemple** :
```sql
-- Table clusterisée par country, city
SELECT * FROM table WHERE country = 'France'
-- → BigQuery lit uniquement les blocs contenant 'France'
```

**Coût** : Gratuit ! Pas de coût supplémentaire pour clusteriser une table.

**Ordre des colonnes** : Important ! Mettre les colonnes les plus filtrées en premier.

#### technical_operation = 'UPSERT'

Avec `type: "incremental"` et `uniqueKey`, Dataform génère un MERGE SQL qui fait un INSERT si la clé n'existe pas, ou un UPDATE si elle existe. Plutôt que de complexifier le code pour déterminer l'opération exacte (faire un MERGE custom), on utilise `UPSERT` qui reflète précisément ce comportement.

#### Données sensibles (RGPD)

Les champs `email`, `first_name`, `last_name` sont des données personnelles identifiantes. Options de protection :
- **Masquage** : BigQuery Data Masking par rôle IAM
- **Hachage** : `SHA256(email)` pour pseudonymiser
- **Purge** : TTL / suppression après X jours (droit à l'oubli)
- **Accès restreint** : Dataset séparé avec droits limités

#### Champ `technical_date` en top-level

Contrairement au Workshop 01 où `technical_date` était dans le `technical_header` (STRUCT), ici on le sort comme **champ top-level** (`technical_date`).

**Raison** : BigQuery n'accepte que des champs de premier niveau (top-level) pour le partitioning. On ne peut pas partitionner sur `technical_header.technical_date` car c'est un champ imbriqué dans un STRUCT.

---

### Concepts Dataform

#### `post_operations` conditionné

Le `post_operations` est conditionné par `${when(incremental(), ...)}` pour éviter un DELETE inutile à l'init ou full refresh. Cela réduit les opérations et les coûts BigQuery.

#### Partitioning du stage

Le stage `stg_02_customers_prepared` est partitionné par `DATE(technical_date)` pour optimiser les requêtes en aval et réduire les coûts.

#### Clustering du stage par `status`

Le `post_operations` filtre sur `status = 'to_delete'`. Clustériser par `status` optimise ce DELETE en regroupant physiquement les lignes par statut.

#### Pourquoi `to_delete` est supprimé en `post_operations`

Si on filtre `WHERE status != 'to_delete'` dans le stage :
- Le client `to_delete` n'est jamais vu par l'output
- Donc jamais supprimé de l'output
- Il reste dans `customers_history` avec son ancien statut

Avec `post_operations` :
- Le client `to_delete` arrive dans l'output avec `status = 'to_delete'`
- Le MERGE met à jour son statut
- Le `post_operations` le supprime ensuite

#### Assertion unique key ne bloque pas

Lors du run incremental, des clients existants sont mis à jour. L'assertion `unique_key` ne bloque pas car le MERGE gère automatiquement les doublons (UPDATE au lieu d'INSERT).

---

### Concepts FinOps

#### Facturation BigQuery

| Modèle | Coût | Slots |
|--------|------|-------|
| **On-demand** | ~$6.25 / TB scanné | 2000 partagés (non garantis) |
| **Capacity** | ~$0.04 / slot / heure | Réservés (garantis) |

**Scanner 1 TB en on-demand = ~$6.25**

**Choisir On-demand vs Capacity** :
- **On-demand** : Idéal pour volumes variables ou < $10k/mois
- **Capacity** : Rentable pour gros volumes constants (> ~500 TB/mois)

En général, commencer en **on-demand** puis migrer vers **Capacity** si la facture devient prévisible et élevée.

#### Optimisations FinOps dans ce workshop

| Optimisation | Impact | Où |
|--------------|--------|-----|
| **Partitioning** | Scanne uniquement les partitions nécessaires | `partitionBy: DATE(technical_date)` |
| **Clustering** | Réduit bytes scannés sur filtres fréquents | `clusterBy: ["country", "city", "status"]` (output)<br>`clusterBy: ["status"]` (stage) |
| **Incremental** | Ne traite que le delta, pas toute la table | `type: "incremental"` |
| **WHERE sur partition** | Évite le full scan | `WHERE DATE(...) >= DATE(incremental_timestamp)` |
| **Filtrer tôt** | Moins de données à traiter en aval | `WHERE status != 'to_delete'` à l'init |
| **post_operations conditionné** | Évite DELETE inutile | `${when(incremental(), ...)}` |

**Exemple concret** :

| Scénario | Sans optimisation | Avec optimisation |
|----------|-------------------|-------------------|
| Table 1 TB, ajout 10 MB | Scan 1 TB → ~$6.25 | Scan 10 MB → ~$0.00006 |
| DELETE to_delete | Scan toute la table | Scan partitions récentes uniquement |

---

## Step 1 : Charger les données sources

1. Télécharger `customers.jsonl`
2. BigQuery → `raw_data` → **Create table** → Upload JSONL → Auto-detect schema

---

## Step 2 : Créer la structure
```bash
mkdir -p definitions/02_incremental/sources
mkdir -p definitions/02_incremental/stage/assertions
mkdir -p definitions/02_incremental/output
```

---

## Step 3 : Créer les fichiers

Créer les fichiers suivants :

**Includes :**
- `includes/constants.js` (mise à jour avec `getIncrementalTimestamp()`)

**Sources :**
- `sources/customers.sqlx`

**Stages :**
- `stage/stg_02_customers_prepared.sqlx`

**Assertions :**
- `stage/assertions/stg_02_customers_assertion_not_null.sqlx`
- `stage/assertions/stg_02_customers_assertion_unique_key.sqlx`

**Output :**
- `output/customers_history.sqlx`

---

## Step 4 : Premier run (init avec filtre France)
```bash
dataform run --tags incremental --vars=filterCountry=France
```

**Résultat** :
- 7 clients France en output (sans `to_delete`)
- 1 client France `to_delete` (id 3) filtrés par le `WHERE status != 'to_delete'` à l'init

Vérifier dans BigQuery : `datawarehouse.customers_history`

---

## Step 5 : Démonstration partitioning (FinOps)

Exécuter dans BigQuery :
```sql
-- Sans filtre partition : scan toute la table
SELECT COUNT(*) FROM `raw_data.customers`
WHERE DATE(technical_date) >= '2024-01-10'

-- Avec filtre partition : scan uniquement partitions concernées
SELECT COUNT(*) FROM `datawarehouse.customers_history`
WHERE DATE(technical_date) >= '2024-01-10'
```

**Comparer les "bytes scanned"** dans les détails de chaque requête → le filtre partition réduit les bytes scannés.

---

## Step 6 : Modifications dans la source

Exécuter dans BigQuery :
```sql
-- UPDATE : Marie passe à inactive
UPDATE `raw_data.customers`
SET 
  status = 'inactive',
  updated_at = TIMESTAMP('2025-02-05T11:00:00'),
  technical_date = CURRENT_TIMESTAMP(),
  technical_operation = 'UPDATE'
WHERE customer_id = 2;

-- UPDATE : Sophie passe à inactive mais technical_date ne change pas
UPDATE `raw_data.customers`
SET 
  status = 'inactive',
  updated_at = TIMESTAMP('2025-02-05T11:00:00'),
  technical_operation = 'UPDATE'
WHERE customer_id = 4;

-- UPDATE : Lucas passe à to_delete
UPDATE `raw_data.customers`
SET 
  status = 'to_delete',
  updated_at = TIMESTAMP('2025-02-06T11:00:00'),
  technical_date = CURRENT_TIMESTAMP(),
  technical_operation = 'UPDATE'
WHERE customer_id = 5;

-- INSERT : Nouveau client
INSERT INTO `raw_data.customers` (
  customer_id,
  email,
  first_name,
  last_name,
  birth_date,
  country,
  city,
  registration_date,
  updated_at,
  status,
  technical_date,
  technical_operation,
  technical_flow_identifier
)
VALUES (
  11,
  'hugo.blanc@email.fr',
  'Hugo',
  'Blanc',
  DATE('1993-06-12'),
  'France',
  'Lille',
  TIMESTAMP('2025-02-01T10:00:00'),
  TIMESTAMP('2025-02-01T10:00:00'),
  'active',
  CURRENT_TIMESTAMP(),
  'INSERT',
  'ingestion_customers'
);
```

---

## Step 7 : Deuxième run (incremental)
```bash
dataform run --tags incremental --vars=filterCountry=France
```

**Résultat** :
- Marie  (2) : UPDATE vers `inactive`
- Sophie (4) : Pas de UPDATE car `technical_date` n'a pas changé
- Lucas  (5) : UPDATE vers `to_delete` → puis DELETE par `post_operations`
- Hugo  (11) : INSERT

**Vérifier** :
- Seulement ces 3 clients traités (pas les autres)
- Lucas (5) supprimé de la table
- **Assertion `unique_key` ne bloque pas** = MERGE fonctionne correctement !

---

## Step 8 : Corrompre la table

Exécuter dans BigQuery :
```sql
DELETE FROM `datawarehouse.customers_history`
WHERE customer_id IN (1, 4)
```

---

## Step 9 : Full refresh
```bash
dataform run --tags incremental --full-refresh --vars=filterCountry=France
```

**Résultat** :
- Table recréée complètement

---

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `dataform compile` | Compiler |
| `dataform run --tags incremental` | Exécuter en mode incremental |
| `dataform run --tags incremental --full-refresh` | Forcer full refresh |
| `dataform run --tags incremental --vars=filterCountry=France` | Filtrer par pays |

---

## Points clés

1. **Type `incremental`** = MERGE automatique (INSERT nouveaux + UPDATE existants)
2. **`${when(incremental(), ...)}`** = Logique différente selon le mode
3. **Partitioning + Clustering** = Réduction drastique des coûts BigQuery
4. **`post_operations` conditionné** = Optimisation FinOps
5. **`to_delete` en `post_operations`** = Pour voir le changement de statut avant suppression