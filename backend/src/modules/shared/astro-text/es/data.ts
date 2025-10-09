// backend/src/modules/shared/astro-text/es/data.ts
// ES locale dictionaries for astro-text module (Spanish content with RU PeriodFrame keys for compatibility)

import type { PlanetKey, Sign, AspectType, PeriodFrame, Tone } from '../types';

export const ASPECT_NAMES_ES: Record<AspectType, string> = {
  conjunction: 'en conjunción con',
  opposition: 'en oposición a',
  trine: 'en trígono con',
  square: 'en cuadratura con',
  sextile: 'en sextil con',
};

// Planet-in-sign (partial coverage is fine; facade has fallbacks)
export const PLANET_IN_SIGN_ES: Partial<
  Record<PlanetKey, Partial<Record<Sign, string>>>
> = {
  sun: {
    Aries: 'El Sol en Aries aporta iniciativa, vitalidad y liderazgo.',
    Taurus: 'El Sol en Tauro aporta consistencia, practicidad y amor por la calidad.',
  },
  moon: {
    Aries: 'La Luna en Aries intensifica la espontaneidad emocional y la pasión.',
    Taurus: 'La Luna en Tauro estabiliza las emociones y ama la comodidad.',
  },
};

// Detailed house interpretations by sign (partial)
export const HOUSE_SIGN_INTERPRETATIONS_ES: Partial<
  Record<number, Partial<Record<Sign, string>>>
> = {
  1: {
    Aries: 'Casa 1 en Aries: autoexpresión dinámica, presencia audaz y líder natural.',
    Taurus: 'Casa 1 en Tauro: personalidad estable, práctica y confiable; elegancia serena.',
  },
};

// Ascendant short texts (partial)
export const ASCENDANT_ES: Partial<Record<Sign, string>> = {
  Aries: 'Ascendente en Aries: audaz, directo y enérgico.',
  Taurus: 'Ascendente en Tauro: estable, práctico y calmado.',
};

// House themes/areas (full)
export const HOUSES_THEMES_ES: Record<number, string> = {
  1: 'personalidad y autoexpresión',
  2: 'finanzas y valores',
  3: 'comunicación y aprendizaje',
  4: 'hogar y familia',
  5: 'creatividad y romance',
  6: 'salud y servicio',
  7: 'asociaciones y matrimonio',
  8: 'transformación y recursos compartidos',
  9: 'filosofía y viajes',
  10: 'carrera y estatus público',
  11: 'amistad y aspiraciones',
  12: 'subconsciente y espiritualidad',
};

export const HOUSES_AREAS_ES: Record<number, string> = {
  1: 'Personalidad',
  2: 'Finanzas',
  3: 'Comunicación',
  4: 'Hogar y Familia',
  5: 'Creatividad',
  6: 'Salud',
  7: 'Asociación',
  8: 'Transformación',
  9: 'Viajes',
  10: 'Carrera',
  11: 'Amistad',
  12: 'Espiritualidad',
};

// Period templates — keep RU PeriodFrame keys for compatibility
export const GENERAL_TEMPLATES_ES: Record<
  PeriodFrame,
  Record<Tone, string[]>
> = {
  Сегодня: {
    positive: ['Hoy es favorable: la energía abre oportunidades.'],
    neutral: ['Hoy es equilibrado: ritmo constante y escucha interna.'],
    challenging: ['Hoy requiere paciencia: los retos son crecimiento.'],
  },
  Завтра: {
    positive: ['Mañana trae inspiración y movimiento positivo.'],
    neutral: ['Mañana es constante: planifica con cuidado.'],
    challenging: ['Mañana puede exigir calma y consciencia.'],
  },
  'На этой неделе': {
    positive: ['Esta semana apoya pasos significativos.'],
    neutral: ['Esta semana es estable: enfócate en prioridades.'],
    challenging: ['Esta semana pondrá a prueba tu equilibrio: sé paciente.'],
  },
  'В этом месяце': {
    positive: ['Este mes favorece proyectos a largo plazo.'],
    neutral: ['Este mes avanza con constancia: refina rutinas.'],
    challenging: ['Este mes requiere resiliencia y ritmo cuidadoso.'],
  },
};

export const LOVE_PERIOD_PHRASES_ES: Record<
  PeriodFrame,
  { positive: string[]; neutral: string[]; negative: string[] }
> = {
  Сегодня: {
    positive: [
      'crea una atmósfera romántica',
      'fortalece la atracción mutua',
      'invita ternura y cuidado',
      'alinea para un diálogo cálido',
    ],
    neutral: [
      'influye en el estado de ánimo',
      'anima intercambios calmados',
      'invita conversación honesta',
      'recuerda la atención al detalle',
    ],
    negative: [
      'crea tensión',
      'puede aumentar sensibilidad',
      'demanda moderación en reacciones',
      'pone a prueba la armonía',
    ],
  },
  Завтра: {
    positive: [
      'promete encuentros agradables',
      'favorece reconciliaciones',
      'aumenta carisma e interés',
      'apoya conexión sincera',
    ],
    neutral: [
      'facilita la comunicación',
      'ayuda a escucharse mutuamente',
      'promueve compromisos amables',
      'invita cercanía tranquila',
    ],
    negative: [
      'puede generar malentendidos',
      'requiere paciencia y tacto',
      'recuerda los límites personales',
      'revela expectativas no dichas',
    ],
  },
  'На этой неделе': {
    positive: [
      'abre perspectivas para la relación',
      'apoya profundizar la confianza',
      'anima planes compartidos',
      'trae gestos cálidos de atención',
    ],
    neutral: [
      'mantiene estabilidad en pareja',
      'anima equilibrio de roles',
      'llama a moderación y cuidado',
      'alinea a un ritmo común',
    ],
    negative: [
      'demanda trabajo en la relación',
      'plantea apoyo mutuo',
      'destaca desalineaciones',
      'pone a prueba acuerdos',
    ],
  },
  'В этом месяце': {
    positive: [
      'crea condiciones favorables para el amor',
      'apoya la armonía a largo plazo',
      'fortalece el entendimiento',
      'da tiempo a tradiciones cálidas',
    ],
    neutral: [
      'promueve el desarrollo de la relación',
      'establece diálogo maduro',
      'anima decisiones conjuntas',
      'apoya ritmo constante',
    ],
    negative: [
      'llama a reevaluar prioridades',
      'invita honestidad y responsabilidad',
      'puede requerir pausa reparadora',
      'sugiere necesidad de límites',
    ],
  },
};

export const CAREER_PERIOD_ACTIONS_ES: Record<
  PeriodFrame,
  { jupiter: string[]; saturn: string[]; mars: string[]; neutral: string[] }
> = {
  Сегодня: {
    jupiter: ['hoy es favorable para', 'hoy abre oportunidades para'],
    saturn: ['hoy requiere', 'hoy es importante enfocarse en'],
    mars: ['hoy trae energía para', 'hoy invita impulso activo en'],
    neutral: ['hoy continúa trabajando en', 'hoy mantén ritmo estable en'],
  },
  Завтра: {
    jupiter: ['mañana abre posibilidades para', 'mañana conviene expandir en'],
    saturn: ['mañana exige planificación para', 'mañana organiza y sistematiza'],
    mars: ['mañana trae impulso para', 'mañana puedes acelerar en'],
    neutral: ['mañana enfócate en', 'mañana continúa refinando'],
  },
  'На этой неделе': {
    jupiter: ['esta semana favorece crecer en', 'esta semana apoya el escalado de'],
    saturn: ['esta semana requiere', 'esta semana es para estructurar'],
    mars: ['esta semana añade empuje para', 'esta semana permite un avance en'],
    neutral: ['esta semana conviene trabajo constante en', 'esta semana consolida resultados en'],
  },
  'В этом месяце': {
    jupiter: ['este mes abre crecimiento en', 'este mes apoya iniciativas estratégicas en'],
    saturn: ['este mes llama a', 'este mes es para disciplina en'],
    mars: ['este mes añade energía para progresar en', 'este mes fortalece el momentum en'],
    neutral: ['este mes favorece el desarrollo de', 'este mes mejora procesos en'],
  },
};

export const ADVICE_POOLS_ES: Record<PeriodFrame, string[]> = {
  Сегодня: [
    'Hoy confía en tu intuición y da el primer paso.',
    'Hoy mantente abierto a experiencias nuevas.',
    'Hoy practica gratitud por lo que tienes.',
  ],
  Завтра: [
    'Mañana empieza con intención clara.',
    'Mañana sé flexible ante oportunidades.',
    'Mañana planifica tareas importantes.',
  ],
  'На этой неделе': [
    'Esta semana equilibra trabajo y descanso.',
    'Esta semana refuerza talentos propios.',
    'Esta semana cultiva relaciones valiosas.',
  ],
  'В этом месяце': [
    'Este mes enfócate en metas de largo plazo.',
    'Este mes invierte en aprendizaje y crecimiento.',
    'Este mes construye una base sólida.',
  ],
};

export const SIGN_COLORS_ES: Record<Sign, string[]> = {
  Aries: ['Rojo', 'Naranja'],
  Taurus: ['Verde', 'Rosa'],
  Gemini: ['Amarillo', 'Azul Claro'],
  Cancer: ['Plata', 'Blanco'],
  Leo: ['Oro', 'Naranja'],
  Virgo: ['Marrón', 'Beige'],
  Libra: ['Rosa', 'Azul Claro'],
  Scorpio: ['Burdeos', 'Negro'],
  Sagittarius: ['Púrpura', 'Azul'],
  Capricorn: ['Gris', 'Verde'],
  Aquarius: ['Azul Cielo', 'Plata'],
  Pisces: ['Turquesa', 'Lavanda'],
};

// Aspect pair templates (partial)
export const ASPECT_PAIR_TEMPLATES_ES: Partial<
  Record<
    AspectType,
    Partial<Record<PlanetKey, Partial<Record<PlanetKey, string>>>>
  >
> = {
  conjunction: {
    sun: {
      moon: 'Sol en conjunción con Luna unifica voluntad y emoción: ideal para iniciar.',
    },
    venus: {
      mars: 'Venus conjunción Marte enciende pasión y pulso creativo.',
    },
  },
  trine: {
    mercury: {
      jupiter: 'Mercurio trígono Júpiter trae claridad, aprendizaje y oportunidad.',
    },
  },
  square: {
    mars: {
      saturn: 'Marte cuadratura Saturno exige paciencia y disciplina estructurada.',
    },
  },
};

// Ascendant meta (partial)
export const ASCENDANT_META_ES: Partial<
  Record<
    Sign,
    {
      keywords: string[];
      strengths: string[];
      challenges: string[];
    }
  >
> = {
  Aries: {
    keywords: ['iniciativa', 'directo', 'energético'],
    strengths: ['Coraje', 'Rapidez', 'Liderazgo'],
    challenges: ['Impulsividad', 'Franqueza', 'Impaciencia'],
  },
  Taurus: {
    keywords: ['estable', 'práctico', 'confiable'],
    strengths: ['Resistencia', 'Consistencia', 'Sensualidad'],
    challenges: ['Terquedad', 'Rutina', 'Lentitud'],
  },
};

// Extended details (15 lines recommended) — partial coverage to start
export const PLANET_IN_SIGN_EXT_ES: Partial<
  Record<PlanetKey, Partial<Record<Sign, string[]>>>
> = {
  sun: {
    Aries: [
      '• Impulso fuerte para liderazgo y acción decisiva.',
      '• Necesidad alta de moverse rápido y con claridad.',
      '• Excelente para iniciar y abrir caminos.',
      '• Equilibrio: velocidad vs. sostenibilidad.',
      '• La motivación crece con metas concretas.',
      '• Ejercicio físico descarga tensión.',
      '• Riesgo: precipitación e impaciencia.',
      '• Practica planificar el siguiente paso.',
      '• Lidera desde el ejemplo, no desde la presión.',
      '• Respeta la autonomía ajena en pareja y equipos.',
      '• Haz una acción audaz diaria hacia tu objetivo.',
      '• Apóyate en lo que te enciende genuinamente.',
      '• Evita dispersarte: foco en una prioridad.',
      '• Aprende a pausar antes de reaccionar.',
      '• Resultado: liderazgo consciente y responsable.',
    ],
    Taurus: [
      '• Base: estabilidad, constancia y valor tangible.',
      '• Progreso por rutinas y método.',
      '• La calidad alimenta la motivación.',
      '• Terminar lo empezado es fortaleza central.',
      '• Riesgo: zona de confort prolongada.',
      '• Disciplina financiera crea seguridad.',
      '• Escucha señales del cuerpo (fatiga/saciedad).',
      '• Disfrute sensorial como fuente de energía.',
      '• Practica Kaizen: 1% de mejora diaria.',
      '• Flexibiliza ante cambios inevitables.',
      '• No confundas estabilidad con estancamiento.',
      '• Relaciones basadas en fiabilidad y calma.',
      '• Anclas materiales/rituales para foco.',
      '• Menos promesas, más hechos consistentes.',
      '• Resultado: crecimiento sólido y sostenible.',
    ],
  },
  moon: {
    Aries: [
      '• Emoción rápida: prende y se apaga pronto.',
      '• Pedagogía emocional: pausa breve antes de actuar.',
      '• Movimiento ayuda a metabolizar estrés.',
      '• Disparadores: bloqueo e inercia externa.',
      '• Pequeñas metas para victorias rápidas.',
      '• Valora la franqueza sin agresión.',
      '• Practica respiración 4–4–4–4.',
      '• Da espacio a la independencia afectiva.',
      '• Rituales cortos de descarga corporal.',
      '• Coraje para expresar vulnerabilidad.',
      '• Evita acumular resentimiento.',
      '• Usa ira como señal de límites.',
      '• Pequeñas victorias construyen confianza.',
      '• Aprende a pedir ayuda cuando necesites.',
      '• Resultado: emocionalidad viva y auténtica.',
    ],
    Taurus: [
      '• Emoción estable: calma y predictibilidad.',
      '• Necesidad de seguridad emocional tangible.',
      '• Ritmos lentos para procesar sentimientos.',
      '• Disfrute sensorial como ancla emocional.',
      '• Riesgo: apego excesivo a lo conocido.',
      '• Practica paciencia con cambios internos.',
      '• Construye confianza a través de consistencia.',
      '• Valora la lealtad en relaciones.',
      '• Escucha señales del cuerpo.',
      '• Evita suprimir emociones por comodidad.',
      '• Usa rutinas para estabilidad emocional.',
      '• Aprende a recibir afecto sin condiciones.',
      '• Pequeños gestos de cuidado diario.',
      '• Flexibiliza ante lo inesperado.',
      '• Resultado: paz emocional profunda.',
    ],
  },
};

export const ASCENDANT_EXT_ES: Partial<Record<Sign, string[]>> = {
  Aries: [
    '• Presencia audaz y directa en el mundo.',
    '• Primera impresión: energética y decidida.',
    '• Atracción por desafíos y acción rápida.',
    '• Estilo: práctico, dinámico y funcional.',
    '• Relaciones: respeta autonomía mutua.',
    '• Riesgo: imponer en lugar de dialogar.',
    '• Practica: una prioridad principal por día.',
    '• Lidera con ejemplo, no con presión.',
    '• Respeta límites personales en equipos.',
    '• Acción audaz diaria hacia metas.',
    '• Apóyate en lo que te motiva genuinamente.',
    '• Evita dispersión: foco en lo esencial.',
    '• Pausa antes de reaccionar impulsivamente.',
    '• Resultado: liderazgo consciente y responsable.',
    '• Principio: acción con propósito.',
  ],
  Taurus: [
    '• Presencia calmada y confiable.',
    '• Primera impresión: estable y serena.',
    '• Fuerza a través de consistencia y sustancia.',
    '• Estilo: cómodo, centrado en calidad.',
    '• Relaciones: lealtad y predictibilidad.',
    '• Riesgo: estancamiento y apego excesivo.',
    '• Practica: mejora del 1% diario.',
    '• Resultado: presencia confiable a largo plazo.',
    '• Principio: calidad sobre velocidad.',
    '• Construye confianza con hechos.',
    '• Valora la estabilidad emocional.',
    '• Evita rutinas rígidas.',
    '• Disfruta del proceso, no solo resultados.',
    '• Anclas materiales para grounding.',
    '• Resultado: presencia sólida y duradera.',
  ],
};

export const HOUSE_SIGN_INTERPRETATIONS_EXT_ES: Partial<
  Record<number, Partial<Record<Sign, string[]>>>
> = {
  1: {
    Aries: [
      '• Autoexpresión dinámica y audaz.',
      '• Presencia fuerte y orientada a acción.',
      '• Impulso para independencia y decisiones rápidas.',
      '• Habilidad: canalizar iniciativa constructivamente.',
      '• Recurso: sprints sobre maratones.',
      '• Estilo: limpio, dinámico y práctico.',
      '• Parejas: protege autonomía de ambas partes.',
      '• Riesgo: empujar en lugar de dialogar.',
      '• Practica: una prioridad principal por día.',
      '• Resultado: liderazgo inspirador y contagioso.',
      '• Principio: menos palabras, más hechos.',
      '• Evita imponer tu ritmo.',
      '• Respeta el espacio personal.',
      '• Acción diaria hacia metas.',
      '• Resultado: presencia poderosa y responsable.',
    ],
    Taurus: [
      '• Autoexpresión calmada y confiada.',
      '• Fuerza a través de estabilidad y sustancia.',
      '• Habilidad: paciencia y consistencia.',
      '• Recurso: rituales y anclas materiales.',
      '• Estilo: cómodo y centrado en calidad.',
      '• Relaciones: lealtad y predictibilidad.',
      '• Riesgo: estancamiento y apego excesivo.',
      '• Practica: mejora del 1% diario.',
      '• Resultado: presencia confiable a largo plazo.',
      '• Principio: calidad sobre velocidad.',
      '• Construye confianza con hechos.',
      '• Evita rutinas rígidas.',
      '• Disfruta del proceso.',
      '• Anclas para grounding.',
      '• Resultado: presencia sólida y duradera.',
    ],
  },
};