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
      type: 'text',
      label: 'Horarios de atención y cultos',
      response:
        '🕐 *Horarios de atención*\n\nNuestros cultos son *miércoles y sábado a las 7:00 PM*.',
    },
    {
      id: 2,
      type: 'text',
      label: 'Programa de alimento',
      response:
        '🍞 *Programa de alimento*\n\nGracias por tu interés. Acércate en culto para más información.',
    },
    {
      id: 3,
      type: 'link',
      label: 'Estudiar la Biblia',
      redirectName: 'el estudio bíblico',
      linkUrl: 'https://estudios-biblicos-gamma.vercel.app/',
    },
    {
      id: 4,
      type: 'forward',
      label: 'Escribir a la reverenda',
      forwardMessages: true,
      whatsappPresetText: 'Hola reverenda, escribo desde el bot de la iglesia.',
    },
    {
      id: 5,
      type: 'submenu',
      label: 'Saber sobre las creencias de la iglesia',
      children: defaultBeliefsSubmenu.items.map((item, i) => ({
        id: i + 1,
        type: 'text',
        label: item.label,
        response: item.response,
        children: [],
      })),
    },
  ],
};

module.exports = { defaultMenu };
