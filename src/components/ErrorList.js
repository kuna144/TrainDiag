import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import config from '../config.json';

// Material UI Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HistoryIcon from '@mui/icons-material/History';
import ClearIcon from '@mui/icons-material/Clear';

function ErrorList({ language = 'pl', t = (key) => key }) {
  const [errors, setErrors] = useState([]);
  const [errorHistory, setErrorHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const xmlDoc = await api.getErrorCounters();
      const parsedErrors = parseErrorCounters(xmlDoc);
      setErrors(parsedErrors);
      setLastUpdate(new Date());
      
      // Zapisz do historii jeśli są nowe błędy
      if (parsedErrors.length > 0) {
        saveToHistory(parsedErrors);
      }
    } catch (error) {
      console.error('Błąd pobierania błędów:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseErrorCounters = (xmlDoc) => {
    const errorElements = xmlDoc.getElementsByTagName('error');
    const errorList = [];

    for (let error of errorElements) {
      const id = error.getElementsByTagName('id')[0]?.textContent;
      const count = error.getElementsByTagName('count')[0]?.textContent;
      const description = error.getElementsByTagName('description')[0]?.textContent;

      if (id && parseInt(count) > 0) {
        const description = config.supportedErrors[id] || description || `Błąd ${id}`;
        errorList.push({
          id,
          count: parseInt(count),
          description: description,
          timestamp: new Date()
        });
      }
    }

    return errorList;
  };

  const saveToHistory = (newErrors) => {
    const history = JSON.parse(localStorage.getItem('errorHistory') || '[]');
    const updated = [...history, ...newErrors.map(e => ({
      ...e,
      timestamp: new Date().toISOString()
    }))];
    
    // Zachowaj ostatnie 100 błędów
    const trimmed = updated.slice(-100);
    localStorage.setItem('errorHistory', JSON.stringify(trimmed));
    setErrorHistory(trimmed.reverse());
  };

  const loadHistory = () => {
    const history = JSON.parse(localStorage.getItem('errorHistory') || '[]');
    setErrorHistory(history.reverse());
  };

  const clearHistory = () => {
    localStorage.removeItem('errorHistory');
    setErrorHistory([]);
  };

  const handleClearError = async (errorId) => {
    // Tutaj dodaj endpoint do kasowania błędów gdy będzie dostępny
    console.log('Kasowanie błędu:', errorId);
    // Na razie tylko odświeżamy
    fetchErrors();
  };

  useEffect(() => {
    fetchErrors();
    loadHistory();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchErrors();
    }, config.refreshInterval * 2); // Błędy odświeżaj rzadziej

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="error-list-container">
      <div className="control-header">
        <h2>{t('errorList')}</h2>
        <div className="control-actions">
          <label className="switch">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="slider">{t('autoRefreshLabel')}</span>
          </label>
          <button className="btn btn-refresh" onClick={fetchErrors} disabled={loading}>
            <RefreshIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {lastUpdate && (
        <div className="last-update">
          {t('lastUpdate')}: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      <div className="errors-section">
        <h3><ErrorOutlineIcon sx={{ fontSize: 24, marginRight: 1 }} /> {t('activeErrors')} ({errors.length})</h3>
        {errors.length === 0 ? (
          <div className="no-errors">✓ {t('noActiveErrors')}</div>
        ) : (
          <div className="error-cards">
            {errors.map((error) => (
              <div key={error.id} className="error-card">
                <div className="error-header">
                  <span className="error-id">{t('errorId').replace('{id}', error.id)}</span>
                  <span className="error-count">{t('occurrences').replace('{count}', error.count)}</span>
                </div>
                <div className="error-description">{error.description}</div>
                <button 
                  className="btn btn-clear"
                  onClick={() => handleClearError(error.id)}
                >
                  {t('clearError')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="history-section">
        <div className="history-header">
          <h3><HistoryIcon sx={{ fontSize: 24, marginRight: 1 }} /> {t('errorHistory')} ({errorHistory.length})</h3>
          <button className="btn btn-secondary" onClick={clearHistory}>
            <ClearIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
            {t('clearHistory')}
          </button>
        </div>
        {errorHistory.length === 0 ? (
          <div className="no-data">{t('noErrorHistory')}</div>
        ) : (
          <div className="history-list">
            {errorHistory.slice(0, 20).map((error, index) => (
              <div key={index} className="history-item">
                <span className="history-time">
                  {new Date(error.timestamp).toLocaleString()}
                </span>
                <span className="history-error">
                  {t('errorId').replace('{id}', error.id)} - {error.description}
                </span>
                <span className="history-count">×{error.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorList;
