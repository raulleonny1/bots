/**
 * Imprime el JSON de cuenta de servicio en una línea para pegar en Vercel:
 * Variable: FIREBASE_SERVICE_ACCOUNT_JSON
 *
 * Uso: node scripts/print-firebase-env.js
 */

const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'firebase-service-account.json');
if (!fs.existsSync(file)) {
  console.error('No existe firebase-service-account.json en la raíz del proyecto.');
  process.exit(1);
}

const json = JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')));
console.log('\n--- Copia TODO esto en Vercel → FIREBASE_SERVICE_ACCOUNT_JSON ---\n');
console.log(json);
console.log('\n--- Fin. Luego: Redeploy en Vercel ---\n');
