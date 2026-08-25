/**
 * Servidor web del panel administrativo (Express + Bootstrap).
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { config } = require('../config/env');
const settingsService = require('../services/settingsService');
const messageStore = require('../services/messageStore');
const { restartScheduler } = require('../services/schedulerService');
const logger = require('../utils/logger');
const adminRoutes = require('./routes/admin');
const whatsappWebhook = require('./routes/whatsappWebhook');
const { attachAuth } = require('./middleware/auth');
const { isVercel, isCloudApiEnabled } = require('../utils/runtime');

function botIsReady() {
  try {
    const botStateService = require('../services/botStateService');
    return botStateService.getState().status === 'ready';
  } catch {
    return false;
  }
}

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('json charset', 'utf-8');

  app.use('/webhook', express.raw({ type: '*/*' }), whatsappWebhook);
  app.use('/api/webhook', express.raw({ type: '*/*' }), whatsappWebhook);

  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use('/assets', express.static(path.join(__dirname, '..', 'public')));

  if (!isVercel()) {
    const sessionDir = path.resolve(__dirname, '..', 'data', 'admin-sessions');
    fs.mkdirSync(sessionDir, { recursive: true });
    app.use(
      session({
        store: new FileStore({
          path: sessionDir,
          ttl: 86400,
          retries: 0,
        }),
        secret: config.admin.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: 7 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          sameSite: 'lax',
        },
      })
    );
  } else {
    app.use((req, _res, next) => {
      if (!req.session) req.session = {};
      next();
    });
  }

  app.use(attachAuth);

  app.use(async (req, res, next) => {
    // Webhook ya está montado arriba; esto solo aplica al panel.
    const pathName = req.path || '';
    if (pathName.startsWith('/webhook') || pathName.startsWith('/api/webhook')) {
      return next();
    }
    try {
      await settingsService.init();
      await messageStore.init();
    } catch (error) {
      logger.warn('Init panel', { message: error.message });
    }
    res.locals.botName = config.botName;
    res.locals.cloudMode = isCloudApiEnabled();
    next();
  });

  app.use(adminRoutes);

  app.use((req, res) => {
    if (req.xhr || (req.headers.accept || '').includes('application/json')) {
      return res.status(404).json({ ok: false, error: 'No encontrado', path: req.url });
    }
    res.status(404).render('error', {
      title: 'No encontrado',
      message: `Pagina no encontrada (${req.method} ${req.url})`,
    });
  });

  app.use((err, req, res, _next) => {
    logger.error('Error en panel', { message: err.message, path: req.path });
    if (res.headersSent) return;
    if (req.xhr || (req.headers.accept || '').includes('application/json')) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    res.status(500).render('error', {
      title: 'Error',
      message: err.message || 'Error interno del panel',
    });
  });

  return app;
}

function startWebServer() {
  if (!settingsService.getSettings()) {
    settingsService.loadSettings();
  }

  settingsService.setOnSettingsChange(() => {
    if (global.whatsappClient && botIsReady()) {
      restartScheduler();
    }
  });

  const app = createApp();
  const { host, port } = config.admin;
  const server = app.listen(port, host);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(
        `El puerto ${port} ya está ocupado. Cierra la otra ventana de npm start (solo una).`
      );
      process.exit(1);
    }
    logger.error('Error al abrir el panel', { message: error.message });
    process.exit(1);
  });

  server.on('listening', () => {
    const passLen = String(process.env.ADMIN_PASSWORD || '').trim().length;
    logger.success(`Panel admin: http://localhost:${port}`, {
      contraseñaConfigurada: passLen > 0 ? `${passLen} caracteres` : 'usa ADMIN_PASSWORD en .env',
    });
    logger.info('En este PC usa npm start (no npm run dev). Deja el ordenador encendido, sin suspender.');
  });
}

module.exports = { startWebServer, createApp };
