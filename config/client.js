/**
 * Configuración e instancia del cliente WhatsApp Web.
 */

const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { config } = require('./env');
const logger = require('../utils/logger');

function resolveChromePath() {
  if (config.chromePath && fs.existsSync(config.chromePath)) {
    return config.chromePath;
  }

  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ].filter(Boolean);

  return candidates.find((p) => fs.existsSync(p)) || null;
}

/**
 * Crea una nueva instancia del cliente con sesión persistente.
 */
function createWhatsAppClient() {
  const executablePath = resolveChromePath();
  const puppeteer = {
    headless: true,
    timeout: 120000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  };

  if (executablePath) {
    puppeteer.executablePath = executablePath;
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'main-session',
      dataPath: config.sessionsPath,
    }),
    puppeteer,
    authTimeoutMs: 120000,
    qrMaxRetries: 8,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
    deviceName: config.botName || 'Bot Iglesia',
    webVersionCache: { type: 'local' },
  });

  logger.info('Cliente WhatsApp creado', {
    sessionsPath: config.sessionsPath,
    botName: config.botName,
    chrome: executablePath || 'puppeteer (cache)',
  });

  return client;
}

module.exports = { createWhatsAppClient, resolveChromePath };
