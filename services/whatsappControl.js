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
let connectInProgress = false;

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
 * Inicia conexion en segundo plano (respuesta rapida al panel).
 */
function startConnect() {
  if (!bootClientFn) {
    throw new Error('Bot no inicializado');
  }

  if (connectInProgress) {
    return botStateService.getState();
  }

  settingsService.setWhatsappKeepConnected(true);
  setReconnectAllowed(true);
  resetReconnectAttempts();
  botStateService.updateState({ status: 'loading' });
  logger.info('Conexion manual solicitada desde el panel');
  connectInProgress = true;

  void safeAsync(async () => {
    try {
      await bootClientFn();
    } finally {
      connectInProgress = false;
    }
  }, 'Conectar WhatsApp');

  return botStateService.getState();
}

/** Conexion bloqueante (arranque del servidor) */
async function connect() {
  if (!bootClientFn) {
    throw new Error('Bot no inicializado');
  }

  settingsService.setWhatsappKeepConnected(true);
  setReconnectAllowed(true);
  resetReconnectAttempts();
  botStateService.updateState({ status: 'loading' });
  await bootClientFn();
  return botStateService.getState();
}

/** @deprecated usar startConnect() o connect() */
async function reconnect() {
  return connect();
}

/**
 * Nuevo QR en segundo plano (no bloquea la peticion HTTP).
 */
function startNewQr() {
  if (!bootClientFn) {
    throw new Error('Bot no inicializado');
  }

  if (connectInProgress) {
    throw new Error('Ya hay una conexion en curso. Espera unos segundos.');
  }

  logger.info('Nuevo QR solicitado desde el panel — cerrando sesion...');
  connectInProgress = true;

  void safeAsync(async () => {
    try {
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

      global.whatsappClient = null;
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
    } finally {
      connectInProgress = false;
    }
  }, 'Generar nuevo QR');

  return botStateService.getState();
}

/** @deprecated usar startNewQr() */
async function reconnectWithNewQr() {
  startNewQr();
  return botStateService.getState();
}

module.exports = {
  registerBootClient,
  disconnect,
  startConnect,
  connect,
  reconnect,
  startNewQr,
  reconnectWithNewQr,
};
