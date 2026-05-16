/**
 * Tiempo real del panel admin (SSE).
 * El badge superior refleja el estado de WHATSAPP, no la conexion del panel.
 */
(function () {
  if (typeof EventSource === 'undefined') return;

  const liveBadge = document.getElementById('liveBadge');
  const WHATSAPP_BADGES = {
    ready: { text: 'WhatsApp conectado', className: 'badge bg-success' },
    qr: { text: 'Escanea el QR', className: 'badge bg-warning text-dark' },
    disconnected: { text: 'WhatsApp desconectado', className: 'badge bg-danger' },
    loading: { text: 'Conectando WhatsApp...', className: 'badge bg-info text-dark' },
    authenticating: { text: 'Autenticando...', className: 'badge bg-info text-dark' },
    starting: { text: 'Iniciando...', className: 'badge bg-secondary' },
  };

  let lastWhatsAppStatus = null;
  let lastStatusAt = 0;

  function setBadge(text, className) {
    if (!liveBadge) return;
    liveBadge.textContent = text;
    liveBadge.className = className;
  }

  function updateBadgeFromWhatsApp(bot) {
    if (!bot || !bot.status) return;
    lastWhatsAppStatus = bot.status;
    lastStatusAt = Date.now();
    const cfg = WHATSAPP_BADGES[bot.status] || {
      text: bot.status,
      className: 'badge bg-secondary',
    };
    setBadge(cfg.text, cfg.className);
  }

  window.updateLiveBadgeFromBot = updateBadgeFromWhatsApp;

  const es = new EventSource('/api/live');

  es.onopen = () => {
    if (lastWhatsAppStatus) {
      updateBadgeFromWhatsApp({ status: lastWhatsAppStatus });
    }
  };

  es.onerror = () => {
    // No confundir con WhatsApp: solo avisa si el panel dejo de recibir datos
    const stale = Date.now() - lastStatusAt > 8000;
    if (stale || !lastWhatsAppStatus) {
      setBadge('Panel sin actualizar', 'badge bg-secondary');
    }
  };

  es.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (data.type === 'status' && data.bot) {
      updateBadgeFromWhatsApp(data.bot);
    }

    if (data.type === 'status' && typeof window.onLiveStatus === 'function') {
      window.onLiveStatus(data);
    }

    if (data.type === 'message' && typeof window.onLiveMessage === 'function') {
      window.onLiveMessage(data.message, data.stats);
    }

    if (data.type === 'update' && typeof window.onLiveUpdate === 'function') {
      window.onLiveUpdate(data);
    }
  };

  window.liveEventSource = es;
})();
