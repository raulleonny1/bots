/**
 * Envío de mensajes por WhatsApp Cloud API (Graph).
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

async function sendParts(to, parts) {
  const results = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const text = typeof part === 'string' ? part : part?.text;
    if (!text) continue;
    // Pausa corta para orden en WhatsApp; 400ms sumaba mucho con varios bloques.
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 80));
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
  digits,
};
