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
import RepeatIcon from '@mui/icons-material/Repeat';

function ManualControl({ language = 'pl', t = (key) => key, globalAutoRefresh = true }) {
  const [data, setData] = useState({ analog: [], digital: [] });
  const [loading, setLoading] = useState(false);
  const [flushProgress, setFlushProgress] = useState({ active: false, type: '', remaining: 0, total: 0 });
  const [normalFlushCounter, setNormalFlushCounter] = useState(0);
  const [serviceFlushCounter, setServiceFlushCounter] = useState(0);
  const [pressTimer, setPressTimer] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [activeProcess, setActiveProcess] = useState(null); // 'normal', 'service', 'freezeDrain', null
  const flushStartTimer = React.useRef(null);

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
    // Test proxy connection
    api.testProxyConnection().then(connected => {
      console.log('Proxy connection status:', connected);
    });
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
      
      // Set active process for FreezeDrain
      if (service === 'FreezeDrainG') {
        setActiveProcess('freezeDrain');
      }
      
      const success = await api.callServiceFunction(service);
      if (success) {
        console.log(`Funkcja ${functionName} została wykonana pomyślnie`);
        // Odśwież dane po wykonaniu funkcji serwisowej
        setTimeout(fetchData, 500);
      } else {
        console.error(`Błąd wykonania funkcji ${functionName}`);
        if (service === 'FreezeDrainG') {
          setActiveProcess(null);
        }
      }
    } catch (error) {
      console.error(`Błąd wywołania funkcji serwisowej ${service}:`, error);
      if (service === 'FreezeDrainG') {
        setActiveProcess(null);
      }
    }
  };

  const handleFlushButtonPress = (type) => {
    setIsLongPress(false);
    const timer = setTimeout(() => {
      // Long press (3 seconds) - add 10 or reset to 0
      setIsLongPress(true);
      if (type === 'normal') {
        if (flushProgress.active && flushProgress.type === 'normal') {
          // Reset counter if active
          setNormalFlushCounter(0);
          handleStopFlush();
        } else {
          setNormalFlushCounter(prev => prev + 10);
        }
      } else if (type === 'service') {
        if (flushProgress.active && flushProgress.type === 'service') {
          // Reset counter if active
          setServiceFlushCounter(0);
          handleStopFlush();
        } else {
          setServiceFlushCounter(prev => prev + 10);
        }
      }
    }, 3000);
    setPressTimer(timer);
  };

  const handleFlushButtonRelease = async (type) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    
    // Short press - increment counter by 1 (only if not long press)
    if (!isLongPress) {
      if (type === 'normal') {
        setNormalFlushCounter(prev => prev + 1);
      } else if (type === 'service') {
        setServiceFlushCounter(prev => prev + 1);
      }
    }
    setIsLongPress(false);
  };

  const handleStopFlush = async () => {
    try {
      const response = await api.stopFlushX10();
      if (response.success) {
        setFlushProgress({ active: false, type: '', remaining: 0, total: 0 });
        setNormalFlushCounter(0);
        setServiceFlushCounter(0);
      }
    } catch (error) {
      console.error('Błąd zatrzymywania flush:', error);
    }
  };

  const handleUniversalStop = async () => {
    // Stop flush if active
    if (flushProgress.active) {
      if (flushProgress.type === 'normal') {
        setNormalFlushCounter(0);
        setActiveProcess(null);
      } else if (flushProgress.type === 'service') {
        setServiceFlushCounter(0);
        setActiveProcess(null);
      }
      await handleStopFlush();
    }
    // Stop FreezeDrain if active
    else if (activeProcess === 'freezeDrain') {
      await handleServiceFunction('FreezeDrainS', t('freezeDrainStop'));
      setActiveProcess(null);
    }
  };

  const pollFlushProgress = async () => {
    try {
      const response = await api.getFlushProgress();
      console.log('Progress polling response:', response);
      if (response.active) {
        const mappedType = response.type === 'normal' || response.type === 'normalFlush' ? 'normal' : 
                          response.type === 'service' || response.type === 'serviceFlush' ? 'service' : response.type;
        
        setFlushProgress({
          active: true,
          type: mappedType,
          remaining: response.remaining,
          total: response.total
        });
        // Update counters based on progress
        if (mappedType === 'normal') {
          setNormalFlushCounter(response.remaining);
          setActiveProcess('normal');
        } else if (mappedType === 'service') {
          setServiceFlushCounter(response.remaining);
          setActiveProcess('service');
        }
        // Poll more frequently (every 2 seconds) to show real-time progress
        setTimeout(pollFlushProgress, 2000);
      } else {
        console.log('Flush operation completed');
        setFlushProgress({ active: false, type: '', remaining: 0, total: 0 });
        setNormalFlushCounter(0);
        setServiceFlushCounter(0);
        setActiveProcess(null);
        // Refresh data when complete
        fetchData();
      }
    } catch (error) {
      console.error('Błąd pobierania statusu flush:', error);
      // On error, stop polling and reset state
      setFlushProgress({ active: false, type: '', remaining: 0, total: 0 });
      setNormalFlushCounter(0);
      setServiceFlushCounter(0);
      setActiveProcess(null);
    }
  };

  // Poll for progress on component mount if there's an active flush
  useEffect(() => {
    pollFlushProgress();
  }, []);

  // Start flush when counter changes from 0 (with debounce)
  useEffect(() => {
    if (normalFlushCounter > 0 && !flushProgress.active) {
      // Clear previous timer
      if (flushStartTimer.current) {
        clearTimeout(flushStartTimer.current);
      }
      // Start flush after 500ms of no clicks
      flushStartTimer.current = setTimeout(() => {
        startFlushOperation('normal', normalFlushCounter);
      }, 500);
    }
    return () => {
      if (flushStartTimer.current) {
        clearTimeout(flushStartTimer.current);
      }
    };
  }, [normalFlushCounter]);

  useEffect(() => {
    if (serviceFlushCounter > 0 && !flushProgress.active) {
      // Clear previous timer
      if (flushStartTimer.current) {
        clearTimeout(flushStartTimer.current);
      }
      // Start flush after 500ms of no clicks
      flushStartTimer.current = setTimeout(() => {
        startFlushOperation('serviceFlush', serviceFlushCounter);
      }, 500);
    }
    return () => {
      if (flushStartTimer.current) {
        clearTimeout(flushStartTimer.current);
      }
    };
  }, [serviceFlushCounter]);

  const startFlushOperation = async (type, count) => {
    try {
      console.log(`Starting flush with ${count} cycles for type: ${type}`);
      const response = await api.startFlushX10(type, count);
      console.log('Flush response:', response);
      if (response.success) {
        setFlushProgress({ active: true, type: type === 'serviceFlush' ? 'service' : 'normal', remaining: count, total: count });
        // Start polling for progress
        pollFlushProgress();
      }
    } catch (error) {
      console.error(`Błąd uruchomienia ${type} flush:`, error);
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
          <div className="service-functions-grid">
            <button
              className={`btn-service normal-flush ${normalFlushCounter > 0 ? 'has-counter' : ''} ${flushProgress.active && flushProgress.type === 'normal' ? 'active' : ''}`}
              onMouseDown={() => handleFlushButtonPress('normal')}
              onMouseUp={() => handleFlushButtonRelease('normal')}
              onMouseLeave={() => {
                if (pressTimer) {
                  clearTimeout(pressTimer);
                  setPressTimer(null);
                }
              }}
              onTouchStart={() => handleFlushButtonPress('normal')}
              onTouchEnd={() => handleFlushButtonRelease('normal')}
              disabled={activeProcess && activeProcess !== 'normal'}
            >
              <WaterDropIcon className="icon" />
              {t('normalFlush')}
              {normalFlushCounter > 0 && <span className="counter-badge">{normalFlushCounter}</span>}
            </button>
            <button
              className={`btn-service service-flush ${serviceFlushCounter > 0 ? 'has-counter' : ''} ${flushProgress.active && flushProgress.type === 'service' ? 'active' : ''}`}
              onMouseDown={() => handleFlushButtonPress('service')}
              onMouseUp={() => handleFlushButtonRelease('service')}
              onMouseLeave={() => {
                if (pressTimer) {
                  clearTimeout(pressTimer);
                  setPressTimer(null);
                }
              }}
              onTouchStart={() => handleFlushButtonPress('service')}
              onTouchEnd={() => handleFlushButtonRelease('service')}
              disabled={activeProcess && activeProcess !== 'service'}
            >
              <BuildIcon className="icon" />
              {t('serviceFlush')}
              {serviceFlushCounter > 0 && <span className="counter-badge">{serviceFlushCounter}</span>}
            </button>
            <button
              className="btn-service freeze-drain-start"
              onClick={() => handleServiceFunction('FreezeDrainG', t('freezeDrainStart'))}
              disabled={activeProcess !== null}
            >
              <AcUnitIcon className="icon" />
              {t('freezeDrainStart')}
            </button>
            <button
              className={`btn-service universal-stop ${activeProcess ? 'active' : ''}`}
              onClick={handleUniversalStop}
              disabled={!activeProcess}
            >
              <StopIcon className="icon" />
              {activeProcess ? 'STOP' : t('stop')}
            </button>
          </div>
        </div>

        {/* Sensor readings moved to header */}

        {/* Output Controls Rows */}
        <div className="grid-section outputs">
          <h3 className="grid-section-title">{t('outputControl')}</h3>
          <div className="grid-rows output-rows compact">
            {ledOutputs.map((led, idx) => {
              const rawLabel = led.description || led.id.toUpperCase();
              const cleaned = rawLabel.replace(/^(?:Output|Wyjście|LED|Led)\s*\d+\s*:?-?\s*/i, '').trim() || rawLabel;
              const stateText = led.on ? t('on') : t('off');
              return (
                <button
                  key={led.id}
                  className={`btn-output output-full ${led.on ? 'active' : ''}`}
                  onClick={() => handleToggleOutput(led.id, led.on)}
                  title={rawLabel}
                >
                  {led.on ? <LightbulbIcon className="icon" /> : <PowerOffIcon className="icon" />}
                  <span className="btn-output-text">{`${idx + 1}: ${cleaned} - ${stateText}`}</span>
                </button>
              );
            })}
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default ManualControl;
