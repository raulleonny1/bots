/**
 * Configuración e instancia del cliente WhatsApp Web.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const { config } = require('./env');
const logger = require('../utils/logger');

/**
 * Crea una nueva instancia del cliente con sesión persistente.
 */
function createWhatsAppClient() {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'main-session',
      dataPath: config.sessionsPath,
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  logger.info('Cliente WhatsApp creado', {
    sessionsPath: config.sessionsPath,
    botName: config.botName,
  });

  return client;
}

module.exports = { createWhatsAppClient };
