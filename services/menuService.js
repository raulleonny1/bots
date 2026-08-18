/**
 * Menú interactivo con submenús (editable desde el panel).
 */

const settingsService = require('./settingsService');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { digitsOnly, buildWaMeLink } = require('../utils/whatsappLink');
const { getLinkDisplayName, buildSplitLinkReply } = require('../utils/linkReply');
const { toChatId } = require('../utils/phone');
const {
  formatWhatsAppMainMenu,
  formatWhatsAppSubmenu,
  shouldSendLogoForReplyType,
} = require('../utils/whatsappMenuFormat');

/** chatId -> índices desde la raíz (vacío = menú principal) */
const navStack = new Map();
const viewingLeaf = new Map();
const forwardChatMode = new Map();

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getMenuConfig() {
  return settingsService.getMenuConfig();
}

function getRootOptions() {
  return getMenuConfig().options || [];
}

function getNodeAtPath(path) {
  let node = { label: 'Menú', children: getRootOptions() };
  for (const idx of path) {
    const list = node.children || [];
    node = list[idx];
    if (!node) return null;
  }
  return node;
}

function getCurrentOptions(chatId) {
  const path = navStack.get(chatId) || [];
  const node = getNodeAtPath(path);
  return node?.children || getRootOptions();
}

function buildMenuText() {
  return formatWhatsAppMainMenu(getMenuConfig());
}

function buildCurrentMenuText(chatId) {
  const path = navStack.get(chatId) || [];
  if (!path.length) return buildMenuText();
  const node = getNodeAtPath(path);
  return formatWhatsAppSubmenu({
    title: node?.label || 'Submenú',
    options: node?.children || [],
    intro: node?.response || '',
  });
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

function isBackCommand(messageBody) {
  const n = normalizeText(messageBody);
  return ['atras', 'volver'].includes(n);
}

function parseNumberChoice(messageBody, max) {
  const n = normalizeText(messageBody);
  if (max <= 0) return null;
  const match = n.match(/^(?:opcion|opción|numero|número)?\s*(\d{1,2})$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (num >= 1 && num <= max) return num;
  return null;
}

function clearNav(chatId) {
  if (chatId) {
    navStack.delete(chatId);
    viewingLeaf.delete(chatId);
  }
}

function isInSubmenu(chatId) {
  return Boolean(chatId && (navStack.get(chatId) || []).length);
}

function resolveOptionPhone(option) {
  const fromOption = digitsOnly(option?.whatsappPhone);
  if (fromOption) return fromOption;
  if (option?.type === 'forward') {
    return config.reverendWhatsApp || '';
  }
  return '';
}

function getRedirectName(option) {
  if (String(option?.redirectName || '').trim()) {
    return String(option.redirectName).trim();
  }
  return String(option?.label || '').trim() || 'tu solicitud';
}

function buildTextReply(option, inSubmenu) {
  const body = String(option.response || '').trim();
  const nav = inSubmenu
    ? '_Elige otro número, *atrás* para volver o *menu* para el inicio._'
    : '_Escribe *menu* para volver al inicio._';
  const text = `${body || `Información sobre ${option.label}.`}\n\n${nav}`;
  return { text, multiMessage: false };
}

function buildLinkReply(option, inSubmenu) {
  const linkUrl = String(option.linkUrl || '').trim();
  const custom = String(option.response || '').trim();
  const nav = '_Escribe *menu* para volver._';
  if (!linkUrl) {
    return buildTextReply(option, inSubmenu);
  }

  return buildSplitLinkReply({
    intro: custom,
    linkUrl,
    nav,
    displayName: getLinkDisplayName(option),
  });
}

function buildForwardReply(option, inSubmenu) {
  const name = getRedirectName(option);
  const phone = resolveOptionPhone(option);
  const waLink = phone ? buildWaMeLink(phone, '') : null;
  const custom = String(option.response || '').trim();
  const nav = '_Escribe *menu* para volver._';

  if (!phone && !waLink) {
    const text = custom
      ? `${custom}\n\n${nav}`
      : `No hay un número configurado para ${name}.\n\n${nav}`;
    return { text, multiMessage: false, phone: null };
  }

  const built = buildSplitLinkReply({
    intro: custom
      ? `${custom}\n\n✍️ *Escribe aquí en este chat* y reenviamos tu mensaje a *${name}*.`
      : `✍️ *Escribe aquí en este chat* y reenviamos tu mensaje a *${name}*.`,
    linkUrl: waLink,
    nav,
    displayName: name,
    kind: 'wa',
  });

  return {
    ...built,
    phone,
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

function handleOption(option, index, chatId, currentPath) {
  const type = option.type || 'text';
  logger.info('Respuesta opción de menú', { option: index + 1, type, label: option.label });

  if (type === 'submenu' && Array.isArray(option.children) && option.children.length) {
    if (chatId) {
      navStack.set(chatId, [...currentPath, index]);
      viewingLeaf.delete(chatId);
      clearForwardMode(chatId);
    }
    return withMenuPresentation(
      formatWhatsAppSubmenu({
        title: option.label,
        options: option.children,
        intro: option.response || '',
      }),
      'submenu'
    );
  }

  if (chatId && type !== 'forward') {
    clearForwardMode(chatId);
  }

  if (chatId) viewingLeaf.set(chatId, true);

  if (type === 'link') {
    const built = buildLinkReply(option, currentPath.length > 0);
    return {
      text: built.text,
      messageParts: built.messageParts || null,
      type: 'menu-link',
    };
  }

  if (type === 'forward') {
    const built = buildForwardReply(option, currentPath.length > 0);
    if (chatId && built.phone) {
      setForwardMode(chatId, built.phone, option.label);
    }
    return {
      text: built.text,
      messageParts: built.messageParts || null,
      type: 'menu-forward',
    };
  }

  const built = buildTextReply(option, currentPath.length > 0);
  return { text: built.text, type: 'menu-text' };
}

function getMenuReply(messageBody, chatId) {
  if (!isMenuEnabled()) {
    return null;
  }

  if (isMenuCommand(messageBody) || isGreeting(messageBody)) {
    clearNav(chatId);
    if (chatId) clearForwardMode(chatId);
    logger.info('Menú principal enviado');
    return withMenuPresentation(buildMenuText(), 'menu');
  }

  const path = chatId ? navStack.get(chatId) || [] : [];

  if (path.length && isBackCommand(messageBody)) {
    if (viewingLeaf.get(chatId)) {
      viewingLeaf.delete(chatId);
      return withMenuPresentation(buildCurrentMenuText(chatId), 'submenu');
    }
    const next = path.slice(0, -1);
    if (chatId) {
      if (next.length) navStack.set(chatId, next);
      else navStack.delete(chatId);
    }
    return withMenuPresentation(
      next.length ? buildCurrentMenuText(chatId) : buildMenuText(),
      next.length ? 'submenu' : 'menu'
    );
  }

  const current = path.length ? getNodeAtPath(path)?.children || [] : getRootOptions();
  const optionNum = parseNumberChoice(messageBody, current.length);
  if (optionNum) {
    const option = current[optionNum - 1];
    if (option) {
      return handleOption(option, optionNum - 1, chatId, path);
    }
  }

  if (path.length) {
    return {
      text: 'Elige un *número* de la lista, o escribe *atrás* / *menu*.',
      type: 'submenu-hint',
    };
  }

  return null;
}

function isBeliefsSubmenuMode(chatId) {
  return isInSubmenu(chatId);
}

function clearBeliefsSubmenuMode(chatId) {
  clearNav(chatId);
}

function hydrateChatState(chatId, state) {
  if (!chatId) return;
  const nav = Array.isArray(state?.navStack) ? state.navStack : [];
  if (nav.length) navStack.set(chatId, nav);
  else navStack.delete(chatId);

  if (state?.viewingLeaf) viewingLeaf.set(chatId, true);
  else viewingLeaf.delete(chatId);

  if (state?.forward?.phone) {
    forwardChatMode.set(chatId, {
      phone: digitsOnly(state.forward.phone),
      label: state.forward.label || 'Contacto',
    });
  } else {
    forwardChatMode.delete(chatId);
  }
}

function exportChatState(chatId) {
  if (!chatId) {
    return { navStack: [], viewingLeaf: false, forward: null };
  }
  return {
    navStack: navStack.get(chatId) || [],
    viewingLeaf: Boolean(viewingLeaf.get(chatId)),
    forward: forwardChatMode.get(chatId) || null,
  };
}

function buildBeliefsSubmenuText() {
  const creencias = getRootOptions().find(
    (opt) => opt.type === 'submenu' && /creencia/i.test(opt.label || '')
  );
  if (!creencias) return buildMenuText();
  return formatWhatsAppSubmenu({ title: creencias.label, options: creencias.children || [] });
}

module.exports = {
  getMenuReply,
  buildMenuText,
  buildBeliefsSubmenuText,
  isGreeting,
  isMenuCommand,
  isMenuEnabled,
  isBeliefsSubmenuMode,
  clearBeliefsSubmenuMode,
  isForwardMode,
  clearForwardMode,
  getForwardTarget,
  getForwardChatId,
  getMenuConfig,
  hydrateChatState,
  exportChatState,
};
