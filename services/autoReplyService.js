/**
 * Servicio de respuestas automáticas por palabras clave.
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
 */
async function getAutoReply(message) {
  // Ignorar mensajes propios, de estado o sin cuerpo
  if (message.fromMe || !message.body) {
    return null;
  }

  // Ignorar broadcasts y estados
  if (message.from === 'status@broadcast') {
    return null;
  }

  const keywordReply = findKeywordResponse(message.body);

  if (keywordReply) {
    logger.info('Respuesta por palabra clave', {
      from: message.from,
      keyword: message.body.substring(0, 50),
    });
    return keywordReply;
  }

  // Integración futura con OpenAI si está habilitada
  if (openaiService.isEnabled()) {
    const aiReply = await openaiService.generateReply(message.body);
    if (aiReply) {
      logger.info('Respuesta generada por OpenAI', { from: message.from });
      return aiReply;
    }
  }

  return null;
}

module.exports = { getAutoReply, findKeywordResponse, normalizeText };
