/**
 * Formato elegante para menús enviados por WhatsApp (texto + media).
 */

const fs = require('fs');
const path = require('path');

/** Sin caption: el saludo va solo en el texto del menú (evita doble «Bienvenido»). */
const LOGO_CAPTION = '';

const DIVIDER_HEAVY = '━━━━━━━━━━━━━━━━━━━━';
const DIVIDER_LIGHT = '────────────────────';

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

/** Reglas por tema: la primera coincidencia gana; icons[] da alternativas si ya se usó una. */
const OPTION_ICONS = [
  { test: /horario|culto|atenci[oó]n|apertura|misa/i, icons: ['🕐', '🕙', '⏰'] },
  { test: /alimento|comida|pan|nutrici|hambre|desayuno|comedor/i, icons: ['🍞', '🥖', '🍽️'] },
  { test: /biblia|estudio b[ií]blico|escritura|vers[ií]culo/i, icons: ['📖', '📜', '✍️'] },
  { test: /devocional|d[ií]a con dios|reflexi[oó]n diaria|meditaci[oó]n/i, icons: ['🌅', '📔', '☀️'] },
  { test: /contacto|contactar|escr[ií]benos|ll[aá]manos|habla con/i, icons: ['📞', '💬', '📱'] },
  { test: /reverend|pastor|pastora|representante|sacerdote/i, icons: ['✉️', '🙏', '💬'] },
  { test: /creencia|doctrina|fe de la iglesia|lo que creemos/i, icons: ['✝️', '📿', '☦️'] },
  { test: /qui[eé]nes somos|sobre nosotros|conocer la iglesia|historia/i, icons: ['⛪', '🏛️', '📜'] },
  { test: /trinidad|dios uno|padre hijo/i, icons: ['☦️', '✝️', '🕊️'] },
  { test: /jes[uú]s|salvaci[oó]n|evangelio/i, icons: ['✝️', '🌟', '📖'] },
  { test: /sacramento|eucarist[ií]a|comuni[oó]n/i, icons: ['🍷', '🕊️', '✝️'] },
  { test: /episcopado|iglesia y|obispo/i, icons: ['🏛️', '⛪', '📜'] },
  { test: /liturgia|oraci[oó]n|rezar|intercesi[oó]n/i, icons: ['📿', '🙏', '🕯️'] },
  { test: /vida cristiana|misi[oó]n|evangelizar/i, icons: ['❤️', '🌍', '🕊️'] },
  { test: /unir|unirte|bautismo|bautiz/i, icons: ['🤝', '💧', '⛪'] },
  { test: /ubicaci[oó]n|direcci[oó]n|mapa|c[oó]mo llegar|donde est/i, icons: ['📍', '🗺️', '⛪'] },
  { test: /zoom|en l[ií]nea|virtual|streaming|directo/i, icons: ['💻', '📹', '▶️'] },
  { test: /m[uú]sica|alabanza|coro|canto/i, icons: ['🎵', '🎶', '🎤'] },
  { test: /j[oó]ven|ni[nñ]os|infantil|escuela dominical/i, icons: ['🧒', '👨‍👩‍👧', '🎒'] },
  { test: /matrimonio|boda|pareja/i, icons: ['💒', '💍', '❤️'] },
  { test: /donaci[oó]n|ofrenda|diezmo|colabor/i, icons: ['💝', '🤲', '❤️'] },
  { test: /voluntari|servir|servicio|ayudar/i, icons: ['🤲', '🙋', '🤝'] },
  { test: /evento|actividad|celebraci[oó]n|fiesta/i, icons: ['🎉', '📅', '🎊'] },
  { test: /grupo|comunidad|celula|c[eé]lula|pequeño grupo/i, icons: ['👥', '🤝', '💬'] },
  { test: /consejer[ií]a|acompa[nñ]amiento|apoyo emocional/i, icons: ['💚', '🤝', '🙏'] },
  { test: /inscripci[oó]n|registro|apunt/i, icons: ['📝', '✅', '📋'] },
  { test: /redes|instagram|facebook|youtube/i, icons: ['📱', '🔗', '▶️'] },
  { test: /enlace|p[aá]gina web|sitio web|web/i, icons: ['🔗', '🌐', '💻'] },
  { test: /funeral|duelo|memorial/i, icons: ['🕯️', '🙏', '✝️'] },
  { test: /navidad|pascua|adviento|cuaresma/i, icons: ['🎄', '✝️', '🕯️'] },
];

/** Si no hay coincidencia clara: palabras sueltas → icono. */
const WORD_ICONS = [
  { words: ['dios', 'señor', 'cielo'], icons: ['🙏', '✨', '☁️'] },
  { words: ['amor', 'paz', 'fe'], icons: ['❤️', '🕊️', '✝️'] },
  { words: ['familia', 'hogar'], icons: ['👨‍👩‍👧', '🏠', '❤️'] },
  { words: ['libro', 'lectura', 'leer'], icons: ['📚', '📖', '📔'] },
  { words: ['video', 'ver', 'mirar'], icons: ['▶️', '📹', '🎬'] },
  { words: ['foto', 'imagen', 'galer'], icons: ['🖼️', '📷', '✨'] },
  { words: ['pregunta', 'duda', 'consulta'], icons: ['❓', '💬', '🙋'] },
  { words: ['gratis', 'gratuito'], icons: ['🎁', '💚', '✨'] },
  { words: ['nuevo', 'nueva', 'novedad'], icons: ['🆕', '📣', '✨'] },
  { words: ['importante', 'aviso', 'anuncio'], icons: ['📢', '⚠️', '📌'] },
];

/** Reserva para opciones sin match: se elige una distinta por menú. */
const GENERIC_POOL = [
  '💡', '🌟', '📌', '🎯', '🔔', '📋', '🕊️', '💫', '🌿', '📣',
  '🌸', '🎁', '🔖', '🪴', '🧭', '💎', '🌺', '📎', '🗓️', '✨',
];

function normalizeLabelText(label) {
  return String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function pickUnusedIcon(candidates, usedIcons) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const icon of list) {
    if (!usedIcons.has(icon)) return icon;
  }
  return list[0];
}

function hashLabel(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickGenericIcon(label, usedIcons) {
  const text = normalizeLabelText(label);
  const start = hashLabel(text) % GENERIC_POOL.length;
  for (let i = 0; i < GENERIC_POOL.length; i += 1) {
    const icon = GENERIC_POOL[(start + i) % GENERIC_POOL.length];
    if (!usedIcons.has(icon)) return icon;
  }
  return '📎';
}

function iconForLabel(label, usedIcons = null) {
  const used = usedIcons || new Set();
  const text = normalizeLabelText(label);

  for (const { test, icons } of OPTION_ICONS) {
    if (test.test(text)) {
      const icon = pickUnusedIcon(icons, used);
      used.add(icon);
      return icon;
    }
  }

  for (const { words, icons } of WORD_ICONS) {
    if (words.some((w) => text.includes(w))) {
      const icon = pickUnusedIcon(icons, used);
      used.add(icon);
      return icon;
    }
  }

  const icon = pickGenericIcon(label, used);
  used.add(icon);
  return icon;
}

function numberEmoji(index) {
  return NUMBER_EMOJIS[index] || `*${index + 1}*`;
}

function formatOptionLines(options) {
  const usedIcons = new Set();
  return (options || []).map((opt, index) => {
    const num = numberEmoji(index);
    const icon = iconForLabel(opt.label, usedIcons);
    return `${num}  ${icon}  ${opt.label}`;
  });
}

function resolveLogoPath() {
  const candidates = [
    path.resolve(__dirname, '..', 'public', 'logo grande iere.png'),
    path.resolve(__dirname, '..', 'public', 'logo-grande-iere.png'),
    path.resolve(__dirname, '..', 'public', 'logo.png'),
    path.resolve(__dirname, '..', 'web', 'public', 'logo.png'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function normalizeIntro(intro) {
  return String(intro || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/**
 * Quita del intro líneas que repiten el nombre de la parroquia / IERE
 * (ya van en el encabezado del mensaje).
 */
function stripDuplicateChurchBranding(intro) {
  return normalizeIntro(intro)
    .split('\n')
    .filter((line) => {
      const n = line
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (/buen pastor/.test(n) && /parroquia|iere|reformada|episcopal/.test(n)) {
        return false;
      }
      if (/^cruz.*creencias de nuestra iglesia/.test(n) || /^\*creencias de nuestra iglesia\*/.test(n)) {
        return false;
      }
      if (/creencias de nuestra iglesia/.test(n) && !/[?]/.test(n)) {
        return false;
      }
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Menú principal (opciones 1, 2, 3…).
 */
function formatWhatsAppMainMenu(menu) {
  const options = menu.options || [];
  const intro =
    stripDuplicateChurchBranding(menu.intro) ||
    '¡Bendiciones! ¿En qué podemos ayudarte?\nResponde con el *número* de tu opción:';
  const footer =
    normalizeIntro(menu.footer) || '_Escribe *menu* en cualquier momento para ver este menú._';

  const optionLines = formatOptionLines(options);

  return [
    '✝️ *Parroquia "El Buen Pastor" Móstoles*',
    '_Iglesia Española Reformada Episcopal_',
    DIVIDER_LIGHT,
    '',
    intro,
    '',
    '📋 *Elige una opción*',
    '',
    ...optionLines,
    '',
    DIVIDER_LIGHT,
    footer,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function formatWhatsAppSubmenu({ title, options, intro }) {
  const list = options || [];
  const optionLines = formatOptionLines(list);
  const heading = String(title || 'Submenú').replace(/^\d+\s*/, '');
  const introText = String(intro || '').trim();

  return [
    `📋 *${heading}*`,
    DIVIDER_LIGHT,
    '',
    introText || 'Elige un tema (responde con el *número*):',
    '',
    ...optionLines,
    '',
    DIVIDER_LIGHT,
    '_Escribe *atrás* para volver o *menu* para el inicio._',
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function shouldSendLogoForReplyType(type) {
  return type === 'menu';
}

module.exports = {
  LOGO_CAPTION,
  formatWhatsAppMainMenu,
  formatWhatsAppSubmenu,
  formatWhatsAppBeliefsSubmenu: (sub) =>
    formatWhatsAppSubmenu({
      title: 'Creencias de la iglesia',
      options: (sub?.items || []).map((item) => ({ label: item.label })),
    }),
  resolveLogoPath,
  shouldSendLogoForReplyType,
  iconForLabel,
};
