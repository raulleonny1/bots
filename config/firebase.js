/**
 * Firebase Admin (Firestore) para el servidor del bot.
 * En Vercel: FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 * (o FIREBASE_SERVICE_ACCOUNT_JSON con el JSON entero).
 */

const fs = require('fs');
const path = require('path');
const { config } = require('./env');
const logger = require('../utils/logger');

let db = null;
let initialized = false;
let initError = null;

function stripEnvQuotes(value) {
  let s = String(value || '').trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

/** Vercel a menudo guarda la key con \n literales o sin saltos. */
function normalizePrivateKey(raw) {
  let key = stripEnvQuotes(raw);
  if (!key) return '';
  key = key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  if (key.includes('BEGIN') && !key.includes('\n')) {
    key = key
      .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
      .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----\n')
      .replace(/-----BEGIN RSA PRIVATE KEY-----/, '-----BEGIN RSA PRIVATE KEY-----\n')
      .replace(/-----END RSA PRIVATE KEY-----/, '\n-----END RSA PRIVATE KEY-----\n');
  }
  return key;
}

function resolveServiceAccount() {
  const jsonRaw = stripEnvQuotes(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '');
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw);
      if (parsed.private_key) {
        parsed.private_key = normalizePrivateKey(parsed.private_key);
      }
      return parsed;
    } catch (error) {
      initError = `FIREBASE_SERVICE_ACCOUNT_JSON inválido: ${error.message}`;
      return null;
    }
  }

  const clientEmail = stripEnvQuotes(process.env.FIREBASE_CLIENT_EMAIL || '');
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || '');
  const projectId = stripEnvQuotes(
    process.env.FIREBASE_PROJECT_ID || config.firebase.projectId || ''
  );

  if (clientEmail && privateKey) {
    return {
      type: 'service_account',
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    };
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
    initError = 'FIREBASE_ENABLED no es true';
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
      initError =
        initError ||
        'Falta FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (o FIREBASE_SERVICE_ACCOUNT_JSON)';
      logger.warn('Firebase activado pero sin cuenta de servicio', { detail: initError });
      return false;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(credentialData),
        projectId:
          credentialData.project_id ||
          credentialData.projectId ||
          config.firebase.projectId,
      });
    }

    db = admin.firestore();
    initError = null;
    logger.success('Firebase Firestore conectado', {
      projectId: config.firebase.projectId,
    });
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
