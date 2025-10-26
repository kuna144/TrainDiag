import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import config from '../config.json';
import RefreshIcon from '@mui/icons-material/Refresh';

function SensorReadings({ language = 'pl', t = (key) => key }) {
  const [sensors, setSensors] = useState({ analog: [] });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchSensors = async () => {
    setLoading(true);
    try {
      const data = await api.getSensorData();
      setSensors({ analog: data.analog });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Błąd pobierania czujników:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSensors();
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="sensor-readings-container">
      <div className="control-header">
        <h2>{t('sensorReadings')}</h2>
        <div className="control-actions">
          <label className="switch">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="slider">{t('autoRefresh')}</span>
          </label>
          <button className="btn btn-refresh" onClick={fetchSensors} disabled={loading}>
            <RefreshIcon className="icon" /> {t('refresh')}
          </button>
        </div>
      </div>

      {lastUpdate && (
        <div className="last-update">
          {t('lastUpdate')}: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      <div className="sensors-grid">
        {sensors.analog.map((sensor) => (
          <div key={sensor.id} className="sensor-card">
            <div className="sensor-header">
              <span className="sensor-label">{sensor.id.toUpperCase()}</span>
            </div>
            <div className="sensor-value">
              {sensor.value} {sensor.unit}
            </div>
            <div className="sensor-unit">{sensor.description}</div>
          </div>
        ))}
      </div>

      {sensors.analog.length === 0 && !loading && (
        <div className="no-data">
          {t('noAnalogSensors')}
        </div>
      )}
    </div>
  );
}

export default SensorReadings;
