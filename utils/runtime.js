/**
 * Entorno de ejecución: PC local vs Vercel.
 */

function isVercel() {
  return Boolean(process.env.VERCEL);
}

function isCloudApiEnabled() {
  const { config } = require('../config/env');
  return Boolean(config.whatsappCloud.enabled);
}

function publicBaseUrl(req) {
  const fromEnv = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const prod = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  if (prod) return `https://${prod.replace(/^https?:\/\//, '')}`;

  const vercel = String(process.env.VERCEL_URL || '').trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;

  if (req?.get) {
    const host = req.get('host');
    if (host && !host.startsWith('localhost') && !host.startsWith('127.')) {
      return `https://${host}`;
    }
  }

  const { config } = require('../config/env');
  return `http://localhost:${config.admin.port}`;
}

module.exports = { isVercel, isCloudApiEnabled, publicBaseUrl };
