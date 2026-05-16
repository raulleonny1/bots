/**
 * Estado del bot en tiempo real (para panel admin).
 */

let state = {
  status: 'disconnected',
  pushname: null,
  number: null,
  reconnectAttempts: 0,
  schedulerActive: false,
  lastQr: null,
  lastDisconnectReason: null,
  startedAt: new Date().toISOString(),
  lastReadyAt: null,
};

function updateState(partial) {
  state = { ...state, ...partial };
  return state;
}

function getState() {
  return { ...state };
}

function setQr(qr) {
  state.lastQr = qr;
  state.status = 'qr';
}

function setReady(info) {
  state.status = 'ready';
  state.pushname = info?.pushname || null;
  state.number = info?.wid?.user || null;
  state.lastReadyAt = new Date().toISOString();
  state.lastQr = null;
  state.reconnectAttempts = 0;
}

function setDisconnected(reason) {
  state.status = 'disconnected';
  state.schedulerActive = false;
  state.lastDisconnectReason = reason || null;
}

function setAuthenticated() {
  if (state.status === 'qr') {
    state.status = 'authenticating';
  }
}

/**
 * Alinea el estado del panel con el cliente real (p. ej. si loading_screen pisó "ready").
 */
function syncFromClient(client) {
  if (!client?.info?.wid) {
    return getState();
  }

  const info = client.info;
  const number = info.wid?.user || null;

  if (state.status !== 'ready' || state.number !== number || state.pushname !== info.pushname) {
    setReady(info);
  }

  return getState();
}

module.exports = {
  getState,
  updateState,
  setQr,
  setReady,
  setDisconnected,
  setAuthenticated,
  syncFromClient,
};
