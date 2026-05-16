/**
 * Envuelve funciones async para capturar errores sin tumbar el proceso.
 */

const logger = require('./logger');

/**
 * Ejecuta una promesa y registra errores si falla.
 * @param {Function} fn - Función async a ejecutar
 * @param {string} context - Contexto para el log de error
 */
async function safeAsync(fn, context = 'Operación async') {
  try {
    return await fn();
  } catch (error) {
    logger.error(`${context} falló`, {
      message: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Wrapper para handlers de eventos (message, etc.)
 */
function wrapHandler(handler, context) {
  return (...args) => {
    safeAsync(() => handler(...args), context);
  };
}

module.exports = { safeAsync, wrapHandler };
