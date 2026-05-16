/**
 * Enlaces wa.me para abrir chat con un numero en WhatsApp.
 */

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function buildWaMeLink(phone, presetText) {
  const digits = digitsOnly(phone);
  if (!digits) return null;

  let url = `https://wa.me/${digits}`;
  if (presetText && String(presetText).trim()) {
    url += `?text=${encodeURIComponent(String(presetText).trim())}`;
  }
  return url;
}

module.exports = { digitsOnly, buildWaMeLink };
