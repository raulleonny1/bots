/**
 * Submenú de creencias (opción 5 del menú principal). Respuestas fijas, sin ChatGPT.
 * Editable en data/settings.json → menu.beliefsSubmenu
 */

const defaultBeliefsSubmenu = {
  intro:
    '✝️ *Creencias de nuestra iglesia*\n' +
    'Parroquia «El buen Pastor» — Iglesia Española Reformada Episcopal\n\n' +
    'Elige un tema (responde con el *número*):',
  footer: '_Escribe *atrás* para ver este submenú o *menu* para el menú principal._',
  items: [
    {
      label: 'Quiénes somos',
      response:
        '⛪ *Quiénes somos*\n\n' +
        'Somos una comunidad cristiana de la *Iglesia Española Reformada Episcopal* (IERE). ' +
        'Profesamos la fe apostólica en continuidad con la Reforma y la tradición anglicana.\n\n' +
        'Nuestra parroquia es *«El buen Pastor»*. Celebramos culto, estudio bíblico, oración y servicio al prójimo. ' +
        'Todos son bienvenidos a conocernos y participar.',
    },
    {
      label: 'La Biblia',
      response:
        '📖 *La Biblia*\n\n' +
        'Creemos que la *Santa Escritura* es la Palabra de Dios escrita, norma suprema de la fe y la vida. ' +
        'Los setenta y dos libros del Antiguo y Nuevo Testamento contienen todo lo necesario para la salvación.\n\n' +
        'La Biblia se interpreta con la razón, la tradición de la Iglesia y el testimonio de los credos antiguos.',
    },
    {
      label: 'Dios: Trinidad',
      response:
        '☦️ *Dios uno y trino*\n\n' +
        'Creemos en *un solo Dios*: Padre, Hijo y Espíritu Santo, tres personas en una sola esencia.\n\n' +
        '• *Padre*: Creador y sustentador de todo.\n' +
        '• *Hijo*: Jesucristo, verdadero Dios y verdadero hombre.\n' +
        '• *Espíritu Santo*: que santifica, guía y da vida a la Iglesia.',
    },
    {
      label: 'Jesús y salvación',
      response:
        '✝️ *Jesús Cristo y la salvación*\n\n' +
        'Creemos que el Señor *Jesucristo* es el único Salvador: por su muerte y resurrección reconcilia a la humanidad con Dios.\n\n' +
        'La salvación es por *gracia*, mediante la fe en Cristo, no por méritos humanos. ' +
        'Somos llamados a arrepentirnos, creer el Evangelio y seguirle en la vida diaria.',
    },
    {
      label: 'Sacramentos',
      response:
        '🕊️ *Sacramentos*\n\n' +
        'Reconocemos dos sacramentos instituidos por Cristo:\n\n' +
        '• *Bautismo*: entrada en la Iglesia, perdón de pecados y nuevo nacimiento en el Espíritu.\n' +
        '• *Santa Cena (Eucaristía)*: comunión con Cristo en el pan y el vino, memorial de su sacrificio y prenda de vida eterna.\n\n' +
        'Otros ritos (matrimonio, ordenación, etc.) son signos de la gracia de Dios.',
    },
    {
      label: 'Iglesia y episcopado',
      response:
        '🏛️ *La Iglesia y el episcopado*\n\n' +
        'La *Iglesia* es el cuerpo de Cristo: el pueblo de Dios reunido por el Espíritu.\n\n' +
        'En la IERE mantenemos el *ministerio episcopal* en sucesión apostólica: obispos, presbíteros y diáconos ' +
        'sirven a la comunidad predicando la Palabra y administrando los sacramentos.',
    },
    {
      label: 'Liturgia y oración',
      response:
        '📿 *Liturgia y oración*\n\n' +
        'Nuestro culto une *Palabra y sacramento*: lecturas bíblicas, predicación, oraciones comunes, canto y Santa Cena.\n\n' +
        'Usamos liturgias propias de la tradición anglicana (p. ej. oraciones del Libro de Oración Común). ' +
        'La oración personal y comunitaria sostiene la vida de fe.',
    },
    {
      label: 'Vida cristiana y misión',
      response:
        '❤️ *Vida cristiana y misión*\n\n' +
        'El discípulo de Cristo ama a Dios y al prójimo, busca justicia y paz, y anuncia el Evangelio con palabra y obras.\n\n' +
        'En nuestra parroquia servimos con programas de ayuda, visitas, estudio bíblico y acogida. ' +
        'Cada persona tiene un don para edificar a la comunidad.',
    },
    {
      label: 'Cómo unirte a nosotros',
      response:
        '🤝 *Cómo unirte*\n\n' +
        '• Ven a un *culto* (consulta horarios en el menú principal).\n' +
        '• Participa en *estudio bíblico* o actividades parroquiales.\n' +
        '• Habla con la *reverenda* o con cualquier miembro (menú opción 4).\n\n' +
        'Si deseas el bautismo o la confirmación, te acompañamos en preparación y catequesis.',
    },
  ],
};

module.exports = { defaultBeliefsSubmenu };
