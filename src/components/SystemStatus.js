import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import config from '../config.json';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

function SystemStatus({ language = 'pl', t = (key) => key }) {
  const [systemStatus, setSystemStatus] = useState(null);
  const [maintenanceInfo, setMaintenanceInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchSystemStatus = async () => {
    setLoading(true);
    try {
      const [statusData, maintenanceData] = await Promise.all([
        api.getSystemStatus(),
        api.getMaintenanceInfo()
      ]);
      
      setSystemStatus(parseSystemStatus(statusData));
      setMaintenanceInfo(parseMaintenanceInfo(maintenanceData));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Błąd pobierania statusu systemu:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseSystemStatus = (xmlDoc) => {
    const status = {
      overall: 'unknown',
      components: []
    };

    // Parsuj ogólny status systemu
    const overallStatus = xmlDoc.getElementsByTagName('overall')[0]?.textContent;
    status.overall = overallStatus || 'unknown';

    // Parsuj status komponentów
    const components = xmlDoc.getElementsByTagName('component');
    for (let comp of components) {
      const name = comp.getElementsByTagName('name')[0]?.textContent;
      const state = comp.getElementsByTagName('state')[0]?.textContent;
      const message = comp.getElementsByTagName('message')[0]?.textContent;

      if (name) {
        status.components.push({
          name,
          state: state || 'unknown',
          message: message || ''
        });
      }
    }

    return status;
  };

  const parseMaintenanceInfo = (xmlDoc) => {
    const maintenance = {
      lastService: null,
      nextService: null,
      alerts: []
    };

    const lastService = xmlDoc.getElementsByTagName('lastService')[0]?.textContent;
    const nextService = xmlDoc.getElementsByTagName('nextService')[0]?.textContent;

    if (lastService) maintenance.lastService = new Date(lastService);
    if (nextService) maintenance.nextService = new Date(nextService);

    // Parsuj alerty konserwacyjne
    const alerts = xmlDoc.getElementsByTagName('alert');
    for (let alert of alerts) {
      const type = alert.getElementsByTagName('type')[0]?.textContent;
      const description = alert.getElementsByTagName('description')[0]?.textContent;

      if (type && description) {
        maintenance.alerts.push({ type, description });
      }
    }

    return maintenance;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok':
      case 'good':
        return <CheckCircleIcon sx={{ color: '#43a047' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#ffb300' }} />;
      case 'error':
      case 'critical':
        return <ErrorIcon sx={{ color: '#e53935' }} />;
      default:
        return <WarningIcon sx={{ color: '#757575' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
      case 'good':
        return '#43a047';
      case 'warning':
        return '#ffb300';
      case 'error':
      case 'critical':
        return '#e53935';
      default:
        return '#757575';
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  return (
    <div className="system-status-container">
      <div className="control-header">
        <h2>{t('systemStatus')}</h2>
        <div className="control-actions">
          <button className="btn btn-refresh" onClick={fetchSystemStatus} disabled={loading}>
            <RefreshIcon className="icon" /> {t('refresh')}
          </button>
        </div>
      </div>

      {lastUpdate && (
        <div className="last-update">
          {t('lastUpdate')}: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {systemStatus && (
        <div className="status-overview">
          <div className="status-card overall">
            <h3>{t('overallSystemStatus')}</h3>
            <div className="status-indicator" style={{ color: getStatusColor(systemStatus.overall) }}>
              {getStatusIcon(systemStatus.overall)}
              <span>{systemStatus.overall.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

      {systemStatus && systemStatus.components.length > 0 && (
        <div className="components-section">
          <h3>{t('componentStatus')}</h3>
          <div className="components-grid">
            {systemStatus.components.map((component, index) => (
              <div key={index} className="component-card">
                <div className="component-header">
                  <span className="component-name">{component.name}</span>
                  <div className="component-status" style={{ color: getStatusColor(component.state) }}>
                    {getStatusIcon(component.state)}
                  </div>
                </div>
                {component.message && (
                  <div className="component-message">{component.message}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {maintenanceInfo && (
        <div className="maintenance-section">
          <h3>{t('maintenanceInfo')}</h3>
          
          <div className="maintenance-info">
            {maintenanceInfo.lastService && (
              <p>{t('lastMaintenance')}: {maintenanceInfo.lastService.toLocaleDateString()}</p>
            )}
            {maintenanceInfo.nextService && (
              <p>{t('nextMaintenance')}: {maintenanceInfo.nextService.toLocaleDateString()}</p>
            )}
          </div>

          {maintenanceInfo.alerts.length > 0 && (
            <div className="maintenance-alerts">
              <h4>{t('maintenanceAlerts')}</h4>
              {maintenanceInfo.alerts.map((alert, index) => (
                <div key={index} className={`alert ${alert.type}`}>
                  <WarningIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
                  {alert.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!systemStatus && !loading && (
        <div className="no-data">
          {t('noSystemStatusData')}
        </div>
      )}
    </div>
  );
}

export default SystemStatus;