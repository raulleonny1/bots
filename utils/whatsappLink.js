/**
 * Enlaces wa.me para abrir chat con un numero en WhatsApp.
 */

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function buildWaMeLink(phone, presetText) {
  const digits = digitsOnly(phone);
  if (!digits) return null;

  const preset = String(presetText || '').trim();
  // Textos vacíos o basura → enlace limpio (WhatsApp muestra "Comenzar a chatear")
  const skipPreset =
    !preset ||
    /^clic\s*(aqui|aquí|para|here)?/i.test(preset) ||
    /^click\s*(here|to)?/i.test(preset) ||
    preset.length < 8;

  let url = `https://wa.me/${digits}`;
  if (!skipPreset) {
    url += `?text=${encodeURIComponent(preset)}`;
  }
  return url;
}

module.exports = { digitsOnly, buildWaMeLink };
