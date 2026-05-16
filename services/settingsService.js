/**
 * Configuración editable desde el panel admin (persistida en data/settings.json).
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config/env');
const { keywords: defaultKeywords } = require('../config/keywords');
const { defaultMenu } = require('../config/menu');
const logger = require('../utils/logger');
const firestoreService = require('./firestoreService');
const { initFirebase } = require('../config/firebase');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

let settings = null;
let onSettingsChange = null;

function defaultSettings() {
  return {
    responsesEnabled: true,
    keywordRepliesEnabled: true,
    menuEnabled: true,
    openaiRepliesEnabled: null,
    keywords: JSON.parse(JSON.stringify(defaultKeywords)),
    menu: JSON.parse(JSON.stringify(defaultMenu)),
    dailyMessage: {
      text: config.cron.dailyMessage,
      hour: config.cron.dailyHour,
      minute: config.cron.dailyMinute,
      recipients: [...config.cron.recipients],
    },
    /** Si true, al reiniciar el servidor se vuelve a conectar WhatsApp (salvo Desconectar manual) */
    whatsappKeepConnected: false,
    updatedAt: new Date().toISOString(),
  };
}

function setWhatsappKeepConnected(keep) {
  saveSettings({ whatsappKeepConnected: Boolean(keep) });
}

function shouldKeepWhatsAppConnected() {
  return getSettings().whatsappKeepConnected === true;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function mergeMenu(parsedMenu) {
  const base = defaultSettings().menu;
  if (!parsedMenu) return base;

  return {
    intro: parsedMenu.intro ?? base.intro,
    footer: parsedMenu.footer ?? base.footer,
    greetings: Array.isArray(parsedMenu.greetings) ? parsedMenu.greetings : base.greetings,
    options: Array.isArray(parsedMenu.options) && parsedMenu.options.length
      ? parsedMenu.options.map((opt, i) => ({
          id: opt.id ?? i + 1,
          label: opt.label || '',
          response: opt.response || '',
          useOpenAI: Boolean(opt.useOpenAI),
        }))
      : base.options,
  };
}

function loadSettings() {
  ensureDataDir();

  if (!fs.existsSync(SETTINGS_FILE)) {
    settings = defaultSettings();
    saveSettingsToDisk();
    return settings;
  }

  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    settings = { ...defaultSettings(), ...parsed };
    settings.keywords = parsed.keywords || defaultSettings().keywords;
    settings.dailyMessage = { ...defaultSettings().dailyMessage, ...parsed.dailyMessage };
    settings.menu = mergeMenu(parsed.menu);
    if (settings.menuEnabled === undefined) {
      settings.menuEnabled = true;
    }
    return settings;
  } catch (error) {
    logger.error('Error leyendo settings.json, usando valores por defecto', {
      message: error.message,
    });
    settings = defaultSettings();
    return settings;
  }
}

function saveSettingsToDisk() {
  ensureDataDir();
  settings.updatedAt = new Date().toISOString();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

async function persistSettings() {
  saveSettingsToDisk();
  if (firestoreService.isFirebaseReady()) {
    await firestoreService.saveSettings(settings);
  }
}

/**
 * Carga settings locales y sincroniza con Firestore si está activo.
 */
async function init() {
  loadSettings();
  initFirebase();

  if (!firestoreService.isFirebaseReady()) {
    return settings;
  }

  try {
    const remote = await firestoreService.getSettings();
    if (remote && remote.updatedAt) {
      settings = { ...defaultSettings(), ...remote };
      settings.keywords = remote.keywords || defaultSettings().keywords;
      settings.dailyMessage = { ...defaultSettings().dailyMessage, ...remote.dailyMessage };
      settings.menu = mergeMenu(remote.menu);
      saveSettingsToDisk();
      logger.info('Configuracion cargada desde Firebase');
    } else {
      await firestoreService.saveSettings(getSettings());
      logger.info('Configuracion subida a Firebase por primera vez');
    }
  } catch (error) {
    logger.warn('Firebase settings no disponible, usando archivo local', {
      message: error.message,
    });
  }

  return settings;
}

function getSettings() {
  if (!settings) loadSettings();
  return settings;
}

function getMenuConfig() {
  return getSettings().menu || defaultSettings().menu;
}

function saveSettings(partial) {
  const current = getSettings();
  settings = {
    ...current,
    ...partial,
    dailyMessage: partial.dailyMessage
      ? { ...current.dailyMessage, ...partial.dailyMessage }
      : current.dailyMessage,
    menu: partial.menu ? mergeMenu(partial.menu) : current.menu,
    updatedAt: new Date().toISOString(),
  };

  if (partial.keywords) {
    settings.keywords = partial.keywords;
  }

  saveSettingsToDisk();
  if (firestoreService.isFirebaseReady()) {
    firestoreService.saveSettings(settings).catch((err) => {
      logger.error('Error guardando settings en Firebase', { message: err.message });
    });
  }

  if (typeof onSettingsChange === 'function') {
    clearTimeout(saveSettings._debounce);
    saveSettings._debounce = setTimeout(() => onSettingsChange(settings), 500);
  }

  return settings;
}

function areResponsesEnabled() {
  return getSettings().responsesEnabled !== false;
}

function areKeywordRepliesEnabled() {
  return getSettings().keywordRepliesEnabled !== false;
}

function isOpenaiRepliesEnabled() {
  const s = getSettings();
  if (s.openaiRepliesEnabled === null || s.openaiRepliesEnabled === undefined) {
    return config.openai.enabled && Boolean(config.openai.apiKey);
  }
  return Boolean(s.openaiRepliesEnabled) && Boolean(config.openai.apiKey);
}

function getKeywords() {
  return getSettings().keywords || [];
}

function getDailyMessageConfig() {
  return getSettings().dailyMessage;
}

function setOnSettingsChange(fn) {
  onSettingsChange = fn;
}

module.exports = {
  init,
  loadSettings,
  getSettings,
  setWhatsappKeepConnected,
  shouldKeepWhatsAppConnected,
  getMenuConfig,
  saveSettings,
  areResponsesEnabled,
  areKeywordRepliesEnabled,
  isOpenaiRepliesEnabled,
  getKeywords,
  getDailyMessageConfig,
  setOnSettingsChange,
};
