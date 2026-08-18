/**
 * Enlaces en WhatsApp: texto bonito + URL en mensaje aparte (sin preview feo).
 */

function isWaMeUrl(url) {
  return /^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(String(url || '').trim());
}

function getLinkDisplayName(option, fallback = 'Abrir enlace') {
  const name = String(option?.redirectName || '').trim();
  if (name) return name;
  const label = String(option?.label || '').trim();
  return label || fallback;
}

/**
 * @param {{ intro?: string, linkUrl: string, nav: string, displayName?: string, kind?: 'web'|'wa' }}
 */
function buildSplitLinkReply({ intro, linkUrl, nav, displayName, kind }) {
  const label = displayName || 'Abrir enlace';
  const isWaMe = kind === 'wa' || isWaMeUrl(linkUrl);

  const cta = isWaMe
    ? `📱 Toca *Comenzar a chatear* en el siguiente mensaje para escribir a *${label}*.`
    : `🔗 En el siguiente mensaje tienes el enlace:\n*${label}*`;

  const mainText = intro ? `${intro}\n\n${cta}\n\n${nav}` : `${cta}\n\n${nav}`;

  return {
    text: mainText,
    multiMessage: true,
    messageParts: [
      { text: mainText },
      { text: linkUrl, linkPreview: false },
    ],
  };
}

module.exports = { isWaMeUrl, getLinkDisplayName, buildSplitLinkReply };
