import React, { useState } from 'react';
import ManualControl from './ManualControl';
import InputsTab from './InputsTab';
import config from '../config.json';

function ControlPanel({ language = 'pl' }) {
  const [activeTab, setActiveTab] = useState('manual');
  
  const t = (key) => {
    try {
      return config.languages[language][key] || key;
    } catch (error) {
      return key;
    }
  };

  return (
    <div className="control-panel-wrapper">
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          {t('manualControl')}
        </button>
        <button 
          className={`tab-button ${activeTab === 'inputs' ? 'active' : ''}`}
          onClick={() => setActiveTab('inputs')}
        >
          {t('inputsTab')}
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'manual' && <ManualControl language={language} t={t} />}
        {activeTab === 'inputs' && <InputsTab language={language} t={t} />}
      </div>
    </div>
  );
}

export default ControlPanel;