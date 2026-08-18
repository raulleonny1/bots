/**
 * Árbol de menú WhatsApp: texto, enlace, reenvío o submenú.
 */

const TYPES = ['text', 'link', 'forward', 'submenu'];

function looksLikeCreencias(label) {
  return /creencia|doctrina|fe de la iglesia|lo que creemos/i.test(String(label || ''));
}

function looksLikeForwardContact(label) {
  return /reverend|pastora|pastor|representante/i.test(String(label || ''));
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function inferType(opt) {
  const t = String(opt?.type || '').toLowerCase().trim();
  if (TYPES.includes(t)) return t;
  if (Array.isArray(opt?.children) && opt.children.length) return 'submenu';
  if (String(opt?.linkUrl || '').trim()) return 'link';
  const phone = digits(opt?.whatsappPhone);
  if (opt?.forwardMessages && (phone || looksLikeForwardContact(opt?.label))) {
    return 'forward';
  }
  if (looksLikeCreencias(opt?.label)) return 'submenu';
  return 'text';
}

function itemToOption(item, index) {
  return normalizeOption(
    {
      type: 'text',
      label: item.label,
      response: item.response,
    },
    index,
    null,
    1
  );
}

function normalizeOption(opt, index, beliefsItems, depth) {
  if (!opt || !String(opt.label || '').trim()) return null;

  const depthNum = Number(depth) || 0;
  let type = inferType(opt);
  let children = Array.isArray(opt.children)
    ? opt.children
        .map((child, i) => normalizeOption(child, i, null, depthNum + 1))
        .filter(Boolean)
    : [];

  if (
    type === 'submenu' &&
    children.length === 0 &&
    looksLikeCreencias(opt.label) &&
    Array.isArray(beliefsItems) &&
    beliefsItems.length
  ) {
    children = beliefsItems.map((item, i) => itemToOption(item, i)).filter(Boolean);
  }

  if (children.length && depthNum < 3) {
    type = 'submenu';
  }

  if (type === 'submenu' && depthNum >= 3) {
    type = 'text';
    children = [];
  }

  const phone = type === 'forward' || type === 'link' ? digits(opt.whatsappPhone) : '';
  const linkUrl = type === 'link' ? String(opt.linkUrl || '').trim() : '';

  return {
    id: opt.id ?? index + 1,
    type,
    label: String(opt.label || '').trim(),
    response: String(opt.response || '').trim(),
    linkUrl,
    whatsappPhone: type === 'forward' ? phone : '',
    whatsappPresetText: type === 'forward' ? String(opt.whatsappPresetText || '').trim() : '',
    redirectName: String(opt.redirectName || '').trim(),
    forwardMessages: type === 'forward',
    children: type === 'submenu' ? children : [],
  };
}

function beliefsFromTree(options) {
  const found = (options || []).find(
    (opt) => opt.type === 'submenu' && looksLikeCreencias(opt.label)
  );
  if (!found) return null;
  return {
    intro: 'Elige un tema (responde con el *número*):',
    footer: '_Escribe *atrás* para ver este submenú o *menu* para el menú principal._',
    items: (found.children || []).map((child) => ({
      label: child.label,
      response: child.response,
    })),
  };
}

function mergeMenuTree(parsedMenu, defaults) {
  const base = defaults || { intro: '', footer: '', greetings: [], options: [] };
  if (!parsedMenu) return JSON.parse(JSON.stringify(base));

  const beliefsItems = parsedMenu.beliefsSubmenu?.items;
  const options = Array.isArray(parsedMenu.options) && parsedMenu.options.length
    ? parsedMenu.options
        .map((opt, i) => normalizeOption(opt, i, beliefsItems, 0))
        .filter(Boolean)
    : (base.options || []).map((opt, i) => normalizeOption(opt, i, beliefsItems, 0)).filter(Boolean);

  const beliefsSubmenu = beliefsFromTree(options) || parsedMenu.beliefsSubmenu || base.beliefsSubmenu;

  return {
    intro: parsedMenu.intro ?? base.intro,
    footer: parsedMenu.footer ?? base.footer,
    greetings: Array.isArray(parsedMenu.greetings) ? parsedMenu.greetings : base.greetings,
    beliefsSubmenu,
    options,
  };
}

module.exports = {
  TYPES,
  inferType,
  normalizeOption,
  mergeMenuTree,
  looksLikeCreencias,
  looksLikeForwardContact,
};
