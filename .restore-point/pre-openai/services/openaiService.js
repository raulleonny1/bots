/**
 * Servicio preparado para integración futura con OpenAI API.
 * Actualmente es un stub: activa OPENAI_ENABLED=true cuando tengas API key.
 */

const { config } = require('../config/env');
const logger = require('../utils/logger');

function isEnabled() {
  return config.openai.enabled && Boolean(config.openai.apiKey);
}

/**
 * Genera una respuesta usando OpenAI (implementación futura).
 * @param {string} userMessage - Mensaje del usuario
 * @returns {Promise<string|null>}
 */
async function generateReply(userMessage) {
  if (!isEnabled()) {
    return null;
  }

  // TODO: Descomentar e instalar 'openai' cuando quieras activar esta función:
  // npm install openai
  //
  // const OpenAI = require('openai');
  // const openai = new OpenAI({ apiKey: config.openai.apiKey });
  //
  // const completion = await openai.chat.completions.create({
  //   model: config.openai.model,
  //   messages: [
  //     { role: 'system', content: 'Eres un asistente amable de una iglesia.' },
  //     { role: 'user', content: userMessage },
  //   ],
  // });
  // return completion.choices[0]?.message?.content || null;

  logger.debug('OpenAI habilitado pero stub activo — implementa generateReply en services/openaiService.js');
  return null;
}

module.exports = { isEnabled, generateReply };
