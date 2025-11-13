import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import config from '../config.json';

// Material UI Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HistoryIcon from '@mui/icons-material/History';
import ClearIcon from '@mui/icons-material/Clear';

function ErrorList({ language = 'pl', t = (key) => key, globalAutoRefresh = true }) {
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get counter name from language-specific config
  const getCounterName = (counterId) => {
    const languageConfig = config.languages[language];
    if (languageConfig && languageConfig.errorCounters && languageConfig.errorCounters[counterId]) {
      return languageConfig.errorCounters[counterId];
    }
    return `Counter ${counterId}`;
  };

  const fetchErrors = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const counterData = await api.getErrorCounters();
      // Update counter names with language-specific translations
      const translatedCounters = counterData.map(counter => ({
        ...counter,
        name: getCounterName(counter.id)
      }));
      setCounters(translatedCounters);
    } catch (error) {
      console.error('Błąd pobierania błędów:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetCounter = async (counterId) => {
    try {
      console.log(`Resetowanie licznika ${counterId}`);
      await api.resetErrorCounter(counterId);
      fetchErrors();
    } catch (error) {
      console.error('Błąd resetowania licznika:', error);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [language]); // Re-fetch when language changes

  useEffect(() => {
    if (!globalAutoRefresh) return;

    const interval = setInterval(() => {
      fetchErrors();
    }, 30000); // Błędy odświeżaj co 30 sekund

    return () => clearInterval(interval);
  }, [globalAutoRefresh, language]); // Add language dependency

  return (
    <div className="control-grid-container">
      <div className="grid-section">
        <div className="section-header">
          <ErrorOutlineIcon className="section-icon" />
          <span className="section-title">{t('errorList')}</span>
          <span className="section-subtitle">({counters.length} {t('counters')})</span>
        </div>

        {counters.length === 0 ? (
          <div className="no-data-message">
            <HistoryIcon className="no-data-icon" />
            <span>{t('noCountersAvailable')}</span>
          </div>
        ) : (
          <div className="error-counters-grid">
            {counters.map((counter) => (
              <div key={counter.id} className="counter-card">
                <div className="counter-header">
                  <span className="counter-name">{counter.name}</span>
                  <button 
                    className="btn-reset"
                    onClick={() => handleResetCounter(counter.id)}
                    title={t('resetCounter')}
                  >
                    <ClearIcon />
                  </button>
                </div>
                <div className="counter-values">
                  <div className="counter-value-item">
                    <span className="counter-label">{t('currentValue')}</span>
                    <span className="counter-value">{counter.value}</span>
                  </div>
                  <div className="counter-value-item">
                    <span className="counter-label">{t('absoluteValue')}</span>
                    <span className="counter-abs-value">{counter.absValue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorList;
