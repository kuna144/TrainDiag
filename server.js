const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serwuj pliki statyczne z folderu dist
app.use(express.static(path.join(__dirname, 'dist')));

// Czytaj config.json
const configPath = path.join(__dirname, 'src', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let currentControllerIp = config.defaultSettings.controllerIp;
function getControllerUrl() {
  return `http://${currentControllerIp}`;
}

console.log(`🚀 TrainDiag Server starting...`);
console.log(`📡 API Proxy forwarding to: ${getControllerUrl()}`);

// API Proxy
app.use('/api', async (req, res) => {
  const apiPath = req.originalUrl.replace('/api', '');
  const url = `${getControllerUrl()}${apiPath}`;

  console.log(`🔗 Proxy: ${req.method} ${req.originalUrl} -> ${url}`);

  try {
    const response = await axios(url, {
      method: req.method,
      headers: req.headers,
      data: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      timeout: 30000
    });

    console.log(`✅ Proxy response: ${response.status}`);
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

// Endpoint do zmiany IP sterownika w locie
app.post('/setControllerIp', (req, res) => {
  const { controllerIp } = req.body;
  if (!controllerIp || !/^\d{1,3}(\.\d{1,3}){3}$/.test(controllerIp)) {
    return res.status(400).json({ success: false, message: 'Invalid IP format' });
  }
  currentControllerIp = controllerIp;
  console.log(`🔄 Controller IP updated to: ${currentControllerIp}`);
  return res.json({ success: true, controllerIp: currentControllerIp });
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.use((req, res) => {
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 TrainDiag Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API Proxy: http://localhost:${PORT}/api`);
  console.log(`🎯 Controller IP: ${config.defaultSettings.controllerIp}`);
  console.log('');
  console.log('✨ Ready to use! Open browser and navigate to the URL above.');
});