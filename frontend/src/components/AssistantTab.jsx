import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

function AssistantTab({ selectedCity, userProfile }) {
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: `Hello ${userProfile.name}! 🌱 I'm your EcoGuard Advisor. I have loaded real-time environmental context for **${selectedCity}**. Ask me about air quality, health recommendations, weather indices, or daily conservation practices.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (textToSend) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;

    // Add user message
    const userMsg = {
      sender: 'user',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setSending(true);

    // Call backend
    fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageText,
        city: selectedCity,
        name: userProfile.name,
        asthma: userProfile.asthma
      })
    })
      .then(res => res.json())
      .then(data => {
        const agentMsg = {
          sender: 'agent',
          text: data.response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, agentMsg]);
        setSending(false);
      })
      .catch(err => {
        console.error('Chat error:', err);
        const errorMsg = {
          sender: 'agent',
          text: 'Oops! I had trouble connecting to my central node. Please check if the backend API is online.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
        setSending(false);
      });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Suggestion buttons
  const suggestions = [
    { label: 'Check Air Quality', query: 'What is the air quality (AQI) right now?' },
    { label: 'Get Safety Advice', query: 'Do you have any health safety tips for me?' },
    { label: 'Suggest Green Actions', query: 'What daily eco actions should I try today?' },
    { label: 'Explain UV Index', query: 'What is the current UV level and safety precautions?' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '12fr', gap: '1.5rem', height: 'calc(100vh - 180px)' }}>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>EcoGuard Multi-Agent Chatbot</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Powered by real-time telemetry from <strong>{selectedCity}</strong>
            </p>
          </div>
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <div 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: msg.sender === 'user' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                  color: msg.sender === 'user' ? 'var(--accent-info)' : 'var(--accent-purple)',
                  flexShrink: 0
                }}
              >
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div>
                <div 
                  style={{ 
                    padding: '0.85rem 1rem', 
                    borderRadius: '12px', 
                    background: msg.sender === 'user' ? 'rgba(14, 165, 233, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid',
                    borderColor: msg.sender === 'user' ? 'rgba(14, 165, 233, 0.15)' : 'var(--border-light)',
                    fontSize: '0.85rem',
                    lineHeight: '1.5',
                    color: '#fff',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.text}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {sending && (
            <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' }}>
                <Bot size={16} />
              </div>
              <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-light)', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--accent-purple)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out' }}></span>
                <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--accent-purple)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.2s' }}></span>
                <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--accent-purple)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.4s' }}></span>
                <style>{`
                  @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1.0); }
                  }
                `}</style>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {suggestions.map((s, idx) => (
            <button 
              key={idx} 
              onClick={() => sendMessage(s.query)}
              className="glass-btn" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }}
              disabled={sending}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask EcoGuard about ${selectedCity}...`}
            className="glass-input" 
            disabled={sending}
          />
          <button 
            onClick={() => sendMessage()}
            className="glass-btn glass-btn-primary" 
            style={{ width: '50px', height: '50px', padding: 0 }}
            disabled={sending}
          >
            <Send size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}

export default AssistantTab;
