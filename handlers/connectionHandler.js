/**
 * Handler de conexión, QR, reconexión y eventos del cliente WhatsApp.
 */

const qrcode = require('qrcode-terminal');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { safeAsync } = require('../utils/asyncHandler');
const { startScheduler, stopScheduler } = require('../services/schedulerService');
const botStateService = require('../services/botStateService');
const { registerMessageHandler } = require('./messageHandler');

let reconnectAttempts = 0;
let messageHandlerRegistered = false;
let reconnectAllowed = false;

function setReconnectAllowed(allowed) {
  reconnectAllowed = allowed;
}

function resetReconnectAttempts() {
  reconnectAttempts = 0;
  botStateService.updateState({ reconnectAttempts: 0 });
}

async function attemptReconnect(restartBot, reason) {
  if (reconnectAttempts >= config.reconnect.maxAttempts) {
    botStateService.setDisconnected('max_reconnect_attempts');
    logger.error('Máximo de intentos de reconexión alcanzado. Reinicia el bot manualmente.', {
      attempts: reconnectAttempts,
      reason,
    });
    return;
  }

  reconnectAttempts += 1;
  botStateService.updateState({ reconnectAttempts });

  const delay = config.reconnect.delayMs;

  logger.warn(`Reconectando en ${delay / 1000}s... (intento ${reconnectAttempts}/${config.reconnect.maxAttempts})`, {
    reason,
  });

  await new Promise((resolve) => setTimeout(resolve, delay));

  messageHandlerRegistered = false;

  await safeAsync(async () => {
    if (typeof restartBot === 'function') {
      await restartBot();
    }
  }, 'Reconexión WhatsApp');
}

function registerConnectionHandlers(client, restartBot) {
  client.on('qr', (qr) => {
    botStateService.setQr(qr);
    logger.info('Escanea el código QR con WhatsApp (Dispositivos vinculados)');
    console.log('\n');
    qrcode.generate(qr, { small: true });
    console.log('\n');
  });

  client.on('authenticated', () => {
    botStateService.setAuthenticated();
    logger.success('Autenticación exitosa — sesión guardada');
  });

  client.on('auth_failure', (msg) => {
    botStateService.setDisconnected('auth_failure');
    logger.error('Fallo de autenticación', { message: msg });
  });

  client.on('ready', async () => {
    reconnectAttempts = 0;

    const info = client.info;
    botStateService.setReady(info);

    logger.success(`${config.botName} conectado y listo`, {
      user: info?.pushname || 'Desconocido',
      number: info?.wid?.user || 'N/A',
    });

    if (!messageHandlerRegistered) {
      registerMessageHandler(client);
      messageHandlerRegistered = true;
    }

    startScheduler(client);
  });

  client.on('disconnected', async (reason) => {
    stopScheduler();

    if (!reconnectAllowed) {
      logger.debug('Desconexión ignorada (reinicio interno del cliente)');
      return;
    }

    botStateService.setDisconnected(reason);
    logger.warn('WhatsApp desconectado', { reason });
    await attemptReconnect(restartBot, reason);
  });

  client.on('loading_screen', (percent, message) => {
    const current = botStateService.getState();
    // Tras "ready", WhatsApp puede seguir emitiendo loading_screen al sincronizar;
    // no volver a "Cargando" en el panel si ya estamos conectados.
    if (current.status === 'ready') {
      botStateService.updateState({ loadingPercent: percent });
      return;
    }
    botStateService.updateState({ status: 'loading', loadingPercent: percent });
    logger.info(`Cargando WhatsApp Web: ${percent}% - ${message}`);
  });

  client.on('change_state', (state) => {
    logger.debug('Estado del cliente cambió', { state });
  });
}

function getConnectionStatus() {
  return botStateService.getState();
}

module.exports = {
  registerConnectionHandlers,
  getConnectionStatus,
  setReconnectAllowed,
  resetReconnectAttempts,
};
