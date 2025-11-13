import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import config from '../config.json';

// Material UI Icons
import SensorsIcon from '@mui/icons-material/Sensors';
import InputIcon from '@mui/icons-material/Input';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

function InputsTab({ language = 'pl', t = (key) => key, globalAutoRefresh = true }) {
  const [data, setData] = useState({
    buttons: Array.from({length: 12}, (_, i) => ({ id: `button${i}`, on: false, marked: false })),
    analog: [
      { id: 'ad4', value: 0 },
      { id: 'ad5', value: 0 }
    ]
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getOutputs();
      setData(data);
    } catch (error) {
      console.error('Błąd pobierania danych:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!globalAutoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(interval);
  }, [globalAutoRefresh]);

  const getSensorDisplayName = (sensorId) => {
    const supportedSensor = config.supportedSensors[sensorId];
    if (supportedSensor) {
      if (sensorId === 'ad4') return 'Analog IN1';
      if (sensorId === 'ad5') return 'Analog IN2';
    }
    return `Sensor ${sensorId}`;
  };

  const getSensorUnit = (sensorId) => {
    const supportedSensor = config.supportedSensors[sensorId];
    if (supportedSensor) {
      if (sensorId === 'ad4') return 'mBar';
      if (sensorId === 'ad5') return 'mA';
    }
    return '';
  };

  const getIconForSensor = (sensorId) => {
    if (sensorId.includes('temperature') || sensorId.includes('temp')) {
      return <DeviceThermostatIcon className="icon" />;
    } else if (sensorId.includes('pressure') || sensorId.includes('speed') || sensorId === 'ad4') {
      return <SpeedIcon className="icon" />;
    }
    return <SensorsIcon className="icon" />;
  };

  return (
    <div className="inputs-tab-container">

      {/* Sensor Readings */}
      <div className="sensors-section">
        <h3>{t('sensorReadings')}</h3>
        {data.analog && data.analog.length > 0 ? (
          <div className="sensor-grid">
            {data.analog.map((sensor) => (
              <div key={sensor.id} className="sensor-item">
                <div className="sensor-icon">
                  {getIconForSensor(sensor.id)}
                </div>
                <div className="sensor-info">
                  <span className="sensor-label">{getSensorDisplayName(sensor.id)}</span>
                  <span className="sensor-value">{sensor.value} {getSensorUnit(sensor.id)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">{t('noAnalogSensors')}</div>
        )}
      </div>

      {/* Inputs Section */}
      <div className="inputs-section">
        <h3><InputIcon sx={{ fontSize: 24, marginRight: 1 }} /> {t('inputsSection')} ({data.buttons.filter(btn => btn.on).length}/{data.buttons.length})</h3>
        <div className="control-grid">
          {data.buttons.map((button) => {
            const config_key = button.id;
            const inputConfig = config.supportedInputs[config_key];
            const translationKey = language === 'pl' ? 
              config.languages.pl.inputs[config_key] : 
              config.languages.en.inputs[config_key];
            
            const displayName = translationKey || inputConfig || `Input ${button.id}`;
            
            return (
              <div key={button.id} className={`control-item input-item ${button.on ? 'active' : ''}`}>
                <div className="item-info">
                  <div className="item-id">{button.id.toUpperCase()}</div>
                  <div className="item-description">{displayName}</div>
                </div>
                <div className={`status-indicator ${button.on ? 'active' : 'inactive'}`}>
                  <span className="status-dot"></span>
                  <span className="status-text">{button.on ? t('active') : t('inactive')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default InputsTab;