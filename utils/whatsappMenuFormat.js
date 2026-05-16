/**
 * Formato elegante para menús enviados por WhatsApp (texto + logo).
 */

const fs = require('fs');
const path = require('path');

const LOGO_CAPTION =
  '✝️ *Parroquia «El Buen Pastor»*\n_Iglesia Española Reformada Episcopal_';

const DIVIDER_HEAVY = '━━━━━━━━━━━━━━━━━━━━━━';
const DIVIDER_LIGHT = '──────────────────────';

const OPTION_ICONS = [
  { test: /horario|culto|atenci[oó]n/i, icon: '🕐' },
  { test: /alimento|comida|pan/i, icon: '🍞' },
  { test: /biblia|estudio/i, icon: '📖' },
  { test: /reverend|pastor|pastora/i, icon: '✉️' },
  { test: /creencia|doctrina|fe de la iglesia/i, icon: '✝️' },
  { test: /sobre nosotros|qui[eé]nes somos|conocer/i, icon: '⛪' },
];

function iconForLabel(label) {
  const text = String(label || '');
  for (const { test, icon } of OPTION_ICONS) {
    if (test.test(text)) return icon;
  }
  return '▸';
}

function resolveLogoPath() {
  const candidates = [
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
 * Menú principal (opciones 1, 2, 3…).
 */
function formatWhatsAppMainMenu(menu) {
  const options = menu.options || [];
  const intro = normalizeIntro(menu.intro);
  const footer =
    normalizeIntro(menu.footer) || '_Escribe *menu* en cualquier momento para ver este menú._';

  const optionLines = options.map((opt, index) => {
    const icon = iconForLabel(opt.label);
    return `${icon}  *${index + 1}*   ${opt.label}`;
  });

  return [
    DIVIDER_HEAVY,
    '✝️  *PARROQUIA «EL BUEN PASTOR»*',
    '_Iglesia Española Reformada Episcopal_',
    DIVIDER_HEAVY,
    '',
    intro,
    '',
    '📋 *Opciones disponibles*',
    '',
    ...optionLines,
    '',
    DIVIDER_LIGHT,
    footer,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Submenú de creencias (opción 5).
 */
function formatWhatsAppBeliefsSubmenu(sub) {
  const items = sub.items || [];
  const intro = normalizeIntro(sub.intro);
  const footer =
    normalizeIntro(sub.footer) ||
    '_Escribe *atrás* para este submenú o *menu* para el inicio._';

  const optionLines = items.map((item, index) => {
    const icon = iconForLabel(item.label);
    return `${icon}  *${index + 1}*   ${item.label}`;
  });

  return [
    DIVIDER_HEAVY,
    '✝️  *CREENCIAS DE LA IGLESIA*',
    '_Parroquia «El Buen Pastor» · IERE_',
    DIVIDER_HEAVY,
    '',
    intro,
    '',
    '📖 *Elige un tema*',
    '_Responde con el número_',
    '',
    ...optionLines,
    '',
    DIVIDER_LIGHT,
    footer,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function shouldSendLogoForReplyType(type) {
  return type === 'menu' || type === 'beliefs-submenu';
}

module.exports = {
  LOGO_CAPTION,
  formatWhatsAppMainMenu,
  formatWhatsAppBeliefsSubmenu,
  resolveLogoPath,
  shouldSendLogoForReplyType,
  iconForLabel,
};
