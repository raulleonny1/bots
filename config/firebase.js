/**
 * Firebase Admin (Firestore) para el servidor del bot.
 * La config web del cliente va en .env; para escribir datos hace falta cuenta de servicio.
 */

const fs = require('fs');
const path = require('path');
const { config } = require('./env');
const logger = require('../utils/logger');

let db = null;
let initialized = false;
let initError = null;

function resolveServiceAccount() {
  const inline = {
    projectId: config.firebase.projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
  };

  if (inline.clientEmail && inline.privateKey) {
    return inline;
  }

  const accountPath = config.firebase.serviceAccountPath;
  if (!accountPath) return null;

  const resolved = path.isAbsolute(accountPath)
    ? accountPath
    : path.resolve(__dirname, '..', accountPath);

  if (!fs.existsSync(resolved)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function initFirebase() {
  if (!config.firebase.enabled) {
    return false;
  }

  if (initialized) {
    return Boolean(db);
  }

  initialized = true;

  try {
    const admin = require('firebase-admin');
    const credentialData = resolveServiceAccount();

    if (!credentialData) {
      initError = 'Falta firebase-service-account.json o FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY';
      logger.warn('Firebase activado en .env pero sin cuenta de servicio', {
        hint: 'Firebase Console → Configuración → Cuentas de servicio → Generar clave',
      });
      return false;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(credentialData),
        projectId: config.firebase.projectId,
      });
    }

    db = admin.firestore();
    logger.success('Firebase Firestore conectado', { projectId: config.firebase.projectId });
    return true;
  } catch (error) {
    initError = error.message;
    logger.error('No se pudo iniciar Firebase', { message: error.message });
    db = null;
    return false;
  }
}

function getDb() {
  if (!initialized) initFirebase();
  return db;
}

function isFirebaseReady() {
  return Boolean(getDb());
}

function getInitError() {
  if (!initialized) initFirebase();
  return initError;
}

module.exports = {
  initFirebase,
  getDb,
  isFirebaseReady,
  getInitError,
};
