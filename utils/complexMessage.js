/**
 * Detecta si un mensaje merece respuesta con IA (pregunta compleja).
 */

const { shortGreetings, questionIndicators } = require('../config/openai');

/**
 * Normaliza texto para comparaciones.
 */
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * True si es solo un saludo corto (no usar OpenAI).
 */
function isShortGreeting(messageBody) {
  const n = normalize(messageBody);
  if (n.length > 30) return false;

  return shortGreetings.some((g) => n === normalize(g) || n.startsWith(`${normalize(g)} `));
}

/**
 * True si parece una pregunta o consulta elaborada.
 */
function looksLikeQuestion(messageBody, minLength = 25) {
  const text = messageBody.trim();
  const n = normalize(text);

  if (text.includes('?') || text.includes('¿')) {
    return true;
  }

  if (text.length >= minLength) {
    return true;
  }

  return questionIndicators.some((word) => n.includes(normalize(word)));
}

/**
 * Decide si el mensaje debe procesarse con ChatGPT.
 */
function isComplexMessage(messageBody, options = {}) {
  const {
    minLength = 25,
    onlyQuestions = true,
    ignoreGreetings = true,
  } = options;

  if (!messageBody || messageBody.trim().length < 3) {
    return false;
  }

  if (ignoreGreetings && isShortGreeting(messageBody)) {
    return false;
  }

  if (onlyQuestions) {
    return looksLikeQuestion(messageBody, minLength);
  }

  // Modo amplio: cualquier mensaje con longitud mínima
  return messageBody.trim().length >= minLength;
}

module.exports = {
  isComplexMessage,
  isShortGreeting,
  looksLikeQuestion,
};
