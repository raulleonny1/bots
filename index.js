/**
 * Punto de entrada principal del bot de WhatsApp.
 * Automatizador con respuestas por palabras clave y mensajes programados.
 */

const { config, validateConfig } = require('./config/env');
const { createWhatsAppClient } = require('./config/client');
const { registerConnectionHandlers } = require('./handlers/connectionHandler');
const logger = require('./utils/logger');
const { safeAsync } = require('./utils/asyncHandler');
const { stopScheduler } = require('./services/schedulerService');

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
  // En producción podrías usar process.exit(1) tras un graceful shutdown
});

// ─── Cierre limpio (Ctrl+C, PM2 stop, etc.) ──────────────────────────────────

async function gracefulShutdown(signal) {
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

// ─── Inicio del bot ──────────────────────────────────────────────────────────

async function startBot() {
  console.log('\n========================================');
  console.log(`  ${config.botName} — WhatsApp Automatizador`);
  console.log('========================================\n');

  const warnings = validateConfig();
  warnings.forEach((w) => logger.warn(w));

  if (config.openai.enabled && config.openai.apiKey) {
    logger.success('ChatGPT activo — responderá preguntas complejas', {
      model: config.openai.model,
      soloPreguntas: config.openai.onlyQuestions,
    });
  }

  logger.info('Iniciando bot...', {
    entorno: config.nodeEnv,
    timezone: config.cron.timezone,
    mensajeDiario: `${config.cron.dailyHour}:${String(config.cron.dailyMinute).padStart(2, '0')}`,
  });

  const client = createWhatsAppClient();
  global.whatsappClient = client;

  registerConnectionHandlers(client);

  await safeAsync(async () => {
    await client.initialize();
    logger.info('Cliente inicializado — esperando QR o sesión guardada...');
  }, 'Inicialización del cliente WhatsApp');
}

startBot();
