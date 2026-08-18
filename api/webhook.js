/**
 * Función serverless de Vercel: webhook de WhatsApp Cloud API.
 * Meta llamará a https://TU-DOMINIO/webhook
 */

const crypto = require('crypto');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { handleCloudPayload } = require('../services/cloudInbound');
const { initFirebase } = require('../config/firebase');

function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'));
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(JSON.stringify(req.body));
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function signatureOk(raw, header) {
  const secret = config.whatsappCloud.appSecret;
  if (!secret) return true;
  if (!header || !raw) return false;

  const received = String(header).replace(/^sha256=/i, '');
  const expected = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  const a = Buffer.from(received, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token && token === config.whatsappCloud.verifyToken) {
      logger.success('Webhook de WhatsApp verificado por Meta');
      res.status(200).send(String(challenge || ''));
      return;
    }
    res.status(403).send('Forbidden');
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).send('Method Not Allowed');
    return;
  }

  let raw = '';
  try {
    raw = await readRawBody(req);
  } catch (error) {
    logger.error('Vercel webhook: no se pudo leer el cuerpo', { message: error.message });
    res.status(400).send('Bad body');
    return;
  }

  const sig = req.headers['x-hub-signature-256'] || '';
  if (!signatureOk(raw, sig)) {
    res.status(401).send('Invalid signature');
    return;
  }

  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    res.status(400).send('Invalid JSON');
    return;
  }

  try {
    initFirebase();
    await handleCloudPayload(payload);
  } catch (error) {
    logger.error('Vercel webhook: error', { message: error.message });
  }

  res.status(200).send('EVENT_RECEIVED');
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
