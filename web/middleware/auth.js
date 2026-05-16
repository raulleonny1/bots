/**
 * Autenticación del panel admin por sesión.
 */

const path = require('path');
const { config } = require('../../config/env');

/**
 * Lee ADMIN_PASSWORD del .env (re-carga en cada login por si cambiaste .env sin reiniciar).
 */
function getAdminPassword() {
  require('dotenv').config({
    path: path.resolve(__dirname, '..', '..', '.env'),
    override: true,
  });

  return String(process.env.ADMIN_PASSWORD || config.admin.password).trim();
}

function requireAuth(req, res, next) {
  if (req.session?.authenticated) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  return res.redirect('/login');
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session?.authenticated) {
    return res.redirect('/');
  }
  next();
}

function handleLogin(req, res) {
  const password = String(req.body.password || '').trim();
  const expected = getAdminPassword();

  if (password && password === expected) {
    req.session.authenticated = true;
    return res.redirect('/');
  }

  return res.render('login', {
    error: 'Contraseña incorrecta',
    title: 'Iniciar sesión',
  });
}

module.exports = { requireAuth, redirectIfAuthenticated, handleLogin, getAdminPassword };
