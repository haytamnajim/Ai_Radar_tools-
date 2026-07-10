import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RefreshCw, Share2, Activity, Calendar, Heart, CheckCircle, Download, Play, Square, MessageCircle, LayoutGrid, List, Trophy, FileText } from 'lucide-react';
import ChatWidget from './components/ChatWidget';
import { format, isToday, parseISO, subDays, isAfter, startOfDay, isThisWeek, isThisMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

// ===== HELPER: Source badge info =====
const SOURCE_CONFIG = {
  'Hacker News': { label: 'HN', icon: 'Y', className: 'source-hackernews' },
  'ArXiv':       { label: 'ArXiv', icon: '📄', className: 'source-arxiv' },
  'Reddit':      { label: 'Reddit', icon: '🔗', className: 'source-reddit' },
  'Web':         { label: 'Web', icon: '🌐', className: 'source-web' },
};

function getSourceConfig(source) {
  return SOURCE_CONFIG[source] || SOURCE_CONFIG['Web'];
}

// ===== HELPER: Extract domain from URL =====
function getDomain(url) {
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return '';
  }
}

// ===== COMPONENT: Mini Activity Chart =====
function ActivityChart({ articles }) {
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const count = articles.filter(a => {
        const d = startOfDay(parseISO(a.date_creation));
        return d.getTime() === day.getTime();
      }).length;
      days.push({ day, count, label: format(day, 'EEE d', { locale: fr }) });
    }
    return days;
  }, [articles]);

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  return (
    <div className="activity-chart" title="Articles par jour (7 derniers jours)">
      {chartData.map((d, i) => (
        <div key={i} className="activity-bar-wrapper">
          <div className="activity-tooltip">{d.label}: {d.count}</div>
          <div
            className="activity-bar"
            style={{ height: `${Math.max((d.count / maxCount) * 22, 2)}px` }}
          />
        </div>
      ))}
    </div>
  );
}

// ===== COMPONENT: Source Badge =====
function SourceBadge({ source }) {
  const cfg = getSourceConfig(source);
  return (
    <span className={`source-badge ${cfg.className}`}>
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Toutes');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'score'
  const [isSpeakingAll, setIsSpeakingAll] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [currentContext, setCurrentContext] = useState(null);
  // New states
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [minScore, setMinScore] = useState(1);
  const [timePeriod, setTimePeriod] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [showTopWeek, setShowTopWeek] = useState(false);

  const categories = ['Toutes', 'Favoris', 'Outil', 'Modèle', 'Recherche', 'Financement', 'Autre'];

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/articles');
      const data = await res.json();
      setArticles(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des articles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh toutes les 60 secondes
  useEffect(() => {
    fetchArticles();
    const interval = setInterval(fetchArticles, 60000);
    return () => clearInterval(interval);
  }, [fetchArticles]);

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

  // ===== Category counts =====
  const categoryCounts = useMemo(() => {
    const counts = {};
    categories.forEach(cat => {
      if (cat === 'Toutes') {
        counts[cat] = articles.length;
      } else if (cat === 'Favoris') {
        counts[cat] = articles.filter(a => a.favori).length;
      } else {
        counts[cat] = articles.filter(a => a.categorie === cat).length;
      }
    });
    return counts;
  }, [articles]);

  // ===== Filtrage et Tri =====
  const filteredArticles = useMemo(() => {
    let result = articles;

    // Filtre par catégorie
    if (activeCategory === 'Favoris') {
      result = result.filter(a => a.favori);
    } else if (activeCategory !== 'Toutes') {
      result = result.filter(a => a.categorie === activeCategory);
    }

    // Recherche (titre + résumé)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.titre?.toLowerCase().includes(query) || 
        a.resume?.toLowerCase().includes(query)
      );
    }

    // Filtre par score minimum
    if (minScore > 1) {
      result = result.filter(a => (a.score || 0) >= minScore);
    }

    // Filtre par période
    if (timePeriod !== 'all') {
      result = result.filter(a => {
        const date = parseISO(a.date_creation);
        switch (timePeriod) {
          case 'today': return isToday(date);
          case 'week': return isThisWeek(date, { weekStartsOn: 1 });
          case 'month': return isThisMonth(date);
          default: return true;
        }
      });
    }

    // Tri
    result = [...result].sort((a, b) => {
      if (sortBy === 'score') {
        return (b.score || 0) - (a.score || 0);
      }
      return new Date(b.date_creation) - new Date(a.date_creation);
    });

    return result;
  }, [articles, activeCategory, searchQuery, sortBy, minScore, timePeriod]);

  // ===== Top de la semaine =====
  const topWeekArticles = useMemo(() => {
    const oneWeekAgo = subDays(new Date(), 7);
    return [...articles]
      .filter(a => isAfter(parseISO(a.date_creation), oneWeekAgo))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
  }, [articles]);

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

  const getCardClassName = (article) => {
    let classes = 'card';
    if (article.lu) classes += ' card-lu';
    if (article.source === 'ArXiv' && article.categorie === 'Recherche') {
      classes += ' card-arxiv-research';
    }
    return classes;
  };

  // ===== Time period options =====
  const timePeriods = [
    { value: 'all', label: 'Tout' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  // ===== RENDER: Card view =====
  const renderCard = (article, extraClass = '') => (
    <article 
      key={article.id} 
      className={`${getCardClassName(article)} ${extraClass}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(article));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
      }}
    >
      <div className="card-header">
        <div className="badges-row">
          <span className="category-badge">
            {article.source === 'ArXiv' && article.categorie === 'Recherche' && <><FileText size={10} style={{ marginRight: '3px' }} /></>}
            {article.categorie}
          </span>
          <SourceBadge source={article.source || 'Web'} />
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {getDomain(article.url) && (
            <img 
              className="favicon-img"
              src={`https://www.google.com/s2/favicons?domain=${getDomain(article.url)}&sz=16`}
              alt=""
              loading="lazy"
            />
          )}
          <time dateTime={article.date_creation}>
            {format(parseISO(article.date_creation), 'd MMM yyyy, HH:mm', { locale: fr })}
          </time>
        </div>
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
  );

  // ===== RENDER: List item =====
  const renderListItem = (article) => (
    <div key={article.id} className={`list-item ${article.lu ? 'card-lu' : ''}`}>
      <div className="list-item-title">
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {getDomain(article.url) && (
            <img 
              className="favicon-img"
              src={`https://www.google.com/s2/favicons?domain=${getDomain(article.url)}&sz=16`}
              alt=""
              loading="lazy"
            />
          )}
          {article.titre}
        </a>
      </div>
      <SourceBadge source={article.source || 'Web'} />
      <span className={`score-badge ${getScoreClass(article.score)}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
        {article.score}/10
      </span>
      <span className="list-item-meta list-hide-mobile">{article.categorie}</span>
      <span className="list-item-meta">
        {format(parseISO(article.date_creation), 'd MMM', { locale: fr })}
      </span>
    </div>
  );

  return (
    <div className="container">
      {/* HEADER */}
      <header className="header">
        <div className="logo-section">
          <h1>Radar IA</h1>
          <div className="stats">
            <span>
              <Activity size={16} /> Total: {stats.total}
              <ActivityChart articles={articles} />
            </span>
            <span><Calendar size={16} /> Aujourd'hui: {stats.today}</span>
            {loading && <span style={{ marginLeft: '1rem', color: 'var(--accent)' }}><RefreshCw size={14} className="animate-spin" /> Actualisation...</span>}
            <button className="filter-btn" onClick={exportDigest} title="Exporter le digest du jour en Markdown" style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Download size={16} /> <span>Export</span>
            </button>
            <button 
              className={`filter-btn ${isSpeakingAll ? 'active' : ''}`} 
              onClick={toggleSpeechAll} 
              title="Écouter le résumé du jour" 
              style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              {isSpeakingAll ? <Square size={16} /> : <Play size={16} />} 
              <span>{isSpeakingAll ? 'Arrêter' : 'Tout Écouter'}</span>
            </button>
          </div>
        </div>
        
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un article (titre ou résumé)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* CONTROL PANEL */}
      <div className="control-panel">
        {/* ROW 1: Categories & View Toggle */}
        <div className="control-row">
          <div className="filters">
            {categories.map(cat => (
              <button 
                key={cat}
                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                <span className="filter-count">({categoryCounts[cat] || 0})</span>
              </button>
            ))}
          </div>
          
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vue grille"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vue liste"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        <div className="control-divider" />

        {/* ROW 2: Top Week, Time Filters, Score, Sort */}
        <div className="control-row">
          <div className="control-group">
            <button
              className={`filter-btn top-week-toggle ${showTopWeek ? 'active' : ''}`}
              onClick={() => setShowTopWeek(prev => !prev)}
              title="Top 5 articles de la semaine"
            >
              <Trophy size={14} style={{ marginRight: '0.35rem' }} />
              Top Semaine
            </button>
          </div>

          <div className="control-group">
            <div className="time-filters">
              {timePeriods.map(tp => (
                <button
                  key={tp.value}
                  className={`time-filter-btn ${timePeriod === tp.value ? 'active' : ''}`}
                  onClick={() => setTimePeriod(tp.value)}
                >
                  {tp.label}
                </button>
              ))}
            </div>

            <div className="score-slider-container">
              <span>Score min:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              />
              <span className="score-slider-label">{minScore}</span>
            </div>

            <select 
              className="sort-select"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Trier par date (récent)</option>
              <option value="score">Trier par score (pertinent)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TOP WEEK SECTION */}
      {showTopWeek && topWeekArticles.length > 0 && (
        <div className="top-week-section">
          <div className="top-week-header">
            <Trophy size={20} style={{ color: '#fbbf24' }} />
            <h2>Top de la Semaine</h2>
          </div>
          <div className="top-week-grid">
            {topWeekArticles.map((article, idx) => (
              <div key={article.id} style={{ position: 'relative', height: '100%' }}>
                <span className="top-week-rank">#{idx + 1}</span>
                {renderCard(article, 'top-week-card')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRID / LIST */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-8 empty-state">
          Aucun article trouvé pour ces critères.
        </div>
      ) : viewMode === 'list' ? (
        <div className="list-view">
          {filteredArticles.map(renderListItem)}
        </div>
      ) : (
        <div className="grid">
          {filteredArticles.map(article => renderCard(article))}
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
