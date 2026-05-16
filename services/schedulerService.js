/**
 * Servicio de mensajes programados con node-cron.
 */

const cron = require('node-cron');
const { config } = require('../config/env');
const settingsService = require('./settingsService');
const botStateService = require('./botStateService');
const logger = require('../utils/logger');
const { safeAsync } = require('../utils/asyncHandler');
const { toChatId } = require('../utils/phone');

let dailyJob = null;
let activeClient = null;

async function sendDailyMessage(client) {
  const daily = settingsService.getDailyMessageConfig();
  const text = daily.text || config.cron.dailyMessage;
  const recipients = daily.recipients?.length ? daily.recipients : config.cron.recipients;

  if (!recipients.length) {
    logger.warn('No hay destinatarios para mensaje diario.');
    return;
  }

  logger.info('Enviando mensaje programado diario...', {
    recipients: recipients.length,
  });

  for (const recipient of recipients) {
    await safeAsync(async () => {
      const chatId = toChatId(recipient);
      await client.sendMessage(chatId, text);
      logger.success('Mensaje diario enviado', { to: chatId });
    }, `Envío diario a ${recipient}`);
  }
}

function buildCronExpression(hour, minute) {
  return `${minute} ${hour} * * *`;
}

function startScheduler(client) {
  activeClient = client;

  if (dailyJob) {
    dailyJob.stop();
    dailyJob = null;
  }

  const daily = settingsService.getDailyMessageConfig();
  const hour = daily.hour ?? config.cron.dailyHour;
  const minute = daily.minute ?? config.cron.dailyMinute;
  const expression = buildCronExpression(hour, minute);

  if (!cron.validate(expression)) {
    logger.error('Expresión cron inválida', { expression });
    botStateService.updateState({ schedulerActive: false });
    return;
  }

  dailyJob = cron.schedule(
    expression,
    () => {
      safeAsync(() => sendDailyMessage(client), 'Tarea cron mensaje diario');
    },
    { scheduled: true, timezone: config.cron.timezone }
  );

  botStateService.updateState({ schedulerActive: true });

  logger.success('Scheduler iniciado', {
    cron: expression,
    timezone: config.cron.timezone,
    hour: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    message: daily.text,
  });
}

function restartScheduler() {
  if (activeClient) {
    startScheduler(activeClient);
  }
}

function stopScheduler() {
  if (dailyJob) {
    dailyJob.stop();
    dailyJob = null;
    logger.info('Scheduler detenido');
  }
  botStateService.updateState({ schedulerActive: false });
}

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
  restartScheduler,
  sendDailyMessage,
  registerCustomJob,
};
