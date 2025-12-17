const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();

// Better CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Czytaj config.json
const configPath = path.join(__dirname, 'src', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const CONTROLLER_URL = `http://${config.defaultSettings.controllerIp}`;

// State for tracking flush operations
let flushState = {
  active: false,
  type: '',
  remaining: 0,
  total: 0,
  intervalId: null
};

// Internal function to proxy requests (same logic as main proxy)
async function proxyRequest(endpoint) {
  const url = `${CONTROLLER_URL}${endpoint}`;
  console.log(`Internal proxy: GET ${endpoint} -> ${url}`);
  
  try {
    const response = await axios(url, {
      method: 'GET',
      timeout: 35000
    });
    console.log(`Internal proxy response: ${response.status}`);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    console.error('Internal proxy error:', error.message);
    return { success: false, error: error.message };
  }
}

// Function to execute a single flush cycle
async function executeFlushCycle(type) {
  try {
    const service = type === 'normal' ? 'normalFlush' : 'serviceFlush';
    const endpoint = config.endpoints.serviceFunctions.replace('{service}', service);
    
    console.log(`Executing flush cycle: ${type} service=${service}`);
    const result = await proxyRequest(endpoint);
    
    if (result.success && result.status === 200) {
      console.log(`Flush cycle ${type} executed successfully`);
      return true;
    } else {
      console.error(`Flush cycle ${type} failed:`, result.error || `Status ${result.status}`);
      return false;
    }
  } catch (error) {
    console.error('Error executing flush cycle:', error.message);
    return false;
  }
}

// Function to start 10x flush operation
async function startFlushX10(type) {
  if (flushState.active) {
    throw new Error('Flush operation already in progress');
  }

  const service = type === 'normal-x10' ? 'normalFlush' : 'serviceFlush'; // TODO

  flushState = {
    active: true,
    type: service,
    remaining: 10,
    total: 10,
    intervalId: null
  };

  console.log(`Starting ${type} flush x10 operation`);

  // Start the sequential execution
  const executeNext = async () => {
    if (flushState.remaining > 0 && flushState.active) {
      const currentCycle = flushState.total - flushState.remaining + 1;
      console.log(`Executing cycle ${currentCycle}/${flushState.total} for ${flushState.type} flush`);
      
      try {
        const success = await executeFlushCycle(flushState.type);
        if (success) {
          console.log(`Cycle ${currentCycle} completed successfully`);
          flushState.remaining--;
          
          if (flushState.remaining > 0) {
            console.log(`Waiting 30 seconds before next cycle. ${flushState.remaining} cycles remaining.`);
            // Wait 30 seconds between cycles, then continue
            setTimeout(() => {
              if (flushState.active) { // Check if still active
                executeNext();
              }
            }, 30000); // 30 seconds
          } else {
            // All cycles completed
            console.log(`Completed all 10 cycles of ${type} flush operation`);
            flushState.active = false;
            flushState.type = '';
            flushState.remaining = 0;
            flushState.total = 0;
          }
        } else {
          // Error occurred, stop the operation
          console.error(`Failed to execute cycle ${currentCycle}, stopping operation`);
          flushState.active = false;
          flushState.type = '';
          flushState.remaining = 0;
          flushState.total = 0;
        }
      } catch (error) {
        console.error(`Error in cycle ${currentCycle}:`, error);
        flushState.active = false;
        flushState.type = '';
        flushState.remaining = 0;
        flushState.total = 0;
      }
    }
  };

  // Start the first cycle immediately
  executeNext();
}

console.log(`Proxy server running. Forwarding to: ${CONTROLLER_URL}`);

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint to start 10x flush operation
// app.post('/api/flush-x10/:type', async (req, res) => {
//   console.log(`Received flush x10 request for type: ${req.params.type}`);
//   try {
//     const { type } = req.params;
    
//     if (type !== 'normal' && type !== 'service') {
//       console.log(`Invalid flush type: ${type}`);
//       return res.status(400).json({ success: false, error: 'Invalid flush type' });
//     }

//     console.log(`Starting flush x10 for type: ${type}`);
//     await startFlushX10(type);
//     const response = { success: true, message: `Started ${type} flush x10 operation` };
//     console.log('Sending response:', response);
//     res.json(response);
//   } catch (error) {
//     console.error('Error starting flush x10:', error.message);
//     res.status(400).json({ success: false, error: error.message });
//   }
// });

// Endpoint to get flush operation progress
app.get('/api/flush-progress', (req, res) => {
  const progress = {
    active: flushState.active,
    type: flushState.type,
    remaining: flushState.remaining,
    total: flushState.total
  };
  console.log('Progress requested:', progress);
  res.json(progress);
});

// Endpoint to stop flush operation
app.post('/api/flush-stop', (req, res) => {
  if (flushState.active) {
    console.log(`Stopping ${flushState.type} flush operation at cycle ${flushState.total - flushState.remaining + 1}`);
    flushState.active = false;
    flushState.type = '';
    flushState.remaining = 0;
    flushState.total = 0;
    res.json({ success: true, message: 'Flush operation stopped' });
  } else {
    res.json({ success: false, message: 'No active flush operation' });
  }
});

// app.use('/api', async (req, res) => {
//   const path = req.originalUrl.replace('/api', '');
//   const url = `${CONTROLLER_URL}${path}`;

//   console.log(`Proxy: ${req.method} ${req.originalUrl} -> ${url}`);

//   try {
//     const response = await axios(url, {
//       method: req.method,
//       headers: req.headers,
//       data: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
//       timeout: 30000
//     });

//     console.log(`Proxy response: ${response.status}`);
//     res.status(response.status).send(response.data);
//   } catch (error) {
//     console.error('Proxy error:', error.message);
//     res.status(error.response?.status || 500).send(error.message);
//   }
// });

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});