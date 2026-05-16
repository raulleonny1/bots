/**
 * Servicio de respuestas automáticas por palabras clave + OpenAI.
 */

const settingsService = require('./settingsService');
const logger = require('../utils/logger');
const openaiService = require('./openaiService');
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
    menuService.clearBeliefsMode(chatId);
    if (openaiService.isEnabled()) {
      openaiService.clearHistory(chatId);
    }
    return { text: menuService.buildMenuText(), type: 'menu' };
  }

  const menuReply = menuService.getMenuReply(message.body, chatId);
  if (menuReply) {
    return menuReply;
  }

  // Modo creencias: tras elegir opcion con ChatGPT, responde con IA
  if (menuService.isBeliefsMode(chatId)) {
    if (settingsService.isOpenaiRepliesEnabled() && openaiService.isEnabled()) {
      const aiReply = await openaiService.generateReply(message.body, chatId, {
        beliefsMode: true,
      });

      if (aiReply) {
        logger.info('Respuesta ChatGPT (modo creencias)', { from: chatId });
        return { text: aiReply, type: 'openai-beliefs' };
      }

      return {
        text:
          'No pude procesar tu pregunta. Asegúrate de que ChatGPT está activo en .env (OPENAI_ENABLED=true) y en el panel. Escribe *menu* para volver.',
        type: 'system',
      };
    }

    return {
      text:
        'El asistente de creencias no está disponible ahora. Activa ChatGPT en Automatizaciones y en tu archivo .env. Escribe *menu* para otras opciones.',
      type: 'system',
    };
  }

  const keywordMatch = findKeywordResponse(message.body);

  if (keywordMatch) {
    logger.info('Respuesta por palabra clave', {
      from: chatId,
      keyword: message.body.substring(0, 50),
    });
    return keywordMatch;
  }

  if (settingsService.isOpenaiRepliesEnabled() && openaiService.isEnabled()) {
    const aiReply = await openaiService.generateReply(message.body, chatId);

    if (aiReply) {
      const type = openaiService.isOffTopicQuestion(message.body) ? 'offtopic' : 'openai';
      logger.info('Respuesta generada por ChatGPT', { from: chatId, type });
      return { text: aiReply, type };
    }
  }

  return null;
}

module.exports = { getAutoReply, findKeywordResponse, normalizeText };
