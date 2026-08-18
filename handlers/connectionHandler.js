/**
 * Handler de conexi�n, QR, reconexi�n y eventos del cliente WhatsApp.
 */

const qrcode = require('qrcode-terminal');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { safeAsync } = require('../utils/asyncHandler');
const { startScheduler, stopScheduler } = require('../services/schedulerService');
const botStateService = require('../services/botStateService');
const settingsService = require('../services/settingsService');
const { registerMessageHandler } = require('./messageHandler');

let reconnectAttempts = 0;
let reconnectAllowed = false;
let ignoringDisconnect = false;
let reconnectInProgress = false;
const clientsWithHandlers = new WeakSet();

function setReconnectAllowed(allowed) {
  reconnectAllowed = Boolean(allowed);
}

function setIgnoringDisconnect(value) {
  ignoringDisconnect = Boolean(value);
}

function resetReconnectAttempts() {
  reconnectAttempts = 0;
  botStateService.updateState({ reconnectAttempts: 0 });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptReconnect(restartBot, reason) {
  if (reconnectInProgress) {
    logger.debug('Reconexi�n ya en curso � se ignora otro disparo');
    return;
  }

  if (reconnectAttempts >= config.reconnect.maxAttempts) {
    botStateService.setDisconnected('max_reconnect_attempts');
    logger.error('M�ximo de intentos de reconexi�n alcanzado. Pulsa Conectar en el panel.', {
      attempts: reconnectAttempts,
      reason,
    });
    return;
  }

  reconnectInProgress = true;
  reconnectAttempts += 1;
  botStateService.updateState({ reconnectAttempts });

  const delay = config.reconnect.delayMs;
  logger.warn(
    `Reconectando en ${delay / 1000}s... (intento ${reconnectAttempts}/${config.reconnect.maxAttempts})`,
    { reason }
  );

  await sleep(delay);

  if (!reconnectAllowed) {
    reconnectInProgress = false;
    logger.info('Reconexi�n cancelada (WhatsApp se desconect� desde el panel)');
    return;
  }

  await safeAsync(async () => {
    if (typeof restartBot === 'function') {
      await restartBot();
    }
  }, 'Reconexi�n WhatsApp');

  reconnectInProgress = false;
}

function registerConnectionHandlers(client, restartBot) {
  client.on('qr', (qr) => {
    botStateService.setQr(qr);
    logger.info('Escanea el c�digo QR con WhatsApp (Dispositivos vinculados)');
    console.log('\n');
    qrcode.generate(qr, { small: true });
    console.log('\n');
  });

  client.on('authenticated', () => {
    botStateService.setAuthenticated();
    logger.success('Autenticaci�n exitosa � sesi�n guardada');
  });

  client.on('auth_failure', (msg) => {
    botStateService.setDisconnected('auth_failure');
    logger.error('Fallo de autenticaci�n. En el panel pulsa �Generar nuevo QR�.', {
      message: msg,
    });
  });

  client.on('ready', async () => {
    reconnectAttempts = 0;
    reconnectInProgress = false;

    const info = client.info;
    botStateService.setReady(info);
    settingsService.setWhatsappKeepConnected(true);

    logger.success(`${config.botName} conectado y listo`, {
      user: info?.pushname || 'Desconocido',
      number: info?.wid?.user || 'N/A',
    });

    if (!clientsWithHandlers.has(client)) {
      registerMessageHandler(client);
      clientsWithHandlers.add(client);
    }

    startScheduler(client);
  });

  client.on('disconnected', async (reason) => {
    stopScheduler();

    if (ignoringDisconnect || !reconnectAllowed) {
      logger.debug('Desconexi�n ignorada (reinicio interno o desconexi�n manual)', {
        reason,
      });
      return;
    }

    botStateService.setDisconnected(reason);
    logger.warn('WhatsApp desconectado � intentando reconectar', { reason });
    await attemptReconnect(restartBot, reason);
  });

  client.on('loading_screen', (percent, message) => {
    const current = botStateService.getState();
    if (current.status === 'ready') {
      botStateService.updateState({ loadingPercent: percent });
      return;
    }
    botStateService.updateState({ status: 'loading', loadingPercent: percent });
    logger.info(`Cargando WhatsApp Web: ${percent}% - ${message}`);
  });

  client.on('change_state', (state) => {
    logger.debug('Estado del cliente cambi�', { state });
  });
}

function getConnectionStatus() {
  return botStateService.getState();
}

module.exports = {
  registerConnectionHandlers,
  getConnectionStatus,
  setReconnectAllowed,
  setIgnoringDisconnect,
  resetReconnectAttempts,
};
