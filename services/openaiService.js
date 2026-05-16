/**
 * Integración con OpenAI (ChatGPT) para respuestas a preguntas complejas.
 */

const { config } = require('../config/env');
const { systemPrompt } = require('../config/openai');
const { isComplexMessage } = require('../utils/complexMessage');
const { isChurchRelated } = require('../utils/churchTopic');
const logger = require('../utils/logger');

/** Cliente OpenAI (singleton) */
let openaiClient = null;

/** Historial corto por chat: chatId -> [{role, content}] */
const conversationHistory = new Map();

/** Última petición por chat (rate limit) */
const lastRequestAt = new Map();

function isEnabled() {
  return config.openai.enabled && Boolean(config.openai.apiKey);
}

function getClient() {
  if (!openaiClient) {
    // Carga diferida: no requiere el paquete si OpenAI está desactivado
    const OpenAI = require('openai');
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
}

/**
 * Comprueba cooldown por usuario para no saturar la API.
 */
function isOnCooldown(chatId) {
  const last = lastRequestAt.get(chatId);
  if (!last) return false;
  return Date.now() - last < config.openai.cooldownMs;
}

function touchCooldown(chatId) {
  lastRequestAt.set(chatId, Date.now());
}

/**
 * Obtiene y actualiza historial de conversación (ventana deslizante).
 */
function getHistory(chatId) {
  if (!conversationHistory.has(chatId)) {
    conversationHistory.set(chatId, []);
  }
  return conversationHistory.get(chatId);
}

function appendToHistory(chatId, role, content) {
  const history = getHistory(chatId);
  history.push({ role, content });

  const max = config.openai.maxHistoryMessages;
  while (history.length > max) {
    history.shift();
  }
}

function clearHistory(chatId) {
  conversationHistory.delete(chatId);
}

/**
 * Indica si este mensaje debe ir a ChatGPT.
 */
function shouldUseAI(messageBody, chatId) {
  if (!isEnabled()) return false;

  if (isOnCooldown(chatId)) {
    logger.debug('OpenAI en cooldown para este chat', { chatId });
    return false;
  }

  const isComplex = isComplexMessage(messageBody, {
    minLength: config.openai.minMessageLength,
    onlyQuestions: config.openai.onlyQuestions,
    ignoreGreetings: config.openai.ignoreGreetings,
  });

  if (!isComplex) return false;

  // Solo preguntas relacionadas con la iglesia
  if (config.openai.churchTopicsOnly && !isChurchRelated(messageBody)) {
    return false;
  }

  return true;
}

/**
 * True si es pregunta compleja pero fuera del ámbito de la iglesia.
 */
function isOffTopicQuestion(messageBody) {
  if (!config.openai.churchTopicsOnly) return false;

  const isComplex = isComplexMessage(messageBody, {
    minLength: config.openai.minMessageLength,
    onlyQuestions: config.openai.onlyQuestions,
    ignoreGreetings: config.openai.ignoreGreetings,
  });

  return isComplex && !isChurchRelated(messageBody);
}

/**
 * Genera respuesta con ChatGPT.
 * @param {string} userMessage
 * @param {string} chatId - ID del chat de WhatsApp
 */
async function generateReply(userMessage, chatId = 'default', options = {}) {
  if (!isEnabled()) {
    return null;
  }

  const beliefsMode = Boolean(options.beliefsMode);

  if (!beliefsMode && isOffTopicQuestion(userMessage)) {
    logger.info('Pregunta fuera de tema (no iglesia) — respuesta automática', { chatId });
    return config.openai.offTopicMessage;
  }

  if (beliefsMode && config.openai.churchTopicsOnly && !isChurchRelated(userMessage)) {
    logger.info('Pregunta fuera de tema en modo creencias', { chatId });
    return config.openai.offTopicMessage;
  }

  if (!beliefsMode && !shouldUseAI(userMessage, chatId)) {
    return null;
  }

  if (beliefsMode && isOnCooldown(chatId)) {
    logger.debug('OpenAI en cooldown (modo creencias)', { chatId });
    return null;
  }

  try {
    const client = getClient();
    const history = getHistory(chatId);

    const messages = [
      { role: 'system', content: config.openai.systemPrompt || systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];

    logger.info('Consultando OpenAI...', {
      model: config.openai.model,
      chatId,
    });

    const completion = await client.chat.completions.create({
      model: config.openai.model,
      messages,
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      logger.warn('OpenAI devolvió respuesta vacía');
      return null;
    }

    // Guardar en historial para contexto en mensajes siguientes
    appendToHistory(chatId, 'user', userMessage);
    appendToHistory(chatId, 'assistant', reply);

    touchCooldown(chatId);

    logger.success('Respuesta OpenAI generada', {
      tokens: completion.usage?.total_tokens,
      length: reply.length,
    });

    return reply;
  } catch (error) {
    logger.error('Error al llamar OpenAI', {
      message: error.message,
      status: error.status,
    });
    return null;
  }
}

module.exports = {
  isEnabled,
  shouldUseAI,
  isOffTopicQuestion,
  generateReply,
  clearHistory,
};
