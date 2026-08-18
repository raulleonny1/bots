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
const { restartScheduler } = require('../services/schedulerService');
const logger = require('../utils/logger');
const adminRoutes = require('./routes/admin');
const whatsappWebhook = require('./routes/whatsappWebhook');

function startWebServer() {
  if (!settingsService.getSettings()) {
    settingsService.loadSettings();
  }

  settingsService.setOnSettingsChange(() => {
    if (global.whatsappClient && botIsReady()) {
      restartScheduler();
    }
  });

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('json charset', 'utf-8');

  // Webhook de Meta ANTES de json(): necesita el cuerpo en bruto para la firma
  app.use('/webhook', express.raw({ type: '*/*' }), whatsappWebhook);
  app.use('/api/webhook', express.raw({ type: '*/*' }), whatsappWebhook);

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use('/assets', express.static(path.join(__dirname, '..', 'public')));

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
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
      },
    })
  );

  app.use((req, res, next) => {
    res.locals.botName = config.botName;
    next();
  });

  app.use(adminRoutes);

  app.use((req, res) => {
    res.status(404).render('error', {
      title: 'No encontrado',
      message: 'Página no encontrada',
    });
  });

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

function botIsReady() {
  try {
    const botStateService = require('../services/botStateService');
    return botStateService.getState().status === 'ready';
  } catch {
    return false;
  }
}

module.exports = { startWebServer };
