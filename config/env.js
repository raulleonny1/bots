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

function digitsOnlyEnv(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
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
    delayMs: parseIntEnv(process.env.RECONNECT_DELAY_MS, 8000),
    maxAttempts: parseIntEnv(process.env.MAX_RECONNECT_ATTEMPTS, 15),
  },

  sessionsPath: path.resolve(__dirname, '..', 'sessions'),

  /** Chrome de Windows (opcional). Si está vacío se busca Chrome instalado. */
  chromePath: String(process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || '').trim(),

  /** Numero reverenda (codigo pais sin +). Ej: 34612345678 */
  reverendWhatsApp: digitsOnlyEnv(process.env.REVEREND_WHATSAPP),

  /** En el PC fijo de la iglesia: true para reconectar al arrancar */
  autoConnectWhatsApp: parseBool(process.env.AUTO_CONNECT_WHATSAPP, true),

  admin: {
    host: process.env.ADMIN_HOST || '127.0.0.1',
    port: parseIntEnv(process.env.ADMIN_PORT, 3000),
    password: String(process.env.ADMIN_PASSWORD || 'admin123').trim(),
    sessionSecret: String(process.env.ADMIN_SESSION_SECRET || 'cambiar-este-secreto-en-produccion').trim(),
  },

  whatsappCloud: {
    enabled: parseBool(process.env.WHATSAPP_CLOUD_ENABLED, false),
    token: String(process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
    phoneNumberId: String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    businessAccountId: String(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim(),
    verifyToken: String(process.env.WHATSAPP_VERIFY_TOKEN || '').trim(),
    appSecret: String(process.env.WHATSAPP_APP_SECRET || '').trim(),
    apiVersion: String(process.env.WHATSAPP_API_VERSION || 'v21.0').trim(),
    logoUrl: String(process.env.WHATSAPP_LOGO_URL || '').trim(),
  },

  firebase: {
    enabled: parseBool(process.env.FIREBASE_ENABLED, false),
    projectId: process.env.FIREBASE_PROJECT_ID || 'botsiere',
    churchId: process.env.FIREBASE_CHURCH_ID || 'main',
    serviceAccountPath:
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json',
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
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

  if (config.whatsappCloud.enabled) {
    if (!config.whatsappCloud.token) {
      warnings.push('WHATSAPP_CLOUD_ENABLED=true pero falta WHATSAPP_TOKEN.');
    }
    if (!config.whatsappCloud.phoneNumberId) {
      warnings.push('WHATSAPP_CLOUD_ENABLED=true pero falta WHATSAPP_PHONE_NUMBER_ID.');
    }
    if (!config.whatsappCloud.verifyToken) {
      warnings.push('WHATSAPP_CLOUD_ENABLED=true pero falta WHATSAPP_VERIFY_TOKEN (el que pondrás en Meta).');
    }
  }

  if (config.firebase.enabled) {
    const fs = require('fs');
    const path = require('path');
    const hasInline =
      process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
    const accountPath = path.resolve(
      __dirname,
      '..',
      config.firebase.serviceAccountPath
    );
    if (!hasInline && !fs.existsSync(accountPath)) {
      warnings.push(
        'FIREBASE_ENABLED=true pero falta firebase-service-account.json (o FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY en .env)'
      );
    }
  }

  return warnings;
}

module.exports = { config, validateConfig };
