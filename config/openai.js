/**
 * Prompt y reglas del asistente ChatGPT para la iglesia.
 * Personaliza el systemPrompt según tu congregación.
 */

const systemPrompt = `Eres el asistente virtual de una iglesia cristiana en WhatsApp. Tu nombre es "Bot Iglesia".

REGLA PRINCIPAL — SOLO TEMAS DE IGLESIA:
Solo respondes preguntas sobre: la iglesia, la fe cristiana, la Biblia, oración, cultos, actividades de la congregación, vida espiritual, familia en contexto cristiano, y servicio a la comunidad de fe.
Si la pregunta NO es sobre la iglesia ni la fe (deportes, tecnología, política, entretenimiento, recetas, trabajo secular, etc.), NO la respondas. Responde únicamente con este texto exacto:
"Solo puedo ayudarte con temas de nuestra iglesia y la fe. Para otras consultas, escríbenos y un miembro del equipo te atenderá. ¡Bendiciones!"

Otras reglas:
- Español, tono cálido y breve (máximo 3 párrafos cortos).
- Horarios de culto: miércoles y sábado a las 7PM.
- Ubicación: Madrid (pueden pedir dirección exacta al equipo).
- Oración: invita a compartir la petición; asegura que orarán por ellos.
- No inventes teléfonos, nombres de pastores ni eventos no confirmados.
- Versículos bíblicos solo cuando encajen; sin sermonear.
- No consejo médico, legal ni financiero.`;

/** Temas permitidos — el mensaje debe contener al menos una de estas palabras/frases */
const churchTopicKeywords = [
  'iglesia',
  'culto',
  'cultos',
  'servicio',
  'servicios',
  'congregacion',
  'congregación',
  'pastor',
  'pastora',
  'lider',
  'líder',
  'ministerio',
  'ministerios',
  'celula',
  'célula',
  'grupo',
  'jovenes',
  'jóvenes',
  'ninos',
  'niños',
  'adoracion',
  'adoración',
  'alabanza',
  'biblia',
  'biblico',
  'bíblico',
  'versiculo',
  'versículo',
  'escritura',
  'evangelio',
  'dios',
  'jesus',
  'jesús',
  'cristo',
  'espiritu santo',
  'espíritu santo',
  'fe',
  'oracion',
  'oración',
  'orar',
  'orando',
  'peticion',
  'petición',
  'rezo',
  'salvacion',
  'salvación',
  'bautismo',
  'comunion',
  'comunión',
  'santa cena',
  'sermon',
  'sermón',
  'predicacion',
  'predicación',
  'enseñanza',
  'enseñanza biblica',
  'estudio biblico',
  'estudio bíblico',
  'capellania',
  'capellanía',
  'diezmo',
  'ofrenda',
  'donacion',
  'donación',
  'voluntariado',
  'mision',
  'misión',
  'evangelizar',
  'discipulado',
  'ayuno',
  'ayunar',
  'horario',
  'ubicacion',
  'ubicación',
  'madrid',
  'bendicion',
  'bendición',
  'oramos',
  'creyente',
  'cristiano',
  'cristiana',
  'reino de dios',
  'palabra de dios',
  'vida espiritual',
  'matrimonio cristiano',
  'familia cristiana',
  'pecado',
  'arrepentimiento',
  'perdon',
  'perdón',
  'santidad',
  'adorar',
  'reunion',
  'reunión',
  'vigilia',
  'retiro',
  'conferencia',
  'seminario',
];

/** Temas bloqueados si NO hay palabra de iglesia en el mismo mensaje */
const offTopicKeywords = [
  'futbol',
  'fútbol',
  'bitcoin',
  'cripto',
  'acciones',
  'bolsa',
  'receta',
  'cocinar',
  'python',
  'javascript',
  'programar',
  'clima',
  'tiempo meteorologico',
  'trump',
  'elecciones',
  'partido politico',
  'netflix',
  'pelicula',
  'película',
  'videojuego',
  'fortnite',
  'tarea escolar',
  'matematicas',
  'matemáticas',
];

/** Mensaje cuando el filtro local detecta tema fuera de iglesia */
const defaultOffTopicMessage =
  'Solo puedo ayudarte con temas de nuestra iglesia y la fe. Para otras consultas, escríbenos y un miembro del equipo te atenderá. ¡Bendiciones! 🙏';

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
  churchTopicKeywords,
  offTopicKeywords,
  defaultOffTopicMessage,
};
