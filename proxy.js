const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const fetch = (...args) => import('node-fetch').then(module => module.default(...args));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Czytaj config.json
const configPath = path.join(__dirname, 'src', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const CONTROLLER_URL = `http://${config.defaultSettings.controllerIp}`;

console.log(`Proxy server running. Forwarding to: ${CONTROLLER_URL}`);

app.use('/api', async (req, res) => {
  const path = req.originalUrl.replace('/api', '');
  const url = `${CONTROLLER_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      timeout: 10000
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});