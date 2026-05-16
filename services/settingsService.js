/**
 * Configuración editable desde el panel admin (persistida en data/settings.json).
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config/env');
const { keywords: defaultKeywords } = require('../config/keywords');
const { defaultMenu } = require('../config/menu');
const logger = require('../utils/logger');

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
    updatedAt: new Date().toISOString(),
  };
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
  loadSettings,
  getSettings,
  getMenuConfig,
  saveSettings,
  areResponsesEnabled,
  areKeywordRepliesEnabled,
  isOpenaiRepliesEnabled,
  getKeywords,
  getDailyMessageConfig,
  setOnSettingsChange,
};
