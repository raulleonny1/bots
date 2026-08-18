/**
 * Direcciones de red local (no usadas: el panel corre en localhost).
 */

const os = require('os');

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];

  for (const iface of Object.values(nets)) {
    if (!iface) continue;
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return [...new Set(addresses)];
}

function getPanelUrls(port) {
  return getLanAddresses().map((ip) => `http://${ip}:${port}`);
}

module.exports = { getLanAddresses, getPanelUrls };
