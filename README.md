# 📡 Radar IA - Dashboard de Veille Technologique

![Aperçu du Dashboard](./docs/screenshot.png) *(Remplacer par votre capture d'écran)*

Un tableau de bord moderne, sombre et élégant conçu pour centraliser votre veille technologique sur l'Intelligence Artificielle. Ce projet est la brique d'affichage (frontend/backend local) d'une architecture d'automatisation complète (généralement via n8n).

## 🚀 Fonctionnalités
- **Design Premium** : Thème sombre inspiré de Vercel/Linear avec système de badges et color-coding.
- **Temps Réel** : Auto-actualisation toutes les 60 secondes pour voir les nouvelles entrées instantanément.
- **Interactivité** :
  - Filtrage par catégorie (Outil, Modèle, Recherche, Financement, Autre) et barre de recherche.
  - Sauvegarde en **Favoris** (❤️) et marquage comme **Lu** (✓).
  - **Text-to-Speech (Audio)** : Écoutez le résumé d'un article ou le digest complet de la journée avec une voix de synthèse naturelle.
- **Export** : Génération d'un *Digest Markdown* des articles du jour d'un simple clic.

---

## 🏗️ Architecture du Projet

Le système complet repose sur une **architecture en boucle** séparée en deux parties :

1. **Le Collecteur (n8n + LLM)** *(Votre workflow d'automatisation externe)*
2. **L'Afficheur (Ce projet React/Express)**

### Pourquoi cette architecture en boucle ?
La séparation entre l'extraction des données (n8n) et l'affichage (React) offre une modularité totale. Le workflow n8n tourne en tâche de fond (cron job), collecte les flux RSS ou réseaux sociaux, et traite la donnée. Le dashboard n'est responsable que de l'affichage rapide et propre. Cela évite de surcharger l'interface utilisateur avec la lourdeur du web scraping.

### Choix Techniques : Pourquoi Groq / Gemini ?
Dans la boucle d'automatisation n8n, l'utilisation de **LLMs performants (Groq / Gemini)** est stratégique :
- **Groq (LPU)** : Utilisé pour sa vitesse d'inférence fulgurante. C'est l'outil parfait pour filtrer rapidement des centaines de liens entrants et éliminer le bruit (spam) en une fraction de seconde, à très bas coût.
- **Gemini (Google)** : Utilisé pour sa capacité de synthèse avancée et sa gestion du contexte long. Il excelle dans la création de résumés structurés (2-3 phrases) à partir des articles bruts, ainsi que dans l'attribution précise des scores de pertinence (1-10) et la catégorisation automatique.

---

## 📸 Démo

*(Remplacer par votre GIF de démonstration)*
![Démo GIF](./docs/demo.gif)

---

## ⚙️ Installation & Lancement Local

1. Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé.
2. Clonez ce dépôt.
3. Installez les dépendances et lancez le projet :
   ```bash
   npm install
   cd client && npm install
   cd ..
   npm run dev
   ```

Cette commande lance **deux serveurs simultanément** :
- 🖥️ **Frontend (React)** : http://localhost:5173
- ⚙️ **Backend (API Express)** : http://localhost:3000

---

## 🔌 Connecter n8n

Dans votre workflow, utilisez un nœud HTTP Request à la fin de votre boucle LLM :

- **Method** : `POST`
- **URL** : `http://localhost:3000/api/articles`
- **Body Content Type** : `JSON`
- **Payload attendu** :
  ```json
  {
    "titre": "Mistral annonce un nouveau modèle open-source",
    "url": "https://mistral.ai/news",
    "score": 9,
    "categorie": "Modèle",
    "resume": "Mistral a dévoilé aujourd'hui un modèle avec des performances records sur les benchmarks ouverts.",
    "date_creation": "2026-07-06T12:00:00Z"
  }
  ```
> *Note : Le champ `date_creation` est optionnel. S'il est omis, l'API utilisera l'heure courante de réception.*
