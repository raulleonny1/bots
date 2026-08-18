/**
 * Webhook público de WhatsApp Cloud API (Meta).
 * GET = verificación. POST = mensajes.
 */

const express = require('express');
const crypto = require('crypto');
const { config } = require('../../config/env');
const logger = require('../../utils/logger');
const { handleCloudPayload } = require('../../services/cloudInbound');

const router = express.Router();

function parseRawBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') {
    return req.body;
  }
  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }
  return '';
}

function signatureValid(rawBody, header) {
  const secret = config.whatsappCloud.appSecret;
  if (!secret) return true;
  if (!header || !rawBody) return false;

  const received = String(header).replace(/^sha256=/i, '');
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  const a = Buffer.from(received, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === config.whatsappCloud.verifyToken) {
    logger.success('Webhook de WhatsApp verificado por Meta');
    return res.status(200).send(String(challenge || ''));
  }

  logger.warn('Verificación de webhook rechazada');
  return res.status(403).send('Forbidden');
});

router.post('/', async (req, res) => {
  const raw = parseRawBody(req);
  const sig = req.get('x-hub-signature-256') || req.get('X-Hub-Signature-256');

  if (config.whatsappCloud.appSecret && !signatureValid(raw, sig)) {
    logger.warn('Firma del webhook inválida');
    return res.status(401).send('Invalid signature');
  }

  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : req.body || {};
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  res.status(200).send('EVENT_RECEIVED');

  try {
    await handleCloudPayload(payload);
  } catch (error) {
    logger.error('Error procesando webhook Cloud API', { message: error.message });
  }
});

module.exports = router;
