# Dataform-workshop-ff
Workshop Dataform - French Fragrance Analytics Pipeline

## Objectifs

- Comprendre les concepts clés de Dataform
- Créer des pipelines de transformation SQL (Full-Refresh et Incremental)
- Optimiser les coûts BigQuery avec partitioning et clustering
- Gérer la qualité des données avec des assertions

## Prérequis

- Compte Google Cloud Platform
- Éditeur de code
- Git (Si besoin de cloner ce repo seulement)
- Gcloud CLI
- Node.js et npm
- Dataform CLI (npm install -g @dataform/cli)

## Setup & Hello World
**Option 1 : Suivre le workshop pas à pas**
- Suivez les instructions ci-dessous

**Option 2 : Cloner le projet terminé**
```bash
git clone https://github.com/yanislopes/Dataform-workshop-ff.git
cd Dataform-workshop-ff
npm install
```

### Step 1: Installer Dataform en local
#### **macOS**
```bash
# Installer gcloud CLI 
brew install --cask google-cloud-sdk
gcloud --version

# Installer Node.js (inclut npm) + vérifier les installations
brew install node
node --version
npm --version

# Installer Dataform CLI + vérifier l'installation
npm install -g @dataform/cli
dataform --version
```

#### **Windows**
- gcloud CLI : https://cloud.google.com/sdk/docs/install
- Node.js : https://nodejs.org/
- Dataform CLI : `npm install -g @dataform/cli` (dans PowerShell)

#### **Linux**
```bash
# gcloud CLI : https://cloud.google.com/sdk/docs/install
sudo apt install nodejs npm
npm install -g @dataform/cli
```

### Step 2 : Configuration GCP
#### **Authentification**
```bash
# Se connecter à GCP
gcloud auth login

# Authentification pour les applications (utilisé par Dataform CLI)
gcloud auth application-default login
```

#### **Créer et configurer un projet GCP**
**Via l'interface :**
1. Aller sur https://console.cloud.google.com
2. Cliquer sur le sélecteur de projet
3. **New Project**
4. **Project name**
5. Créer le projet

**Configurer gcloud avec ce projet :**
```bash
# Lister vos projets
gcloud projects list

# Configurer le projet par défaut
gcloud config set project VOTRE_PROJECT_ID
```

**Activer les APIs via l'interface :**
1. Aller dans la console GCP
2. **Vérifier que vous êtes dans le bon projet**
3. Dans la **barre de recherche**, taper : `Dataform` et sélectionner dataform marketplace
4. Activer l'API

**OU via CLI :**
```bash
# Activer BigQuery API
gcloud services enable bigquery.googleapis.com

# Activer Dataform API
gcloud services enable dataform.googleapis.com

# Vérifier que les APIs sont activées
gcloud services list --enabled | grep -E 'bigquery|dataform'
```

### Step 3 : Initialiser le projet
```bash
# Créer et entrer dans le dossier du projet
mkdir dataform-workshop-ff
cd dataform-workshop-ff

# Créer la structure du hello_world 
mkdir -p definitions/00_hello_world
mkdir -p includes 
```
Le dossier **includes/** sert à stocker des fonctions JavaScript réutilisables dans les transformations Dataform. Il restera vide pour le Hello World.

```bash
# Créer dataform.json
cat > dataform.json << 'EOF'
{
  "warehouse": "bigquery",
  "defaultDatabase": "VOTRE_PROJECT_ID",
  "defaultSchema": "DATASET_NAME",
  "assertionSchema": "dataform_assertions",
  "defaultLocation": "EU"
}
EOF

# Créer package.json
cat > package.json << 'EOF'
{
  "name": "dataform-workshop-ff",
  "version": "1.0.0",
  "dependencies": {
    "@dataform/core": "^3.0.0"
  }
}
EOF

# Générer les credentials (fichier local, ne sera pas versionné dans Git)
cat > .df-credentials.json << 'EOF'
{
  "projectId": "VOTRE_PROJECT_ID",
  "location": "EU"
}
EOF

# Créer .gitignore
cat > .gitignore << 'EOF'
# Dataform
node_modules/
.df-credentials.json
EOF

# Installer les dépendances
npm install
```
PS : Le champ `"name"` dans package.json est l'identifiant npm du projet (vous pouvez le changer). On peut le voir avec la commande: `npm list`

### Step 4 : Créer le dataset source
```bash
# Créer le dataset pour les données brutes
bq mk --location=EU --dataset VOTRE_PROJECT_ID:raw_data
```
**OU via l'interface BigQuery :**
1. BigQuery → Clic droit sur projet → **Create dataset**
2. **Dataset ID** : `raw_data`
3. **Location** : `EU`
4. **Create**

### Step 5 : Créer la table source de test
```bash
# Créer la table hello_world dans le dataset raw_data
bq mk --table \
  VOTRE_PROJECT_ID:raw_data.hello_world \
  fragrance_id:INTEGER,brand_name:STRING,name:STRING,price_eur:FLOAT

# Insérer des données de test
bq query --use_legacy_sql=false "
INSERT INTO \`VOTRE_PROJECT_ID.raw_data.hello_world\` 
(fragrance_id, brand_name, name, price_eur)
VALUES 
  (1, 'Hello', 'world', 89.99)
"

# Vérifier que les données sont bien insérées
bq query --use_legacy_sql=false \
  "SELECT * FROM \`VOTRE_PROJECT_ID.raw_data.hello_world\`"
```

**OU via l'interface BigQuery :**

1. Aller dans **BigQuery**
2. Ouvrir le dataset `raw_data`
3. Cliquer sur **CREATE TABLE**
4. **Table name** : `hello_world`
5. **Schema** :
   - `fragrance_id` : INTEGER
   - `brand_name` : STRING
   - `name` : STRING
   - `price_eur` : FLOAT
6. **Create table**
7. Dans l'éditeur de requêtes, exécuter :
```sql
INSERT INTO `VOTRE_PROJECT_ID.raw_data.hello_world` 
(fragrance_id, brand_name, name, price_eur)
VALUES 
  (1, 'Hello', 'world', 89.99);

SELECT * FROM `VOTRE_PROJECT_ID.raw_data.hello_world`;
```

### Step 6 : Créer la source et la transformation hello_world
#### **A. Créer la structure des dossiers**
```bash
mkdir -p definitions/00_hello_world/sources
mkdir -p definitions/00_hello_world/stage
mkdir -p definitions/00_hello_world/output
```

#### **B. Déclarer la source**
Créer le fichier `definitions/00_hello_world/sources/raw_data.sqlx` :
```sql
config {
  type: "declaration",
  database: "VOTRE_PROJECT_ID",
  schema: "raw_data",
  name: "hello_world"
}
```
**Explication :** 
- Déclare la table source existante dans BigQuery (`raw_data.hello_world`)
- Permet d'utiliser `ref()` pour référencer cette table

#### **C. Créer la transformation stage**

Créer le fichier `definitions/00_hello_world/stage/stage_hello_world.sqlx` :
```sql
config {
  type: "table",
  database: "VOTRE_PROJECT_ID",
  schema: "stage_congrat_data",
  name: "stage_hello_world",
  description: "Temp French Fragrance Hello World",
  tags: ["hello_world"]
}

SELECT 
  fragrance_id,
  brand_name,
  name,
  price_eur,
  'Made in Paris, France' as origin,
  CURRENT_TIMESTAMP() as technical_date
FROM ${ref("raw_data", "hello_world")}
```

**Explication :**
- Crée une table temporaire dans `stage_congrat_data`
- Ajoute les colonnes `origin` et `technical_date`
- Référence la source via `${ref("raw_data", "hello_world")}`
- Tag `hello_world` pour exécuter tout le pipeline `hello_world` (pas obligatoire)

#### **D. Créer la transformation output**

Créer le fichier `definitions/00_hello_world/output/hello_world.sqlx` :
```sql
config {
  type: "table",
  database: "VOTRE_PROJECT_ID",
  schema: "congrat_data",
  description: "French Fragrance Hello World",
  tags: ["hello_world"],
  dependencies: ["stage_hello_world"]
}

SELECT *
FROM ${ref("stage_congrat_data", "stage_hello_world")}
```

**Explication :**
- Le nom de la table sera `hello_world` (nom du fichier .sqlx)
- Crée la table finale dans `congrat_data`
- Référence le stage via `${ref("stage_congrat_data", "stage_hello_world")}`
- `dependencies` assure que le stage s'exécute avant l'output

**Architecture du pipeline :**
```
raw_data.hello_world (source)
    ↓
stage_congrat_data.stage_hello_world (transformation)
    ↓
congrat_data.hello_world (output final)
```

### Step 7 : Compiler et exécuter le pipeline
#### **A. Compiler le projet**
```bash
# Dans le dossier dataform-workshop-ff
dataform compile
```

#### **B. Exécuter le pipeline hello_world**
```bash
# Exécuter uniquement le tag hello_world
dataform run --tags hello_world
# Équivalent (mais pas nécessaire) :
dataform run --tags hello_world --credentials .df-credentials.json
```

#### **C. Vérifier les résultats dans BigQuery**
1. Aller dans **BigQuery**
2. Naviguer vers `congrat_data` puis dans `hello_world`
3. Cliquer sur **Preview**
4. Vérifier que les données contiennent `Made in Paris, France` et `technical_date`

## Bonus : Utiliser l'interface Dataform GCP
**Optionnel** : Juste pour voir l'interface, sans connexion au projet local

### Différences avec le mode CLI

L'interface Dataform GCP simplifie le setup :
- **Pas de `package.json`** : Les dépendances Dataform sont gérées automatiquement par GCP
- **`workflow_settings.yaml` au lieu de `dataform.json`** : Nouveau format depuis l'intégration à GCP
- **Pas de credentials à configurer** : Authentification automatique via votre compte GCP

### Étapes

1. **Créer un repository Dataform**
   - Console GCP → **Dataform**
   - **Create Repository**
   - Repository ID : `repo-name`
   - Region : `europe-west1`

2. **Créer un workspace**
   - Cliquer sur **Create Development Workspace**
   - Workspace ID : `workspace-name`

3. **Initialiser l'espace de travail**
   - Cliquer sur **Initialize workspace**
   - GCP crée automatiquement :
     - `workflow_settings.yaml` (équivalent de `dataform.json`)
     - `definitions/`
     - `includes/`
     - `.gitignore`

4. **Configurer workflow_settings.yaml**
   
   Éditer le fichier avec vos paramètres :
```yaml
defaultProject: VOTRE_PROJECT_ID
defaultDataset: french_fragrance
defaultAssertionDataset: dataform_assertions
defaultLocation: EU
dataformCoreVersion: 3.0.26
```
**dataformCoreVersion** spécifie la version de **@dataform/core** à utiliser

5. **Coder dans l'interface**
   - Créer vos fichiers `.sqlx` directement dans l'éditeur web
   - copier les codes de hello_world fait via le CLI

6. **Visualiser le DAG**
   - Cliquer sur **Compiled graph**
   - Voir le graphe de dépendances entre les tables

7. **Exécuter**
   - Cliquer sur **Start execution**
   - Choisir notre tag
   - **Execute**

8. **Versionning**
**En mode CLI** : Le versioning se gère via votre propre système (Git tags, CI/CD, etc.). 

**En mode interface GCP** : On peut connecter un repository Git à Dataform pour utiliser la feature Release (avec son scheduler intégré).

### Avantages de l'interface

- Setup ultra-rapide (pas d'installation locale)
- Visualisation du DAG intégrée
- Exécution directe dans GCP
- Logs et monitoring intégrés
- Gestion des releases 

**Idéal pour les démos et le prototypage rapide !**