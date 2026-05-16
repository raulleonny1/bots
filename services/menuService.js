/**
 * Menu interactivo editable desde el panel + modo ChatGPT para creencias.
 */

const settingsService = require('./settingsService');
const logger = require('../utils/logger');

/** Chats en modo "preguntar sobre creencias" (ChatGPT) */
const beliefsChatMode = new Map();

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getMenuConfig() {
  return settingsService.getMenuConfig();
}

function buildMenuText() {
  const menu = getMenuConfig();
  const lines = (menu.options || []).map((opt, index) => `*${index + 1}.* ${opt.label}`);
  return [menu.intro, '', ...lines, '', menu.footer].filter(Boolean).join('\n');
}

function isMenuEnabled() {
  return settingsService.getSettings().menuEnabled !== false;
}

function getGreetings() {
  return getMenuConfig().greetings || [];
}

function isGreeting(messageBody) {
  const n = normalizeText(messageBody);
  if (!n) return false;

  return getGreetings().some((trigger) => {
    const t = normalizeText(trigger);
    return n === t || n.startsWith(`${t} `) || n.startsWith(`${t},`) || n.startsWith(`${t}!`);
  });
}

function isMenuCommand(messageBody) {
  const n = normalizeText(messageBody);
  return ['menu', 'opciones', 'ayuda', 'inicio', 'volver'].includes(n);
}

function getMaxOptionId() {
  const options = getMenuConfig().options || [];
  return options.length;
}

function parseMenuOption(messageBody) {
  const n = normalizeText(messageBody);
  const max = getMaxOptionId();
  if (max === 0) return null;

  const numMatch = n.match(/^([1-9])$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= max) return num;
  }

  const patterns = [
    /^opcion\s*([1-9])$/,
    /^opción\s*([1-9])$/,
    /^numero\s*([1-9])$/,
    /^número\s*([1-9])$/,
  ];

  for (const pattern of patterns) {
    const match = n.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= max) return num;
    }
  }

  return null;
}

function getOptionByNumber(num) {
  const options = getMenuConfig().options || [];
  return options[num - 1] || null;
}

function setBeliefsMode(chatId, enabled) {
  if (enabled) {
    beliefsChatMode.set(chatId, true);
  } else {
    beliefsChatMode.delete(chatId);
  }
}

function isBeliefsMode(chatId) {
  return beliefsChatMode.has(chatId);
}

function clearBeliefsMode(chatId) {
  beliefsChatMode.delete(chatId);
}

/**
 * Procesa saludo, menu o numero de opcion.
 * @returns {{ text, type, startBeliefsChat?: boolean }}
 */
function getMenuReply(messageBody, chatId) {
  if (!isMenuEnabled()) {
    return null;
  }

  if (isMenuCommand(messageBody)) {
    if (chatId) clearBeliefsMode(chatId);
    logger.info('Menu de bienvenida enviado');
    return { text: buildMenuText(), type: 'menu' };
  }

  if (isGreeting(messageBody)) {
    if (chatId) clearBeliefsMode(chatId);
    logger.info('Menu de bienvenida enviado (saludo)');
    return { text: buildMenuText(), type: 'menu' };
  }

  const optionNum = parseMenuOption(messageBody);
  const option = optionNum ? getOptionByNumber(optionNum) : null;

  if (option) {
    logger.info('Respuesta opcion de menu', { option: optionNum, useOpenAI: option.useOpenAI });

    if (option.useOpenAI && chatId) {
      setBeliefsMode(chatId, true);
    } else if (chatId) {
      clearBeliefsMode(chatId);
    }

    return {
      text: option.response,
      type: `menu-option-${optionNum}`,
      startBeliefsChat: Boolean(option.useOpenAI),
    };
  }

  return null;
}

module.exports = {
  getMenuReply,
  buildMenuText,
  isGreeting,
  isMenuCommand,
  parseMenuOption,
  isMenuEnabled,
  isBeliefsMode,
  clearBeliefsMode,
  getMenuConfig,
};
