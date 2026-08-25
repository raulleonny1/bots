/**
 * Entrada Vercel: panel admin + webhook de WhatsApp Cloud API.
 */

const { createApp } = require('../web/server');
const { initFirebase } = require('../config/firebase');
const settingsService = require('../services/settingsService');
const messageStore = require('../services/messageStore');

let app;

async function getApp() {
  if (app) return app;
  initFirebase();
  // Solo settings (menú). Los mensajes del panel se cargan después, no bloquean el webhook.
  await settingsService.init();
  messageStore.init().catch(() => {});
  app = createApp();
  return app;
}

/**
 * Vercel rewrite manda todo a /api y a veces pierde /menu, /messages, etc.
 * Recuperamos la ruta desde ?__path= (vercel.json) o cabeceras reales.
 */
function normalizeUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  let raw = String(req.url || '/');

  try {
    const u = new URL(raw, `https://${host}`);
    if (u.searchParams.has('__path')) {
      const p = String(u.searchParams.get('__path') || '').replace(/^\/+/, '');
      u.searchParams.delete('__path');
      const q = u.searchParams.toString();
      const pathname = p ? `/${p}` : '/';
      raw = q ? `${pathname}?${q}` : pathname;
    }
  } catch {
    // keep raw
  }

  const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-original-uri'];
  if (
    (!raw || raw === '/' || /^\/api(\/index(\.js)?)?\/?(\?|$)/.test(raw)) &&
    forwarded &&
    typeof forwarded === 'string' &&
    forwarded.startsWith('/') &&
    !/^\/api(\/index(\.js)?)?\/?(\?|$)/.test(forwarded)
  ) {
    raw = forwarded;
  }

  if (!raw.startsWith('/')) raw = `/${raw}`;
  req.url = raw;
  req.originalUrl = raw;
}

module.exports = async function handler(req, res) {
  normalizeUrl(req);
  const server = await getApp();
  return server(req, res);
};
