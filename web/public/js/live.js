/**
 * Actualización del panel (polling). En Vercel no se usa SSE.
 */
(function () {
  const liveBadge = document.getElementById('liveBadge');
  const WHATSAPP_BADGES = {
    ready: { text: 'WhatsApp conectado', className: 'badge bg-success' },
    qr: { text: 'Escanea el QR', className: 'badge bg-warning text-dark' },
    disconnected: { text: 'WhatsApp desconectado', className: 'badge bg-danger' },
    loading: { text: 'Conectando WhatsApp...', className: 'badge bg-info text-dark' },
    authenticating: { text: 'Autenticando...', className: 'badge bg-info text-dark' },
    starting: { text: 'Iniciando...', className: 'badge bg-secondary' },
  };

  function setBadge(text, className) {
    if (!liveBadge) return;
    liveBadge.textContent = text;
    liveBadge.className = className;
  }

  function updateBadgeFromWhatsApp(bot) {
    if (!bot || !bot.status) return;
    const cfg = WHATSAPP_BADGES[bot.status] || {
      text: bot.status,
      className: 'badge bg-secondary',
    };
    if (bot.cloudMode && bot.status === 'ready') {
      setBadge('Cloud API activa', 'badge bg-success');
      return;
    }
    setBadge(cfg.text, cfg.className);
  }

  window.updateLiveBadgeFromBot = updateBadgeFromWhatsApp;

  async function tick() {
    try {
      const res = await fetch('/api/status', { credentials: 'same-origin' });
      if (res.status === 401) return;
      const data = await res.json();
      if (data.bot) updateBadgeFromWhatsApp(data.bot);
      if (typeof window.onLiveStatus === 'function') {
        window.onLiveStatus({ type: 'status', ...data });
      }
    } catch {
      setBadge('Panel sin actualizar', 'badge bg-secondary');
    }
  }

  tick();
  setInterval(tick, 4000);
})();
