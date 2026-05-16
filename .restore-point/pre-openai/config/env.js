/**
 * Carga y valida variables de entorno.
 * Centraliza toda la configuración del bot en un solo lugar.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Convierte un string a booleano de forma segura.
 */
function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['true', '1', 'yes', 'si', 'sí'].includes(String(value).toLowerCase());
}

/**
 * Convierte un string separado por comas en array limpio.
 */
function parseList(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  botName: process.env.BOT_NAME || 'WhatsApp Bot',

  cron: {
    timezone: process.env.CRON_TIMEZONE || 'Europe/Madrid',
    dailyHour: parseInt(process.env.DAILY_MESSAGE_HOUR, 10) || 8,
    dailyMinute: parseInt(process.env.DAILY_MESSAGE_MINUTE, 10) || 0,
    dailyMessage: process.env.DAILY_MESSAGE_TEXT || 'Dios bendiga tu día. Todo lo puedo en Cristo.',
    recipients: parseList(process.env.SCHEDULED_RECIPIENTS),
  },

  openai: {
    enabled: parseBool(process.env.OPENAI_ENABLED, false),
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  reconnect: {
    delayMs: parseInt(process.env.RECONNECT_DELAY_MS, 10) || 5000,
    maxAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS, 10) || 10,
  },

  sessionsPath: path.resolve(__dirname, '..', 'sessions'),
};

/**
 * Valida configuración crítica al iniciar.
 */
function validateConfig() {
  const warnings = [];

  if (config.cron.recipients.length === 0) {
    warnings.push(
      'SCHEDULED_RECIPIENTS está vacío. Los mensajes programados no se enviarán hasta que configures destinatarios en .env'
    );
  }

  if (config.openai.enabled && !config.openai.apiKey) {
    warnings.push('OPENAI_ENABLED=true pero OPENAI_API_KEY está vacía.');
  }

  return warnings;
}

module.exports = { config, validateConfig };
