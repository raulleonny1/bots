/**
 * Estado de menú por chat. En Vercel la memoria no dura: se guarda en Firestore.
 */

const firestoreService = require('./firestoreService');

const memory = new Map();

function emptyState() {
  return {
    navStack: [],
    viewingLeaf: false,
    forward: null,
  };
}

async function load(chatId) {
  if (!chatId) return emptyState();

  if (memory.has(chatId)) {
    return { ...emptyState(), ...memory.get(chatId) };
  }

  const remote = await firestoreService.getChatState(chatId);
  const state = remote
    ? {
        navStack: Array.isArray(remote.navStack) ? remote.navStack : [],
        viewingLeaf: Boolean(remote.viewingLeaf),
        forward: remote.forward || null,
      }
    : emptyState();

  memory.set(chatId, state);
  return state;
}

async function save(chatId, state) {
  if (!chatId) return;
  const next = {
    navStack: Array.isArray(state.navStack) ? state.navStack : [],
    viewingLeaf: Boolean(state.viewingLeaf),
    forward: state.forward || null,
  };
  memory.set(chatId, next);
  // No bloquea la respuesta de WhatsApp
  firestoreService.saveChatState(chatId, next).catch(() => {});
}

module.exports = { load, save, emptyState };
