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

  // Get translation based on current language
  getTranslation(key, section = '') {
    const language = localStorage.getItem('language') || 'pl';
    
    if (section) {
      // For outputs, inputs, sensors etc.
      const translations = config.languages[language]?.[section];
      if (translations && translations[key]) {
        return translations[key];
      }
      // Fallback to global config
      const globalSection = section === 'outputs' ? 'supportedOutputs' : 
                           section === 'inputs' ? 'supportedInputs' :
                           section === 'sensors' ? 'supportedSensors' : null;
      if (globalSection && config[globalSection] && config[globalSection][key]) {
        return config[globalSection][key];
      }
    } else {
      // For regular translations
      const translations = config.languages[language];
      if (translations && translations[key]) {
        return translations[key];
      }
    }
    
    return key; // Return key as fallback
  }

  saveSettings(settings) {
    localStorage.setItem('controllerSettings', JSON.stringify(settings));
    this.settings = settings;
  }

  async updateControllerIp(ip) {
    // Persist locally
    this.settings.controllerIp = ip;
    localStorage.setItem('controllerSettings', JSON.stringify(this.settings));
    // Try server endpoint (integrated server variant)
    try {
      const response = await fetch('/setControllerIp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controllerIp: ip })
      });
      if (!response.ok) {
        console.warn('Controller IP update endpoint responded with status', response.status);
      } else {
        const data = await response.json();
        console.log('Controller IP updated on server:', data);
      }
    } catch (e) {
      console.warn('Controller IP update failed (likely using standalone proxy.js):', e.message);
    }
  }

  getAuthHeader() {
    const { username, password } = this.settings;
    const encoded = btoa(`${username}:${password}`);
    return `Basic ${encoded}`;
  }

  getBaseUrl() {
    // ipAddress used previously for proxy address; derive automatically
    // If running integrated server, base = current origin; else fallback to stored ipAddress
    if (window.location.port === '3000') {
      return `${window.location.origin}/api`;
    }
    return `http://${this.settings.ipAddress || 'localhost:3000/api'}`;
  }

  getProxyUrl() {
    // Always use proxy server for flush operations
    return 'http://localhost:3001/api';
  }

  // Test proxy connectivity
  async testProxyConnection() {
    try {
      const response = await fetch('http://localhost:3001/api/health');
      if (response.ok) {
        const data = await response.json();
        console.log('Proxy connection test successful:', data);
        return true;
      } else {
        console.error('Proxy connection test failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Proxy connection test error:', error);
      return false;
    }
  }

  // async fetchWithProxy(endpoint, options = {}, customTimeout = config.timeout) {
  //   const url = `${this.getProxyUrl()}${endpoint}`;
  //   const headers = {
  //     'Authorization': this.getAuthHeader(),
  //     ...options.headers
  //   };

  //   const controller = new AbortController();
  //   const timeoutId = setTimeout(() => controller.abort(), customTimeout);

  //   try {
  //     const response = await fetch(url, {
  //       ...options,
  //       headers,
  //       signal: controller.signal
  //     });

  //     clearTimeout(timeoutId);

  //     if (!response.ok && response.status !== 304) {
  //       const errorText = await response.text().catch(() => '');
  //       console.error('API Error Response:', errorText || `HTTP ${response.status}`);
  //       throw new Error(`HTTP Error: ${response.status}`);
  //     }

  //     return response;
  //   } catch (error) {
  //     clearTimeout(timeoutId);
  //     console.error('API Error:', error);
  //     throw error;
  //   }
  // }

  async fetchWithAuth(endpoint, options = {}, customTimeout = config.timeout) {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers = {
      'Authorization': this.getAuthHeader(),
      ...options.headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), customTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      console.log(`API Request: ${options.method || 'GET'} ${url} -> ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error Response: ${errorText}`);
        clearTimeout(timeoutId);
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API Error:', error);
      throw error;
    }
  }

  // Pobierz liczniki błędów
  async getErrorCounters() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const url = `${this.getBaseUrl()}${config.endpoints.errorCounter}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': this.getAuthHeader()
        },
        signal: controller.signal
      });
      
      console.log(`API Request: GET ${url} -> ${response.status}`);
      const text = await response.text();
      clearTimeout(timeoutId);
      
      return this.parseErrorCountersXML(text);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Błąd pobierania liczników błędów:', error);
      throw error;
    }
  }

  // Parsowanie XML liczników błędów
  parseErrorCountersXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    const counters = [];
    const texts = xmlDoc.getElementsByTagName('text');
    
    // Grupuj liczniki i ich wartości absolutne
    const counterData = {};
    for (let text of texts) {
      const id = text.getElementsByTagName('id')[0]?.textContent;
      const value = text.getElementsByTagName('value')[0]?.textContent;
      
      if (id && value) {
        if (id.startsWith('counter') && !id.includes('absCounter')) {
          const counterNum = id.replace('counter', '');
          if (!counterData[counterNum]) {
            counterData[counterNum] = {};
          }
          counterData[counterNum].id = id;
          counterData[counterNum].value = parseInt(value);
          counterData[counterNum].name = config.errorCounters[id] || `Counter ${counterNum}`;
        } else if (id.startsWith('absCounter')) {
          const counterNum = id.replace('absCounter', '');
          if (!counterData[counterNum]) {
            counterData[counterNum] = {};
          }
          counterData[counterNum].absValue = parseInt(value);
        }
      }
    }
    
    // Konwertuj do tablicy
    for (let num in counterData) {
      if (counterData[num].id) {
        counters.push({
          id: counterData[num].id,
          name: counterData[num].name,
          value: counterData[num].value || 0,
          absValue: counterData[num].absValue === 4294967295 ? -1 : counterData[num].absValue
        });
      }
    }
    
    return counters;
  }

  // Pobierz szczegóły licznika błędów
  async getErrorCounterDetail(counterId) {
    try {
      const endpoint = config.endpoints.errorCounterDetail.replace('{id}', counterId);
      const response = await this.fetchWithAuth(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const text = await response.text();
      return text;
    } catch (error) {
      console.error('Błąd pobierania szczegółów błędu:', error);
      throw error;
    }
  }

  // Pobierz dane czujników (alias dla getOutputs z parsowaniem czujników)
  async getSensorData() {
    try {
      const response = await this.fetchWithAuth(config.endpoints.outputs);
      const text = await response.text();
      
      if (response.status === 204) {
        // No Content - zwróć domyślne wartości
        return {
          analog: [
            { id: 'ad4', value: 0, unit: 'mBar', description: this.getTranslation('ad4', 'sensors') || 'Pressure sensor' },
            { id: 'ad5', value: 0, unit: 'mA', description: this.getTranslation('ad5', 'sensors') || 'nc(not connect)' }
          ],
          digital: [
            ...Array.from({length: 12}, (_, i) => ({ 
              id: `button${i}`, 
              on: false, 
              description: config.supportedInputs[`button${i}`] || `Input ${i+1}` 
            })),
            ...Array.from({length: 12}, (_, i) => ({ 
              id: `led${i}`, 
              on: false, 
              description: this.getTranslation(`led${i}`, 'outputs') || `Output ${i+1}` 
            }))
          ]
        };
      }
      
      return this.parseSensorXML(text);
    } catch (error) {
      console.error('Błąd pobierania danych czujników:', error);
      throw error;
    }
  }

  // Pobierz stan wyjść
  async getOutputs() {
    try {
      const response = await this.fetchWithAuth(config.endpoints.outputs);
      const text = await response.text();
      
      if (response.status === 204) {
        // No Content - zwróć domyślne wartości
        return {
          analog: [
            { id: 'ad4', value: 0 },
            { id: 'ad5', value: 0 }
          ],
          buttons: Array.from({length: 12}, (_, i) => ({ id: `button${i}`, on: false, marked: false })),
          leds: Array.from({length: 12}, (_, i) => ({ id: `led${i}`, on: false, marked: false }))
        };
      }
      
      return this.parseOutputsXML(text);
    } catch (error) {
      console.error('Błąd pobierania wyjść:', error);
      throw error;
    }
  }

  // Sterowanie manualne
  async setOutput(outputId, state) {
    try {
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

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return response.ok;
    } catch (error) {
      console.error('Błąd sterowania wyjściem:', error);
      throw error;
    }
  }

  // Sterowanie wieloma wyjściami jednocześnie
  async setMultipleOutputs(outputs) {
    try {
      const body = new URLSearchParams({
        pg: 'led',
        ...outputs
      });

      const response = await this.fetchWithAuth(config.endpoints.manualControl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return response.ok;
    } catch (error) {
      console.error('Błąd sterowania wieloma wyjściami:', error);
      throw error;
    }
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
        console.log('Analog sensor:', id, value);
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
        console.log('Checkbox:', id, on, marked);
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
      
      if (id && value && (config.supportedSensors[id] || this.getTranslation(id, 'sensors'))) {
        const description = this.getTranslation(id, 'sensors') || config.supportedSensors[id];
        // Wyciągnij jednostkę z opisu
        const unitMatch = description.match(/\[([^\]]+)\]/);
        const unit = unitMatch ? unitMatch[1] : '';
        const cleanDescription = description.replace(/\s*\[.*?\]/, '');
        
        result.analog.push({ 
          id, 
          value: parseFloat(value), 
          unit,
          description: cleanDescription
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
          description = this.getTranslation(id, 'inputs');
        } else if (id.startsWith('led')) {
          description = this.getTranslation(id, 'outputs');
        }
        
        if (description && description !== id) {
          result.digital.push({ id, on, description });
        }
      }
    }

    return result;
  }

  // Pobierz wersję oprogramowania
  async getVersion() {
    try {
      console.log('Pobieranie wersji z endpointu:', config.endpoints.version);
      const response = await this.fetchWithAuth(config.endpoints.version);
      const text = await response.text();
      console.log('Odpowiedź XML wersji:', text);
      const parsed = this.parseVersionXML(text);
      console.log('Sparsowana wersja:', parsed);
      return parsed;
    } catch (error) {
      console.error('Błąd pobierania wersji:', error);
      throw error;
    }
  }

  // Parsowanie XML z wersją
  parseVersionXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    const result = {
      unicVersion: '',
      systemVersion: ''
    };

    const texts = xmlDoc.getElementsByTagName('text');
    for (let text of texts) {
      const id = text.getElementsByTagName('id')[0]?.textContent;
      const value = text.getElementsByTagName('value')[0]?.textContent;
      
      if (id === 'versionUNIC' && value) {
        // Wyciągnij wersję z formatu 'UNIC Version: "V1.1.0_Beta_10"'
        const match = value.match(/"([^"]+)"/); 
        result.unicVersion = match ? match[1] : value;
      } else if (id === 'versionCustomer' && value) {
        // Wyciągnij wersję z formatu 'System Version: "SVT V2.0"'
        const match = value.match(/"([^"]+)"/); 
        result.systemVersion = match ? match[1] : value;
      }
    }

    return result;
  }

  // Test połączenia
  async testConnection() {
    try {
      console.log('Testowanie połączenia przez getSensorData...');
      await this.getSensorData();
      console.log('Test połączenia: SUKCES');
      return { success: true, message: 'Połączenie OK' };
    } catch (error) {
      console.log('Test połączenia: BŁĄD', error.message);
      return { success: false, message: error.message };
    }
  }

  // Ustaw wartość licznika błędów
  async setErrorCounter(counterId, value) {
    try {
      const counterNum = counterId.replace('counter', '');
      const endpoint = config.endpoints.errorCounterSet
        .replace('{id}', counterNum)
        .replace('{value}', value);
      
      const response = await this.fetchWithAuth(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      return true;
    } catch (error) {
      console.error('Błąd ustawiania licznika:', error);
      throw error;
    }
  }

  // Resetuj licznik błędów
  async resetErrorCounter(counterId) {
    try {
      const counterNum = counterId.replace('counter', '');
      const endpoint = config.endpoints.errorCounterSet
        .replace('{id}', counterNum)
        .replace('{value}', '0');
      
      const response = await this.fetchWithAuth(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      return true;
    } catch (error) {
      console.error('Błąd resetowania licznika:', error);
      throw error;
    }
  }

  // Wywołaj funkcję serwisową
  async callServiceFunction(service) {
    try {
      const endpoint = config.endpoints.serviceFunctions.replace('{service}', service);
      const response = await this.fetchWithAuth(endpoint, { method: 'GET' });
      
      console.log(`Service Function Request: GET ${endpoint} (via proxy) -> ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error(`Błąd wywołania funkcji serwisowej ${service}:`, error);
      return false;
    }
  }

  // Start 10x flush operation
  async startFlushX10(type, count = 10) {
    try {
      //const service = `${type}-x10`;
      //const endpoint = config.endpoints.serviceFunctions.replace('{service}', service);

      const endpoint = `/flush-x10/${type}`;
      const response = await this.fetchWithAuth(endpoint, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Started ${type} flush with ${count} cycles:`, data);
      return data;
    } catch (error) {
      console.error(`Błąd uruchomienia ${type} flush:`, error);
      throw error;
    }
  }

  // Get flush operation progress
  async getFlushProgress() {
    try {
      const endpoint = '/flush-progress';
      const response = await this.fetchWithAuth(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Błąd pobierania statusu flush:', error);
      throw error;
    }
  }

  // Stop flush operation
  // Stop flush operation
  async stopFlushX10() {
    try {
      const endpoint = '/flush-stop';
      const response = await this.fetchWithAuth(endpoint, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Stopped flush x10:', data);
      return data;
    } catch (error) {
      console.error('Błąd zatrzymywania flush x10:', error);
      throw error;
    }
  }

  // Update flush count during active operation
  async updateFlushCount(type, count) {
    try {
      const endpoint = `/flush-update/${type}`;
      const response = await this.fetchWithAuth(endpoint, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Updated flush count:', data);
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji licznika flush:', error);
      throw error;
    }
  }
}

export default new ControllerAPI();
