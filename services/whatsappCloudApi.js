/**
 * Envío de mensajes por WhatsApp Cloud API (Graph).
 * Incluye listas/botones (como bancos) y “escribiendo…”.
 */

const { config } = require('../config/env');
const logger = require('../utils/logger');

function isConfigured() {
  return Boolean(
    config.whatsappCloud.enabled &&
      config.whatsappCloud.token &&
      config.whatsappCloud.phoneNumberId
  );
}

function graphUrl(path) {
  const version = config.whatsappCloud.apiVersion || 'v21.0';
  return `https://graph.facebook.com/${version}/${path}`;
}

async function graphPost(body) {
  const res = await fetch(graphUrl(`${config.whatsappCloud.phoneNumberId}/messages`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsappCloud.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      ...body,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error?.message || res.statusText;
    throw new Error(err);
  }
  return data;
}

function digits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function truncate(text, max) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

/** Doble check azul + “escribiendo…” (experiencia tipo banco). */
async function markReadWithTyping(messageId) {
  if (!messageId || !isConfigured()) return null;
  try {
    return await graphPost({
      status: 'read',
      message_id: messageId,
      typing_indicator: { type: 'text' },
    });
  } catch (error) {
    logger.warn('Cloud API: no se pudo marcar leído/typing', { message: error.message });
    return null;
  }
}

async function sendText(to, text) {
  const waId = digits(to);
  if (!waId || !String(text || '').trim()) return null;
  return graphPost({
    to: waId,
    type: 'text',
    text: { body: String(text), preview_url: false },
  });
}

async function sendImage(to, imageUrl, caption) {
  const waId = digits(to);
  if (!waId || !imageUrl) return null;
  const image = { link: imageUrl };
  if (caption) image.caption = caption;
  return graphPost({
    to: waId,
    type: 'image',
    image,
  });
}

/**
 * Lista desplegable (hasta 10 opciones) — como menús de bancos.
 */
async function sendInteractiveList(to, { header, body, footer, button, rows }) {
  const waId = digits(to);
  const listRows = (rows || [])
    .slice(0, 10)
    .map((row) => ({
      id: String(row.id).slice(0, 200),
      title: truncate(row.title, 24),
      ...(row.description ? { description: truncate(row.description, 72) } : {}),
    }))
    .filter((row) => row.id && row.title);

  if (!waId || !listRows.length || !body) return null;

  const interactive = {
    type: 'list',
    body: { text: truncate(body, 1024) },
    action: {
      button: truncate(button || 'Ver opciones', 20),
      sections: [{ title: truncate(header || 'Menú', 24), rows: listRows }],
    },
  };
  if (footer) interactive.footer = { text: truncate(footer, 60) };

  return graphPost({
    to: waId,
    type: 'interactive',
    interactive,
  });
}

/** Hasta 3 botones de respuesta rápida. */
async function sendInteractiveButtons(to, { body, footer, buttons }) {
  const waId = digits(to);
  const list = (buttons || [])
    .slice(0, 3)
    .map((btn) => ({
      type: 'reply',
      reply: {
        id: String(btn.id).slice(0, 256),
        title: truncate(btn.title, 20),
      },
    }))
    .filter((btn) => btn.reply.id && btn.reply.title);

  if (!waId || !list.length || !body) return null;

  const interactive = {
    type: 'button',
    body: { text: truncate(body, 1024) },
    action: { buttons: list },
  };
  if (footer) interactive.footer = { text: truncate(footer, 60) };

  return graphPost({
    to: waId,
    type: 'interactive',
    interactive,
  });
}

async function sendInteractive(to, interactive) {
  if (!interactive) return null;
  if (interactive.kind === 'list') {
    return sendInteractiveList(to, interactive);
  }
  if (interactive.kind === 'buttons') {
    return sendInteractiveButtons(to, interactive);
  }
  return null;
}

async function sendParts(to, parts) {
  const results = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const text = typeof part === 'string' ? part : part?.text;
    if (!text) continue;
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    results.push(await sendText(to, text));
  }
  return results;
}

module.exports = {
  isConfigured,
  sendText,
  sendImage,
  sendParts,
  sendInteractive,
  sendInteractiveList,
  sendInteractiveButtons,
  markReadWithTyping,
  digits,
  truncate,
};
