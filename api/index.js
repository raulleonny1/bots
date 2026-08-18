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

module.exports = async function handler(req, res) {
  const server = await getApp();
  return server(req, res);
};
