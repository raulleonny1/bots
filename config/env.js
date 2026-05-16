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

function parseIntEnv(value, defaultValue) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function parseFloatEnv(value, defaultValue) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : defaultValue;
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  botName: process.env.BOT_NAME || 'WhatsApp Bot',

  cron: {
    timezone: process.env.CRON_TIMEZONE || 'Europe/Madrid',
    dailyHour: parseIntEnv(process.env.DAILY_MESSAGE_HOUR, 8),
    dailyMinute: parseIntEnv(process.env.DAILY_MESSAGE_MINUTE, 0),
    dailyMessage: process.env.DAILY_MESSAGE_TEXT || 'Dios bendiga tu día. Todo lo puedo en Cristo.',
    recipients: parseList(process.env.SCHEDULED_RECIPIENTS),
  },

  openai: {
    enabled: parseBool(process.env.OPENAI_ENABLED, false),
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseIntEnv(process.env.OPENAI_MAX_TOKENS, 400),
    temperature: parseFloatEnv(process.env.OPENAI_TEMPERATURE, 0.7),
    minMessageLength: parseIntEnv(process.env.OPENAI_MIN_MESSAGE_LENGTH, 25),
    onlyQuestions: parseBool(process.env.OPENAI_ONLY_QUESTIONS, true),
    ignoreGreetings: parseBool(process.env.OPENAI_IGNORE_GREETINGS, true),
    cooldownMs: parseIntEnv(process.env.OPENAI_COOLDOWN_MS, 15000),
    maxHistoryMessages: parseIntEnv(process.env.OPENAI_MAX_HISTORY_MESSAGES, 6),
    systemPrompt: process.env.OPENAI_SYSTEM_PROMPT || '',
    churchTopicsOnly: parseBool(process.env.OPENAI_CHURCH_TOPICS_ONLY, true),
    offTopicMessage:
      process.env.OPENAI_OFF_TOPIC_MESSAGE ||
      'Solo puedo ayudarte con temas de nuestra iglesia y la fe. Para otras consultas, escríbenos y un miembro del equipo te atenderá. ¡Bendiciones! 🙏',
  },

  reconnect: {
    delayMs: parseIntEnv(process.env.RECONNECT_DELAY_MS, 5000),
    maxAttempts: parseIntEnv(process.env.MAX_RECONNECT_ATTEMPTS, 10),
  },

  sessionsPath: path.resolve(__dirname, '..', 'sessions'),

  /** false por defecto: conectas manualmente desde el panel. true solo en PC fijo 24/7 */
  autoConnectWhatsApp: parseBool(process.env.AUTO_CONNECT_WHATSAPP, false),

  admin: {
    host: process.env.ADMIN_HOST || '0.0.0.0',
    port: parseIntEnv(process.env.ADMIN_PORT, 3000),
    password: String(process.env.ADMIN_PASSWORD || 'admin123').trim(),
    sessionSecret: String(process.env.ADMIN_SESSION_SECRET || 'cambiar-este-secreto-en-produccion').trim(),
  },
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

  if (config.admin.password === 'admin123') {
    warnings.push(
      'ADMIN_PASSWORD usa el valor por defecto. Cámbialo en .env por seguridad.'
    );
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: config.cron.timezone });
  } catch {
    warnings.push(
      `CRON_TIMEZONE="${config.cron.timezone}" no es válida. Usa ej: Europe/Madrid`
    );
  }

  return warnings;
}

module.exports = { config, validateConfig };
