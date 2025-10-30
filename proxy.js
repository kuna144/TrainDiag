const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

  console.log(`Proxy: ${req.method} ${req.originalUrl} -> ${url}`);

  try {
    const response = await axios(url, {
      method: req.method,
      headers: req.headers,
      data: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      timeout: 30000
    });

    console.log(`Proxy response: ${response.status}`);
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});