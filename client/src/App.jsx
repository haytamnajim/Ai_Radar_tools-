import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Share2, Activity, Calendar, Heart, CheckCircle, Download, Play, Square, MessageCircle } from 'lucide-react';
import ChatWidget from './components/ChatWidget';
import { format, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Toutes');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'score'
  const [isSpeakingAll, setIsSpeakingAll] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [currentContext, setCurrentContext] = useState(null);

  const categories = ['Toutes', 'Favoris', 'Outil', 'Modèle', 'Recherche', 'Financement', 'Autre'];

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

  const handleUpdate = async (id, updates) => {
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const exportDigest = () => {
    const todayArticles = articles.filter(a => isToday(parseISO(a.date_creation)));
    if (todayArticles.length === 0) {
      alert("Aucun article aujourd'hui à exporter.");
      return;
    }

    let mdContent = `# Digest Veille IA - ${format(new Date(), 'd MMMM yyyy', { locale: fr })}\n\n`;
    todayArticles.forEach(a => {
      mdContent += `## [${a.titre}](${a.url})\n`;
      mdContent += `**Catégorie:** ${a.categorie} | **Score:** ${a.score}/10\n\n`;
      mdContent += `${a.resume}\n\n---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digest-ia-${format(new Date(), 'yyyy-MM-dd')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMaleVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const frVoices = voices.filter(v => v.lang.startsWith('fr'));
    const maleVoice = frVoices.find(v => /paul|thomas|male|homme|antoine|nicolas|claude/i.test(v.name));
    return maleVoice || frVoices[0]; // Tombe sur la 1ère voix française sinon
  };

  const toggleSpeechAll = () => {
    if (isSpeakingAll) {
      window.speechSynthesis.cancel();
      setIsSpeakingAll(false);
      return;
    }
    
    window.speechSynthesis.cancel();
    setSpeakingId(null);

    const todayArticles = articles.filter(a => isToday(parseISO(a.date_creation)));
    if (todayArticles.length === 0) {
      alert("Aucun article aujourd'hui à lire.");
      return;
    }

    const textToRead = "Voici votre résumé de la veille d'aujourd'hui. " + 
      todayArticles.map(a => `${a.titre}. ${a.resume}`).join(".   ");

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'fr-FR';
    const voice = getMaleVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    
    utterance.onend = () => setIsSpeakingAll(false);
    utterance.onerror = () => setIsSpeakingAll(false);
    
    setIsSpeakingAll(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleArticleSpeech = (article) => {
    if (speakingId === article.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeakingAll(false);

    const utterance = new SpeechSynthesisUtterance(`${article.titre}. ${article.resume}`);
    utterance.lang = 'fr-FR';
    const voice = getMaleVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    
    setSpeakingId(article.id);
    window.speechSynthesis.speak(utterance);
  };

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
    if (activeCategory === 'Favoris') {
      result = result.filter(a => a.favori);
    } else if (activeCategory !== 'Toutes') {
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
            <button className="action-btn" onClick={exportDigest} title="Exporter le digest du jour en Markdown" style={{ marginLeft: '0.5rem' }}>
              <Download size={16} /> <span style={{marginLeft: '0.25rem'}}>Export</span>
            </button>
            <button 
              className={`action-btn ${isSpeakingAll ? 'text-accent' : ''}`} 
              onClick={toggleSpeechAll} 
              title="Écouter le résumé du jour" 
              style={{ marginLeft: '0.5rem' }}
            >
              {isSpeakingAll ? <Square size={16} /> : <Play size={16} />} 
              <span style={{marginLeft: '0.25rem'}}>{isSpeakingAll ? 'Arrêter' : 'Tout Écouter'}</span>
            </button>
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
            <article 
              key={article.id} 
              className={`card ${article.lu ? 'card-lu' : ''}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(article));
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
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
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button 
                    className={`action-btn ${article.lu ? 'text-accent' : ''}`}
                    onClick={() => handleUpdate(article.id, { lu: !article.lu })}
                    title={article.lu ? "Marquer comme non lu" : "Marquer comme lu"}
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button 
                    className={`action-btn ${article.favori ? 'text-red' : ''}`}
                    onClick={() => handleUpdate(article.id, { favori: !article.favori })}
                    title={article.favori ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Heart size={16} fill={article.favori ? "currentColor" : "none"} />
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => handleShare(article.url)}
                    title="Partager le lien"
                  >
                    <Share2 size={16} />
                  </button>
                  <button 
                    className={`action-btn ${speakingId === article.id ? 'text-accent' : ''}`}
                    onClick={() => toggleArticleSpeech(article)}
                    title={speakingId === article.id ? 'Arrêter la lecture' : 'Écouter cet article'}
                  >
                    {speakingId === article.id ? <Square size={16} /> : <Play size={16} />}
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => setCurrentContext(article)}
                    title="Discuter de cet article avec l'IA"
                  >
                    <MessageCircle size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      
      <ChatWidget 
        articleContext={currentContext} 
        clearArticleContext={() => setCurrentContext(null)} 
        onArticleDrop={setCurrentContext}
      />
    </div>
  );
}

export default App;
