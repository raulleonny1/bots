/**
 * Control del cliente WhatsApp desde el panel admin (reconectar, nuevo QR).
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config/env');
const botStateService = require('./botStateService');
const logger = require('../utils/logger');
const { safeAsync } = require('../utils/asyncHandler');
const {
  setReconnectAllowed,
  resetReconnectAttempts,
} = require('../handlers/connectionHandler');
const { stopScheduler } = require('./schedulerService');
const settingsService = require('./settingsService');

let bootClientFn = null;

function registerBootClient(fn) {
  bootClientFn = fn;
}

function getSessionDir() {
  return path.join(config.sessionsPath, 'session-main-session');
}

function clearSavedSession() {
  const sessionDir = getSessionDir();
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    logger.info('Sesion de WhatsApp eliminada', { path: sessionDir });
  }
}

/**
 * Desconecta WhatsApp desde el panel (sin borrar la sesion guardada).
 */
async function disconnect() {
  if (!bootClientFn) {
    throw new Error('Bot no inicializado');
  }

  logger.info('Desconexion manual solicitada desde el panel');

  settingsService.setWhatsappKeepConnected(false);
  setReconnectAllowed(false);
  stopScheduler();
  resetReconnectAttempts();

  const client = global.whatsappClient;

  if (client) {
    await safeAsync(async () => {
      await client.destroy();
    }, 'Desconectar WhatsApp');
    global.whatsappClient = null;
  }

  botStateService.updateState({
    status: 'disconnected',
    lastDisconnectReason: 'desconectado_desde_panel',
    pushname: null,
    number: null,
    lastQr: null,
    schedulerActive: false,
  });

  return botStateService.getState();
}

/**
 * Conecta / reinicia el cliente (misma sesion si existe).
 */
async function connect() {
  if (!bootClientFn) {
    throw new Error('Bot no inicializado');
  }

  settingsService.setWhatsappKeepConnected(true);
  setReconnectAllowed(true);
  resetReconnectAttempts();
  botStateService.updateState({ status: 'loading' });
  logger.info('Conexion manual solicitada desde el panel');
  await bootClientFn();
  return botStateService.getState();
}

/** @deprecated usar connect() */
async function reconnect() {
  return connect();
}

/**
 * Cierra sesion, borra datos guardados y genera QR nuevo.
 */
async function reconnectWithNewQr() {
  if (!bootClientFn) {
    throw new Error('Bot no inicializado');
  }

  logger.info('Nuevo QR solicitado desde el panel — cerrando sesion...');

  resetReconnectAttempts();
  setReconnectAllowed(false);
  stopScheduler();

  const client = global.whatsappClient;

  if (client) {
    await safeAsync(async () => {
      await client.logout();
    }, 'Logout WhatsApp');

    await safeAsync(async () => {
      await client.destroy();
    }, 'Destruir cliente WhatsApp');
  }

  clearSavedSession();
  setReconnectAllowed(true);

  botStateService.updateState({
    status: 'qr',
    pushname: null,
    number: null,
    lastQr: null,
    schedulerActive: false,
  });

  await bootClientFn();
  return botStateService.getState();
}

module.exports = {
  registerBootClient,
  disconnect,
  connect,
  reconnect,
  reconnectWithNewQr,
};
