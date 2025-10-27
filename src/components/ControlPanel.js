import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import config from '../config.json';

// Material UI Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import ScheduleIcon from '@mui/icons-material/Schedule';

function ControlPanel({ language = 'pl', t = (key) => key }) {
  const [outputs, setOutputs] = useState({ 
    leds: [
      { id: 'led0', on: false },
      { id: 'led1', on: false },
      { id: 'led2', on: false },
      { id: 'led3', on: false },
      { id: 'led4', on: false },
      { id: 'led5', on: false },
      { id: 'led6', on: false },
      { id: 'led7', on: false },
      { id: 'led8', on: false },
      { id: 'led9', on: false },
      { id: 'led10', on: false },
      { id: 'led11', on: false }
    ], 
    buttons: [
      { id: 'button1', on: false },
      { id: 'button2', on: false },
      { id: 'button3', on: false },
      { id: 'button4', on: false },
      { id: 'button5', on: false },
      { id: 'button6', on: false },
      { id: 'button7', on: false },
      { id: 'button8', on: false },
      { id: 'button9', on: false },
      { id: 'button10', on: false },
      { id: 'button11', on: false },
      { id: 'button12', on: false }
    ], 
    analog: [
      { id: 'ad4', value: 0 },
      { id: 'ad5', value: 0 }
    ]
  });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getOutputs();
      // Łączymy dane z API z domyślnymi danymi
      setOutputs(prevOutputs => ({
        leds: data.leds && data.leds.length > 0 ? data.leds : prevOutputs.leds,
        buttons: data.buttons && data.buttons.length > 0 ? data.buttons : prevOutputs.buttons,
        analog: data.analog && data.analog.length > 0 ? data.analog : prevOutputs.analog
      }));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Błąd pobierania danych:', error);
      // W przypadku błędu zachowujemy domyślne dane
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleToggleOutput = async (outputId, currentState) => {
    try {
      const success = await api.setOutput(outputId, !currentState);
      if (success) {
        // Odśwież stan po zmianie
        setTimeout(fetchData, 300);
      }
    } catch (error) {
      console.error('Błąd sterowania wyjściem:', error);
    }
  };

  return (
    <div className="control-panel-container">
      <div className="control-header">
        <h2>{t('controlPanel')}</h2>
        <div className="control-actions">
          <label className="switch">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="slider">{t('autoRefresh')}</span>
          </label>
          <button className="btn btn-refresh" onClick={fetchData} disabled={loading}>
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

      {/* Czujniki Analogowe */}
      {outputs.analog.length > 0 && (
        <div className="section">
          <h3><AnalyticsIcon sx={{ fontSize: 24, marginRight: 1 }} /> {t('sensorReadings')}</h3>
          <div className="sensors-grid">
            {outputs.analog.map((sensor) => (
              <div key={sensor.id} className="sensor-card">
                <div className="sensor-header">
                  <span className="sensor-label">Analog IN{sensor.id === 'ad4' ? '1' : '2'}</span>
                </div>
                <div className="sensor-value">
                  {sensor.value}
                </div>
                <div className="sensor-unit">{config.languages[language].sensors[sensor.id] || sensor.id}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wyjścia LED i Wejścia w dwóch kolumnach */}
      <div className="controls-container">
        {/* Wyjścia LED - Sterowanie */}
        <div className="section controls-column">
          <h3><LightbulbIcon sx={{ fontSize: 24, marginRight: 1 }} /> {t('outputsSection')}</h3>
          <div className="output-grid">
            {outputs.leds.map((led) => (
              <div key={led.id} className="output-item">
                <span className="output-label">{config.languages[language].outputs[led.id] || led.id.toUpperCase()}</span>
                <button
                  className={`btn-output ${led.on ? 'active' : ''}`}
                  onClick={() => handleToggleOutput(led.id, led.on)}
                >
                  {led.on ? t('on') : t('off')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Wejścia (Przyciski) - Tylko odczyt */}
        <div className="section controls-column">
          <h3><TouchAppIcon sx={{ fontSize: 24, marginRight: 1 }} /> {t('inputsLabel')}</h3>
          <div className="output-grid">
            {outputs.buttons.map((button) => (
              <div key={button.id} className="output-item readonly">
                <span className="output-label">{config.languages[language].inputs[button.id] || button.id.toUpperCase()}</span>
                <div className={`status-indicator ${button.on ? 'active' : ''}`}>
                  {button.on ? t('active') : t('inactive')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
