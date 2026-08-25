/**
 * Procesa un mensaje entrante de WhatsApp Cloud API (webhook de Meta).
 * Menú con botones/lista táctil (estilo banca).
 */

const { config } = require('../config/env');
const logger = require('../utils/logger');
const settingsService = require('./settingsService');
const messageStore = require('./messageStore');
const menuService = require('./menuService');
const chatSessionStore = require('./chatSessionStore');
const firestoreService = require('./firestoreService');
const cloudApi = require('./whatsappCloudApi');
const { getAutoReply } = require('./autoReplyService');

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

async function processCloudMessage(inbound) {
  const chatId = inbound.from;
  const body = inbound.body || '';
  const chatName = inbound.chatName || chatId;

  // “Escribiendo…” al instante (como apps de banco)
  const typingPromise = cloudApi.markReadWithTyping(inbound.id);

  const claimed = await firestoreService.claimProcessedMessage(inbound.id);
  if (!claimed) {
    logger.info('Webhook duplicado ignorado', { id: inbound.id });
    return;
  }

  await typingPromise;

  messageStore.addIncoming({
    from: chatId,
    body,
    chatName,
    messageType: inbound.type || 'text',
  });

  if (!settingsService.areResponsesEnabled()) {
    return;
  }

  const session = await chatSessionStore.load(chatId);
  menuService.hydrateChatState(chatId, session);

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
      !/^opt_/i.test(body)
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
            'No pudimos enviar el mensaje ahora. Prueba el enlace de WhatsApp o escribe *menu*.'
          );
        }
        return;
      }
    }

    const reply = await getAutoReply(fakeMessage, chatId);
    if (!reply) return;

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
    await chatSessionStore.save(chatId, menuService.exportChatState(chatId));
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
