import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

const WEBHOOK_URL = 'https://primary-needlessly-dinosaur.ngrok-free.app/webhook-test/chat-radar-ia'; // Webhook n8n test

export default function ChatWidget({ articleContext, clearArticleContext, onArticleDrop }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let sid = localStorage.getItem('chat_session_id');
    if (!sid) {
      sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      localStorage.setItem('chat_session_id', sid);
    }
    setSessionId(sid);
  }, []);

  useEffect(() => {
    if (articleContext) {
      setIsOpen(true);
      // Avoid duplicate context messages
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        const contextText = `Vous discutez de l'article : **${articleContext.titre}**`;
        if (lastMsg && lastMsg.text === contextText) return prev;
        return [...prev, { role: 'system', text: contextText }];
      });
    }
  }, [articleContext]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data && onArticleDrop) {
        const article = JSON.parse(data);
        onArticleDrop(article);
      }
    } catch (err) {
      console.error('Erreur de drag & drop', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');
    setIsTyping(true);

    try {
      const payload = {
        message: userMsg,
        session_id: sessionId,
        contexte_article: articleContext ? `Titre: ${articleContext.titre} | Résumé: ${articleContext.resume}` : ""
      };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Erreur réseau');

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.reply || 'Désolé, je n\'arrive pas à répondre pour le moment.' }]);
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', text: "Désolé, je n'arrive pas à répondre pour le moment." }]);
    } finally {
      setIsTyping(false);
      if (articleContext) clearArticleContext(); // Clear context after first message is sent
    }
  };

  return (
    <>
      <button 
        className={`chat-fab ${isDragOver ? 'drag-over' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Discuter avec l'IA"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isOpen && (
        <div 
          className={`chat-panel ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Assistant IA</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="chat-close-btn">
              <X size={20} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                Bonjour ! Je suis l'assistant de Radar IA, posez-moi vos questions sur les articles.
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble-container ${msg.role}`}>
                {msg.role === 'bot' && <Bot size={16} className="chat-icon bot-icon" />}
                <div className={`chat-bubble ${msg.role}`}>
                  {msg.text}
                </div>
                {msg.role === 'user' && <User size={16} className="chat-icon user-icon" />}
              </div>
            ))}
            {isTyping && (
              <div className="chat-bubble-container bot">
                <Bot size={16} className="chat-icon bot-icon" />
                <div className="chat-bubble bot typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Écrivez votre message..." 
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
            />
            <button type="submit" disabled={!inputValue.trim() || isTyping}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
