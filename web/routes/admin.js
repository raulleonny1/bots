/**
 * Rutas del panel administrativo.
 */

const express = require('express');
const QRCode = require('qrcode');
const { config } = require('../../config/env');
const settingsService = require('../../services/settingsService');
const messageStore = require('../../services/messageStore');
const botStateService = require('../../services/botStateService');
const { restartScheduler } = require('../../services/schedulerService');
const { requireAuth, redirectIfAuthenticated, handleLogin, clearAuthCookie } = require('../middleware/auth');
const { isCloudApiEnabled, publicBaseUrl, isVercel } = require('../../utils/runtime');
const { isFirebaseReady } = require('../../config/firebase');

const QR_IMAGE_OPTS = { width: 512, margin: 2, errorCorrectionLevel: 'M' };

async function botWithQr() {
  if (isCloudApiEnabled()) {
    const configured = Boolean(config.whatsappCloud.token && config.whatsappCloud.phoneNumberId);
    return {
      status: configured ? 'ready' : 'disconnected',
      pushname: 'WhatsApp Cloud API',
      number: config.whatsappCloud.phoneNumberId || null,
      reconnectAttempts: 0,
      schedulerActive: false,
      lastQr: null,
      lastDisconnectReason: configured ? null : 'falta_token_cloud_api',
      qrDataUrl: null,
      cloudMode: true,
    };
  }

  botStateService.syncFromClient(global.whatsappClient);
  const bot = botStateService.getState();
  let qrDataUrl = null;

  if (bot.lastQr) {
    try {
      qrDataUrl = await QRCode.toDataURL(bot.lastQr, QR_IMAGE_OPTS);
    } catch {
      qrDataUrl = null;
    }
  }

  return { ...bot, qrDataUrl, cloudMode: false };
}

/** Imagen PNG del QR (mejor que data URL en otros PCs/navegadores) */
async function sendQrPng(res) {
  botStateService.syncFromClient(global.whatsappClient);
  const bot = botStateService.getState();

  if (!bot.lastQr) {
    res.status(404).type('text/plain').send('No hay QR activo. Pulsa Conectar en el panel.');
    return;
  }

  try {
    const png = await QRCode.toBuffer(bot.lastQr, { ...QR_IMAGE_OPTS, type: 'png' });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(png);
  } catch (error) {
    res.status(500).type('text/plain').send(error.message);
  }
}

const router = express.Router();

async function getDashboardData(req) {
  const base = publicBaseUrl(req);
  const cloudMode = isCloudApiEnabled();
  return {
    bot: await botWithQr(),
    settings: settingsService.getSettings(),
    stats: messageStore.getStats(),
    localPanelUrl: base,
    cloudMode,
    firebaseReady: isFirebaseReady(),
    webhookUrl: `${base}/webhook`,
    config: {
      botName: config.botName,
      openaiEnvEnabled: config.openai.enabled,
      timezone: config.cron.timezone,
    },
  };
}

function renderPrivacy(req, res) {
  res.render('privacy', {
    title: 'Política de privacidad',
    botName: config.botName,
  });
}

function renderTerms(req, res) {
  res.render('terms', {
    title: 'Condiciones de servicio',
    botName: config.botName,
  });
}

function renderDataDeletion(req, res) {
  res.render('data-deletion', {
    title: 'Eliminación de datos',
    botName: config.botName,
  });
}

router.get('/privacidad', renderPrivacy);
router.get('/privacy', renderPrivacy);
router.get('/politica-de-privacidad', renderPrivacy);

router.get('/terminos', renderTerms);
router.get('/terms', renderTerms);
router.get('/condiciones', renderTerms);
router.get('/condiciones-de-servicio', renderTerms);

router.get('/eliminacion-datos', renderDataDeletion);
router.get('/data-deletion', renderDataDeletion);
router.get('/borrar-datos', renderDataDeletion);

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', { error: null, title: 'Iniciar sesión' });
});

router.post('/login', express.urlencoded({ extended: true }), handleLogin);

router.post('/logout', (req, res) => {
  if (req.session) req.session.authenticated = false;
  clearAuthCookie(res);
  if (req.session?.destroy) {
    return req.session.destroy(() => {
      res.redirect('/login');
    });
  }
  res.redirect('/login');
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const data = await getDashboardData(req);
    res.render('dashboard', {
      title: 'Panel - Estado',
      ...data,
      cloudMode: true,
      webhookUrl: data.webhookUrl || 'https://www.botselbuenpastor.online/webhook',
      firebaseReady: Boolean(data.firebaseReady),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/api/whatsapp/qr-image', async (req, res) => {
  await sendQrPng(res);
});

router.get('/whatsapp-qr', async (req, res) => {
  botStateService.syncFromClient(global.whatsappClient);
  const bot = botStateService.getState();
  res.render('qr-fullscreen', {
    title: 'QR WhatsApp',
    hasQr: Boolean(bot.lastQr),
    status: bot.status,
  });
});

router.post('/api/whatsapp/disconnect', async (req, res) => {
  if (isCloudApiEnabled()) {
    return res.json({ ok: false, error: 'El panel en Vercel usa Cloud API. No hay QR ni desconexión de Chrome.' });
  }
  try {
    const whatsappControl = require('../../services/whatsappControl');
    await whatsappControl.disconnect();
    const botView = await botWithQr();
    res.json({ ok: true, bot: botView });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/api/whatsapp/connect', async (req, res) => {
  if (isCloudApiEnabled()) {
    return res.json({ ok: false, error: 'El panel en Vercel usa Cloud API. Configura el webhook en Meta.' });
  }
  try {
    const whatsappControl = require('../../services/whatsappControl');
    whatsappControl.startConnect();
    const botView = await botWithQr();
    res.json({
      ok: true,
      bot: botView,
      message: 'Conectando WhatsApp… el estado se actualiza solo en unos segundos.',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/api/whatsapp/reconnect', async (req, res) => {
  if (isCloudApiEnabled()) {
    return res.json({ ok: false, error: 'El panel en Vercel usa Cloud API. No hay reconexión QR.' });
  }
  try {
    const whatsappControl = require('../../services/whatsappControl');
    whatsappControl.startConnect();
    const botView = await botWithQr();
    res.json({ ok: true, bot: botView });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/api/whatsapp/new-qr', async (req, res) => {
  if (isCloudApiEnabled()) {
    return res.json({ ok: false, error: 'El panel en Vercel usa Cloud API. No hay código QR.' });
  }
  try {
    const whatsappControl = require('../../services/whatsappControl');
    whatsappControl.startNewQr();
    const botView = await botWithQr();
    res.json({
      ok: true,
      bot: botView,
      message: 'Generando QR… aparecera en pantalla en unos segundos.',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/messages', async (req, res) => {
  const direction = req.query.direction || 'all';
  const messages = await messageStore.getMessages({
    limit: 150,
    direction: direction === 'all' ? undefined : direction,
  });

  res.render('messages', {
    title: 'Panel — Mensajes',
    messages,
    direction,
    stats: messageStore.getStats(),
  });
});

router.post('/messages/clear', async (req, res) => {
  await messageStore.clearMessages();
  res.redirect('/messages');
});

router.get('/menu', (req, res, next) => {
  try {
    const settings = settingsService.getSettings();
    res.render('menu', {
      title: 'Panel — Editar menu',
      settings,
      menu: settingsService.getMenuConfig(),
      config: {
        openaiEnvEnabled: config.openai.enabled,
        openaiUiEnabled: settingsService.isOpenaiRepliesEnabled(),
      },
      saved: req.query.saved === '1',
      saveError: req.query.error === '1',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/settings/menu', express.urlencoded({ extended: true, limit: '2mb' }), async (req, res) => {
  const greetings = String(req.body.greetings || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

  let options = [];
  try {
    const parsed = JSON.parse(String(req.body.menuTree || '[]'));
    options = Array.isArray(parsed) ? parsed : [];
  } catch {
    return res.redirect('/menu?error=1');
  }

  try {
    settingsService.saveSettings({
      menu: {
        intro: req.body.intro || '',
        footer: req.body.footer || '',
        greetings,
        options,
      },
    });
    await settingsService.waitForSave();
    return res.redirect('/menu?saved=1');
  } catch (error) {
    return res.redirect('/menu?error=1');
  }
});

router.get('/automations', (req, res) => {
  const settings = settingsService.getSettings();
  res.render('automations', {
    title: 'Panel — Automatizaciones',
    settings,
    config: {
      timezone: config.cron.timezone,
      openaiEnvEnabled: config.openai.enabled,
    },
    saved: req.query.saved === '1',
  });
});

router.post('/settings/toggle', express.urlencoded({ extended: true }), async (req, res) => {
  const { field, value } = req.body;
  const allowed = ['responsesEnabled', 'keywordRepliesEnabled', 'menuEnabled', 'openaiRepliesEnabled'];

  if (!allowed.includes(field)) {
    return res.status(400).send('Campo no válido');
  }

  let parsedValue = value === 'true' || value === 'on' || value === '1';

  if (field === 'openaiRepliesEnabled' && (value === 'env' || value === 'null')) {
    parsedValue = null;
  }

  settingsService.saveSettings({ [field]: parsedValue });
  await settingsService.waitForSave();
  res.redirect('/automations?saved=1');
});

router.post('/settings/keywords', express.urlencoded({ extended: true }), async (req, res) => {
  const triggersList = Array.isArray(req.body.triggers)
    ? req.body.triggers
    : [req.body.triggers].filter(Boolean);
  const responsesList = Array.isArray(req.body.responses)
    ? req.body.responses
    : [req.body.responses].filter(Boolean);

  const keywords = triggersList
    .map((triggers, i) => ({
      triggers: String(triggers || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      response: String(responsesList[i] || '').trim(),
    }))
    .filter((k) => k.triggers.length && k.response);

  settingsService.saveSettings({ keywords });
  await settingsService.waitForSave();
  res.redirect('/automations?saved=1');
});

router.post('/settings/daily', express.urlencoded({ extended: true }), async (req, res) => {
  const recipients = String(req.body.recipients || '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

  settingsService.saveSettings({
    dailyMessage: {
      text: req.body.text || '',
      hour: parseInt(req.body.hour, 10) || 8,
      minute: parseInt(req.body.minute, 10) || 0,
      recipients,
    },
  });
  await settingsService.waitForSave();

  restartScheduler();
  res.redirect('/automations?saved=1');
});

router.get('/api/messages', async (req, res) => {
  const direction = req.query.direction || 'all';
  const since = req.query.since;

  res.json({
    messages: await messageStore.getMessages({
      limit: 150,
      direction: direction === 'all' ? undefined : direction,
      since,
    }),
    stats: messageStore.getStats(),
  });
});

/** Tiempo real: SSE en el PC; en Vercel el panel hace polling a /api/status */
router.get('/api/live', async (req, res) => {
  if (isVercel() || isCloudApiEnabled()) {
    const bot = await botWithQr();
    return res.json({
      type: 'status',
      bot,
      settings: {
        responsesEnabled: settingsService.areResponsesEnabled(),
        keywordRepliesEnabled: settingsService.areKeywordRepliesEnabled(),
        openaiRepliesEnabled: settingsService.isOpenaiRepliesEnabled(),
      },
      stats: messageStore.getStats(),
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const onMessage = (msg) => send({ type: 'message', message: msg, stats: messageStore.getStats() });
  const onUpdate = (data) => send({ type: 'update', ...data });

  messageStore.onEvent('message', onMessage);
  messageStore.onEvent('update', onUpdate);

  const heartbeat = setInterval(async () => {
    const bot = await botWithQr();
    send({
      type: 'status',
      bot,
      settings: {
        responsesEnabled: settingsService.areResponsesEnabled(),
        keywordRepliesEnabled: settingsService.areKeywordRepliesEnabled(),
        openaiRepliesEnabled: settingsService.isOpenaiRepliesEnabled(),
      },
      stats: messageStore.getStats(),
    });
  }, 2000);

  send({
    type: 'status',
    bot: await botWithQr(),
    stats: messageStore.getStats(),
  });

  req.on('close', () => {
    clearInterval(heartbeat);
    messageStore.offEvent('message', onMessage);
    messageStore.offEvent('update', onUpdate);
  });
});

router.get('/api/status', async (req, res) => {
  res.json({
    bot: await botWithQr(),
    settings: {
      responsesEnabled: settingsService.areResponsesEnabled(),
      keywordRepliesEnabled: settingsService.areKeywordRepliesEnabled(),
      openaiRepliesEnabled: settingsService.isOpenaiRepliesEnabled(),
    },
    stats: messageStore.getStats(),
  });
});

module.exports = router;
