const path = require('path');
const dotenv = require('dotenv');

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  glpi: {
    baseUrl: (process.env.GLPI_BASE_URL || 'http://localhost/glpi').replace(/\/+$/, ''),
    apiEndpoint: `${(process.env.GLPI_BASE_URL || 'http://localhost/glpi').replace(/\/+$/, '')}/apirest.php`,
    userToken: process.env.GLPI_USER_TOKEN || '',
    appToken: process.env.GLPI_APP_TOKEN || ''
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || ''
  }
};

// Validate critical GLPI configuration
if (!config.glpi.userToken) {
  console.warn('[CONFIG WARN] GLPI_USER_TOKEN is missing in .env file.');
}

module.exports = config;
