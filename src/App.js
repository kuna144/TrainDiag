import React, { useState, useEffect } from 'react';
import './App.css';
import Settings from './components/Settings';
import ManualControl from './components/ManualControl';
import InputsTab from './components/InputsTab';
import ErrorList from './components/ErrorList';
import api from './utils/api';
import config from './config.json';

// Material UI Icons
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorIcon from '@mui/icons-material/Error';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PublicIcon from '@mui/icons-material/Public';
import BuildIcon from '@mui/icons-material/Build';
import InputIcon from '@mui/icons-material/Input';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

function App() {
  const [activeTab, setActiveTab] = useState('manual');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [isConnecting, setIsConnecting] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'auto';
  });
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'pl';
  });
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [globalAutoRefresh, setGlobalAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('globalAutoRefresh');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    console.log('=== useEffect - URUCHAMIANIE APLIKACJI ===');
    // Apply theme
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('globalAutoRefresh', JSON.stringify(globalAutoRefresh));
  }, [globalAutoRefresh]);

  useEffect(() => {
    console.log('=== useEffect - REJESTRACJA SW I TEST POŁĄCZENIA ===');
    // Rejestracja Service Workera
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker zarejestrowany:', reg))
        .catch(err => console.log('Service Worker error:', err));
    }

    // Test połączenia przy starcie
    console.log('Wywoływanie checkConnection przy starcie...');
    setTimeout(() => {
      checkConnection();
    }, 100);
  }, []);

  const checkConnection = async () => {
    console.log('=== ROZPOCZĘCIE checkConnection ===');
    setIsConnecting(true);
    console.log('Testowanie połączenia...');
    const result = await api.testConnection();
    console.log('Wynik testowania połączenia:', result);
    setConnectionStatus(result.success ? 'connected' : 'disconnected');
    console.log('Ustawiono status połączenia na:', result.success ? 'connected' : 'disconnected');
    
    // Pobierz wersję tylko jeśli połączenie jest udane
    if (result.success) {
      try {
        console.log('Połączenie udane, pobieranie wersji...');
        const version = await api.getVersion();
        console.log('Pobrana wersja:', version);
        setVersionInfo(version);
        console.log('Ustawiono versionInfo na:', version);
      } catch (error) {
        console.error('Nie udało się pobrać wersji:', error);
        setVersionInfo(null);
      }
    } else {
      console.log('Połączenie nieudane, nie pobieramy wersji');
      setVersionInfo(null);
    }
    
    setIsConnecting(false);
    console.log('=== KONIEC checkConnection ===');
  };

  const handleSettingsSaved = () => {
    checkConnection();
    setSettingsOpen(false);
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('auto');
    else setTheme('light');
  };

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    setLanguageDropdownOpen(false);
  };

  const getCurrentLanguageFlag = () => {
    return language === 'pl' ? '🇵🇱' : '🇬🇧';
  };

  const t = (key) => {
    try {
      const langData = config.languages[language];
      if (!langData) {
        console.warn(`Language '${language}' not found in config, falling back to 'pl'`);
        return config.languages['pl'][key] || key;
      }
      return langData[key] || key;
    } catch (error) {
      console.error('Translation error:', error);
      return key;
    }
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <LightModeIcon sx={{ fontSize: 24 }} />;
    if (theme === 'dark') return <DarkModeIcon sx={{ fontSize: 24 }} />;
    return <SettingsBrightnessIcon sx={{ fontSize: 24 }} />;
  };

  const getThemeLabel = () => {
    if (theme === 'light') return t('lightMode');
    if (theme === 'dark') return t('darkMode');
    return t('autoMode');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'manual':
        return <ManualControl language={language} t={t} globalAutoRefresh={globalAutoRefresh} />;
      case 'inputs':
        return <InputsTab language={language} t={t} globalAutoRefresh={globalAutoRefresh} />;
      case 'errors':
        return <ErrorList language={language} t={t} globalAutoRefresh={globalAutoRefresh} />;
      default:
        return <ManualControl language={language} t={t} globalAutoRefresh={globalAutoRefresh} />;
    }
  };

  const getStatusColor = () => {
    if (isConnecting) return '#ffb300';
    return connectionStatus === 'connected' ? '#43a047' : '#e53935';
  };

  // Fullscreen helpers
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement || window.matchMedia('(display-mode: fullscreen)').matches);

  const updateFullscreenState = () => {
    const fs = !!document.fullscreenElement || window.matchMedia('(display-mode: fullscreen)').matches;
    setIsFullscreen(fs);
  };

  useEffect(() => {
    const handler = () => updateFullscreenState();
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    // Auto enter fullscreen if URL has ?fullscreen=1 or local preference
    const params = new URLSearchParams(window.location.search);
    const autoFs = params.get('fullscreen') === '1' || localStorage.getItem('prefFullscreen') === 'true';
    if (autoFs && !isFullscreen) {
      requestFullscreen();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      localStorage.setItem('prefFullscreen', 'true');
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      localStorage.setItem('prefFullscreen', 'false');
    } catch (e) {
      console.warn('Exit fullscreen failed:', e);
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) exitFullscreen(); else requestFullscreen();
  };

  return (
    <div className="app">
      {/* Side Drawer for Settings */}
      <div className={`side-drawer ${settingsOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2><SettingsIcon sx={{ fontSize: 24, marginRight: 1 }} /> {t('connectionSettings')}</h2>
          <button className="close-drawer" onClick={() => setSettingsOpen(false)}>
            <CloseIcon sx={{ fontSize: 24 }} />
          </button>
        </div>
        <div className="drawer-content">
          <div className="theme-toggle" onClick={toggleTheme}>
            {getThemeIcon()}
            <span>{getThemeLabel()}</span>
          </div>
          <div className="language-selector">
            <PublicIcon sx={{ fontSize: 20 }} />
            <div className="custom-dropdown">
              <button 
                className="dropdown-trigger"
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              >
                <span className="flag">{getCurrentLanguageFlag()}</span>
                <span className="arrow">{languageDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {languageDropdownOpen && (
                <div className="dropdown-menu">
                  <button 
                    className={`dropdown-item ${language === 'pl' ? 'active' : ''}`}
                    onClick={() => changeLanguage('pl')}
                  >
                    <span className="flag">🇵🇱</span>
                    <span className="label">{t('polish')}</span>
                  </button>
                  <button 
                    className={`dropdown-item ${language === 'en' ? 'active' : ''}`}
                    onClick={() => changeLanguage('en')}
                  >
                    <span className="flag">🇬🇧</span>
                    <span className="label">{t('english')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <Settings onSettingsSaved={handleSettingsSaved} language={language} t={t} />
        </div>
      </div>

      {/* Overlay */}
      {settingsOpen && (
        <div className="drawer-overlay" onClick={() => setSettingsOpen(false)} />
      )}

      <header className="app-header">
        <button className="hamburger-btn" onClick={() => setSettingsOpen(true)}>
          <MenuIcon sx={{ fontSize: 24 }} />
        </button>
        <h1>
          <EngineeringIcon sx={{ fontSize: 32, marginRight: 1 }} />
          {t('appTitle')}
        </h1>
        <div className="connection-status">
          {versionInfo && (
            <div className="version-info">
              <div className="version-line">{versionInfo.unicVersion}</div>
              <div className="version-line">{versionInfo.systemVersion}</div>
            </div>
          )}
          {connectionStatus === 'connected' ? (
            <WifiIcon sx={{ fontSize: 20, color: getStatusColor() }} />
          ) : (
            <WifiOffIcon sx={{ fontSize: 20, color: getStatusColor() }} />
          )}
          <button 
            className={`auto-refresh-btn ${globalAutoRefresh ? 'active' : ''}`} 
            onClick={() => setGlobalAutoRefresh(!globalAutoRefresh)}
            title={globalAutoRefresh ? t('disableAutoRefresh') : t('enableAutoRefresh')}
          >
            <AutorenewIcon sx={{ fontSize: 20 }} />
          </button>
          <button
            className={`fullscreen-btn ${isFullscreen ? 'active' : ''}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
          >
            {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 20 }} /> : <FullscreenIcon sx={{ fontSize: 20 }} />}
          </button>
          <button className="refresh-btn" onClick={() => { 
            console.log('KLIKNIĘTO PRZYCISK REFRESH!');
            checkConnection();
          }} disabled={isConnecting}>
            <RefreshIcon sx={{ fontSize: 20 }} />
          </button>
        </div>
      </header>

      <nav className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          <BuildIcon sx={{ fontSize: 20, marginRight: 1 }} />
          {t('manualControl')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'inputs' ? 'active' : ''}`}
          onClick={() => setActiveTab('inputs')}
        >
          <InputIcon sx={{ fontSize: 20, marginRight: 1 }} />
          {t('inputsTab')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'errors' ? 'active' : ''}`}
          onClick={() => setActiveTab('errors')}
        >
          <ErrorIcon sx={{ fontSize: 20, marginRight: 1 }} />
          {t('errorList')}
        </button>
      </nav>

      <main className="app-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
