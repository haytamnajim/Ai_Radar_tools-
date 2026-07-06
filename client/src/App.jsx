import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Share2, Activity, Calendar } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Toutes');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'score'

  const categories = ['Toutes', 'Outil', 'Modèle', 'Recherche', 'Financement', 'Autre'];

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles');
      const data = await res.json();
      setArticles(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des articles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh toutes les 60 secondes
  useEffect(() => {
    fetchArticles();
    const interval = setInterval(fetchArticles, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleShare = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('Lien copié dans le presse-papier !');
    } catch (err) {
      console.error('Échec de la copie', err);
    }
  };

  // Filtrage et Tri
  const filteredArticles = useMemo(() => {
    let result = articles;

    // Filtre par catégorie
    if (activeCategory !== 'Toutes') {
      result = result.filter(a => a.categorie === activeCategory);
    }

    // Recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.titre?.toLowerCase().includes(query) || 
        a.resume?.toLowerCase().includes(query)
      );
    }

    // Tri
    result = [...result].sort((a, b) => {
      if (sortBy === 'score') {
        return (b.score || 0) - (a.score || 0);
      }
      return new Date(b.date_creation) - new Date(a.date_creation);
    });

    return result;
  }, [articles, activeCategory, searchQuery, sortBy]);

  // Statistiques
  const stats = useMemo(() => {
    const total = articles.length;
    const today = articles.filter(a => isToday(parseISO(a.date_creation))).length;
    return { total, today };
  }, [articles]);

  const getScoreClass = (score) => {
    if (score >= 8) return 'score-high';
    if (score >= 5) return 'score-med';
    return 'score-low';
  };

  return (
    <div className="container">
      {/* HEADER */}
      <header className="header">
        <div className="logo-section">
          <h1>Radar IA</h1>
          <div className="stats">
            <span><Activity size={16} /> Total: {stats.total}</span>
            <span><Calendar size={16} /> Aujourd'hui: {stats.today}</span>
            {loading && <span style={{ marginLeft: '1rem', color: 'var(--accent)' }}><RefreshCw size={14} className="animate-spin" /> Actualisation...</span>}
          </div>
        </div>
        
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un article..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* CONTROLS */}
      <div className="controls">
        <div className="filters">
          {categories.map(cat => (
            <button 
              key={cat}
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="sort-selector">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="date">Trier par date (récent)</option>
            <option value="score">Trier par score (pertinent)</option>
          </select>
        </div>
      </div>

      {/* GRID */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-8 empty-state">
          Aucun article trouvé pour ces critères.
        </div>
      ) : (
        <div className="grid">
          {filteredArticles.map(article => (
            <article key={article.id} className="card">
              <div className="card-header">
                <span className="category-badge">{article.categorie}</span>
                <span className={`score-badge ${getScoreClass(article.score)}`}>
                  {article.score}/10
                </span>
              </div>
              <h2 className="card-title">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  {article.titre}
                </a>
              </h2>
              <p className="card-summary">{article.resume}</p>
              <div className="card-footer">
                <time dateTime={article.date_creation}>
                  {format(parseISO(article.date_creation), 'd MMM yyyy, HH:mm', { locale: fr })}
                </time>
                <button 
                  className="action-btn"
                  onClick={() => handleShare(article.url)}
                  title="Partager le lien"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
