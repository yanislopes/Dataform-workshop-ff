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
**Option 1 : Suivre le workshop pas à pas** (recommandé)
- Suivez les instructions ci-dessous

**Option 2 : Cloner le projet terminé** (pour référence)
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

## Bonus : Utiliser l'interface Dataform GCP (démo)
**Optionnel** : Juste pour voir l'interface, sans connexion au projet local

1. Créer un repository Dataform dans GCP
2. Créer un workspace
3. Coder directement dans l'interface
4. Compiler et exécuter
5. Visualiser le DAG

**Pas de synchronisation avec le projet local, c'est juste pour la démo !**

## 📖 Workshops

### Workshop 1 : Pipeline Full-Refresh (1h30)
- **Scénario** : Reporting Hebdomadaire des Ventes
- **Focus** : Fondamentaux Dataform, architecture en layers
- **Stratégie** : Full-refresh (tables recalculées complètement)

### Workshop 2 : Pipeline Incremental (1h30)
- **Scénario** : Analytics Temps Réel des Opérations (2 ans d'historique)
- **Focus** : Optimisation coûts, performances, gros volumes
- **Stratégie** : Incremental (mise à jour partielle)

