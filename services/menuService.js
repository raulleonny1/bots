/**
 * Menú interactivo editable desde el panel + submenú de creencias (opción 5).
 */

const settingsService = require('./settingsService');
const { config } = require('../config/env');
const { defaultBeliefsSubmenu } = require('../config/beliefsSubmenu');
const logger = require('../utils/logger');
const { digitsOnly, buildWaMeLink } = require('../utils/whatsappLink');
const { toChatId } = require('../utils/phone');
const {
  formatWhatsAppMainMenu,
  formatWhatsAppBeliefsSubmenu,
  shouldSendLogoForReplyType,
} = require('../utils/whatsappMenuFormat');

/** Chats viendo el submenú de creencias (tras elegir opción 5) */
const beliefsSubmenuMode = new Map();

/** Chats que reenvían mensajes a un número (ej. reverenda) */
const forwardChatMode = new Map();

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

function getBeliefsSubmenuConfig() {
  const menu = getMenuConfig();
  const sub = menu.beliefsSubmenu;
  if (sub && Array.isArray(sub.items) && sub.items.length) {
    return {
      intro: sub.intro || defaultBeliefsSubmenu.intro,
      footer: sub.footer || defaultBeliefsSubmenu.footer,
      items: sub.items.map((item) => ({
        label: item.label || '',
        response: item.response || '',
      })),
    };
  }
  return defaultBeliefsSubmenu;
}

function buildMenuText() {
  return formatWhatsAppMainMenu(getMenuConfig());
}

function buildBeliefsSubmenuText() {
  return formatWhatsAppBeliefsSubmenu(getBeliefsSubmenuConfig());
}

function withMenuPresentation(text, type) {
  return {
    text,
    type,
    sendLogo: shouldSendLogoForReplyType(type),
  };
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
  return ['menu', 'opciones', 'ayuda', 'inicio'].includes(n);
}

function isBeliefsSubmenuBackCommand(messageBody) {
  const n = normalizeText(messageBody);
  return ['atras', 'atrás', 'volver', 'submenu', 'creencias'].includes(n);
}

function getMaxOptionId() {
  const options = getMenuConfig().options || [];
  return options.length;
}

function parseNumberChoice(messageBody, max) {
  const n = normalizeText(messageBody);
  if (max <= 0) return null;

  const patterns = [
    /^([1-9])$/,
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

function parseMenuOption(messageBody) {
  return parseNumberChoice(messageBody, getMaxOptionId());
}

function parseBeliefsSubmenuOption(messageBody) {
  const items = getBeliefsSubmenuConfig().items;
  return parseNumberChoice(messageBody, items.length);
}

function getOptionByNumber(num) {
  const options = getMenuConfig().options || [];
  return options[num - 1] || null;
}

function setBeliefsSubmenuMode(chatId, enabled) {
  if (enabled) {
    beliefsSubmenuMode.set(chatId, true);
  } else {
    beliefsSubmenuMode.delete(chatId);
  }
}

function isBeliefsSubmenuMode(chatId) {
  return beliefsSubmenuMode.has(chatId);
}

function clearBeliefsSubmenuMode(chatId) {
  beliefsSubmenuMode.delete(chatId);
}

function isReverendOption(option) {
  const label = normalizeText(option?.label || '');
  return /reverend|pastora|pastor/.test(label);
}

function isCreenciasOption(option) {
  const label = normalizeText(option?.label || '');
  return /creencia|doctrina|fe de la iglesia|lo que creemos/.test(label);
}

function resolveOptionPhone(option) {
  const fromOption = digitsOnly(option?.whatsappPhone);
  if (fromOption) return fromOption;
  if (isReverendOption(option)) {
    return config.reverendWhatsApp || '';
  }
  return '';
}

function getRedirectName(option) {
  if (String(option?.redirectName || '').trim()) {
    return String(option.redirectName).trim();
  }
  const label = String(option?.label || '').trim();
  if (/estudiar/i.test(label) && /biblia/i.test(label)) return 'el estudio bíblico';
  if (/reverend/i.test(label)) return 'la reverenda';
  return label || 'tu solicitud';
}

function getRedirectPreposition(option) {
  const name = getRedirectName(option).toLowerCase();
  if (/reverend|pastor|herman/i.test(name)) return 'con';
  return 'a';
}

function hasRedirectFlow(option) {
  if (isCreenciasOption(option)) return false;
  return Boolean(
    String(option?.linkUrl || '').trim() ||
    resolveOptionPhone(option) ||
    option.forwardMessages
  );
}

function buildRedirectOptionReply(option) {
  if (!hasRedirectFlow(option)) {
    return { text: option.response || '', multiMessage: false };
  }

  const name = getRedirectName(option);
  const prep = getRedirectPreposition(option);
  const immediate =
    `⏳ *Te estamos redirigiendo ${prep} ${name}...*\n\nUn momento, por favor. 🙏`;

  const linkUrl = String(option.linkUrl || '').trim();
  const phone = resolveOptionPhone(option);

  if (linkUrl) {
    const details =
      `✅ *Listo.* Pulsa el enlace para continuar:\n\n${linkUrl}\n\n_Escribe *menu* para volver._`;

    return {
      multiMessage: true,
      messages: [immediate, details],
      text: `${immediate}\n\n${details}`,
    };
  }

  if (option.forwardMessages && phone && isReverendOption(option)) {
    const details =
      `✅ *Ya puedes escribirle.*\n\n` +
      `Escribe tu mensaje *en este mismo chat* y se lo enviamos a *${name}* de inmediato.\n\n` +
      `_No hace falta pulsar ningún enlace._\n\n` +
      `_Escribe *menu* para volver._`;

    return {
      multiMessage: true,
      messages: [immediate, details],
      text: `${immediate}\n\n${details}`,
    };
  }

  const waLink = phone
    ? buildWaMeLink(phone, option.whatsappPresetText || 'Hola, escribo desde el bot de la iglesia.')
    : null;

  if (waLink) {
    const details =
      `✅ *Listo.* Pulsa el enlace para continuar:\n\n${mainLink}\n\n_Escribe *menu* para volver._`;

    return {
      multiMessage: true,
      messages: [immediate, details],
      text: `${immediate}\n\n${details}`,
    };
  }

  const fallback = option.response || `Información sobre ${name}.`;
  return {
    multiMessage: true,
    messages: [immediate, `${fallback}\n\n_Escribe *menu* para volver._`],
    text: `${immediate}\n\n${fallback}`,
  };
}

function setForwardMode(chatId, phone, label) {
  if (!phone) return;
  forwardChatMode.set(chatId, { phone: digitsOnly(phone), label: label || 'Contacto' });
}

function clearForwardMode(chatId) {
  forwardChatMode.delete(chatId);
}

function isForwardMode(chatId) {
  return forwardChatMode.has(chatId);
}

function getForwardTarget(chatId) {
  return forwardChatMode.get(chatId) || null;
}

function getForwardChatId(phone) {
  return toChatId(digitsOnly(phone));
}

function getBeliefsSubmenuReply(messageBody, chatId) {
  if (isMenuCommand(messageBody)) {
    clearBeliefsSubmenuMode(chatId);
    clearForwardMode(chatId);
    return withMenuPresentation(buildMenuText(), 'menu');
  }

  if (isBeliefsSubmenuBackCommand(messageBody)) {
    return withMenuPresentation(buildBeliefsSubmenuText(), 'beliefs-submenu');
  }

  const choice = parseBeliefsSubmenuOption(messageBody);
  if (choice) {
    const item = getBeliefsSubmenuConfig().items[choice - 1];
    if (item?.response) {
      logger.info('Respuesta submenú creencias', { item: choice });
      return {
        text:
          `${item.response}\n\n` +
          '_Elige otro número del submenú, *atrás* para ver temas o *menu* para el inicio._',
        type: 'beliefs-answer',
      };
    }
  }

  return {
    text:
      'Por favor, elige un *número* del submenú de creencias (arriba), o escribe *atrás* / *menu*.',
    type: 'beliefs-hint',
  };
}

/**
 * Procesa saludo, menú, submenú de creencias o número de opción.
 */
function getMenuReply(messageBody, chatId) {
  if (!isMenuEnabled()) {
    return null;
  }

  if (isMenuCommand(messageBody)) {
    if (chatId) {
      clearBeliefsSubmenuMode(chatId);
      clearForwardMode(chatId);
    }
    logger.info('Menu de bienvenida enviado');
    return withMenuPresentation(buildMenuText(), 'menu');
  }

  if (isGreeting(messageBody)) {
    if (chatId) {
      clearBeliefsSubmenuMode(chatId);
      clearForwardMode(chatId);
    }
    logger.info('Menu de bienvenida enviado (saludo)');
    return withMenuPresentation(buildMenuText(), 'menu');
  }

  if (chatId && isBeliefsSubmenuMode(chatId)) {
    return getBeliefsSubmenuReply(messageBody, chatId);
  }

  const optionNum = parseMenuOption(messageBody);
  const option = optionNum ? getOptionByNumber(optionNum) : null;

  if (option) {
    logger.info('Respuesta opcion de menu', { option: optionNum });

    if (isCreenciasOption(option)) {
      if (chatId) {
        setBeliefsSubmenuMode(chatId, true);
        clearForwardMode(chatId);
      }
      return withMenuPresentation(buildBeliefsSubmenuText(), 'beliefs-submenu');
    }

    if (chatId) {
      clearBeliefsSubmenuMode(chatId);
    }

    const phone = resolveOptionPhone(option);
    const enableForward =
      Boolean(option.forwardMessages) && Boolean(phone) && isReverendOption(option);
    if (chatId && enableForward) {
      setForwardMode(chatId, phone, option.label);
    } else if (chatId) {
      clearForwardMode(chatId);
    }

    const built = buildRedirectOptionReply(option);
    return {
      text: built.text,
      messages: built.multiMessage ? built.messages : null,
      type: `menu-option-${optionNum}`,
    };
  }

  return null;
}

module.exports = {
  getMenuReply,
  buildMenuText,
  buildBeliefsSubmenuText,
  isGreeting,
  isMenuCommand,
  parseMenuOption,
  isMenuEnabled,
  isBeliefsSubmenuMode,
  clearBeliefsSubmenuMode,
  isForwardMode,
  clearForwardMode,
  getForwardTarget,
  getForwardChatId,
  getMenuConfig,
  getBeliefsSubmenuConfig,
};
