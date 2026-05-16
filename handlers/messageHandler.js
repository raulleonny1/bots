/**
 * Handler de mensajes entrantes de WhatsApp.
 */

const logger = require('../utils/logger');
const { getAutoReply } = require('../services/autoReplyService');
const { safeAsync } = require('../utils/asyncHandler');

/**
 * Registra el listener de mensajes en el cliente.
 */
function registerMessageHandler(client) {
  client.on('message', async (message) => {
    await safeAsync(async () => {
      await handleIncomingMessage(client, message);
    }, 'Procesamiento de mensaje entrante');
  });

  logger.info('Message handler registrado');
}

/**
 * Procesa un mensaje individual.
 */
async function handleIncomingMessage(client, message) {
  // Log básico de actividad (sin spam en grupos muy activos en producción)
  if (message.body && !message.fromMe) {
    logger.debug('Mensaje recibido', {
      from: message.from,
      preview: message.body.substring(0, 80),
    });
  }

  const reply = await getAutoReply(message);

  if (!reply) {
    return;
  }

  // Pequeña pausa natural antes de responder (opcional, mejora UX)
  await client.sendMessage(message.from, reply);

  logger.success('Respuesta automática enviada', {
    to: message.from,
  });
}

module.exports = { registerMessageHandler, handleIncomingMessage };
