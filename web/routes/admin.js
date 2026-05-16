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
const whatsappControl = require('../../services/whatsappControl');
const { requireAuth, redirectIfAuthenticated, handleLogin } = require('../middleware/auth');

async function botWithQr() {
  botStateService.syncFromClient(global.whatsappClient);
  const bot = botStateService.getState();
  let qrDataUrl = null;

  if (bot.lastQr) {
    try {
      qrDataUrl = await QRCode.toDataURL(bot.lastQr, { width: 300 });
    } catch {
      qrDataUrl = null;
    }
  }

  return { ...bot, qrDataUrl };
}

const router = express.Router();

function getDashboardData() {
  return {
    bot: botStateService.getState(),
    settings: settingsService.getSettings(),
    stats: messageStore.getStats(),
    config: {
      botName: config.botName,
      openaiEnvEnabled: config.openai.enabled,
      timezone: config.cron.timezone,
    },
  };
}

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', { error: null, title: 'Iniciar sesión' });
});

router.post('/login', express.urlencoded({ extended: true }), handleLogin);

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  const data = getDashboardData();
  data.bot = await botWithQr();

  res.render('dashboard', {
    title: 'Panel — Estado',
    ...data,
  });
});

router.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    await whatsappControl.disconnect();
    const botView = await botWithQr();
    res.json({ ok: true, bot: botView });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/api/whatsapp/connect', async (req, res) => {
  try {
    await whatsappControl.connect();
    const botView = await botWithQr();
    res.json({ ok: true, bot: botView });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/api/whatsapp/reconnect', async (req, res) => {
  try {
    const bot = await whatsappControl.connect();
    const botView = await botWithQr();
    res.json({ ok: true, bot: botView });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/api/whatsapp/new-qr', async (req, res) => {
  try {
    const bot = await whatsappControl.reconnectWithNewQr();
    const botView = await botWithQr();
    res.json({ ok: true, bot: botView });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/messages', (req, res) => {
  const direction = req.query.direction || 'all';
  const messages = messageStore.getMessages({
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

router.get('/menu', (req, res) => {
  const settings = settingsService.getSettings();
  res.render('menu', {
    title: 'Panel — Editar menu',
    settings,
    menu: settingsService.getMenuConfig(),
    config: {
      openaiEnvEnabled: config.openai.enabled,
      openaiPanelEnabled: settingsService.isOpenaiRepliesEnabled(),
    },
    saved: req.query.saved === '1',
  });
});

router.post('/settings/menu', express.urlencoded({ extended: true }), (req, res) => {
  const labels = Array.isArray(req.body.labels) ? req.body.labels : [req.body.labels].filter(Boolean);
  const responses = Array.isArray(req.body.responses)
    ? req.body.responses
    : [req.body.responses].filter(Boolean);
  const useOpenAI = Array.isArray(req.body.useOpenAI) ? req.body.useOpenAI : [req.body.useOpenAI].filter(Boolean);

  const greetings = String(req.body.greetings || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

  const options = labels
    .map((label, i) => ({
      id: i + 1,
      label: String(label || '').trim(),
      response: String(responses[i] || '').trim(),
      useOpenAI: useOpenAI.includes(String(i)) || useOpenAI.includes(String(i + 1)),
    }))
    .filter((opt) => opt.label && opt.response);

  settingsService.saveSettings({
    menu: {
      intro: req.body.intro || '',
      footer: req.body.footer || '',
      greetings,
      options,
    },
  });

  res.redirect('/menu?saved=1');
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

router.post('/settings/toggle', express.urlencoded({ extended: true }), (req, res) => {
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
  res.redirect('/automations?saved=1');
});

router.post('/settings/keywords', express.urlencoded({ extended: true }), (req, res) => {
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
  res.redirect('/automations?saved=1');
});

router.post('/settings/daily', express.urlencoded({ extended: true }), (req, res) => {
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

  restartScheduler();
  res.redirect('/automations?saved=1');
});

router.get('/api/messages', (req, res) => {
  const direction = req.query.direction || 'all';
  const since = req.query.since;

  res.json({
    messages: messageStore.getMessages({
      limit: 150,
      direction: direction === 'all' ? undefined : direction,
      since,
    }),
    stats: messageStore.getStats(),
  });
});

/** Tiempo real: Server-Sent Events (mensajes + estado del bot) */
router.get('/api/live', async (req, res) => {
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
