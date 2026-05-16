/**
 * Palabras clave y respuestas automáticas.
 * Agrega nuevas entradas aquí para ampliar el bot sin tocar la lógica.
 */

const keywords = [
  {
    triggers: ['horario', 'horarios', 'culto', 'cultos'],
    response: 'Nuestros cultos son miércoles y sábado a las 7PM',
  },
  {
    triggers: ['ubicacion', 'ubicación', 'direccion', 'dirección', 'donde', 'dónde'],
    response: 'Estamos ubicados en Madrid',
  },
  {
    triggers: ['oracion', 'oración', 'orar', 'peticion', 'petición', 'rezo'],
    response: 'Envíanos tu petición y estaremos orando por ti',
  },
];

module.exports = { keywords };
