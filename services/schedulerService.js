/**
 * Servicio de mensajes programados con node-cron.
 */

const cron = require('node-cron');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { safeAsync } = require('../utils/asyncHandler');
const { toChatId } = require('../utils/phone');

let dailyJob = null;

/**
 * Envía el mensaje diario a todos los destinatarios configurados.
 */
async function sendDailyMessage(client) {
  const { dailyMessage, recipients } = config.cron;

  if (!recipients.length) {
    logger.warn('No hay destinatarios en SCHEDULED_RECIPIENTS. Mensaje diario omitido.');
    return;
  }

  logger.info('Enviando mensaje programado diario...', {
    recipients: recipients.length,
  });

  for (const recipient of recipients) {
    await safeAsync(async () => {
      const chatId = toChatId(recipient);
      await client.sendMessage(chatId, dailyMessage);
      logger.success('Mensaje diario enviado', { to: chatId });
    }, `Envío diario a ${recipient}`);
  }
}

/**
 * Construye expresión cron: "minuto hora * * *"
 */
function buildCronExpression(hour, minute) {
  return `${minute} ${hour} * * *`;
}

/**
 * Inicia el scheduler de mensajes diarios.
 */
function startScheduler(client) {
  if (dailyJob) {
    logger.warn('Scheduler ya estaba activo. Reiniciando...');
    dailyJob.stop();
  }

  const { dailyHour, dailyMinute, timezone } = config.cron;
  const expression = buildCronExpression(dailyHour, dailyMinute);

  if (!cron.validate(expression)) {
    logger.error('Expresión cron inválida', { expression });
    return;
  }

  dailyJob = cron.schedule(
    expression,
    () => {
      safeAsync(() => sendDailyMessage(client), 'Tarea cron mensaje diario');
    },
    {
      scheduled: true,
      timezone,
    }
  );

  logger.success('Scheduler iniciado', {
    cron: expression,
    timezone,
    hour: `${String(dailyHour).padStart(2, '0')}:${String(dailyMinute).padStart(2, '0')}`,
    message: config.cron.dailyMessage,
  });
}

/**
 * Detiene todas las tareas programadas.
 */
function stopScheduler() {
  if (dailyJob) {
    dailyJob.stop();
    dailyJob = null;
    logger.info('Scheduler detenido');
  }
}

/**
 * Registra tareas cron adicionales (extensible).
 * Ejemplo de uso futuro:
 *   registerCustomJob('0 12 * * 0', () => sendSundayReminder(client), 'Europe/Madrid');
 */
function registerCustomJob(cronExpression, taskFn, timezone = config.cron.timezone) {
  if (!cron.validate(cronExpression)) {
    throw new Error(`Expresión cron inválida: ${cronExpression}`);
  }

  return cron.schedule(
    cronExpression,
    () => safeAsync(taskFn, 'Tarea cron personalizada'),
    { scheduled: true, timezone }
  );
}

module.exports = {
  startScheduler,
  stopScheduler,
  sendDailyMessage,
  registerCustomJob,
};
