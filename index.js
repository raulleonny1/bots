/**
 * Punto de entrada principal del bot de WhatsApp.
 * Automatizador con respuestas por palabras clave y mensajes programados.
 */

const { config, validateConfig } = require('./config/env');
const { createWhatsAppClient } = require('./config/client');
const {
  registerConnectionHandlers,
  setReconnectAllowed,
} = require('./handlers/connectionHandler');
const logger = require('./utils/logger');
const { safeAsync } = require('./utils/asyncHandler');
const { stopScheduler } = require('./services/schedulerService');
const settingsService = require('./services/settingsService');
const botStateService = require('./services/botStateService');
const { startWebServer } = require('./web/server');
const whatsappControl = require('./services/whatsappControl');

// ─── Anti-crash: captura errores globales ────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  logger.error('Promesa rechazada no manejada (unhandledRejection)', {
    reason: reason?.message || String(reason),
    stack: reason?.stack,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Excepción no capturada (uncaughtException)', {
    message: error.message,
    stack: error.stack,
  });
});

// ─── Cierre limpio (Ctrl+C, PM2 stop, etc.) ──────────────────────────────────

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  setReconnectAllowed(false);
  logger.warn(`Señal ${signal} recibida. Cerrando bot...`);

  stopScheduler();

  if (global.whatsappClient) {
    await safeAsync(async () => {
      await global.whatsappClient.destroy();
      logger.info('Cliente WhatsApp destruido correctamente');
    }, 'Cierre del cliente');
  }

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ─── Cliente WhatsApp ─────────────────────────────────────────────────────────

/**
 * Crea, registra handlers e inicializa el cliente.
 * Usado al arranque y en reconexiones.
 */
async function bootClient() {
  if (isShuttingDown) return;

  const previous = global.whatsappClient;

  if (previous) {
    setReconnectAllowed(false);
    await safeAsync(async () => {
      await previous.destroy();
    }, 'Destruir cliente anterior');
    setReconnectAllowed(true);
  }

  const client = createWhatsAppClient();
  global.whatsappClient = client;

  registerConnectionHandlers(client, bootClient);

  await client.initialize();
  logger.info('Cliente inicializado — esperando QR o sesión guardada...');
}

// ─── Inicio del bot ──────────────────────────────────────────────────────────

async function startBot() {
  console.log('\n========================================');
  console.log(`  ${config.botName} — WhatsApp Automatizador`);
  console.log('========================================\n');

  const warnings = validateConfig();
  warnings.forEach((w) => logger.warn(w));

  if (config.openai.enabled && config.openai.apiKey) {
    logger.success('ChatGPT activo — solo temas de iglesia', {
      model: config.openai.model,
      soloPreguntas: config.openai.onlyQuestions,
      soloIglesia: config.openai.churchTopicsOnly,
    });
  }

  settingsService.loadSettings();

  whatsappControl.registerBootClient(bootClient);

  startWebServer();

  if (config.autoConnectWhatsApp) {
    setReconnectAllowed(true);
    botStateService.updateState({ status: 'loading' });
    logger.info('PC servidor: conectando WhatsApp automaticamente (sesion guardada)...');
    await safeAsync(bootClient, 'Inicialización del cliente WhatsApp');
  } else {
    setReconnectAllowed(false);
    botStateService.setDisconnected('esperando_conexion_desde_panel');
    logger.info('WhatsApp en espera — pulsa Conectar en el panel admin');
  }
}

module.exports = { bootClient };

startBot();
