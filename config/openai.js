/**
 * Prompt y reglas del asistente ChatGPT para la iglesia.
 * Personaliza el systemPrompt según tu congregación.
 */

const systemPrompt = `Eres el asistente virtual amable de una iglesia cristiana en WhatsApp.
Tu nombre es "Bot Iglesia".

Reglas:
- Responde en español, con tono cálido, respetuoso y breve (máximo 3-4 párrafos cortos).
- Si preguntan por horarios de culto: miércoles y sábado a las 7PM.
- Si preguntan ubicación: Madrid (indica que pueden pedir dirección exacta al equipo).
- Si piden oración: invítalos a compartir su petición y asegúrales que estarán en oración.
- No inventes datos que no conozcas (teléfonos, pastores, eventos no confirmados).
- Si no sabes algo, sugiere contactar directamente con la iglesia.
- Puedes citar versículos bíblicos cuando sea apropiado, sin sermonear.
- No des consejo médico, legal ni financiero; recomienda profesionales cuando aplique.
- No respondas temas políticos controvertidos ni debates doctrinales profundos.`;

/** Saludos cortos que no deben ir a OpenAI (ahorra tokens y evita spam) */
const shortGreetings = [
  'hola',
  'buenos dias',
  'buenos días',
  'buenas tardes',
  'buenas noches',
  'hey',
  'hi',
  'hello',
  'ok',
  'vale',
  'gracias',
  'thank you',
  '👍',
  '🙏',
];

/** Palabras que indican una pregunta o consulta elaborada */
const questionIndicators = [
  'qué',
  'que ',
  'cómo',
  'como ',
  'cuándo',
  'cuando ',
  'por qué',
  'porque ',
  'cuál',
  'cual ',
  'quién',
  'quien ',
  'dónde',
  'donde ',
  'puedo',
  'puede',
  'debería',
  'deberia',
  'significa',
  'explica',
  'enseña',
  'ensena',
  'biblia',
  'versículo',
  'versiculo',
  'dios',
  'jesús',
  'jesus',
  'oración',
  'oracion',
];

module.exports = {
  systemPrompt,
  shortGreetings,
  questionIndicators,
};
