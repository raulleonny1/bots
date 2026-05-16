/**
 * Logger simple con timestamps y niveles de color en consola.
 */

const LEVELS = {
  info: { label: 'INFO', color: '\x1b[36m' },
  success: { label: 'OK', color: '\x1b[32m' },
  warn: { label: 'WARN', color: '\x1b[33m' },
  error: { label: 'ERROR', color: '\x1b[31m' },
  debug: { label: 'DEBUG', color: '\x1b[35m' },
};

const RESET = '\x1b[0m';

function formatTimestamp() {
  return new Date().toLocaleString('es-ES', { hour12: false });
}

function formatMeta(meta) {
  if (!meta) return '';
  if (typeof meta === 'string') return ` | ${meta}`;
  return ` | ${JSON.stringify(meta)}`;
}

function log(level, message, meta) {
  const entry = LEVELS[level] || LEVELS.info;
  const line = `${entry.color}[${entry.label}]${RESET} ${formatTimestamp()} - ${message}${formatMeta(meta)}`;
  console.log(line);
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  success: (msg, meta) => log('success', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
