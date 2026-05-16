/**
 * Utilidades para formatear números de teléfono a chatId de WhatsApp.
 */

/**
 * Convierte un número en formato chatId (@c.us).
 * Acepta: "34612345678", "34612345678@c.us", IDs de grupo "@g.us"
 */
function toChatId(identifier) {
  const raw = String(identifier).trim();

  if (raw.includes('@')) {
    return raw;
  }

  // Solo dígitos para contactos individuales
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    throw new Error(`Identificador inválido: ${identifier}`);
  }

  return `${digits}@c.us`;
}

module.exports = { toChatId };
