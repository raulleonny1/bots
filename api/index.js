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

function isApiEntryPath(url) {
  return Boolean(url && /^\/api(\/index(\.js)?)?\/?(\?|$)/.test(String(url)));
}

/**
 * En Vercel el rewrite a /api a veces deja req.url como /api o /api/index.
 * No usar x-invoke-path: es la función, no la página, y al pisar /menu salía 404.
 */
function normalizeUrl(req) {
  const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-original-uri'];
  if (
    forwarded &&
    typeof forwarded === 'string' &&
    forwarded.startsWith('/') &&
    !isApiEntryPath(forwarded)
  ) {
    req.url = forwarded;
    return;
  }

  const current = String(req.url || '/');
  if (!isApiEntryPath(current)) return;

  const query = current.includes('?') ? current.slice(current.indexOf('?')) : '';
  req.url = query ? `/${query}` : '/';
}

module.exports = async function handler(req, res) {
  normalizeUrl(req);
  const server = await getApp();
  return server(req, res);
};
