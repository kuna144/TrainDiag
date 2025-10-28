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
        clearTimeout(timeoutId);
        const errorText = await response.text();
        console.error(`API Error Response: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API Error:', error);
      throw error;
    } finally {
      // NIE czyścimy timeoutu tutaj - zostanie wyczyszczony po pobraniu body
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
        if (id.startsWith('button') && config.supportedInputs[id]) {
          result.buttons.push({ id, on, marked });
        } else if (id.startsWith('led') && config.supportedOutputs[id]) {
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
