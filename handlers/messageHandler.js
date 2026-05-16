/**
 * Handler de mensajes entrantes de WhatsApp.
 */

const logger = require('../utils/logger');
const { getAutoReply } = require('../services/autoReplyService');
const { safeAsync } = require('../utils/asyncHandler');
const messageStore = require('../services/messageStore');
const settingsService = require('../services/settingsService');

/** Evita duplicados al escuchar message y message_create */
const processedIds = new Set();

function shouldProcess(message) {
  const id = message.id?._serialized || message.id?.id || message.id;
  if (!id) return true;
  if (processedIds.has(id)) return false;
  processedIds.add(id);
  if (processedIds.size > 300) {
    const first = processedIds.values().next().value;
    processedIds.delete(first);
  }
  return true;
}

/**
 * Texto visible para mensajes sin body (audio, imagen, etc.)
 */
function getMessageBody(message) {
  if (message.body) {
    return message.body;
  }

  const type = message.type;
  const labels = {
    image: '[Imagen]',
    video: '[Video]',
    audio: '[Audio]',
    ptt: '[Nota de voz]',
    sticker: '[Sticker]',
    document: '[Documento]',
    location: '[Ubicacion]',
    vcard: '[Contacto]',
    poll: '[Encuesta]',
  };

  return labels[type] || (type ? `[${type}]` : '[Mensaje sin texto]');
}

function formatChatId(from) {
  if (!from) return 'Desconocido';
  const num = from.split('@')[0];
  return num || from;
}

async function resolveChatName(message) {
  if (message.notifyName) {
    return message.notifyName;
  }

  try {
    const contact = await Promise.race([
      message.getContact(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 2500)
      ),
    ]);
    return contact.pushname || contact.name || contact.number || formatChatId(message.from);
  } catch {
    return formatChatId(message.from);
  }
}

async function processMessage(client, message) {
  if (!shouldProcess(message)) {
    return;
  }

  if (message.fromMe) {
    return;
  }

  if (message.from === 'status@broadcast') {
    return;
  }

  const body = getMessageBody(message);
  const chatName = message.notifyName || formatChatId(message.from);

  // Guardar YA en el panel (no esperar getContact)
  messageStore.addIncoming({
    from: message.from,
    body,
    chatName,
    messageType: message.type || 'text',
  });

  logger.info('Mensaje recibido', {
    from: chatName,
    preview: body.substring(0, 60),
  });

  // Mejorar nombre en segundo plano (opcional)
  safeAsync(async () => {
    const betterName = await resolveChatName(message);
    if (betterName && betterName !== chatName) {
      logger.debug('Nombre de contacto actualizado', { name: betterName });
    }
  }, 'Resolver nombre de contacto');

  if (!settingsService.areResponsesEnabled()) {
    return;
  }

  const reply = await getAutoReply(message, message.from);

  if (!reply) {
    return;
  }

  await client.sendMessage(message.from, reply.text);

  messageStore.addOutgoing({
    to: message.from,
    body: reply.text,
    replyType: reply.type,
    chatName,
  });

  logger.success('Respuesta automatica enviada', {
    to: chatName,
    type: reply.type,
  });
}

function registerMessageHandler(client) {
  const onIncoming = (message) => {
    safeAsync(() => processMessage(client, message), 'Procesamiento de mensaje');
  };

  // message_create es mas fiable en versiones recientes de whatsapp-web.js
  client.on('message_create', onIncoming);

  // Respaldo por si solo dispara 'message'
  client.on('message', onIncoming);

  logger.info('Message handler registrado (message + message_create)');
}

module.exports = { registerMessageHandler, processMessage };
