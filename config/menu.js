/**
 * Valores por defecto del menu (se copian a settings.json la primera vez).
 */

const { defaultBeliefsSubmenu } = require('./beliefsSubmenu');

const defaultMenu = {
  intro: '¡Bendiciones! Bienvenido/a a nuestra iglesia.\n\n¿En qué podemos ayudarte? Responde con el *número* de tu opción:',
  footer: '_Escribe *menu* en cualquier momento para ver este menú de nuevo._',
  greetings: [
    'hola',
    'buenos dias',
    'buenos días',
    'buenas tardes',
    'buenas noches',
    'buen dia',
    'buen día',
    'hey',
    'saludos',
  ],
  beliefsSubmenu: defaultBeliefsSubmenu,
  options: [
    {
      id: 1,
      label: 'Horarios de atención y cultos',
      response:
        '🕐 *Horarios de atención*\n\nNuestros cultos son *miércoles y sábado a las 7:00 PM*.\n\nEscribe *menu* para más opciones.',
    },
    {
      id: 2,
      label: 'Programa de alimento',
      response:
        '🍞 *Programa de alimento*\n\nGracias por tu interés. Acércate en culto o escribe *menu* para más opciones.',
    },
    {
      id: 3,
      label: 'Estudiar la Biblia',
      response: '',
      redirectName: 'el estudio bíblico',
      linkUrl: '',
    },
    {
      id: 4,
      label: 'Escribir a la reverenda',
      response: '',
      forwardMessages: true,
      whatsappPresetText: 'Hola reverenda, escribo desde el bot de la iglesia.',
    },
    {
      id: 5,
      label: 'Saber sobre las creencias de la iglesia',
      response: '',
    },
  ],
};

module.exports = { defaultMenu };
