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
  const [pendingUpdate, setPendingUpdate] = useState({ normal: false, service: false });
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

  const handleToggleOutput = async (e, outputId, currentState) => {
    e.preventDefault(); // Zapobiega duplikowaniu eventów
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

  const handleFlushButtonPress = (e, type) => {
    e.preventDefault(); // Zapobiega duplikowaniu eventów
    
    // Blokuj menu kontekstowe dla eventów dotykowych
    if (e.pointerType === 'touch') {
      e.target.addEventListener('contextmenu', preventContextMenu, { once: true });
    }
    
    setIsLongPress(false);
    const timer = setTimeout(() => {
      // Long press (3 seconds) - always add 10
      setIsLongPress(true);
      if (type === 'normal') {
        setNormalFlushCounter(prev => prev + 10);
      } else if (type === 'service') {
        setServiceFlushCounter(prev => prev + 10);
      }
    }, 3000);
    setPressTimer(timer);
  };

  const handleFlushButtonRelease = async (e, type) => {
    e.preventDefault(); // Zapobiega duplikowaniu eventów
    
    // Usuń blokadę menu kontekstowego
    if (e.pointerType === 'touch') {
      e.target.removeEventListener('contextmenu', preventContextMenu);
    }
    
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
      
      // Short press - increment counter by 1 (only if not long press)
      if (!isLongPress) {
        if (type === 'normal') {
          setNormalFlushCounter(prev => prev + 1);
        } else if (type === 'service') {
          setServiceFlushCounter(prev => prev + 1);
        }
      }
    }
    setIsLongPress(false);
  };

  const handleFlushButtonCancel = (e) => {
    e.preventDefault();
    
    // Usuń blokadę menu kontekstowego
    if (e.pointerType === 'touch') {
      e.target.removeEventListener('contextmenu', preventContextMenu);
    }
    
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    setIsLongPress(false);
  };

  // Helper function to prevent context menu
  const preventContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
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
        
        // Only set active process, NEVER update counters from server during active flush
        // User's local counter is the source of truth
        setActiveProcess(mappedType);
        
        // Poll more frequently (every 2 seconds) to show real-time progress
        setTimeout(pollFlushProgress, 2000);
      } else {
        console.log('Flush operation completed');
        setFlushProgress({ active: false, type: '', remaining: 0, total: 0 });
        setNormalFlushCounter(0);
        setServiceFlushCounter(0);
        setActiveProcess(null);
        setPendingUpdate({ normal: false, service: false });
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
      setPendingUpdate({ normal: false, service: false });
    }
  };

  // Poll for progress on component mount if there's an active flush
  useEffect(() => {
    pollFlushProgress();
  }, []);

  // Decrement local counter when server completes a cycle
  const prevRemainingRef = React.useRef(null);
  useEffect(() => {
    if (flushProgress.active && flushProgress.remaining !== null) {
      // Only decrement if no pending update to server
      // If remaining decreased, decrement local counter
      if (prevRemainingRef.current !== null && flushProgress.remaining < prevRemainingRef.current) {
        const decrease = prevRemainingRef.current - flushProgress.remaining;
        if (flushProgress.type === 'normal' && !pendingUpdate.normal) {
          setNormalFlushCounter(prev => Math.max(0, prev - decrease));
        } else if (flushProgress.type === 'service' && !pendingUpdate.service) {
          setServiceFlushCounter(prev => Math.max(0, prev - decrease));
        }
      }
      prevRemainingRef.current = flushProgress.remaining;
    } else {
      prevRemainingRef.current = null;
    }
  }, [flushProgress.remaining, flushProgress.active, flushProgress.type, pendingUpdate]);

  // Start flush when counter changes from 0 (with debounce)
  useEffect(() => {
    if (normalFlushCounter > 0) {
      // Clear previous timer
      if (flushStartTimer.current) {
        clearTimeout(flushStartTimer.current);
      }
      // If already active, update the count on server
      if (flushProgress.active && flushProgress.type === 'normal') {
        setPendingUpdate(prev => ({ ...prev, normal: true }));
        flushStartTimer.current = setTimeout(() => {
          updateFlushCount('normal', normalFlushCounter).finally(() => {
            setPendingUpdate(prev => ({ ...prev, normal: false }));
          });
        }, 500);
      }
      // If not active, start new flush after 500ms
      else if (!flushProgress.active) {
        setPendingUpdate(prev => ({ ...prev, normal: true }));
        flushStartTimer.current = setTimeout(() => {
          startFlushOperation('normal', normalFlushCounter).finally(() => {
            setPendingUpdate(prev => ({ ...prev, normal: false }));
          });
        }, 500);
      }
    }
    return () => {
      if (flushStartTimer.current) {
        clearTimeout(flushStartTimer.current);
      }
    };
  }, [normalFlushCounter]);

  useEffect(() => {
    if (serviceFlushCounter > 0) {
      // Clear previous timer
      if (flushStartTimer.current) {
        clearTimeout(flushStartTimer.current);
      }
      // If already active, update the count on server
      if (flushProgress.active && flushProgress.type === 'service') {
        setPendingUpdate(prev => ({ ...prev, service: true }));
        flushStartTimer.current = setTimeout(() => {
          updateFlushCount('serviceFlush', serviceFlushCounter).finally(() => {
            setPendingUpdate(prev => ({ ...prev, service: false }));
          });
        }, 500);
      }
      // If not active, start new flush after 500ms
      else if (!flushProgress.active) {
        setPendingUpdate(prev => ({ ...prev, service: true }));
        flushStartTimer.current = setTimeout(() => {
          startFlushOperation('serviceFlush', serviceFlushCounter).finally(() => {
            setPendingUpdate(prev => ({ ...prev, service: false }));
          });
        }, 500);
      }
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

  const updateFlushCount = async (type, count) => {
    try {
      console.log(`Updating flush count to ${count} for type: ${type}`);
      const response = await api.updateFlushCount(type, count);
      if (response.success) {
        console.log('Flush count updated successfully');
      }
    } catch (error) {
      console.error(`Błąd aktualizacji licznika flush:`, error);
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
              onPointerDown={(e) => handleFlushButtonPress(e, 'normal')}
              onPointerUp={(e) => handleFlushButtonRelease(e, 'normal')}
              onPointerLeave={handleFlushButtonCancel}
              onPointerCancel={handleFlushButtonCancel}
              onContextMenu={preventContextMenu}
              style={{ 
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'manipulation'
              }}
              disabled={activeProcess && activeProcess !== 'normal'}
            >
              <WaterDropIcon className="icon" />
              {t('normalFlush')}
              {normalFlushCounter > 0 && <span className="counter-badge">{normalFlushCounter}</span>}
            </button>
            <button
              className={`btn-service service-flush ${serviceFlushCounter > 0 ? 'has-counter' : ''} ${flushProgress.active && flushProgress.type === 'service' ? 'active' : ''}`}
              onPointerDown={(e) => handleFlushButtonPress(e, 'service')}
              onPointerUp={(e) => handleFlushButtonRelease(e, 'service')}
              onPointerLeave={handleFlushButtonCancel}
              onPointerCancel={handleFlushButtonCancel}
              onContextMenu={preventContextMenu}
              style={{ 
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'manipulation'
              }}
              disabled={activeProcess && activeProcess !== 'service'}
            >
              <BuildIcon className="icon" />
              {t('serviceFlush')}
              {serviceFlushCounter > 0 && <span className="counter-badge">{serviceFlushCounter}</span>}
            </button>
            <button
              className="btn-service freeze-drain-start"
              onPointerDown={(e) => {
                e.preventDefault();
                handleServiceFunction('FreezeDrainG', t('freezeDrainStart'));
              }}
              onContextMenu={preventContextMenu}
              disabled={activeProcess !== null}
            >
              <AcUnitIcon className="icon" />
              {t('freezeDrainStart')}
            </button>
            <button
              className={`btn-service universal-stop ${activeProcess ? 'active' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                handleUniversalStop();
              }}
              onContextMenu={preventContextMenu}
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
                  onPointerDown={(e) => handleToggleOutput(e, led.id, led.on)}
                  onContextMenu={(e) => e.preventDefault()}
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
