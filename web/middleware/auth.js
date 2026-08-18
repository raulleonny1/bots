/**
 * Autenticación del panel admin.
 * En Vercel no hay disco: la sesión va en una cookie firmada.
 */

const path = require('path');
const crypto = require('crypto');
const { config } = require('../../config/env');
const { isVercel } = require('../../utils/runtime');

const COOKIE_NAME = 'bp_admin';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getAdminPassword() {
  if (!isVercel()) {
    require('dotenv').config({
      path: path.resolve(__dirname, '..', '..', '.env'),
      override: true,
    });
  }
  return String(process.env.ADMIN_PASSWORD || config.admin.password).trim();
}

function cookieSecret() {
  return String(process.env.ADMIN_SESSION_SECRET || config.admin.sessionSecret).trim();
}

function signToken() {
  const exp = Date.now() + MAX_AGE_MS;
  const payload = `ok.${exp}`;
  const sig = crypto.createHmac('sha256', cookieSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function tokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  const lastDot = token.lastIndexOf('.');
  if (lastDot < 0) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = crypto.createHmac('sha256', cookieSecret()).update(payload).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const exp = Number(payload.split('.')[1]);
  return Number.isFinite(exp) && Date.now() < exp;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  });
  return out;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isVercel() || process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS / 1000,
    path: '/',
  };
}

function serializeCookie(name, value, opts) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join('; ');
}

function setAuthCookie(res) {
  res.setHeader('Set-Cookie', serializeCookie(COOKIE_NAME, signToken(), cookieOptions()));
}

function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(COOKIE_NAME, '', { ...cookieOptions(), maxAge: 0 })
  );
}

function isAuthenticated(req) {
  if (req.session?.authenticated) return true;
  const cookies = parseCookies(req);
  return tokenValid(cookies[COOKIE_NAME]);
}

function attachAuth(req, res, next) {
  if (!req.session) req.session = {};
  if (isAuthenticated(req)) {
    req.session.authenticated = true;
  }
  next();
}

function isApiRequest(req) {
  const url = req.originalUrl || req.url || '';
  return url.startsWith('/api/');
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }

  if (isApiRequest(req)) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  return res.redirect('/login');
}

function redirectIfAuthenticated(req, res, next) {
  if (isAuthenticated(req)) {
    return res.redirect('/');
  }
  next();
}

function handleLogin(req, res) {
  const password = String(req.body.password || '').trim();
  const expected = getAdminPassword();

  if (password && password === expected) {
    if (req.session) req.session.authenticated = true;
    setAuthCookie(res);
    if (req.session?.save) {
      return req.session.save((err) => {
        if (err) {
          return res.redirect('/');
        }
        return res.redirect('/');
      });
    }
    return res.redirect('/');
  }

  return res.render('login', {
    error: 'Contraseña incorrecta',
    title: 'Iniciar sesión',
  });
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
  handleLogin,
  getAdminPassword,
  attachAuth,
  clearAuthCookie,
  isAuthenticated,
};
