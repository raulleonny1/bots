/**
 * Persistencia en Firestore: configuración y mensajes.
 */

const { getDb, isFirebaseReady, initFirebase } = require('../config/firebase');
const { config } = require('../config/env');
const logger = require('../utils/logger');

const ROOT = 'bots';
const CHURCH_ID = config.firebase.churchId;

function settingsRef() {
  return getDb().collection(ROOT).doc(CHURCH_ID).collection('data').doc('settings');
}

function messagesRef() {
  return getDb().collection(ROOT).doc(CHURCH_ID).collection('messages');
}

async function getSettings() {
  if (!isFirebaseReady()) return null;

  try {
    const snap = await settingsRef().get();
    if (!snap.exists) return null;
    return snap.data();
  } catch (error) {
    logger.error('Firestore: error leyendo settings', { message: error.message });
    return null;
  }
}

async function saveSettings(data) {
  if (!isFirebaseReady()) return false;

  try {
    await settingsRef().set(
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    logger.error('Firestore: error guardando settings', { message: error.message });
    return false;
  }
}

async function addMessage(record) {
  if (!isFirebaseReady()) return null;

  try {
    const doc = {
      ...record,
      timestamp: record.timestamp || new Date().toISOString(),
    };
    const ref = await messagesRef().add(doc);
    return { ...doc, id: ref.id };
  } catch (error) {
    logger.error('Firestore: error guardando mensaje', { message: error.message });
    return null;
  }
}

async function loadRecentMessages({ limit = 150, direction, since } = {}) {
  if (!isFirebaseReady()) return [];

  try {
    const fetchLimit = direction === 'in' || direction === 'out' ? Math.min(limit * 3, 500) : limit;
    const snap = await messagesRef().orderBy('timestamp', 'desc').limit(fetchLimit).get();
    let list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (direction === 'in' || direction === 'out') {
      list = list.filter((m) => m.direction === direction).slice(0, limit);
    }

    if (since) {
      const sinceTime = new Date(since).getTime();
      list = list.filter((m) => new Date(m.timestamp).getTime() > sinceTime);
    }

    return list;
  } catch (error) {
    logger.error('Firestore: error cargando mensajes', { message: error.message });
    return [];
  }
}

async function clearAllMessages() {
  if (!isFirebaseReady()) return false;

  try {
    const snap = await messagesRef().limit(500).get();
    if (snap.empty) return true;

    const batch = getDb().batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return true;
  } catch (error) {
    logger.error('Firestore: error borrando mensajes', { message: error.message });
    return false;
  }
}

function ensureInit() {
  initFirebase();
  return isFirebaseReady();
}

module.exports = {
  ensureInit,
  isFirebaseReady,
  getSettings,
  saveSettings,
  addMessage,
  loadRecentMessages,
  clearAllMessages,
};
