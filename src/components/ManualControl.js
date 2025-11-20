import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import config from '../config.json';
import RefreshIcon from '@mui/icons-material/Refresh';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import SensorsIcon from '@mui/icons-material/Sensors';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import SpeedIcon from '@mui/icons-material/Speed';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import BuildIcon from '@mui/icons-material/Build';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import StopIcon from '@mui/icons-material/Stop';

function ManualControl({ language = 'pl', t = (key) => key, globalAutoRefresh = true }) {
  const [data, setData] = useState({ analog: [], digital: [] });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sensorData = await api.getSensorData();
      setData(sensorData);
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
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [globalAutoRefresh]);

  const handleToggleOutput = async (outputId, currentState) => {
    try {
      // Obsługa Vacuum (output 3) - steruje jednocześnie output 2 i 3
      if (outputId === 'led2') {
        // Włącz/wyłącz Vacuum i Pressure razem
        const newState = !currentState;
        const stateStr = newState ? 'on' : 'off';
        
        const success = await api.setMultipleOutputs({
          led1: stateStr,  // Pressure valve
          led2: stateStr   // Vacuum valve
        });
        
        if (success) {
          setTimeout(fetchData, 300);
        }
        return;
      }
      
      // Wszystkie inne wyjścia działają niezależnie
      const success = await api.setOutput(outputId, !currentState);
      if (success) {
        setTimeout(fetchData, 300);
      }
    } catch (error) {
      console.error('Błąd sterowania wyjściem:', error);
    }
  };

  const handleServiceFunction = async (service, functionName) => {
    try {
      console.log(`Wywołanie funkcji serwisowej: ${service}`);
      const success = await api.callServiceFunction(service);
      if (success) {
        console.log(`Funkcja ${functionName} została wykonana pomyślnie`);
        // Odśwież dane po wykonaniu funkcji serwisowej
        setTimeout(fetchData, 500);
      } else {
        console.error(`Błąd wykonania funkcji ${functionName}`);
      }
    } catch (error) {
      console.error(`Błąd wywołania funkcji serwisowej ${service}:`, error);
    }
  };

  const getIconForSensor = (sensorId) => {
    if (sensorId.includes('temperature') || sensorId.includes('temp')) {
      return <DeviceThermostatIcon className="icon" />;
    } else if (sensorId.includes('pressure') || sensorId.includes('speed')) {
      return <SpeedIcon className="icon" />;
    }
    return <SensorsIcon className="icon" />;
  };

  // Filtruj tylko wyjścia LED (nie inputs)
  const ledOutputs = data.digital.filter(d => d.id.startsWith('led'));

  return (
    <div className="manual-control-container">

      {/* Combined Grid with all controls */}
      <div className="control-grid-container">
        
        {/* Service Functions Row */}
        <div className="grid-section service-functions">
          <h3 className="grid-section-title">{t('serviceFunctions')}</h3>
          <div className="grid-row service-row">
            <button
              className="btn-service normal-flush"
              onClick={() => handleServiceFunction('normalFlush', t('normalFlush'))}
            >
              <WaterDropIcon className="icon" />
              {t('normalFlush')}
            </button>
            <button
              className="btn-service service-flush"
              onClick={() => handleServiceFunction('serviceFlush', t('serviceFlush'))}
            >
              <BuildIcon className="icon" />
              {t('serviceFlush')}
            </button>
            <button
              className="btn-service freeze-drain-start"
              onClick={() => handleServiceFunction('FreezeDrainG', t('freezeDrainStart'))}
            >
              <AcUnitIcon className="icon" />
              {t('freezeDrainStart')}
            </button>
            <button
              className="btn-service freeze-drain-stop"
              onClick={() => handleServiceFunction('FreezeDrainS', t('freezeDrainStop'))}
            >
              <StopIcon className="icon" />
              {t('freezeDrainStop')}
            </button>
          </div>
        </div>

        {/* Sensor readings moved to header */}

        {/* Output Controls Rows */}
        <div className="grid-section outputs">
          <h3 className="grid-section-title">{t('outputControl')}</h3>
          <div className="grid-rows output-rows">
            {ledOutputs.map((led) => (
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
        
      </div>
    </div>
  );
}

export default ManualControl;
