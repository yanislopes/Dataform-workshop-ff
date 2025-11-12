# Dataform-workshop-ff
Workshop Dataform - French Fragrance Analytics Pipeline

## Objectifs

- Comprendre les concepts clés de Dataform
- Créer des pipelines de transformation SQL (Full-Refresh et Incremental)
- Optimiser les coûts BigQuery avec partitioning et clustering
- Gérer la qualité des données avec des assertions

## Prérequis

- Compte Google Cloud Platform
- Compte Github (Pas Obligatoire)
- Éditeur de code
- Git
- Gcloud CLI
- Node.js et npm
- Dataform CLI (npm install -g @dataform/cli)

## Setup & Hello World

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
2. Cliquer sur le sélecteur de projet (en haut)
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
3. Dans la **barre de recherche**, taper : `Dataform` et selectionner dataform marketplace
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

### Step 3 : Créer le repository Dataform dans GCP
**Optionnel** : Nécessaire uniquement si vous voulez utiliser l'interface web Dataform en plus de la CLI.

1. Dans la console GCP, aller dans **Dataform** 
2. Cliquer sur **"Create Repository"**
3. Remplir le formulaire :
   - **Repository ID** : `dataform-workshop-ff`
   - **Region** : `europe-west1`
4. Si c'est demandé, cliquer sur Tout autoriser
5. Cliquer sur **"Create"**

### Step 4 : Initialiser le projet et synchroniser avec GitHub
#### **Initialiser le projet en local**
```bash
# Créer et entrer dans le dossier du projet
mkdir dataform-workshop-ff
cd dataform-workshop-ff

# Créer la structure du hello_world
mkdir -p definitions/00_hello_world
mkdir -p includes

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

# Créer .gitignore
cat > .gitignore << 'EOF'
# Dataform
node_modules/
.df-credentials.json
EOF

# Installer les dépendances
npm install
```

#### **Créer le repository GitHub et push (FACULTATIF)**
**Uniquement si vous voulez travailler sur l'interface graphique Dataform GCP en plus**
```bash
# Initialiser Git
git init

# Faire le premier commit
git branch -M main
git add .
git commit -m "Initialize Dataform project"
```

**Créer le repo sur GitHub :**
1. Aller sur https://github.com/new
2. **Repository name** : `dataform-workshop-ff`
3. **Visibilité** : Public ou Private
4. **NE PAS** cocher "Add README" ou ".gitignore" (déjà créés)
5. Cliquer sur **Create repository**
```bash

# Ajouter le remote GitHub
git remote add origin https://github.com/VOTRE_USERNAME/dataform-workshop-ff.git

# Push sur GitHub
git push -u origin main
```

#### **Connecter Dataform GCP à GitHub (FACULTATIF)**
**Uniquement si vous voulez travailler sur l'interface graphique Dataform GCP en plus**

1. Dans Dataform GCP, aller dans le repository `dataform-workshop-ff` (créé à la Step 3)
2. Cliquer sur **Settings** (⚙️) → **Link Repository**
3. Choisir **GitHub**
4. **Authenticate with GitHub** : Autoriser GCP
5. Sélectionner le repository `dataform-workshop-ff`
6. **Default branch** : `main`
7. Cliquer sur **Link**

✅ **Synchronisation activée !** Vos commits GitHub seront automatiquement visibles dans l'interface Dataform GCP.





## 📚 Structure du projet
```
dataform-workshop-french-fragrance/
├── README.md
├── LICENSE (MIT)
├── .gitignore
├── dataform.json           
├── package.json 
├── definitions/
│   ├── 00_hello_world/
│   ├── 01_workshop_full_refresh/
│   └── 02_workshop_incremental/
└── includes/
```

## 📖 Workshops

### Workshop 1 : Pipeline Full-Refresh (1h30)
- **Scénario** : Reporting Hebdomadaire des Ventes
- **Focus** : Fondamentaux Dataform, architecture en layers
- **Stratégie** : Full-refresh (tables recalculées complètement)

### Workshop 2 : Pipeline Incremental (1h30)
- **Scénario** : Analytics Temps Réel des Opérations (2 ans d'historique)
- **Focus** : Optimisation coûts, performances, gros volumes
- **Stratégie** : Incremental (mise à jour partielle)