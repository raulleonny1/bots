/**
 * Almacén de mensajes (memoria + Firebase) y eventos para tiempo real (panel admin).
 */

const { EventEmitter } = require('events');
const firestoreService = require('./firestoreService');
const { initFirebase } = require('../config/firebase');
const logger = require('../utils/logger');

const MAX_MESSAGES = 500;
const messages = [];
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

function addMessage(entry) {
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  messages.unshift(record);

  if (messages.length > MAX_MESSAGES) {
    messages.length = MAX_MESSAGES;
  }

  emitter.emit('message', record);
  emitter.emit('update', { stats: getStats() });

  if (firestoreService.isFirebaseReady()) {
    firestoreService.addMessage(record).catch((err) => {
      logger.error('Error guardando mensaje en Firebase', { message: err.message });
    });
  }

  return record;
}

async function init() {
  initFirebase();
  if (!firestoreService.isFirebaseReady()) return;

  try {
    const remote = await firestoreService.loadRecentMessages({ limit: MAX_MESSAGES });
    if (remote.length) {
      messages.length = 0;
      remote
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach((m) => messages.push(m));
      logger.info('Mensajes cargados desde Firebase', { count: messages.length });
      emitter.emit('update', { stats: getStats() });
    }
  } catch (error) {
    logger.warn('No se pudieron cargar mensajes de Firebase', { message: error.message });
  }
}

function addIncoming({ from, body, chatName, messageType }) {
  return addMessage({
    direction: 'in',
    from,
    chatName: chatName || from,
    body: body || '',
    messageType: messageType || 'text',
    replyType: null,
  });
}

function addOutgoing({ to, body, replyType, chatName }) {
  return addMessage({
    direction: 'out',
    from: to,
    chatName: chatName || to,
    body: body || '',
    messageType: 'text',
    replyType: replyType || 'auto',
  });
}

function getMessages({ limit = 100, direction, since } = {}) {
  let list = [...messages];

  if (direction === 'in' || direction === 'out') {
    list = list.filter((m) => m.direction === direction);
  }

  if (since) {
    const sinceTime = new Date(since).getTime();
    list = list.filter((m) => new Date(m.timestamp).getTime() > sinceTime);
  }

  return list.slice(0, limit);
}

function getStats() {
  const today = new Date().toDateString();
  const todayMessages = messages.filter(
    (m) => new Date(m.timestamp).toDateString() === today
  );

  return {
    total: messages.length,
    today: todayMessages.length,
    incoming: messages.filter((m) => m.direction === 'in').length,
    outgoing: messages.filter((m) => m.direction === 'out').length,
  };
}

async function clearMessages() {
  messages.length = 0;
  if (firestoreService.isFirebaseReady()) {
    await firestoreService.clearAllMessages();
  }
  emitter.emit('update', { stats: getStats(), cleared: true });
}

function onEvent(event, listener) {
  emitter.on(event, listener);
}

function offEvent(event, listener) {
  emitter.off(event, listener);
}

module.exports = {
  init,
  addIncoming,
  addOutgoing,
  getMessages,
  getStats,
  clearMessages,
  onEvent,
  offEvent,
};
