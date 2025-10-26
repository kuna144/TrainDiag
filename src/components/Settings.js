import React, { useState } from 'react';
import api from '../utils/api';
import config from '../config.json';

function Settings({ onSettingsSaved, language = 'pl', t = (key) => key }) {
  const [settings, setSettings] = useState(api.loadSettings());
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = () => {
    api.saveSettings(settings);
    setTestResult({ success: true, message: 'Ustawienia zapisane!' });
    if (onSettingsSaved) onSettingsSaved();
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    // Tymczasowo zapisz ustawienia do testowania
    const oldSettings = api.settings;
    api.settings = settings;
    
    const result = await api.testConnection();
    setTestResult(result);
    
    // Przywróć stare ustawienia jeśli test się nie powiódł
    if (!result.success) {
      api.settings = oldSettings;
    }
    
    setIsTesting(false);
  };

  const handleReset = () => {
    setSettings(config.defaultSettings);
    setTestResult(null);
  };

  return (
    <div className="settings-container">
      <h2>{t('connectionSettings')}</h2>
      
      <div className="form-group">
        <label>{t('ipAddress')}:</label>
        <input
          type="text"
          value={settings.ipAddress}
          onChange={(e) => handleChange('ipAddress', e.target.value)}
          placeholder="192.168.0.100"
          className="touch-input"
        />
      </div>

      <div className="form-group">
        <label>{t('username')}:</label>
        <input
          type="text"
          value={settings.username}
          onChange={(e) => handleChange('username', e.target.value)}
          placeholder="guest"
          className="touch-input"
        />
      </div>

      <div className="form-group">
        <label>{t('password')}:</label>
        <input
          type="password"
          value={settings.password}
          onChange={(e) => handleChange('password', e.target.value)}
          placeholder="guest"
          className="touch-input"
        />
      </div>

      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
          {testResult.message}
        </div>
      )}

      <div className="button-group">
        <button 
          className="btn btn-primary" 
          onClick={handleTest}
          disabled={isTesting}
        >
          {isTesting ? t('testing') : t('testConnection')}
        </button>
        <button className="btn btn-success" onClick={handleSave}>
          {t('save')}
        </button>
        <button className="btn btn-secondary" onClick={handleReset}>
          {t('reset')}
        </button>
      </div>

      <div className="info-section">
        <h3>{t('connectionSettings')}</h3>
        <p>{t('defaultIp')}: {config.defaultSettings.ipAddress}</p>
        <p>{t('deviceType')}: {config.defaultSettings.deviceType}</p>
        <p>{t('firmwareVersion')}: {config.defaultSettings.firmwareVersion}</p>
        <p>{t('refreshInterval')}: {config.refreshInterval}ms</p>
        <p>{t('timeout')}: {config.timeout}ms</p>
      </div>
    </div>
  );
}

export default Settings;
