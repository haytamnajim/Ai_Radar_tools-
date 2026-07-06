# Radar IA - Dashboard de Veille Technologique

Un tableau de bord moderne et sombre pour agréger les articles de veille technologique IA, conçu pour être alimenté par n8n ou toute autre automatisation via une API locale.

## Lancement Rapide (Local)

1. Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé.
2. Ouvrez un terminal dans le dossier racine du projet.
3. Lancez la commande suivante :
   ```bash
   npm run dev
   ```

Cette commande va lancer **deux serveurs simultanément** :
- 🖥️ **Frontend (React)** : http://localhost:5173 (L'interface web)
- ⚙️ **Backend (Express)** : http://localhost:3000 (L'API locale)

## Connecter n8n

Pour envoyer un nouvel article depuis votre workflow n8n, utilisez un nœud HTTP Request configuré ainsi :

- **Method** : `POST`
- **URL** : `http://localhost:3000/api/articles`
- **Body Content Type** : `JSON`
- **Body parameters** (exemple) :
  ```json
  {
    "titre": "Nouvelle IA d'OpenAI",
    "url": "https://openai.com/news",
    "score": 9,
    "categorie": "Modèle",
    "resume": "OpenAI dévoile un modèle encore plus performant...",
    "date_creation": "2026-07-06T12:00:00Z"
  }
  ```

> Note : Le champ `date_creation` est optionnel. Si vous ne l'envoyez pas, le serveur utilisera la date et l'heure de réception.

## Fonctionnalités
- Design Premium Dark Mode (inspiré de Vercel/Linear).
- Auto-refresh toutes les 60 secondes pour voir les nouvelles entrées sans recharger la page.
- Filtrage par catégorie et recherche par mots-clés.
- Tri par date ou par pertinence (score).
- Code de couleur pour les scores (Vert >= 8, Jaune >= 5, Gris < 5).
