import config from '../config.json';

class ControllerAPI {
  constructor() {
    this.settings = this.loadSettings();
  }

  loadSettings() {
    const saved = localStorage.getItem('controllerSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return config.defaultSettings;
  }

  saveSettings(settings) {
    localStorage.setItem('controllerSettings', JSON.stringify(settings));
    this.settings = settings;
  }

  getAuthHeader() {
    const { username, password } = this.settings;
    const encoded = btoa(`${username}:${password}`);
    return `Basic ${encoded}`;
  }

  getBaseUrl() {
    return `http://${this.settings.ipAddress}`;
  }

  async fetchWithAuth(endpoint, options = {}) {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers = {
      'Authorization': this.getAuthHeader(),
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        timeout: config.timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Pobierz liczniki błędów
  async getErrorCounters() {
    const response = await this.fetchWithAuth(config.endpoints.errorCounter);
    const text = await response.text();
    return this.parseXML(text);
  }

  // Pobierz szczegóły licznika błędów
  async getErrorCounterDetail(counterId) {
    const endpoint = config.endpoints.errorCounterDetail.replace('{id}', counterId);
    const response = await this.fetchWithAuth(endpoint);
    const text = await response.text();
    return text;
  }

  // Pobierz stan wyjść
  async getOutputs() {
    const response = await this.fetchWithAuth(config.endpoints.outputs);
    const text = await response.text();
    return this.parseOutputsXML(text);
  }

  // Sterowanie manualne
  async setOutput(outputId, state) {
    const body = new URLSearchParams({
      pg: 'led',
      [outputId]: state ? 'on' : 'off'
    });

    const response = await this.fetchWithAuth(config.endpoints.manualControl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    return response.ok;
  }

  // Parsowanie XML z odpowiedzi
  parseXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    return xmlDoc;
  }

  // Parsowanie XML z wyjściami
  parseOutputsXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    const result = {
      analog: [],
      buttons: [],
      leds: []
    };

    // Parsuj wartości analogowe
    const texts = xmlDoc.getElementsByTagName('text');
    for (let text of texts) {
      const id = text.getElementsByTagName('id')[0]?.textContent;
      const value = text.getElementsByTagName('value')[0]?.textContent.trim();
      if (id && value) {
        result.analog.push({ id, value: parseInt(value) });
      }
    }

    // Parsuj checkboxy (przyciski i LED-y)
    const checkboxes = xmlDoc.getElementsByTagName('checkbox');
    for (let checkbox of checkboxes) {
      const id = checkbox.getElementsByTagName('id')[0]?.textContent;
      const on = checkbox.getElementsByTagName('on')[0]?.textContent === 'true';
      const marked = checkbox.getElementsByTagName('marked')[0]?.textContent === 'true';
      
      if (id) {
        if (id.startsWith('button')) {
          result.buttons.push({ id, on, marked });
        } else if (id.startsWith('led')) {
          result.leds.push({ id, on, marked });
        }
      }
    }

    return result;
  }

  // Parsowanie XML z czujnikami
  parseSensorXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    const result = {
      analog: [],
      digital: []
    };

    // Parsuj wartości analogowe z opisami
    const texts = xmlDoc.getElementsByTagName('text');
    for (let text of texts) {
      const id = text.getElementsByTagName('id')[0]?.textContent;
      const value = text.getElementsByTagName('value')[0]?.textContent.trim();
      const unit = text.getElementsByTagName('unit')[0]?.textContent || '';
      
      if (id && value) {
        const description = config.supportedSensors[id] || `Czujnik ${id}`;
        result.analog.push({ 
          id, 
          value: parseFloat(value), 
          unit,
          description 
        });
      }
    }

    // Parsuj wartości cyfrowe
    const checkboxes = xmlDoc.getElementsByTagName('checkbox');
    for (let checkbox of checkboxes) {
      const id = checkbox.getElementsByTagName('id')[0]?.textContent;
      const on = checkbox.getElementsByTagName('on')[0]?.textContent === 'true';
      
      if (id) {
        let description = '';
        if (id.startsWith('button')) {
          description = config.supportedInputs[id] || `Przycisk ${id}`;
        } else if (id.startsWith('led')) {
          description = config.supportedOutputs[id] || `LED ${id}`;
        }
        
        result.digital.push({ id, on, description });
      }
    }

    return result;
  }

  // Test połączenia
  async testConnection() {
    try {
      await this.getOutputs();
      return { success: true, message: 'Połączenie OK' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export default new ControllerAPI();
