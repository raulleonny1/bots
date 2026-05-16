/**
 * Servicio de respuestas automáticas por palabras clave y menú.
 */

const settingsService = require('./settingsService');
const logger = require('../utils/logger');
const menuService = require('./menuService');

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findKeywordResponse(messageBody) {
  if (!settingsService.areKeywordRepliesEnabled()) {
    return null;
  }

  const normalized = normalizeText(messageBody);
  const keywords = settingsService.getKeywords();

  for (const entry of keywords) {
    const triggers = entry.triggers || [];
    const matched = triggers.some((trigger) =>
      normalized.includes(normalizeText(trigger))
    );

    if (matched) {
      return { text: entry.response, type: 'keyword' };
    }
  }

  return null;
}

async function getAutoReply(message) {
  if (message.fromMe || !message.body) {
    return null;
  }

  if (message.from === 'status@broadcast') {
    return null;
  }

  if (!settingsService.areResponsesEnabled()) {
    return null;
  }

  const chatId = message.from;
  const resetCmd = message.body.trim().toLowerCase();

  if (['!reset', 'reiniciar', 'reiniciar chat'].includes(resetCmd)) {
    menuService.clearBeliefsSubmenuMode(chatId);
    menuService.clearForwardMode(chatId);
    return { text: menuService.buildMenuText(), type: 'menu', sendLogo: true };
  }

  const menuReply = menuService.getMenuReply(message.body, chatId);
  if (menuReply) {
    return menuReply;
  }

  const keywordMatch = findKeywordResponse(message.body);

  if (keywordMatch) {
    logger.info('Respuesta por palabra clave', {
      from: chatId,
      keyword: message.body.substring(0, 50),
    });
    return keywordMatch;
  }

  return null;
}

module.exports = { getAutoReply, findKeywordResponse, normalizeText };
