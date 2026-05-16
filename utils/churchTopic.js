/**
 * Filtra mensajes: solo temas relacionados con la iglesia / fe cristiana.
 */

const { churchTopicKeywords, offTopicKeywords } = require('../config/openai');

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Palabras cortas (ej. "fe") no deben coincidir dentro de "profesional".
 */
function matchesKeyword(text, keyword) {
  const k = normalize(keyword);
  if (!k) return false;

  // Frases o palabras largas: búsqueda por substring
  if (k.includes(' ') || k.length > 3) {
    return text.includes(k);
  }

  // Palabras cortas: coincidencia de palabra completa
  const re = new RegExp(
    `(?:^|[\\s,.;:!?¿¡()\\[\\]"'\\-])${escapeRegex(k)}(?:$|[\\s,.;:!?¿¡()\\[\\]"'\\-])`
  );
  return re.test(text);
}

/**
 * True si el mensaje trata sobre la iglesia, la fe o la vida espiritual en ese contexto.
 */
function isChurchRelated(messageBody) {
  const n = normalize(messageBody);
  const padded = ` ${n} `;

  const hasOffTopic = offTopicKeywords.some((word) => matchesKeyword(padded, word));
  const hasChurch = churchTopicKeywords.some((word) => matchesKeyword(padded, word));

  if (hasOffTopic && !hasChurch) {
    return false;
  }

  return hasChurch;
}

module.exports = { isChurchRelated, matchesKeyword };
