/**
 * Handler de conexión, QR, reconexión y eventos del cliente WhatsApp.
 */

const qrcode = require('qrcode-terminal');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { safeAsync } = require('../utils/asyncHandler');
const { startScheduler, stopScheduler } = require('../services/schedulerService');
const { registerMessageHandler } = require('./messageHandler');

let reconnectAttempts = 0;
let isReady = false;
let messageHandlerRegistered = false;

/**
 * Intenta reconectar el cliente tras una desconexión.
 */
async function attemptReconnect(client, reason) {
  if (reconnectAttempts >= config.reconnect.maxAttempts) {
    logger.error('Máximo de intentos de reconexión alcanzado. Reinicia el bot manualmente.', {
      attempts: reconnectAttempts,
      reason,
    });
    return;
  }

  reconnectAttempts += 1;
  const delay = config.reconnect.delayMs;

  logger.warn(`Reconectando en ${delay / 1000}s... (intento ${reconnectAttempts}/${config.reconnect.maxAttempts})`, {
    reason,
  });

  await new Promise((resolve) => setTimeout(resolve, delay));

  await safeAsync(async () => {
    await client.initialize();
  }, 'Reconexión WhatsApp');
}

/**
 * Registra todos los eventos de conexión del cliente.
 */
function registerConnectionHandlers(client) {
  client.on('qr', (qr) => {
    logger.info('Escanea el código QR con WhatsApp (Dispositivos vinculados)');
    console.log('\n');
    qrcode.generate(qr, { small: true });
    console.log('\n');
  });

  client.on('authenticated', () => {
    logger.success('Autenticación exitosa — sesión guardada');
  });

  client.on('auth_failure', (msg) => {
    logger.error('Fallo de autenticación', { message: msg });
    isReady = false;
  });

  client.on('ready', async () => {
    isReady = true;
    reconnectAttempts = 0;

    const info = client.info;
    logger.success(`${config.botName} conectado y listo`, {
      user: info?.pushname || 'Desconocido',
      number: info?.wid?.user || 'N/A',
    });

    // Registrar handler de mensajes una sola vez
    if (!messageHandlerRegistered) {
      registerMessageHandler(client);
      messageHandlerRegistered = true;
    }

    startScheduler(client);
  });

  client.on('disconnected', async (reason) => {
    isReady = false;
    stopScheduler();

    logger.warn('WhatsApp desconectado', { reason });
    await attemptReconnect(client, reason);
  });

  client.on('loading_screen', (percent, message) => {
    logger.info(`Cargando WhatsApp Web: ${percent}% - ${message}`);
  });

  client.on('change_state', (state) => {
    logger.debug('Estado del cliente cambió', { state });
  });
}

function getConnectionStatus() {
  return {
    isReady,
    reconnectAttempts,
  };
}

module.exports = {
  registerConnectionHandlers,
  getConnectionStatus,
};
