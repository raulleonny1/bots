/**
 * Procesa un mensaje entrante de WhatsApp Cloud API (webhook de Meta).
 * Prioridad: responder YA (typing + botones); Firebase en paralelo / después.
 */

const logger = require('../utils/logger');
const settingsService = require('./settingsService');
const messageStore = require('./messageStore');
const menuService = require('./menuService');
const chatSessionStore = require('./chatSessionStore');
const firestoreService = require('./firestoreService');
const cloudApi = require('./whatsappCloudApi');
const { getAutoReply } = require('./autoReplyService');

/** Anti-duplicados en la misma instancia (sin esperar a Firebase). */
const seenMessageIds = new Map();

function claimLocal(messageId) {
  if (!messageId) return true;
  const now = Date.now();
  if (seenMessageIds.size > 800) {
    for (const [id, at] of seenMessageIds) {
      if (now - at > 15 * 60 * 1000) seenMessageIds.delete(id);
    }
  }
  if (seenMessageIds.has(messageId)) return false;
  seenMessageIds.set(messageId, now);
  return true;
}

function inboundText(message) {
  if (!message) return '';
  if (message.type === 'text') return String(message.text?.body || '').trim();
  if (message.type === 'button') {
    return String(message.button?.payload || message.button?.text || '').trim();
  }
  if (message.type === 'interactive') {
    const id =
      message.interactive?.button_reply?.id ||
      message.interactive?.list_reply?.id ||
      '';
    if (id) return String(id).trim();
    return String(
      message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        ''
    ).trim();
  }
  const labels = {
    image: '[Imagen]',
    audio: '[Audio]',
    video: '[Video]',
    document: '[Documento]',
    sticker: '[Sticker]',
    location: '[Ubicacion]',
    contacts: '[Contacto]',
  };
  return labels[message.type] || `[${message.type || 'mensaje'}]`;
}

function extractInboundMessages(payload) {
  const out = [];
  const entries = payload?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      if (change.field && change.field !== 'messages') continue;
      const contacts = value.contacts || [];
      for (const message of value.messages || []) {
        const contact = contacts.find((c) => c.wa_id === message.from) || contacts[0];
        out.push({
          id: message.id,
          from: message.from,
          type: message.type || 'text',
          body: inboundText(message),
          chatName: contact?.profile?.name || message.from,
        });
      }
    }
  }
  return out;
}

function normalizeReplyParts(reply) {
  if (Array.isArray(reply.messageParts) && reply.messageParts.length > 0) {
    return reply.messageParts.map((part) =>
      typeof part === 'string' ? { text: part } : part
    );
  }
  if (Array.isArray(reply.messages) && reply.messages.length > 0) {
    return reply.messages.map((text) => ({ text }));
  }
  return [{ text: reply.text }];
}

function needsSession(body) {
  if (!body) return false;
  if (menuService.isMenuCommand(body) || menuService.isGreeting(body)) return false;
  return true;
}

async function processCloudMessage(inbound) {
  const chatId = inbound.from;
  const body = inbound.body || '';
  const chatName = inbound.chatName || chatId;

  // 1) Feedback inmediato al usuario (no bloquea)
  cloudApi.markReadWithTyping(inbound.id).catch(() => {});

  // 2) Deduplicar sin round-trip a Firebase
  if (!claimLocal(inbound.id)) {
    logger.info('Webhook duplicado (local) ignorado', { id: inbound.id });
    return;
  }
  firestoreService.claimProcessedMessage(inbound.id).catch(() => {});

  messageStore.addIncoming({
    from: chatId,
    body,
    chatName,
    messageType: inbound.type || 'text',
  });

  if (!settingsService.areResponsesEnabled()) {
    return;
  }

  // 3) Sesión: menú/hola no necesita leer Firebase
  if (needsSession(body)) {
    const session = await chatSessionStore.load(chatId);
    menuService.hydrateChatState(chatId, session);
  } else {
    menuService.hydrateChatState(chatId, chatSessionStore.emptyState());
  }

  const fakeMessage = {
    from: chatId,
    body,
    fromMe: false,
  };

  try {
    if (
      menuService.isForwardMode(chatId) &&
      !menuService.isBeliefsSubmenuMode(chatId) &&
      body &&
      !menuService.isMenuCommand(body) &&
      !menuService.isGreeting(body) &&
      !/^opt_/i.test(body) &&
      !/^nav_/i.test(body)
    ) {
      const target = menuService.getForwardTarget(chatId);
      if (target?.phone) {
        const forwardText = `📩 *${chatName}* (${chatId}):\n\n${body}`;
        try {
          await cloudApi.sendText(target.phone, forwardText);
          const confirm = `✅ Tu mensaje fue enviado a ${target.label || 'la reverenda'}. Puedes seguir escribiendo aquí o tocar *Menú*.`;
          await cloudApi.sendInteractive(chatId, {
            kind: 'buttons',
            body: confirm,
            buttons: [{ id: 'nav_menu', title: '📋 Menú' }],
          });
          messageStore.addOutgoing({
            to: chatId,
            body: confirm,
            replyType: 'forward-reverend',
            chatName,
          });
        } catch (error) {
          logger.error('Cloud API: error al reenviar', { message: error.message });
          await cloudApi.sendText(
            chatId,
            'No pudimos enviar el mensaje ahora. Escribe *menu*.'
          );
        }
        return;
      }
    }

    const reply = await getAutoReply(fakeMessage, chatId);
    if (!reply) return;

    // 4) Responder YA
    if (reply.interactive) {
      try {
        await cloudApi.sendInteractive(chatId, reply.interactive);
        messageStore.addOutgoing({
          to: chatId,
          body: reply.text || '[menú interactivo]',
          replyType: reply.type,
          chatName,
        });
        logger.success('Cloud API: menú interactivo enviado', {
          to: chatName,
          type: reply.type,
          kind: reply.interactive.kind,
        });
        return;
      } catch (error) {
        logger.warn('Cloud API: interactive falló, envío texto', { message: error.message });
      }
    }

    const parts = normalizeReplyParts(reply).filter((p) => p?.text);
    await cloudApi.sendParts(chatId, parts);
    parts.forEach((part) => {
      messageStore.addOutgoing({
        to: chatId,
        body: part.text,
        replyType: reply.type,
        chatName,
      });
    });

    logger.success('Cloud API: respuesta enviada', {
      to: chatName,
      type: reply.type,
      parts: parts.length,
    });
  } finally {
    // Memoria inmediata; Firebase en segundo plano
    chatSessionStore.save(chatId, menuService.exportChatState(chatId)).catch((err) => {
      logger.warn('No se pudo guardar sesión de chat', { message: err.message });
    });
  }
}

async function handleCloudPayload(payload) {
  if (!cloudApi.isConfigured()) {
    logger.warn('Webhook Cloud API recibido pero falta WHATSAPP_TOKEN / PHONE_NUMBER_ID');
    return { processed: 0 };
  }

  await settingsService.init();
  const messages = extractInboundMessages(payload);
  for (const msg of messages) {
    await processCloudMessage(msg);
  }
  return { processed: messages.length };
}

module.exports = {
  extractInboundMessages,
  handleCloudPayload,
  processCloudMessage,
};
