/**
 * Logo pequeño para el menú de WhatsApp (redimensionado y en caché).
 */

const fs = require('fs');
const path = require('path');
const { resolveLogoPath } = require('./whatsappMenuFormat');
const logger = require('./logger');

const CACHE_DIR = path.resolve(__dirname, '..', 'data', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'menu-logo-whatsapp.png');

/** Ancho máximo en píxeles (se ve pequeño en el chat) */
const MAX_WIDTH = Math.min(
  512,
  Math.max(96, parseInt(process.env.MENU_LOGO_MAX_WIDTH || '180', 10) || 180)
);

let sharpModule = null;

function getSharp() {
  if (!sharpModule) {
    sharpModule = require('sharp');
  }
  return sharpModule;
}

function cacheIsFresh(sourcePath) {
  if (!fs.existsSync(CACHE_FILE)) return false;
  const src = fs.statSync(sourcePath);
  const cache = fs.statSync(CACHE_FILE);
  return cache.mtimeMs >= src.mtimeMs;
}

/**
 * Genera PNG reducido para WhatsApp si hace falta.
 */
async function ensureSmallLogoFile() {
  const sourcePath = resolveLogoPath();
  if (!sourcePath) return null;

  if (cacheIsFresh(sourcePath)) {
    return CACHE_FILE;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });

  try {
    const sharp = getSharp();
    const meta = await sharp(sourcePath).metadata();
    const needsResize = !meta.width || meta.width > MAX_WIDTH;

    if (!needsResize && path.extname(sourcePath).toLowerCase() === '.png') {
      fs.copyFileSync(sourcePath, CACHE_FILE);
      return CACHE_FILE;
    }

    await sharp(sourcePath)
      .resize({
        width: MAX_WIDTH,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .png({ compressionLevel: 9 })
      .toFile(CACHE_FILE);

    logger.debug('Logo de menu redimensionado para WhatsApp', {
      maxWidth: MAX_WIDTH,
      from: path.basename(sourcePath),
    });

    return CACHE_FILE;
  } catch (error) {
    logger.warn('No se pudo redimensionar el logo; se usa el original', {
      message: error.message,
    });
    return sourcePath;
  }
}

/**
 * MessageMedia listo para enviar (logo pequeño).
 */
async function getMenuLogoMessageMedia() {
  const filePath = await ensureSmallLogoFile();
  if (!filePath) return null;

  const { MessageMedia } = require('whatsapp-web.js');
  return MessageMedia.fromFilePath(filePath);
}

module.exports = {
  getMenuLogoMessageMedia,
  ensureSmallLogoFile,
  MAX_WIDTH,
};
