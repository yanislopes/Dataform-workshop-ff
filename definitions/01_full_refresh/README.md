# Workshop 01 : Full Refresh - Datamart Hebdomadaire des Ventes

## Objectif

Créer un pipeline de transformation complet pour générer un datamart dédié à un dashboard de ventes hebdomadaires.

## Concepts abordés

`type: "table"` = Table recréée entièrement à chaque run
`type: "declaration"` = Déclaration d'une source externe
`type: "assertion"` = Tests de qualité des données
`ref()` = Référencer une table avec gestion des dépendances
`dependencies` = Dépendances explicites (assertions bloquantes)
`tags` = Filtrer les actions à exécuter
Pipeline parallèle = Plusieurs stages s'exécutent en parallèle
Clé unique avec `TO_HEX(SHA256())` = Créer une clé unique hashée
`includes/constants.js` = Variables et fonctions réutilisables
`--dry-run` = Voir le SQL sans exécuter
`disabled` = Désactiver temporairement une action

---

## Prérequis

- Avoir terminé le **Setup & Hello World**
- Dataset `raw_data` créé dans BigQuery

---

## Architecture du pipeline
```
  raw_data.sales    raw_data.products    raw_data.stores
        ↓                   ↓                   ↓
stg_01_sales_prepared  stg_01_products_prepared  stg_01_stores_prepared
        ↓                   ↓                   ↓
        └───────────────────┼───────────────────┘
                            ↓
                   stg_01_sales_joined
                            ↓
                  stg_01_mart_weekly_sales
                            ↓
          ┌─────────────────┼─────────────────┐
          ↓                                   ↓
    assertion_not_null              assertion_unique_key
          ↓                                   ↓
          └─────────────────┬─────────────────┘
                            ↓
                    mart_weekly_sales
```

---

## Notions théoriques

### Concepts Data

#### Tables Fact vs Dimension

**Fact** Événements/transactions = Volume élevé, mesures, granularité fine (`sales`)
**Dimension** Référentiels descriptifs = relativement stable (`products`, `stores`)

Les champs techniques (`technicalDate`, `technicalOperation`, `technicalFlowIdentifier`) sont ajoutés uniquement sur les **tables de faits**.

#### Pourquoi JSONL plutôt que CSV ?

- CSV ne supporte pas les types complexes (ARRAY, STRUCT)
- JSONL permet de représenter des données imbriquées

#### UNNEST et doublons

L'opération `UNNEST()` génère plusieurs lignes à partir d'une seule ligne source.

Cela crée des "doublons" sur `sale_id`. C'est pourquoi on crée une `key` avec une assertion d'unicité.

#### Clé unique avec `TO_HEX(SHA256())`

Longueur fixe = Toujours 64 caractères, stockage prévisible
Pas de collision = Évite les conflits si un séparateur existe dans les données
Distribution uniforme = Valeurs pseudo-aléatoires, bien réparties, améliore performance

#### Intérêt du `technicalHeader`

Le `technicalHeader` est un champ `STRUCT` qui trace la provenance des données :

- `sourceOperation` = Opération source (INSERT, UPDATE)
- `technicalFlowIdentifier` = Nom du flux qui a écrit la donnée
- `sourceDate` = Date d'ingestion de la source
- `sourceFlowIdentifier` = Nom du flux d'ingestion source
- `technicalDate` = Timestamp d'exécution du pipeline
- `technicalOperation` = Opération effectuée par notre flux (INSERT)

**Utilité** : En cas de bug, permet de retrouver quel flux et quelle source ont généré la donnée.

---

### Concepts Dataform

#### Champ `name` dans config

Sans le champ `name`, la table prend le nom du fichier `.sqlx`.

#### Champ `description` dans config

La `description` définie dans le config est visible dans BigQuery : **Table → Details → Description**.

#### Préfixe `01_` dans les fichiers stages

Le préfixe `01_` permet d'identifier le workshop/flux auquel appartient chaque table. Dans un contexte d'équipe où plusieurs pipelines utilisent les mêmes sources, cela évite les conflits de noms.

#### Dossier `includes/`

Le dossier `includes/` contient des fichiers JavaScript réutilisables dans tous les fichiers `.sqlx`. Il permet de centraliser :
- Les constantes (ex: `PROJECT_ID`)
- Les fonctions utilitaires (ex: `generateUniqueKey()`)

**Avantage** : Modifier une valeur à un seul endroit plutôt que dans chaque fichier.

#### Assertions

Une assertion est une requête SQL qui teste la qualité des données. Elle échoue si elle retourne au moins une ligne.
Exemple : Une assertion qui vérifie qu'il n'y a pas de `NULL` retourne les lignes où il y a des `NULL`. Si 0 ligne → succès. Si au moins 1 ligne → échec.

#### Assertions bloquantes vs non-bloquantes

**Bloquant** : L'output dépend des assertions → Si échec, output non créé.

**Non-bloquant** : L'output ne dépend pas des assertions → Créé même si échec.

#### Clé unique et valeurs `NULL`

Si un des champs qui compose la clé est `NULL`, alors `CONCAT()` retourne `NULL`, ce qui propage le `NULL` à travers `SHA256()` et `TO_HEX()`.
Les champs qui composent la `key` doivent toujours être non-null. On devra les mettre dans l'assertion not null.

#### Pourquoi l'output fait juste `SELECT *` ?

Le modèle complet est préparé dans le stage (`stg_01_mart_weekly_sales`). L'output (`mart_weekly_sales`) fait simplement `SELECT *` car :

1. Les assertions testent le stage **avant** de charger l'output
2. On peut choisir de rendre les assertions **bloquantes** ou non via `dependencies`
3. Séparation claire : **stage** = préparation + tests, **output** = exposition finale

---

## Step 1 : Charger les données sources

1. Télécharger `sales.jsonl`, `products.jsonl`, `stores.jsonl`
2. BigQuery → `raw_data` → **Create table** → Upload JSONL → Auto-detect schema

Les champs techniques dans `sales.jsonl` simulent un flux d'ingestion.

---

## Step 2 : Créer la structure
```bash
mkdir -p definitions/01_full_refresh/sources
mkdir -p definitions/01_full_refresh/stage/assertions
mkdir -p definitions/01_full_refresh/output
```

---

## Step 3 : Créer les fichiers

Créer les fichiers suivants :

**Includes :**
- `includes/constants.js`

**Sources :**
- `sources/sales.sqlx`
- `sources/products.sqlx`
- `sources/stores.sqlx`

**Stages :**
- `stage/stg_01_sales_prepared.sqlx`
- `stage/stg_01_products_prepared.sqlx`
- `stage/stg_01_stores_prepared.sqlx`
- `stage/stg_01_sales_joined.sqlx`
- `stage/stg_01_mart_weekly_sales.sqlx`

**Assertions :**
- `stage/assertions/stg_01_mart_weekly_sales_assertion_not_null.sqlx`
- `stage/assertions/stg_01_mart_weekly_sales_assertion_unique_key.sqlx`

**Output :**
- `output/mart_weekly_sales.sqlx`

---

## Step 4 : Compiler et exécuter
```bash
# Compiler
dataform compile

# Dry-run (voir le SQL sans exécuter)
dataform run --tags datamart --dry-run

# Exécuter
dataform run --tags datamart
```

---

## Step 5 : Démonstration Full Refresh

1. Vérifier les données dans `mart_weekly_sales`
2. Remplacer `raw_data.sales` par `sales_v2.jsonl`
3. Ré-exécuter : `dataform run --tags datamart`
4. Vérifier : Toutes les données sont **écrasées**

---

## Step 6 : Tester les assertions

### Faire échouer `assertion_not_null`

Dans `stg_01_sales_joined.sqlx`, remplacer :
```sql
st.city,
```
Par :
```sql
NULL AS city,
```

### Faire échouer `assertion_unique_key`

Dans `stg_01_mart_weekly_sales.sqlx`, remplacer :
```sql
${constants.generateUniqueKey([...])} AS key,
```
Par :
```sql
'duplicated' AS key,
```

Remettre le code original après les tests !

---

## Step 7 : Désactiver une action

Ajouter `disabled: true` dans le config de `mart_weekly_sales.sqlx` :
```sql
config {
  type: "table",
  disabled: true
}
```