import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import config from '../config.json';

// Material UI Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HistoryIcon from '@mui/icons-material/History';
import ClearIcon from '@mui/icons-material/Clear';

function ErrorList({ language = 'pl', t = (key) => key }) {
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [editValues, setEditValues] = useState({});

  const fetchErrors = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const counterData = await api.getErrorCounters();
      setCounters(counterData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Błąd pobierania błędów:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCounter = async (counterId) => {
    const newValue = editValues[counterId];
    if (newValue === undefined || newValue === '') return;
    
    try {
      console.log(`Ustawianie licznika ${counterId} na wartość ${newValue}`);
      await api.setErrorCounter(counterId, newValue);
      fetchErrors();
      // Wyczyść pole po udanym ustawieniu
      setEditValues(prev => ({
        ...prev,
        [counterId]: ''
      }));
    } catch (error) {
      console.error('Błąd ustawiania licznika:', error);
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

  const handleEditChange = (counterId, value) => {
    setEditValues(prev => ({
      ...prev,
      [counterId]: value
    }));
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchErrors();
    }, 30000); // Błędy odświeżaj co 30 sekund

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
        <h3><ErrorOutlineIcon sx={{ fontSize: 24, marginRight: 1 }} /> Error Counters ({counters.length})</h3>
        {counters.length === 0 ? (
          <div className="no-errors">No counters available</div>
        ) : (
          <div className="counter-table">
            <table>
              <thead>
                <tr>
                  <th>Counter</th>
                  <th>Value</th>
                  <th>Absolute Value</th>
                  <th>Set</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {counters.map((counter) => (
                  <tr key={counter.id}>
                    <td>{counter.name}</td>
                    <td className="counter-value">{counter.value}</td>
                    <td className="counter-abs-value">{counter.absValue}</td>
                    <td>
                      <input
                        type="number"
                        className="counter-input"
                        placeholder="New value"
                        value={editValues[counter.id] || ''}
                        onChange={(e) => handleEditChange(counter.id, e.target.value)}
                      />
                    </td>
                    <td className="counter-actions">
                      <button 
                        className="btn btn-set"
                        onClick={() => handleSetCounter(counter.id)}
                        disabled={!editValues[counter.id]}
                      >
                        Set
                      </button>
                      <button 
                        className="btn btn-reset"
                        onClick={() => handleResetCounter(counter.id)}
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorList;
