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
  await settingsService.init();
  await messageStore.init();
  app = createApp();
  return app;
}

function normalizeUrl(req) {
  const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'];
  if (forwarded && typeof forwarded === 'string') {
    req.url = forwarded.startsWith('/') ? forwarded : `/${forwarded}`;
  }
  // Rewrite destino /api/index.js -> ruta real
  if (req.url && /^\/api\/index(\.js)?\/?(\?|$)/.test(req.url)) {
    const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = `/${q}`;
  }
}

module.exports = async function handler(req, res) {
  normalizeUrl(req);
  const server = await getApp();
  return server(req, res);
};
