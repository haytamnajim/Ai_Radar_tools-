const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json());

// Helper function to read data
const readData = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return [];
        }
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        return [];
    }
};

// Helper function to write data
const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing data file:', error);
    }
};

// GET endpoint to fetch articles
app.get('/api/articles', (req, res) => {
    const articles = readData();
    // Sort by date (newest first)
    articles.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation));
    res.json(articles);
});

// POST endpoint to add a new article
app.post('/api/articles', (req, res) => {
    const { titre, url, score, categorie, resume, date_creation, source } = req.body;
    
    // Basic validation
    if (!titre || !url) {
        return res.status(400).json({ error: 'Le titre et l\'url sont obligatoires.' });
    }

    const newArticle = {
        id: Date.now().toString(),
        titre,
        url,
        score: score ? Number(score) : 0,
        categorie: categorie || 'Autre',
        resume: resume || '',
        date_creation: date_creation || new Date().toISOString(),
        source: source || 'Web',
        favori: false,
        lu: false
    };

    const articles = readData();
    articles.push(newArticle);
    writeData(articles);

    res.status(201).json(newArticle);
});

// PATCH endpoint to update an article (lu, favori)
app.patch('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const articles = readData();
    const index = articles.findIndex(a => a.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Article non trouvé' });
    }

    // Update allowed fields
    if (updates.hasOwnProperty('lu')) articles[index].lu = updates.lu;
    if (updates.hasOwnProperty('favori')) articles[index].favori = updates.favori;
    if (updates.hasOwnProperty('source')) articles[index].source = updates.source;

    writeData(articles);
    res.json(articles[index]);
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log(`Endpoint pour n8n (POST) : http://localhost:${PORT}/api/articles`);
});
