/**
 * Servicio de respuestas automáticas por palabras clave + OpenAI.
 */

const { keywords } = require('../config/keywords');
const logger = require('../utils/logger');
const openaiService = require('./openaiService');

/**
 * Normaliza el texto del mensaje para comparación.
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca una respuesta por palabra clave.
 */
function findKeywordResponse(messageBody) {
  const normalized = normalizeText(messageBody);

  for (const entry of keywords) {
    const matched = entry.triggers.some((trigger) =>
      normalized.includes(normalizeText(trigger))
    );

    if (matched) {
      return entry.response;
    }
  }

  return null;
}

/**
 * Procesa un mensaje entrante y devuelve la respuesta a enviar (o null).
 * Prioridad: 1) palabras clave  2) ChatGPT (preguntas complejas)
 */
async function getAutoReply(message) {
  if (message.fromMe || !message.body) {
    return null;
  }

  if (message.from === 'status@broadcast') {
    return null;
  }

  // Comando para reiniciar conversación con ChatGPT
  const resetCmd = message.body.trim().toLowerCase();
  if (['!reset', 'reiniciar', 'reiniciar chat'].includes(resetCmd)) {
    if (openaiService.isEnabled()) {
      openaiService.clearHistory(message.from);
      return 'Conversación reiniciada. ¿En qué puedo ayudarte?';
    }
  }

  // 1. Respuestas fijas por palabra clave (siempre tienen prioridad)
  const keywordReply = findKeywordResponse(message.body);

  if (keywordReply) {
    logger.info('Respuesta por palabra clave', {
      from: message.from,
      keyword: message.body.substring(0, 50),
    });
    return keywordReply;
  }

  // 2. ChatGPT para preguntas complejas
  if (openaiService.isEnabled()) {
    const chatId = message.from;

    if (openaiService.shouldUseAI(message.body, chatId)) {
      const aiReply = await openaiService.generateReply(message.body, chatId);

      if (aiReply) {
        logger.info('Respuesta generada por ChatGPT', { from: chatId });
        return aiReply;
      }
    }
  }

  return null;
}

module.exports = { getAutoReply, findKeywordResponse, normalizeText };
