/**
 * Valores por defecto del menu (se copian a settings.json la primera vez).
 */

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
  options: [
    {
      id: 1,
      label: 'Horarios de atención y cultos',
      response:
        '🕐 *Horarios de atención*\n\nNuestros cultos son *miércoles y sábado a las 7:00 PM*.\n\nEscribe *menu* para más opciones.',
      useOpenAI: false,
    },
    {
      id: 2,
      label: 'Programa de alimento',
      response:
        '🍞 *Programa de alimento*\n\nGracias por tu interés. Acércate en culto o escribe *menu* para más opciones.',
      useOpenAI: false,
    },
    {
      id: 3,
      label: 'Estudiar la Biblia',
      response:
        '📖 *Estudiar la Biblia*\n\nTenemos estudios bíblicos. Cultos: miércoles y sábado 7 PM.\n\nEscribe *menu* para otras opciones.',
      useOpenAI: false,
    },
    {
      id: 4,
      label: 'Conocer más sobre nosotros',
      response:
        '⛪ *Sobre nosotros*\n\nIglesia cristiana en *Madrid*. Cultos: miércoles y sábado 7 PM.\n\nEscribe *menu* para el menú.',
      useOpenAI: false,
    },
    {
      id: 5,
      label: 'Escribir a la reverenda',
      response:
        '✉️ *Contacto con la reverenda*\n\nEnvía tu mensaje aquí y lo compartiremos con ella.\n\nEscribe *menu* para volver.',
      useOpenAI: false,
    },
    {
      id: 6,
      label: 'Saber sobre las creencias de la iglesia',
      response:
        '✝️ *Creencias de nuestra iglesia*\n\nPuedes preguntarme sobre la fe, la Biblia y lo que creemos. Escribe tu pregunta en el siguiente mensaje.\n\n_Escribe *menu* para volver al menú._',
      useOpenAI: true,
    },
  ],
};

module.exports = { defaultMenu };
