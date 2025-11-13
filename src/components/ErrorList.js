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

  const fetchErrors = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const counterData = await api.getErrorCounters();
      setCounters(counterData);
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
  }, []);

  useEffect(() => {
    if (!globalAutoRefresh) return;

    const interval = setInterval(() => {
      fetchErrors();
    }, 30000); // Błędy odświeżaj co 30 sekund

    return () => clearInterval(interval);
  }, [globalAutoRefresh]);

  return (
    <div className="error-list-container">
      <div className="control-header">
        <h2>{t('errorList')}</h2>
      </div>

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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {counters.map((counter) => (
                  <tr key={counter.id}>
                    <td>{counter.name}</td>
                    <td className="counter-value">{counter.value}</td>
                    <td className="counter-abs-value">{counter.absValue}</td>
                    <td className="counter-actions">
                      <button 
                        className="btn btn-reset"
                        onClick={() => handleResetCounter(counter.id)}
                      >
                        <ClearIcon sx={{ fontSize: 16, marginRight: 0.5 }} />
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
