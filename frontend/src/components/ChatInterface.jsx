import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VisualizationRenderer from './VisualizationRenderer';
import flightFacts from './flightFacts';

export default function ChatInterface() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFact, setCurrentFact] = useState('');
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('queryHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const getRandomFact = () => {
    const randomIndex = Math.floor(Math.random() * flightFacts.length);
    return flightFacts[randomIndex];
  };

  useEffect(() => {
    localStorage.setItem('queryHistory', JSON.stringify(history));
  }, [history]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setCurrentFact(getRandomFact());

    try {
      const res = await axios.post('http://localhost:5000/api/query', {
        query: query.trim()
      }, {
        timeout: 60000
      });

      const result = { ...res.data, query: query.trim() };
      setResponse(result);
      setHistory(prev => [...prev, {
        query: query.trim(),
        response: result
      }]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Error processing your query'
      );
      console.error('Query error:', err);
    } finally {
      setLoading(false);
      setCurrentFact('');
    }
  }

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('queryHistory');
  };

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Ask about flight bookings..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '1rem',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            minWidth: '300px',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text)'
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            marginLeft: 10,
            padding: '12px 20px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem'
          }}
        >
          {loading ? 'Processing...' : 'Ask'}
        </button>
      </form>

      {loading && (
        <div style={{
          padding: '15px',
          margin: '10px 0',
          background: 'var(--card-bg)',
          borderRadius: '4px',
          textAlign: 'center',
          color: 'var(--text)'
        }}>
          <div style={{ 
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '3px solid rgba(0,0,0,.1)',
            borderLeftColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '10px'
          }}></div>
          {currentFact && (
            <div style={{
              fontStyle: 'italic',
              color: 'var(--text)',
              marginTop: '10px'
            }}>
              ✈️ Did you know? {currentFact}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          color: 'white',
          backgroundColor: 'var(--error)',
          padding: '10px',
          borderRadius: '4px',
          margin: '10px 0'
        }}>
          {error}
        </div>
      )}

      {response && <VisualizationRenderer response={response} />}

      {history.length > 0 && (
        <div style={{ 
          marginTop: '3rem',
          borderTop: '1px solid var(--border)',
          paddingTop: '2rem',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ color: 'var(--text)' }}>Previous Queries</h3>
            <button
              onClick={clearHistory}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--error)',
                border: '1px solid var(--error)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Clear History
            </button>
          </div>
          
          {history.slice().reverse().map((item, index) => (
            <div key={index} style={{ 
              marginBottom: '2rem',
              padding: '1.5rem',
              background: 'var(--card-bg)',
              borderRadius: '6px',
              color: 'var(--text)'
            }}>
              <div style={{ 
                fontWeight: '600',
                color: 'var(--primary)',
                marginBottom: '1rem'
              }}>
                Q: {item.query}
              </div>
              <VisualizationRenderer response={item.response} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}