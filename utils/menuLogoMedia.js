/**
 * Logo en menú WhatsApp: franja horizontal baja (poco alto en el chat).
 * WhatsApp escala al ancho del chat; imágenes altas se ven enormes.
 */

const fs = require('fs');
const path = require('path');
const { resolveLogoPath } = require('./whatsappMenuFormat');
const logger = require('./logger');

const CACHE_DIR = path.resolve(__dirname, '..', 'data', 'cache');

const SEND_LOGO = process.env.MENU_SEND_LOGO !== 'false';

/** Franja ancha y baja → poca altura en pantalla */
const STRIP_WIDTH = Math.min(
  400,
  Math.max(200, parseInt(process.env.MENU_LOGO_STRIP_WIDTH || '280', 10) || 280)
);
const STRIP_HEIGHT = Math.min(
  120,
  Math.max(56, parseInt(process.env.MENU_LOGO_STRIP_HEIGHT || '72', 10) || 72)
);
const LOGO_MAX_HEIGHT = Math.min(
  STRIP_HEIGHT - 8,
  Math.max(48, parseInt(process.env.MENU_LOGO_MAX_HEIGHT || '64', 10) || 64)
);

function getCacheFile() {
  return path.join(
    CACHE_DIR,
    `menu-logo-wa-strip-${STRIP_WIDTH}x${STRIP_HEIGHT}-h${LOGO_MAX_HEIGHT}.png`
  );
}

let sharpModule = null;

function getSharp() {
  if (!sharpModule) {
    sharpModule = require('sharp');
  }
  return sharpModule;
}

function cacheIsFresh(sourcePath, cacheFile) {
  if (!fs.existsSync(cacheFile)) return false;
  const src = fs.statSync(sourcePath);
  const cache = fs.statSync(cacheFile);
  return cache.mtimeMs >= src.mtimeMs;
}

async function ensureSmallLogoFile() {
  if (!SEND_LOGO) return null;

  const sourcePath = resolveLogoPath();
  if (!sourcePath) return null;

  const cacheFile = getCacheFile();
  if (cacheIsFresh(sourcePath, cacheFile)) {
    return cacheFile;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });

  try {
    const sharp = getSharp();
    let base = sharp(sourcePath);
    try {
      base = base.trim({ threshold: 12 });
    } catch {
      base = sharp(sourcePath);
    }

    const logo = await base
      .resize(null, LOGO_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer({ resolveWithObject: true });

    const w = logo.info.width;
    const h = logo.info.height;
    const left = Math.max(0, Math.round((STRIP_WIDTH - w) / 2));
    const top = Math.max(0, Math.round((STRIP_HEIGHT - h) / 2));

    await sharp({
      create: {
        width: STRIP_WIDTH,
        height: STRIP_HEIGHT,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([{ input: logo.data, left, top }])
      .png({ compressionLevel: 9 })
      .toFile(cacheFile);

    logger.debug('Logo menu (franja baja) para WhatsApp', {
      strip: `${STRIP_WIDTH}x${STRIP_HEIGHT}`,
      logo: `${w}x${h}`,
    });

    return cacheFile;
  } catch (error) {
    logger.warn('Logo del menu no enviado', { message: error.message });
    return null;
  }
}

async function getMenuLogoMessageMedia() {
  const filePath = await ensureSmallLogoFile();
  if (!filePath) return null;

  const { MessageMedia } = require('whatsapp-web.js');
  return MessageMedia.fromFilePath(filePath);
}

module.exports = {
  getMenuLogoMessageMedia,
  ensureSmallLogoFile,
  SEND_LOGO,
  STRIP_WIDTH,
  STRIP_HEIGHT,
  LOGO_MAX_HEIGHT,
};
