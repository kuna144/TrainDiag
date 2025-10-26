import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import config from '../config.json';
import RefreshIcon from '@mui/icons-material/Refresh';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

function ManualControl({ language = 'pl', t = (key) => key }) {
  const [outputs, setOutputs] = useState({ leds: [], buttons: [] });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchOutputs = async () => {
    setLoading(true);
    try {
      const data = await api.getSensorData();
      setOutputs({ leds: data.digital.filter(d => d.id.startsWith('led')), buttons: data.digital.filter(d => d.id.startsWith('button')) });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Błąd pobierania wyjść:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutputs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOutputs();
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleToggleOutput = async (outputId, currentState) => {
    try {
      const success = await api.setOutput(outputId, !currentState);
      if (success) {
        // Odśwież stan po zmianie
        setTimeout(fetchOutputs, 300);
      }
    } catch (error) {
      console.error('Błąd sterowania wyjściem:', error);
    }
  };

  return (
    <div className="manual-control-container">
      <div className="control-header">
        <h2>{t('manualControl')}</h2>
        <div className="control-actions">
          <label className="switch">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="slider">{t('autoRefresh')}</span>
          </label>
          <button className="btn btn-refresh" onClick={fetchOutputs} disabled={loading}>
            <RefreshIcon className="icon" /> {t('refresh')}
          </button>
        </div>
      </div>

      {lastUpdate && (
        <div className="last-update">
          {t('lastUpdate')}: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      <div className="outputs-section">
        <h3>{t('outputsLabel')}</h3>
        <div className="output-grid">
          {outputs.leds.map((led) => (
            <div key={led.id} className="output-item">
              <span className="output-label">{led.description || led.id.toUpperCase()}</span>
              <button
                className={`btn-output ${led.on ? 'active' : ''}`}
                onClick={() => handleToggleOutput(led.id, led.on)}
              >
                {led.on ? <LightbulbIcon className="icon" /> : <PowerOffIcon className="icon" />}
                {led.on ? ` ${t('on')}` : ` ${t('off')}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="outputs-section">
        <h3>{t('inputsLabel')}</h3>
        <div className="output-grid">
          {outputs.buttons.map((button) => (
            <div key={button.id} className="output-item readonly">
              <span className="output-label">{button.description || button.id.toUpperCase()}</span>
              <div className={`status-indicator ${button.on ? 'active' : ''}`}>
                {button.on ? <CheckCircleIcon className="icon" /> : <RadioButtonUncheckedIcon className="icon" />}
                {button.on ? ` ${t('active')}` : ` ${t('inactive')}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ManualControl;
