/**
 * Verificación rápida: módulos, dependencias y reglas básicas.
 * Uso: npm run check
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors += 1;
}

function warn(msg) {
  console.warn(`  ! ${msg}`);
  warnings += 1;
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

console.log('\n--- Verificación del proyecto ---\n');

// Dependencias en package.json
const pkg = require(path.join(root, 'package.json'));
const requiredDeps = [
  'dotenv',
  'ejs',
  'express',
  'express-session',
  'node-cron',
  'openai',
  'qrcode',
  'qrcode-terminal',
  'whatsapp-web.js',
];

for (const dep of requiredDeps) {
  const depPath = path.join(root, 'node_modules', dep);
  if (!fs.existsSync(depPath)) {
    fail(`Dependencia no instalada: ${dep} (ejecuta npm install)`);
  } else {
    ok(`Dependencia: ${dep}`);
  }
}

// Cargar módulos principales
try {
  require(path.join(root, 'config', 'env'));
  require(path.join(root, 'config', 'openai'));
  require(path.join(root, 'services', 'autoReplyService'));
  ok('Módulos principales cargan sin error');
} catch (e) {
  fail(`Error al cargar módulos: ${e.message}`);
}

// Filtro iglesia: falso positivo "profesional"
const { isChurchRelated } = require(path.join(root, 'utils', 'churchTopic'));
if (isChurchRelated('necesito un profesional de marketing')) {
  fail('Falso positivo: "profesional" no debe contar como tema de iglesia');
} else {
  ok('Filtro iglesia: sin falso positivo en "profesional"');
}

if (!isChurchRelated('que es la fe en dios')) {
  fail('Falso negativo: "fe" en contexto religioso debería pasar');
} else {
  ok('Filtro iglesia: detecta "fe" en contexto correcto');
}

// .env no debe estar en git
if (fs.existsSync(path.join(root, '.git'))) {
  const { execSync } = require('child_process');
  try {
    const tracked = execSync('git ls-files .env', { cwd: root, encoding: 'utf8' }).trim();
    if (tracked) {
      fail('.env está versionado en git — riesgo de filtrar secretos');
    } else {
      ok('.env no está en el repositorio git');
    }
  } catch {
    ok('.env no está en el repositorio git');
  }
}

// Node.js
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 18) {
  warn(`Node ${process.versions.node}: se recomienda Node 18+`);
} else {
  ok(`Node.js ${process.versions.node}`);
}

console.log(`\n--- Resultado: ${errors} error(es), ${warnings} advertencia(s) ---\n`);
process.exit(errors > 0 ? 1 : 0);
