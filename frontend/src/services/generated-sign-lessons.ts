import type { Aspect, Chart } from '../types';
import { calculateAspect } from '../helpers/planetCalculations';
import type { AstroLesson } from '../types/lessons';

export type SupportedLessonsLocale = 'ru' | 'en' | 'es';
export type NatalPlacement =
  | 'sun'
  | 'moon'
  | 'ascendant'
  | 'descendant'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'midheaven'
  | 'jupiter'
  | 'saturn'
  | 'northNode'
  | 'southNode'
  | 'chiron';
export type SignKey =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export interface NatalLessonPlacements {
  sunSign?: string | null;
  moonSign?: string | null;
  ascendantSign?: string | null;
  descendantSign?: string | null;
  mercurySign?: string | null;
  venusSign?: string | null;
  marsSign?: string | null;
  midheavenSign?: string | null;
  jupiterSign?: string | null;
  saturnSign?: string | null;
  northNodeSign?: string | null;
  southNodeSign?: string | null;
  chironSign?: string | null;
  houseSigns?: Partial<Record<PersonalizedHouseNumber, string | null>>;
}

export type PersonalizedHouseNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

type LocalizedSignProfile = {
  title: string;
  inSign: string;
  signature: string;
  gift: string;
  shadow: string;
  need: string;
  growth: string;
};

type SignProfile = Record<SupportedLessonsLocale, LocalizedSignProfile>;

type LocalizedHouseProfile = {
  title: string;
  theme: string;
  focus: string;
  risk: string;
  growth: string;
};

type HouseProfile = Record<SupportedLessonsLocale, LocalizedHouseProfile>;

type PersonalizedAspectPoint =
  | 'sun'
  | 'moon'
  | 'ascendant'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn';

type PersonalizedAspectKind =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition';

type AspectTone = 'harmonious' | 'challenging' | 'intense';

interface PersonalizedAspectEntry {
  pointA: PersonalizedAspectPoint;
  pointB: PersonalizedAspectPoint;
  aspect: PersonalizedAspectKind;
  orb: number;
  strength: number;
}

type LocalizedAspectPointProfile = {
  title: string;
  domain: string;
  domainShort: string;
};

type AspectPointProfile = Record<
  SupportedLessonsLocale,
  LocalizedAspectPointProfile
>;

type LocalizedAspectProfile = {
  title: string;
  toneLabel: string;
  overview: string;
  gift: string;
  risk: string;
  growth: string;
};

type AspectProfile = Record<SupportedLessonsLocale, LocalizedAspectProfile>;

const SIGN_ORDER: SignKey[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

const HOUSE_ORDER: PersonalizedHouseNumber[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];

const PERSONALIZED_ASPECT_POINT_ORDER: PersonalizedAspectPoint[] = [
  'sun',
  'moon',
  'ascendant',
  'venus',
  'mars',
  'jupiter',
  'saturn',
];

const PERSONALIZED_ASPECT_CORE_POINTS: PersonalizedAspectPoint[] = [
  'sun',
  'moon',
  'ascendant',
];

const PERSONALIZED_ASPECT_TARGET_POINTS: PersonalizedAspectPoint[] = [
  'venus',
  'mars',
  'jupiter',
  'saturn',
];

const PERSONALIZED_ASPECT_ORDER: PersonalizedAspectKind[] = [
  'conjunction',
  'trine',
  'sextile',
  'opposition',
  'square',
];

const PERSONALIZED_ASPECT_MAX_LESSONS = 6;

const SIGN_OPPOSITES: Record<SignKey, SignKey> = {
  aries: 'libra',
  taurus: 'scorpio',
  gemini: 'sagittarius',
  cancer: 'capricorn',
  leo: 'aquarius',
  virgo: 'pisces',
  libra: 'aries',
  scorpio: 'taurus',
  sagittarius: 'gemini',
  capricorn: 'cancer',
  aquarius: 'leo',
  pisces: 'virgo',
};

const SIGN_ALIASES: Record<string, SignKey> = {
  aries: 'aries',
  овен: 'aries',
  aries_: 'aries',
  taurus: 'taurus',
  телец: 'taurus',
  gemini: 'gemini',
  géminis: 'gemini',
  geminis: 'gemini',
  близнецы: 'gemini',
  cancer: 'cancer',
  рак: 'cancer',
  leo: 'leo',
  лев: 'leo',
  virgo: 'virgo',
  дева: 'virgo',
  libra: 'libra',
  весы: 'libra',
  scorpio: 'scorpio',
  escorpio: 'scorpio',
  скорпион: 'scorpio',
  sagittarius: 'sagittarius',
  sagitario: 'sagittarius',
  стрелец: 'sagittarius',
  capricorn: 'capricorn',
  capricornio: 'capricorn',
  козерог: 'capricorn',
  aquarius: 'aquarius',
  acuario: 'aquarius',
  водолей: 'aquarius',
  pisces: 'pisces',
  piscis: 'pisces',
  рыбы: 'pisces',
};

const SIGN_PROFILES: Record<SignKey, SignProfile> = {
  aries: {
    ru: {
      title: 'Овен',
      inSign: 'в Овне',
      signature: 'прямой импульс, скорость и готовность идти первым',
      gift: 'смелость запускать новое без долгих колебаний',
      shadow: 'нетерпение и желание продавить всё силой',
      need: 'движение, честность и возможность действовать сразу',
      growth: 'превращать импульс в зрелое лидерство',
    },
    en: {
      title: 'Aries',
      inSign: 'in Aries',
      signature: 'direct impulse, speed, and the instinct to go first',
      gift: 'the courage to start before everyone else',
      shadow: 'impatience and the urge to force every process',
      need: 'movement, honesty, and the freedom to act quickly',
      growth: 'turning raw impulse into mature leadership',
    },
    es: {
      title: 'Aries',
      inSign: 'en Aries',
      signature: 'impulso directo, rapidez y deseo de iniciar primero',
      gift: 'la valentia de comenzar sin esperar demasiado',
      shadow: 'impaciencia y tendencia a empujar todo por la fuerza',
      need: 'movimiento, honestidad y margen para actuar de inmediato',
      growth: 'convertir el impulso en liderazgo maduro',
    },
  },
  taurus: {
    ru: {
      title: 'Телец',
      inSign: 'в Тельце',
      signature: 'устойчивость, телесность и умение укреплять результат',
      gift: 'способность создавать надёжную опору и держать темп',
      shadow: 'упрямство и застревание в привычном',
      need: 'стабильность, ритм и ощутимые ресурсы вокруг',
      growth: 'сохранять устойчивость и не путать её с застойностью',
    },
    en: {
      title: 'Taurus',
      inSign: 'in Taurus',
      signature:
        'stability, embodiment, and the ability to build something lasting',
      gift: 'the capacity to create reliable support and keep a steady pace',
      shadow: 'stubbornness and attachment to the familiar',
      need: 'stability, rhythm, and tangible resources',
      growth: 'keeping your stability without turning it into stagnation',
    },
    es: {
      title: 'Tauro',
      inSign: 'en Tauro',
      signature: 'estabilidad, cuerpo y capacidad de consolidar resultados',
      gift: 'la capacidad de crear apoyo real y sostener el ritmo',
      shadow: 'terquedad y apego excesivo a lo conocido',
      need: 'estabilidad, ritmo y recursos tangibles',
      growth: 'mantener la firmeza sin convertirla en inmovilidad',
    },
  },
  gemini: {
    ru: {
      title: 'Близнецы',
      inSign: 'в Близнецах',
      signature: 'подвижность ума, любопытство и быстрая связь между идеями',
      gift: 'умение быстро схватывать, соединять и объяснять',
      shadow: 'рассеянность и жизнь только на поверхности',
      need: 'контакт, обмен и ощущение интеллектуального движения',
      growth: 'углублять знания и не распылять внимание',
    },
    en: {
      title: 'Gemini',
      inSign: 'in Gemini',
      signature: 'mental agility, curiosity, and fast links between ideas',
      gift: 'the ability to learn quickly, connect dots, and explain well',
      shadow: 'scattered focus and staying on the surface',
      need: 'contact, exchange, and intellectual movement',
      growth: 'adding depth without losing flexibility',
    },
    es: {
      title: 'Geminis',
      inSign: 'en Geminis',
      signature: 'agilidad mental, curiosidad y conexion rapida entre ideas',
      gift: 'la capacidad de aprender rapido, conectar y explicar',
      shadow: 'dispersion y tendencia a quedarse en la superficie',
      need: 'contacto, intercambio y movimiento mental',
      growth: 'ganar profundidad sin perder flexibilidad',
    },
  },
  cancer: {
    ru: {
      title: 'Рак',
      inSign: 'в Раке',
      signature: 'эмоциональная память, забота и тонкая реакция на атмосферу',
      gift: 'способность создавать чувство дома и защищать важное',
      shadow: 'обидчивость и уход в защиту вместо открытого разговора',
      need: 'безопасность, близость и эмоционально тёплая среда',
      growth: 'развивать мягкость без самоизоляции',
    },
    en: {
      title: 'Cancer',
      inSign: 'in Cancer',
      signature: 'emotional memory, care, and sensitivity to the atmosphere',
      gift: 'the ability to create a sense of home and protect what matters',
      shadow: 'defensiveness and retreating instead of speaking openly',
      need: 'safety, closeness, and emotional warmth',
      growth: 'staying soft without disappearing into self-protection',
    },
    es: {
      title: 'Cancer',
      inSign: 'en Cancer',
      signature: 'memoria emocional, cuidado y sensibilidad al ambiente',
      gift: 'la capacidad de crear hogar y proteger lo importante',
      shadow: 'susceptibilidad y retirada defensiva',
      need: 'seguridad, cercania y calidez emocional',
      growth: 'mantener la suavidad sin aislarte',
    },
  },
  leo: {
    ru: {
      title: 'Лев',
      inSign: 'во Льве',
      signature: 'яркость, сердечность и желание выражаться щедро',
      gift: 'умение вдохновлять и оживлять пространство своим присутствием',
      shadow: 'драматизация и зависимость от признания',
      need: 'творческая сцена, уважение и чувство личной значимости',
      growth: 'нести свет без необходимости всё время доказывать ценность',
    },
    en: {
      title: 'Leo',
      inSign: 'in Leo',
      signature:
        'radiance, warmth, and the desire to express yourself generously',
      gift: 'the ability to inspire and enliven a room with your presence',
      shadow: 'dramatization and dependence on validation',
      need: 'creative visibility, respect, and a sense of personal significance',
      growth: 'bringing light without needing to prove your worth all the time',
    },
    es: {
      title: 'Leo',
      inSign: 'en Leo',
      signature: 'brillo, calidez y deseo de expresarte con generosidad',
      gift: 'la capacidad de inspirar y dar vida al espacio con tu presencia',
      shadow: 'dramatizacion y dependencia de la aprobacion',
      need: 'visibilidad creativa, respeto y sentido de importancia personal',
      growth: 'dar luz sin tener que demostrar tu valor constantemente',
    },
  },
  virgo: {
    ru: {
      title: 'Дева',
      inSign: 'в Деве',
      signature: 'точность, наблюдательность и стремление улучшать систему',
      gift: 'умение видеть детали и делать процесс чище и эффективнее',
      shadow: 'самокритика и застревание в несовершенстве',
      need: 'понятный порядок, польза и ощущение, что вклад нужен',
      growth: 'развивать качество без перфекционистского давления',
    },
    en: {
      title: 'Virgo',
      inSign: 'in Virgo',
      signature: 'precision, observation, and the drive to improve systems',
      gift: 'the ability to notice details and make things cleaner and more useful',
      shadow: 'self-criticism and getting stuck in imperfection',
      need: 'clear order, usefulness, and meaningful contribution',
      growth: 'choosing quality without falling into perfectionism',
    },
    es: {
      title: 'Virgo',
      inSign: 'en Virgo',
      signature: 'precision, observacion y deseo de mejorar el sistema',
      gift: 'la capacidad de ver detalles y volver el proceso mas limpio y util',
      shadow: 'autocritica y fijacion con lo imperfecto',
      need: 'orden claro, utilidad y sentir que tu aporte sirve',
      growth: 'elegir calidad sin caer en perfeccionismo',
    },
  },
  libra: {
    ru: {
      title: 'Весы',
      inSign: 'в Весах',
      signature: 'чувство баланса, дипломатия и настройка на другого',
      gift: 'умение создавать гармонию и видеть обе стороны сразу',
      shadow: 'колебания и уход от прямого конфликта',
      need: 'красота, взаимность и пространство для диалога',
      growth: 'сохранять дипломатичность и не терять собственную позицию',
    },
    en: {
      title: 'Libra',
      inSign: 'in Libra',
      signature: 'balance, diplomacy, and attunement to other people',
      gift: 'the ability to create harmony and see both sides at once',
      shadow: 'indecision and avoiding direct conflict',
      need: 'beauty, reciprocity, and room for dialogue',
      growth: 'staying diplomatic without abandoning your own position',
    },
    es: {
      title: 'Libra',
      inSign: 'en Libra',
      signature: 'sentido de equilibrio, diplomacia y sintonia con el otro',
      gift: 'la capacidad de crear armonia y ver ambos lados',
      shadow: 'indecision y evitacion del conflicto directo',
      need: 'belleza, reciprocidad y espacio para dialogar',
      growth: 'mantener diplomacia sin perder tu propia posicion',
    },
  },
  scorpio: {
    ru: {
      title: 'Скорпион',
      inSign: 'в Скорпионе',
      signature: 'глубина, интенсивность и способность идти в суть без обходов',
      gift: 'смелость видеть скрытое и проходить через трансформацию',
      shadow: 'подозрительность, контроль и крайности',
      need: 'доверие, честность и ощущение настоящей глубины',
      growth: 'использовать силу глубины без разрушительности',
    },
    en: {
      title: 'Scorpio',
      inSign: 'in Scorpio',
      signature:
        'depth, intensity, and the instinct to go straight to the core',
      gift: 'the courage to face what is hidden and transform through it',
      shadow: 'suspicion, control, and emotional extremes',
      need: 'trust, honesty, and real emotional depth',
      growth: 'using intensity as power instead of destruction',
    },
    es: {
      title: 'Escorpio',
      inSign: 'en Escorpio',
      signature: 'profundidad, intensidad y deseo de ir al nucleo',
      gift: 'el coraje de mirar lo oculto y transformarte a traves de ello',
      shadow: 'sospecha, control y extremos emocionales',
      need: 'confianza, honestidad y profundidad real',
      growth: 'usar la intensidad como poder y no como destruccion',
    },
  },
  sagittarius: {
    ru: {
      title: 'Стрелец',
      inSign: 'в Стрельце',
      signature: 'широкий горизонт, поиск смысла и тяга к движению',
      gift: 'способность видеть перспективу и заражать верой в путь',
      shadow: 'обещания без опоры и бегство от ограничений',
      need: 'простор, честность и ощущение роста',
      growth: 'соединять свободу с ответственностью за направление',
    },
    en: {
      title: 'Sagittarius',
      inSign: 'in Sagittarius',
      signature:
        'a wide horizon, meaning-seeking, and the urge to move forward',
      gift: 'the ability to see perspective and inspire faith in the journey',
      shadow: 'overpromising and escaping limits',
      need: 'space, honesty, and a sense of growth',
      growth: 'pairing freedom with responsibility for direction',
    },
    es: {
      title: 'Sagitario',
      inSign: 'en Sagitario',
      signature: 'horizonte amplio, busqueda de sentido y deseo de avanzar',
      gift: 'la capacidad de ver perspectiva e inspirar confianza en el camino',
      shadow: 'prometer de mas y huir de los limites',
      need: 'espacio, honestidad y sensacion de crecimiento',
      growth: 'unir libertad con responsabilidad por la direccion elegida',
    },
  },
  capricorn: {
    ru: {
      title: 'Козерог',
      inSign: 'в Козероге',
      signature: 'собранность, стратегия и ориентация на результат',
      gift: 'умение выдерживать дистанцию и строить надолго',
      shadow: 'жёсткость, контроль и жизнь только через долг',
      need: 'структура, уважение и ясная цель',
      growth: 'добавлять теплоту и гибкость к своей силе',
    },
    en: {
      title: 'Capricorn',
      inSign: 'in Capricorn',
      signature: 'discipline, strategy, and long-term orientation',
      gift: 'the ability to endure, structure, and build for the future',
      shadow: 'rigidity, control, and living only through duty',
      need: 'structure, respect, and a clear goal',
      growth: 'bringing warmth and flexibility into your strength',
    },
    es: {
      title: 'Capricornio',
      inSign: 'en Capricornio',
      signature: 'disciplina, estrategia y orientacion a largo plazo',
      gift: 'la capacidad de sostener, estructurar y construir con vision',
      shadow: 'rigidez, control y vida solo desde el deber',
      need: 'estructura, respeto y un objetivo claro',
      growth: 'sumar calidez y flexibilidad a tu fuerza',
    },
  },
  aquarius: {
    ru: {
      title: 'Водолей',
      inSign: 'в Водолее',
      signature:
        'независимое мышление, нестандартность и взгляд на систему сверху',
      gift: 'умение приносить новые идеи и видеть будущее раньше других',
      shadow: 'отстранённость и сопротивление близости ради свободы',
      need: 'пространство, смысл и контакт с чем-то большим',
      growth: 'соединять свободу с живым человеческим участием',
    },
    en: {
      title: 'Aquarius',
      inSign: 'in Aquarius',
      signature: 'independent thinking, originality, and a systems-level view',
      gift: 'the ability to bring new ideas and see the future early',
      shadow: 'detachment and resisting closeness in the name of freedom',
      need: 'space, meaning, and connection to a bigger vision',
      growth: 'linking freedom with real human participation',
    },
    es: {
      title: 'Acuario',
      inSign: 'en Acuario',
      signature: 'pensamiento independiente, originalidad y vision del sistema',
      gift: 'la capacidad de traer ideas nuevas y ver el futuro antes',
      shadow: 'distancia emocional y resistencia a la cercania',
      need: 'espacio, sentido y conexion con una vision amplia',
      growth: 'unir libertad con presencia humana real',
    },
  },
  pisces: {
    ru: {
      title: 'Рыбы',
      inSign: 'в Рыбах',
      signature:
        'чувствительность, воображение и проницаемость к тонким процессам',
      gift: 'способность считывать атмосферу и чувствовать глубже слов',
      shadow: 'размытые границы и уход от реальности',
      need: 'мягкость, вдохновение и пространство для восстановления',
      growth: 'сохранять эмпатию и укреплять границы',
    },
    en: {
      title: 'Pisces',
      inSign: 'in Pisces',
      signature: 'sensitivity, imagination, and openness to subtle processes',
      gift: 'the ability to sense atmosphere and feel beyond words',
      shadow: 'blurred boundaries and drifting away from reality',
      need: 'softness, inspiration, and time to recover',
      growth: 'keeping empathy while strengthening boundaries',
    },
    es: {
      title: 'Piscis',
      inSign: 'en Piscis',
      signature: 'sensibilidad, imaginacion y apertura a procesos sutiles',
      gift: 'la capacidad de sentir el ambiente y percibir mas alla de las palabras',
      shadow: 'limites difusos y escapismo',
      need: 'suavidad, inspiracion y espacio para recuperarte',
      growth: 'mantener empatia mientras fortaleces limites',
    },
  },
};

const HOUSE_PROFILES: Record<PersonalizedHouseNumber, HouseProfile> = {
  1: {
    ru: {
      title: '1-й дом',
      theme: 'самопрезентации, телесного стиля и способа входить в жизнь',
      focus: 'как вы начинаете, проявляетесь и собираете первое впечатление',
      risk: 'застревания в защитной маске или слишком жёстком образе',
      growth: 'более живой и осознанной подаче себя',
    },
    en: {
      title: '1st house',
      theme: 'self-presentation, embodiment, and the way you enter life',
      focus: 'how you initiate, show up, and shape first impressions',
      risk: 'getting stuck in a defensive persona or rigid self-image',
      growth: 'a more alive and conscious way of being seen',
    },
    es: {
      title: 'Casa 1',
      theme: 'autoexpresion, presencia corporal y forma de entrar en la vida',
      focus: 'como inicias, te muestras y generas primera impresion',
      risk: 'quedarte atrapado en una mascara defensiva o una imagen rigida',
      growth: 'una presencia mas viva y consciente',
    },
  },
  2: {
    ru: {
      title: '2-й дом',
      theme: 'ресурсов, ценностей и внутренней опоры',
      focus: 'как вы зарабатываете, удерживаете и ощущаете ценность',
      risk: 'тревоги за устойчивость или привязки к форме безопасности',
      growth: 'более зрелому чувству достаточности и самоуважения',
    },
    en: {
      title: '2nd house',
      theme: 'resources, values, and inner stability',
      focus: 'how you earn, hold, and define value',
      risk: 'anxious attachment to security or material proof',
      growth: 'a more mature sense of enoughness and self-worth',
    },
    es: {
      title: 'Casa 2',
      theme: 'recursos, valores y estabilidad interna',
      focus: 'como generas, sostienes y defines valor',
      risk: 'apego ansioso a la seguridad o a la prueba material',
      growth: 'una sensacion mas madura de suficiencia y valor propio',
    },
  },
  3: {
    ru: {
      title: '3-й дом',
      theme: 'мышления, общения, повседневных контактов и обучения',
      focus:
        'как вы говорите, воспринимаете информацию и выстраиваете близкий круг общения',
      risk: 'информационного шума, поспешных выводов или реактивного общения',
      growth: 'ясному мышлению, зрелому диалогу и гибкому обучению',
    },
    en: {
      title: '3rd house',
      theme: 'thinking, communication, everyday contacts, and learning',
      focus:
        'how you speak, process information, and build your close social environment',
      risk: 'mental noise, rushed conclusions, or reactive communication',
      growth: 'clear thinking, mature dialogue, and adaptive learning',
    },
    es: {
      title: 'Casa 3',
      theme: 'pensamiento, comunicacion, contactos cotidianos y aprendizaje',
      focus:
        'como hablas, procesas informacion y construyes tu entorno cercano',
      risk: 'ruido mental, conclusiones apresuradas o comunicacion reactiva',
      growth: 'pensamiento claro, dialogo maduro y aprendizaje flexible',
    },
  },
  4: {
    ru: {
      title: '4-й дом',
      theme: 'дома, корней, семьи и внутренней базы',
      focus: 'как вы переживаете принадлежность, безопасность и частную жизнь',
      risk: 'жизни в старых семейных сценариях или закрытости из-за уязвимости',
      growth: 'внутренней опоре, теплу и более зрелому чувству дома',
    },
    en: {
      title: '4th house',
      theme: 'home, roots, family, and inner foundation',
      focus: 'how you experience belonging, safety, and private life',
      risk: 'living through old family scripts or closing off out of vulnerability',
      growth: 'inner grounding, warmth, and a more mature sense of home',
    },
    es: {
      title: 'Casa 4',
      theme: 'hogar, raices, familia y base interior',
      focus: 'como experimentas pertenencia, seguridad y vida privada',
      risk: 'vivir segun viejos guiones familiares o cerrarte por vulnerabilidad',
      growth: 'arraigo interno, calidez y una nocion mas madura de hogar',
    },
  },
  5: {
    ru: {
      title: '5-й дом',
      theme: 'творчества, удовольствия, романтики и игры',
      focus: 'как вы сияете, флиртуете и позволяете себе радость',
      risk: 'зависимости от внимания или потери контакта со спонтанностью',
      growth: 'свободному и зрелому самовыражению',
    },
    en: {
      title: '5th house',
      theme: 'creativity, pleasure, romance, and play',
      focus: 'how you shine, flirt, and allow joy',
      risk: 'dependency on validation or losing touch with spontaneity',
      growth: 'freer and more mature self-expression',
    },
    es: {
      title: 'Casa 5',
      theme: 'creatividad, placer, romance y juego',
      focus: 'como brillas, coqueteas y permites alegria',
      risk: 'dependencia de la validacion o perdida de espontaneidad',
      growth: 'una expresion propia mas libre y madura',
    },
  },
  6: {
    ru: {
      title: '6-й дом',
      theme: 'ритма, работы, полезности и заботы о теле',
      focus: 'как вы организуете будни, сервис, здоровье и рабочие процессы',
      risk: 'перегруза, гиперконтроля или жизни в режиме постоянного долга',
      growth:
        'устойчивому режиму, полезной дисциплине и бережной эффективности',
    },
    en: {
      title: '6th house',
      theme: 'rhythm, work, usefulness, and care of the body',
      focus: 'how you organize routines, service, health, and daily workflows',
      risk: 'overload, hyper-control, or living in constant duty mode',
      growth: 'steady rhythm, useful discipline, and sustainable efficiency',
    },
    es: {
      title: 'Casa 6',
      theme: 'ritmo, trabajo, utilidad y cuidado del cuerpo',
      focus: 'como organizas rutinas, servicio, salud y procesos diarios',
      risk: 'sobrecarga, hipercontrol o vivir en modo de deber constante',
      growth: 'ritmo estable, disciplina util y eficiencia sostenible',
    },
  },
  7: {
    ru: {
      title: '7-й дом',
      theme: 'партнёрства, зеркала и близких союзов',
      focus: 'какие отношения вы строите и что ищете в другом',
      risk: 'повтора сценариев ради привычного баланса',
      growth: 'более взрослому и взаимному союзу',
    },
    en: {
      title: '7th house',
      theme: 'partnership, mirroring, and close union',
      focus: 'what kind of relationships you build and seek in others',
      risk: 'repeating old patterns in the name of balance',
      growth: 'more mature and reciprocal partnership',
    },
    es: {
      title: 'Casa 7',
      theme: 'pareja, espejo y vinculos cercanos',
      focus: 'que tipo de relaciones construyes y buscas en el otro',
      risk: 'repetir patrones viejos en nombre del equilibrio',
      growth: 'vinculos mas maduros y reciprocos',
    },
  },
  8: {
    ru: {
      title: '8-й дом',
      theme: 'интимности, трансформации и общих ресурсов',
      focus: 'как вы проходите через кризис, доверие и глубокую близость',
      risk: 'контроля, крайностей и страха потери',
      growth: 'честной глубине и здоровому обмену',
    },
    en: {
      title: '8th house',
      theme: 'intimacy, transformation, and shared resources',
      focus: 'how you move through crisis, trust, and deep bonding',
      risk: 'control, emotional extremes, and fear of loss',
      growth: 'honest depth and healthy exchange',
    },
    es: {
      title: 'Casa 8',
      theme: 'intimidad, transformacion y recursos compartidos',
      focus: 'como atraviesas crisis, confianza y fusion profunda',
      risk: 'control, extremos emocionales y miedo a perder',
      growth: 'profundidad honesta e intercambio sano',
    },
  },
  9: {
    ru: {
      title: '9-й дом',
      theme: 'смыслов, мировоззрения, дальних путей и расширения горизонта',
      focus:
        'как вы ищете истину, развиваетесь и выходите за пределы привычного',
      risk: 'догматизма, ухода в абстракции или побега от реальности в большие идеи',
      growth: 'живому смыслу, зрелой вере и более широкому взгляду на мир',
    },
    en: {
      title: '9th house',
      theme: 'meaning, worldview, long journeys, and expanding horizons',
      focus: 'how you seek truth, grow, and move beyond the familiar',
      risk: 'dogmatism, abstraction, or escaping reality through grand ideas',
      growth: 'living meaning, mature faith, and a wider view of life',
    },
    es: {
      title: 'Casa 9',
      theme:
        'sentido, vision del mundo, viajes largos y expansion del horizonte',
      focus: 'como buscas verdad, creces y sales de lo familiar',
      risk: 'dogmatismo, abstraccion o huir de la realidad en grandes ideas',
      growth: 'sentido vivo, fe madura y una mirada mas amplia de la vida',
    },
  },
  10: {
    ru: {
      title: '10-й дом',
      theme: 'карьеры, статуса и роли в мире',
      focus: 'как вы строите репутацию и берёте высоту',
      risk: 'жизни только ради внешнего результата или статуса',
      growth: 'публичной зрелости и авторству пути',
    },
    en: {
      title: '10th house',
      theme: 'career, status, and public role',
      focus: 'how you build reputation and pursue visible achievement',
      risk: 'living only for status or external proof',
      growth: 'public maturity and authorship of your path',
    },
    es: {
      title: 'Casa 10',
      theme: 'carrera, estatus y rol publico',
      focus: 'como construyes reputacion y persigues logros visibles',
      risk: 'vivir solo para el estatus o la prueba externa',
      growth: 'madurez publica y autoria de tu camino',
    },
  },
  11: {
    ru: {
      title: '11-й дом',
      theme: 'сообществ, друзей, будущего и больших замыслов',
      focus: 'как вы соединяетесь с кругом людей и видением будущего',
      risk: 'отстранённости или растворения в группе',
      growth: 'сильной сети, идеи и совместного движения',
    },
    en: {
      title: '11th house',
      theme: 'community, friendship, future vision, and larger goals',
      focus: 'how you connect with networks and shared futures',
      risk: 'detachment or dissolving yourself into the group',
      growth: 'stronger networks, ideas, and shared momentum',
    },
    es: {
      title: 'Casa 11',
      theme: 'comunidad, amistades, vision de futuro y metas amplias',
      focus: 'como te conectas con redes y futuros compartidos',
      risk: 'distancia o disolucion dentro del grupo',
      growth: 'redes mas fuertes, ideas y movimiento compartido',
    },
  },
  12: {
    ru: {
      title: '12-й дом',
      theme: 'внутренней тишины, бессознательного, завершений и восстановления',
      focus:
        'как вы проживаете уединение, интуицию, отпускание и тонкие процессы',
      risk: 'самосаботажа, ухода от реальности или размытых личных границ',
      growth:
        'осознанной глубине, мягкому восстановлению и контакту с внутренним миром',
    },
    en: {
      title: '12th house',
      theme: 'inner silence, the unconscious, endings, and recovery',
      focus:
        'how you move through solitude, intuition, release, and subtle inner processes',
      risk: 'self-sabotage, escapism, or blurred personal boundaries',
      growth:
        'conscious depth, gentle recovery, and connection to the inner world',
    },
    es: {
      title: 'Casa 12',
      theme: 'silencio interior, inconsciente, cierres y recuperacion',
      focus:
        'como atraviesas soledad, intuicion, soltar y procesos internos sutiles',
      risk: 'autosabotaje, escapismo o limites personales difusos',
      growth:
        'profundidad consciente, recuperacion suave y conexion con el mundo interior',
    },
  },
};

const ASPECT_POINT_PROFILES: Record<
  PersonalizedAspectPoint,
  AspectPointProfile
> = {
  sun: {
    ru: {
      title: 'Солнце',
      domain: 'ядро личности, воля и способ самовыражения',
      domainShort: 'личное ядро и воля',
    },
    en: {
      title: 'Sun',
      domain: 'core identity, will, and self-expression',
      domainShort: 'core identity and will',
    },
    es: {
      title: 'Sol',
      domain: 'identidad central, voluntad y autoexpresion',
      domainShort: 'identidad central y voluntad',
    },
  },
  moon: {
    ru: {
      title: 'Луна',
      domain: 'эмоции, потребности и внутренний ритм',
      domainShort: 'эмоции и потребности',
    },
    en: {
      title: 'Moon',
      domain: 'emotions, needs, and inner rhythm',
      domainShort: 'emotions and needs',
    },
    es: {
      title: 'Luna',
      domain: 'emociones, necesidades y ritmo interno',
      domainShort: 'emociones y necesidades',
    },
  },
  ascendant: {
    ru: {
      title: 'Асцендент',
      domain: 'внешнюю подачу, стиль реакции и первое впечатление',
      domainShort: 'внешнюю подачу и стиль реакции',
    },
    en: {
      title: 'Ascendant',
      domain: 'outer style, instinctive response, and first impression',
      domainShort: 'outer style and instinctive response',
    },
    es: {
      title: 'Ascendente',
      domain: 'estilo externo, reaccion instintiva y primera impresion',
      domainShort: 'estilo externo y reaccion instintiva',
    },
  },
  venus: {
    ru: {
      title: 'Венера',
      domain: 'ценности, симпатию, удовольствие и сценарий притяжения',
      domainShort: 'ценности и сценарий притяжения',
    },
    en: {
      title: 'Venus',
      domain: 'values, attraction, pleasure, and relational style',
      domainShort: 'values and attraction style',
    },
    es: {
      title: 'Venus',
      domain: 'valores, atraccion, placer y estilo vincular',
      domainShort: 'valores y estilo de atraccion',
    },
  },
  mars: {
    ru: {
      title: 'Марс',
      domain: 'действие, границы, напор и сексуальную энергию',
      domainShort: 'действие и границы',
    },
    en: {
      title: 'Mars',
      domain: 'action, boundaries, drive, and sexual energy',
      domainShort: 'action and boundaries',
    },
    es: {
      title: 'Marte',
      domain: 'accion, limites, impulso y energia sexual',
      domainShort: 'accion y limites',
    },
  },
  jupiter: {
    ru: {
      title: 'Юпитер',
      domain: 'рост, веру, смысл и расширение горизонта',
      domainShort: 'рост и жизненный смысл',
    },
    en: {
      title: 'Jupiter',
      domain: 'growth, faith, meaning, and expansion',
      domainShort: 'growth and life perspective',
    },
    es: {
      title: 'Jupiter',
      domain: 'crecimiento, fe, sentido y expansion',
      domainShort: 'crecimiento y perspectiva vital',
    },
  },
  saturn: {
    ru: {
      title: 'Сатурн',
      domain: 'структуру, зрелость, страх и внутренние требования',
      domainShort: 'структуру и уроки зрелости',
    },
    en: {
      title: 'Saturn',
      domain: 'structure, maturity, fear, and inner demands',
      domainShort: 'structure and maturity lessons',
    },
    es: {
      title: 'Saturno',
      domain: 'estructura, madurez, miedo y exigencia interna',
      domainShort: 'estructura y lecciones de madurez',
    },
  },
};

const PERSONALIZED_ASPECT_PROFILES: Record<
  PersonalizedAspectKind,
  AspectProfile
> = {
  conjunction: {
    ru: {
      title: 'Соединение',
      toneLabel: 'интенсивный аспект',
      overview: 'сливает две темы в один сильный внутренний узел',
      gift: 'даёт концентрацию и цельность, если энергия осознана',
      risk: 'переусиления, перегрева и жизни в одном доминирующем паттерне',
      growth: 'разделять роли этих энергий и управлять ими осознанно',
    },
    en: {
      title: 'Conjunction',
      toneLabel: 'intense aspect',
      overview: 'blends two themes into one concentrated pattern',
      gift: 'creates focus and cohesion when the energy is conscious',
      risk: 'over-identification, overheating, and living through one dominant pattern',
      growth: 'separating these energies enough to use them consciously',
    },
    es: {
      title: 'Conjuncion',
      toneLabel: 'aspecto intenso',
      overview: 'fusiona dos temas en un patron muy concentrado',
      gift: 'da foco y coherencia cuando la energia es consciente',
      risk: 'sobreidentificacion, exceso y vivir desde un solo patron dominante',
      growth: 'distinguir ambas energias para usarlas con conciencia',
    },
  },
  sextile: {
    ru: {
      title: 'Секстиль',
      toneLabel: 'гармоничный аспект',
      overview: 'создаёт лёгкий канал сотрудничества и полезных возможностей',
      gift: 'даёт гибкий ресурс, который хорошо включается через инициативу',
      risk: 'недооценки своего потенциала из-за слишком мягкого хода энергии',
      growth: 'активно использовать эти возможности, а не ждать автоматически',
    },
    en: {
      title: 'Sextile',
      toneLabel: 'harmonious aspect',
      overview: 'creates an easy channel of cooperation and opportunity',
      gift: 'offers a flexible resource that responds well to initiative',
      risk: 'underusing potential because the energy feels too easy',
      growth: 'activating the opportunity instead of waiting for it to happen',
    },
    es: {
      title: 'Sextil',
      toneLabel: 'aspecto armonico',
      overview: 'crea un canal fluido de cooperacion y oportunidad',
      gift: 'ofrece un recurso flexible que responde bien a la iniciativa',
      risk: 'subutilizar el potencial porque la energia parece demasiado facil',
      growth: 'activar la oportunidad en lugar de esperarla pasivamente',
    },
  },
  square: {
    ru: {
      title: 'Квадрат',
      toneLabel: 'напряжённый аспект',
      overview: 'создаёт внутреннее трение, которое вынуждает расти',
      gift: 'даёт силу, характер и драйв к реальному развитию',
      risk: 'конфликтов, самокритики и жизни в режиме постоянного давления',
      growth: 'переводить напряжение в навык, а не в саморазрушение',
    },
    en: {
      title: 'Square',
      toneLabel: 'challenging aspect',
      overview: 'creates friction that pushes growth and development',
      gift: 'builds strength, character, and real momentum',
      risk: 'conflict, self-criticism, and constant internal pressure',
      growth: 'turning tension into mastery instead of self-sabotage',
    },
    es: {
      title: 'Cuadratura',
      toneLabel: 'aspecto desafiante',
      overview: 'crea friccion que empuja al crecimiento',
      gift: 'construye fuerza, caracter e impulso real',
      risk: 'conflicto, autocritica y presion interna constante',
      growth: 'convertir la tension en maestria y no en autosabotaje',
    },
  },
  trine: {
    ru: {
      title: 'Трин',
      toneLabel: 'гармоничный аспект',
      overview: 'даёт естественный поток и ощущение внутренней согласованности',
      gift: 'позволяет опираться на врождённый талант и лёгкость',
      risk: 'самоуспокоения и привычки не развивать то, что и так работает',
      growth: 'осознанно превращать талант в зрелое качество',
    },
    en: {
      title: 'Trine',
      toneLabel: 'harmonious aspect',
      overview: 'creates natural flow and inner coherence',
      gift: 'allows you to lean on native talent and ease',
      risk: 'complacency and under-developing what already works',
      growth: 'turning talent into a mature and conscious strength',
    },
    es: {
      title: 'Trino',
      toneLabel: 'aspecto armonico',
      overview: 'crea flujo natural y coherencia interna',
      gift: 'permite apoyarte en un talento natural y en la facilidad',
      risk: 'comodidad excesiva o no desarrollar lo que ya funciona',
      growth: 'convertir el talento en una fortaleza madura y consciente',
    },
  },
  opposition: {
    ru: {
      title: 'Оппозиция',
      toneLabel: 'напряжённый аспект',
      overview: 'разводит энергии по полюсу и заставляет искать баланс',
      gift: 'даёт объёмное видение и способность видеть обе стороны',
      risk: 'качелей, проекций и ощущения, что жизнь всё время тянет в разные стороны',
      growth: 'учиться удерживать полярности без раскола на две крайности',
    },
    en: {
      title: 'Opposition',
      toneLabel: 'challenging aspect',
      overview: 'pulls the energies into polarity and demands balance',
      gift: 'offers perspective and the ability to see both sides',
      risk: 'swings, projection, and feeling split between extremes',
      growth: 'holding the polarity without collapsing into either side',
    },
    es: {
      title: 'Oposicion',
      toneLabel: 'aspecto desafiante',
      overview: 'lleva las energias a polaridad y exige equilibrio',
      gift: 'aporta perspectiva y capacidad de ver ambos lados',
      risk: 'oscilaciones, proyeccion y sensacion de vivir entre extremos',
      growth: 'sostener la polaridad sin caer en ninguno de los extremos',
    },
  },
};

const PLACEMENT_META: Record<
  NatalPlacement,
  {
    icon: string;
    emoji: string;
    gradient: readonly [string, string];
    orderBase: number;
    readTime: number;
    relatedLessons: string[];
    title: Record<SupportedLessonsLocale, string>;
    subtitle: Record<SupportedLessonsLocale, string>;
  }
> = {
  sun: {
    icon: 'sunny',
    emoji: '☉',
    gradient: ['#F59E0B', '#FBBF24'],
    orderBase: 10,
    readTime: 95,
    relatedLessons: ['planets_001', 'basics_003'],
    title: {
      ru: 'Солнце',
      en: 'Sun',
      es: 'Sol',
    },
    subtitle: {
      ru: 'Как проявляется ваше солнечное ядро',
      en: 'How your core identity expresses itself',
      es: 'Como se expresa tu nucleo solar',
    },
  },
  moon: {
    icon: 'moon',
    emoji: '☽',
    gradient: ['#6366F1', '#8B5CF6'],
    orderBase: 30,
    readTime: 95,
    relatedLessons: ['planets_002', 'basics_003'],
    title: {
      ru: 'Луна',
      en: 'Moon',
      es: 'Luna',
    },
    subtitle: {
      ru: 'Как устроен ваш эмоциональный ритм',
      en: 'How your emotional rhythm is built',
      es: 'Como funciona tu ritmo emocional',
    },
  },
  ascendant: {
    icon: 'arrow-up-circle',
    emoji: 'ASC',
    gradient: ['#10B981', '#14B8A6'],
    orderBase: 50,
    readTime: 90,
    relatedLessons: ['basics_003', 'houses_001'],
    title: {
      ru: 'Асцендент',
      en: 'Ascendant',
      es: 'Ascendente',
    },
    subtitle: {
      ru: 'Как вас считывают с первого контакта',
      en: 'How people read you on first contact',
      es: 'Como te leen en el primer contacto',
    },
  },
  descendant: {
    icon: 'people',
    emoji: 'DSC',
    gradient: ['#EC4899', '#F43F5E'],
    orderBase: 70,
    readTime: 90,
    relatedLessons: ['houses_007', 'practical_003'],
    title: {
      ru: 'Десцендент',
      en: 'Descendant',
      es: 'Descendente',
    },
    subtitle: {
      ru: 'Чему вас учат отношения и союз',
      en: 'What partnership teaches you',
      es: 'Lo que el vinculo te ensena',
    },
  },
  mercury: {
    icon: 'chatbubbles',
    emoji: '☿',
    gradient: ['#3B82F6', '#2563EB'],
    orderBase: 90,
    readTime: 90,
    relatedLessons: ['planets_003', 'basics_003'],
    title: {
      ru: 'Меркурий',
      en: 'Mercury',
      es: 'Mercurio',
    },
    subtitle: {
      ru: 'Как вы думаете, говорите и связываете идеи',
      en: 'How you think, speak, and connect ideas',
      es: 'Como piensas, hablas y conectas ideas',
    },
  },
  venus: {
    icon: 'heart',
    emoji: '♀',
    gradient: ['#EC4899', '#EF4444'],
    orderBase: 110,
    readTime: 90,
    relatedLessons: ['planets_004', 'practical_003'],
    title: {
      ru: 'Венера',
      en: 'Venus',
      es: 'Venus',
    },
    subtitle: {
      ru: 'Как вы любите, цените и выбираете близость',
      en: 'How you love, value, and choose closeness',
      es: 'Como amas, valoras y eliges cercania',
    },
  },
  mars: {
    icon: 'flame',
    emoji: '♂',
    gradient: ['#F97316', '#EF4444'],
    orderBase: 130,
    readTime: 90,
    relatedLessons: ['planets_005', 'practical_004'],
    title: {
      ru: 'Марс',
      en: 'Mars',
      es: 'Marte',
    },
    subtitle: {
      ru: 'Как вы действуете, спорите и добиваетесь своего',
      en: 'How you act, fight, and pursue what you want',
      es: 'Como actuas, confrontas y vas por lo que quieres',
    },
  },
  midheaven: {
    icon: 'trophy',
    emoji: 'MC',
    gradient: ['#8B5CF6', '#6366F1'],
    orderBase: 150,
    readTime: 85,
    relatedLessons: ['houses_010', 'practical_004'],
    title: {
      ru: 'MC',
      en: 'Midheaven',
      es: 'Medio Cielo',
    },
    subtitle: {
      ru: 'Какой образ и путь вы строите в мире',
      en: 'What public path and reputation you are building',
      es: 'Que camino publico e imagen construyes en el mundo',
    },
  },
  jupiter: {
    icon: 'gift',
    emoji: '♃',
    gradient: ['#3B82F6', '#2563EB'],
    orderBase: 170,
    readTime: 85,
    relatedLessons: ['planets_006', 'practical_004'],
    title: {
      ru: 'Юпитер',
      en: 'Jupiter',
      es: 'Jupiter',
    },
    subtitle: {
      ru: 'Где вы растёте, расширяете горизонт и верите в большее',
      en: 'Where you grow, expand, and trust bigger possibilities',
      es: 'Donde creces, te expandes y confias en posibilidades mayores',
    },
  },
  saturn: {
    icon: 'hourglass',
    emoji: '♄',
    gradient: ['#8B6C42', '#6B7280'],
    orderBase: 190,
    readTime: 90,
    relatedLessons: ['planets_007', 'transits_001'],
    title: {
      ru: 'Сатурн',
      en: 'Saturn',
      es: 'Saturno',
    },
    subtitle: {
      ru: 'Где жизнь требует дисциплины, зрелости и формы',
      en: 'Where life asks for discipline, maturity, and structure',
      es: 'Donde la vida pide disciplina, madurez y estructura',
    },
  },
  northNode: {
    icon: 'navigate-circle',
    emoji: '☊',
    gradient: ['#14B8A6', '#0EA5E9'],
    orderBase: 210,
    readTime: 85,
    relatedLessons: ['basics_003', 'practical_003'],
    title: {
      ru: 'Северный узел',
      en: 'North Node',
      es: 'Nodo Norte',
    },
    subtitle: {
      ru: 'Куда ведёт рост и в какой опыт вас зовёт развитие',
      en: 'Where growth is pulling you and what path development asks for',
      es: 'Hacia donde te llama el crecimiento y que camino pide tu desarrollo',
    },
  },
  southNode: {
    icon: 'return-down-back',
    emoji: '☋',
    gradient: ['#64748B', '#475569'],
    orderBase: 230,
    readTime: 85,
    relatedLessons: ['basics_003', 'practical_003'],
    title: {
      ru: 'Южный узел',
      en: 'South Node',
      es: 'Nodo Sur',
    },
    subtitle: {
      ru: 'Какие привычные сценарии даются легко, но могут тормозить рост',
      en: 'Which familiar patterns feel natural but can hold back growth',
      es: 'Que patrones familiares salen faciles pero pueden frenar tu crecimiento',
    },
  },
  chiron: {
    icon: 'medkit',
    emoji: '⚷',
    gradient: ['#A855F7', '#EC4899'],
    orderBase: 250,
    readTime: 90,
    relatedLessons: ['practical_003', 'transits_001'],
    title: {
      ru: 'Хирон',
      en: 'Chiron',
      es: 'Quiron',
    },
    subtitle: {
      ru: 'Где есть рана, чувствительность и потенциал исцеления',
      en: 'Where the wound, sensitivity, and healing gift live',
      es: 'Donde viven la herida, la sensibilidad y el potencial de sanacion',
    },
  },
};

const GENERATED_LESSONS_CACHE: Partial<
  Record<SupportedLessonsLocale, AstroLesson[]>
> = {};

const buildHouseLessonId = (
  houseNumber: PersonalizedHouseNumber,
  sign: SignKey
): string => {
  return `houses_personal_${houseNumber}_${sign}`;
};

const buildShortText = (
  locale: SupportedLessonsLocale,
  placement: NatalPlacement,
  sign: SignKey
): string => {
  const profile = SIGN_PROFILES[sign][locale];

  if (locale === 'en') {
    switch (placement) {
      case 'sun':
        return `${PLACEMENT_META.sun.title.en} ${profile.inSign} shows that your core strength grows through ${profile.signature}. This lesson helps you use that energy consciously instead of reducing it to a generic zodiac label.`;
      case 'moon':
        return `${PLACEMENT_META.moon.title.en} ${profile.inSign} describes how you feel, self-soothe, and react under pressure. It is less about image and more about emotional safety and instinctive patterns.`;
      case 'ascendant':
        return `${PLACEMENT_META.ascendant.title.en} ${profile.inSign} shapes your first impression, body language, and default entry style. People often notice this layer before they understand your deeper Sun and Moon.`;
      case 'descendant':
        return `${PLACEMENT_META.descendant.title.en} ${profile.inSign} shows what qualities you seek in close partnership and what kind of relationship lessons repeat for you. It reveals the style of balance you are learning.`;
      case 'mercury':
        return `${PLACEMENT_META.mercury.title.en} ${profile.inSign} shows how your mind processes information, how you phrase thoughts, and what tone your communication naturally takes. It is the most direct lesson about your thinking style.`;
      case 'venus':
        return `${PLACEMENT_META.venus.title.en} ${profile.inSign} describes your attraction style, personal taste, and what kind of emotional climate feels beautiful or worthwhile to you.`;
      case 'mars':
        return `${PLACEMENT_META.mars.title.en} ${profile.inSign} reveals how you move toward goals, express anger, and apply pressure. It is about energy, courage, and the way you use will.`;
      case 'midheaven':
        return `${PLACEMENT_META.midheaven.title.en} ${profile.inSign} points to the public image, vocation tone, and kind of recognition you are learning to build over time.`;
      case 'jupiter':
        return `${PLACEMENT_META.jupiter.title.en} ${profile.inSign} shows how your growth, faith, and sense of opportunity naturally expand. It helps explain where life feels more generous and where you grow through trust.`;
      case 'saturn':
        return `${PLACEMENT_META.saturn.title.en} ${profile.inSign} shows where life asks for discipline, delayed mastery, and emotional adulthood. This is the lesson about structure, not speed.`;
      case 'northNode':
        return `${PLACEMENT_META.northNode.title.en} ${profile.inSign} points to the developmental direction your life keeps inviting you toward. It often feels less automatic, but more alive over time.`;
      case 'southNode':
        return `${PLACEMENT_META.southNode.title.en} ${profile.inSign} reveals familiar strengths and habits that are easy to repeat. They are real gifts, but staying only here can block further growth.`;
      case 'chiron':
        return `${PLACEMENT_META.chiron.title.en} ${profile.inSign} describes a sensitive area where pain, wisdom, and healing can live together. This lesson is less about perfection and more about conscious repair.`;
    }
  }

  if (locale === 'es') {
    switch (placement) {
      case 'sun':
        return `${PLACEMENT_META.sun.title.es} ${profile.inSign} muestra que tu fuerza central crece a traves de ${profile.signature}. Esta leccion ayuda a vivir esa energia con consciencia y no como una etiqueta vacia.`;
      case 'moon':
        return `${PLACEMENT_META.moon.title.es} ${profile.inSign} describe como sientes, te regulas y reaccionas bajo presion. Aqui importa la seguridad emocional, no solo la imagen externa.`;
      case 'ascendant':
        return `${PLACEMENT_META.ascendant.title.es} ${profile.inSign} moldea tu primera impresion, el lenguaje corporal y la forma de entrar en cada situacion. Muchas personas ven primero esta capa antes de conocer tu fondo.`;
      case 'descendant':
        return `${PLACEMENT_META.descendant.title.es} ${profile.inSign} muestra que cualidades buscas en una relacion cercana y que aprendizajes vuelven a traves de la pareja. Aqui se define tu idea de equilibrio vincular.`;
      case 'mercury':
        return `${PLACEMENT_META.mercury.title.es} ${profile.inSign} muestra como procesa tu mente la informacion, como formulas ideas y que tono aparece en tu comunicacion natural.`;
      case 'venus':
        return `${PLACEMENT_META.venus.title.es} ${profile.inSign} describe tu estilo de atraccion, tu gusto y el clima emocional que percibes como bello o valioso.`;
      case 'mars':
        return `${PLACEMENT_META.mars.title.es} ${profile.inSign} revela como vas hacia tus metas, como expresas enojo y como aplicas fuerza. Habla de energia, coraje y voluntad.`;
      case 'midheaven':
        return `${PLACEMENT_META.midheaven.title.es} ${profile.inSign} apunta a la imagen publica, el tono vocacional y el tipo de reconocimiento que construyes con el tiempo.`;
      case 'jupiter':
        return `${PLACEMENT_META.jupiter.title.es} ${profile.inSign} muestra como se expanden tu crecimiento, tu fe y tu sensacion de oportunidad. Ayuda a ver donde la vida se vuelve mas generosa contigo.`;
      case 'saturn':
        return `${PLACEMENT_META.saturn.title.es} ${profile.inSign} muestra donde la vida pide disciplina, maestria lenta y madurez. Esta es la leccion de la estructura, no de la rapidez.`;
      case 'northNode':
        return `${PLACEMENT_META.northNode.title.es} ${profile.inSign} señala la direccion evolutiva hacia la que tu vida te sigue llamando. Al principio se siente menos automatico, pero mas vivo con el tiempo.`;
      case 'southNode':
        return `${PLACEMENT_META.southNode.title.es} ${profile.inSign} revela fortalezas y habitos familiares que salen con facilidad. Son dones reales, pero vivir solo desde ahi puede frenar tu desarrollo.`;
      case 'chiron':
        return `${PLACEMENT_META.chiron.title.es} ${profile.inSign} describe una zona sensible donde dolor, sabiduria y sanacion pueden convivir. No habla de perfeccion, sino de reparacion consciente.`;
    }
  }

  switch (placement) {
    case 'sun':
      return `${PLACEMENT_META.sun.title.ru} ${profile.inSign} показывает, что ваша базовая сила раскрывается через ${profile.signature}. Этот урок помогает проживать эту энергию осознанно, а не сводить её к шаблонному описанию знака.`;
    case 'moon':
      return `${PLACEMENT_META.moon.title.ru} ${profile.inSign} описывает, как вы чувствуете, успокаиваете себя и реагируете под давлением. Здесь важна эмоциональная безопасность, а не внешний образ.`;
    case 'ascendant':
      return `${PLACEMENT_META.ascendant.title.ru} ${profile.inSign} формирует первое впечатление, язык тела и стиль входа в ситуацию. Эту часть люди часто считывают раньше, чем узнают вас глубже.`;
    case 'descendant':
      return `${PLACEMENT_META.descendant.title.ru} ${profile.inSign} показывает, какие качества вы ищете в близком союзе и какие уроки снова приходят через отношения. Здесь раскрывается ваша модель баланса и партнёрства.`;
    case 'mercury':
      return `${PLACEMENT_META.mercury.title.ru} ${profile.inSign} показывает, как ваш ум обрабатывает информацию, как вы формулируете мысли и какой тон несёт ваша естественная речь. Это ключ к стилю мышления и общения.`;
    case 'venus':
      return `${PLACEMENT_META.venus.title.ru} ${profile.inSign} описывает ваш стиль притяжения, вкус и тот эмоциональный климат, который ощущается красивым, ценным и близким.`;
    case 'mars':
      return `${PLACEMENT_META.mars.title.ru} ${profile.inSign} раскрывает, как вы идёте к целям, как выражаете раздражение и каким способом продавливаете результат. Это урок про действие, волю и напор.`;
    case 'midheaven':
      return `${PLACEMENT_META.midheaven.title.ru} ${profile.inSign} указывает на ваш публичный образ, карьерный тон и тот тип признания, который вы строите со временем.`;
    case 'jupiter':
      return `${PLACEMENT_META.jupiter.title.ru} ${profile.inSign} показывает, как у вас расширяются рост, вера и чувство возможностей. Этот урок помогает увидеть, где жизнь поддерживает вас через масштаб, смысл и доверие.`;
    case 'saturn':
      return `${PLACEMENT_META.saturn.title.ru} ${profile.inSign} показывает, где жизнь требует дисциплины, зрелости и долгого выстраивания формы. Это урок не про скорость, а про фундамент.`;
    case 'northNode':
      return `${PLACEMENT_META.northNode.title.ru} ${profile.inSign} указывает на направление развития, куда жизнь всё время мягко или жёстко подталкивает вас. Сначала это может быть непривычно, но именно там больше роста.`;
    case 'southNode':
      return `${PLACEMENT_META.southNode.title.ru} ${profile.inSign} раскрывает знакомые сильные стороны и сценарии, в которые легко возвращаться. Это реальные таланты, но жизнь может застопориться, если жить только из них.`;
    case 'chiron':
      return `${PLACEMENT_META.chiron.title.ru} ${profile.inSign} описывает чувствительную зону, где боль, мудрость и способность к исцелению живут рядом. Здесь важна не идеальность, а осознанная работа с уязвимостью.`;
  }
};

const buildFullText = (
  locale: SupportedLessonsLocale,
  placement: NatalPlacement,
  sign: SignKey
): string => {
  const profile = SIGN_PROFILES[sign][locale];

  if (locale === 'en') {
    switch (placement) {
      case 'sun':
        return `The central storyline of this placement is ${profile.signature}. At its best, it gives ${profile.gift}; in its shadow, it may slip into ${profile.shadow}.\n\nYour Sun sign is not just style. It shows what keeps you alive from the inside and what kind of self-expression restores confidence. For this sign, that usually means ${profile.need}.\n\nGrowth comes when you keep the gift and refine the excess. Here the task is ${profile.growth}.`;
      case 'moon':
        return `The emotional storyline here is ${profile.signature}. In daily life it supports ${profile.gift}, but under stress it can turn into ${profile.shadow}.\n\nMoon lessons are practical: they explain what helps your nervous system settle. For this sign, emotional regulation usually needs ${profile.need}.\n\nGrowth begins when you stop shaming your emotional style and learn to guide it. The mature version of this Moon is ${profile.growth}.`;
      case 'ascendant':
        return `Your visible style carries ${profile.signature}. This is the layer that shapes first impressions, body language, pacing, and the way you enter new environments.\n\nAt its best, this Ascendant gives ${profile.gift}. When overused, other people may meet you through ${profile.shadow} before they notice your deeper complexity.\n\nThe task is not to hide the Ascendant, but to use it consciously. Real growth comes through ${profile.growth}.`;
      case 'descendant':
        return `Partnership draws you toward ${profile.signature}. The people who activate you often carry this tone strongly, especially when your life is asking for relationship growth.\n\nIn mature connection this Descendant supports ${profile.gift}. In shadow, it may repeat cycles shaped by ${profile.shadow}.\n\nThis placement becomes healthier when you look at relationships not only as attraction, but as curriculum. The lesson here is ${profile.growth}.`;
      case 'mercury':
        return `The mental storyline here is ${profile.signature}. At its best, it gives ${profile.gift}; under pressure, it can slide toward ${profile.shadow}.\n\nMercury shows how you learn, speak, and make sense of what happens. For this sign, clarity grows when your mind has ${profile.need}.\n\nThe mature version of this placement is not silence or speed by themselves. It is ${profile.growth}.`;
      case 'venus':
        return `The relational storyline here is ${profile.signature}. In a healthy expression it gives ${profile.gift}; in shadow it can lean toward ${profile.shadow}.\n\nVenus describes what feels beautiful, valuable, and emotionally worthwhile. In this sign, love and taste are restored by ${profile.need}.\n\nGrowth comes when attraction becomes more conscious. The lesson here is ${profile.growth}.`;
      case 'mars':
        return `The action pattern here is ${profile.signature}. In strength it brings ${profile.gift}; in shadow it may become ${profile.shadow}.\n\nMars is about drive, boundaries, anger, and the way you pursue results. In this sign, your energy works best when it has ${profile.need}.\n\nThe mature version of this Mars is ${profile.growth}.`;
      case 'midheaven':
        return `The public storyline here is ${profile.signature}. When this placement is lived well, it supports ${profile.gift}; when distorted, it may drift into ${profile.shadow}.\n\nThe Midheaven points to vocation, reputation, and what the world gradually recognizes in you. This sign thrives when career direction includes ${profile.need}.\n\nGrowth means building a path where recognition comes through ${profile.growth}.`;
      case 'jupiter':
        return `The growth storyline here is ${profile.signature}. In its strongest form it brings ${profile.gift}; in excess it may drift toward ${profile.shadow}.\n\nJupiter describes how life expands through meaning, trust, opportunity, and generosity. In this sign, healthy expansion often needs ${profile.need}.\n\nThe mature version of this placement is ${profile.growth}.`;
      case 'saturn':
        return `The discipline storyline here is ${profile.signature}. In strength it becomes ${profile.gift}; in shadow it can harden into ${profile.shadow}.\n\nSaturn shows where life demands consistency, structure, responsibility, and slower mastery. In this sign, maturity grows when there is ${profile.need}.\n\nThe mature lesson of this Saturn is ${profile.growth}.`;
      case 'northNode':
        return `The developmental storyline here is ${profile.signature}. It points to a path where growth asks for ${profile.gift}, even if that quality feels less automatic at first.\n\nThe North Node is not about immediate comfort. It shows the direction that gradually makes life larger, more conscious, and more alive. In this sign, the path keeps inviting ${profile.need}.\n\nThe growth task is ${profile.growth}.`;
      case 'southNode':
        return `The familiar storyline here is ${profile.signature}. It often feels skilled and natural, because it carries old competence and reflexive habits. In its best expression it still holds ${profile.gift}, but overuse may slide into ${profile.shadow}.\n\nThe South Node is not a mistake; it is a comfort zone. Growth happens when this sign remains a resource without becoming the whole story.\n\nThe mature lesson is ${profile.growth}.`;
      case 'chiron':
        return `The healing storyline here is ${profile.signature}. This placement can hold both ${profile.gift} and ${profile.shadow} at once, because pain and medicine often grow from the same terrain.\n\nChiron shows where sensitivity can become wisdom, and where insecurity may later turn into guidance for yourself and others. In this sign, healing usually needs ${profile.need}.\n\nThe mature form of this placement is ${profile.growth}.`;
    }
  }

  if (locale === 'es') {
    switch (placement) {
      case 'sun':
        return `La historia central de esta posicion es ${profile.signature}. En su version fuerte da ${profile.gift}; en sombra puede caer en ${profile.shadow}.\n\nTu Sol no es solo estilo: muestra que te enciende por dentro y que forma de expresion te devuelve sentido. En este signo eso suele pedir ${profile.need}.\n\nEl crecimiento aparece cuando conservas el don y maduras el exceso. Aqui la tarea es ${profile.growth}.`;
      case 'moon':
        return `La historia emocional aqui es ${profile.signature}. En la vida diaria favorece ${profile.gift}, pero bajo estres puede transformarse en ${profile.shadow}.\n\nLas lecciones lunares son practicas: muestran que necesita tu sistema emocional para regularse. En este signo suele necesitar ${profile.need}.\n\nEl crecimiento empieza cuando dejas de pelearte con tu sensibilidad y aprendes a dirigirla. La version madura de esta Luna es ${profile.growth}.`;
      case 'ascendant':
        return `Tu estilo visible transmite ${profile.signature}. Esta capa forma la primera impresion, el lenguaje corporal, el ritmo y la forma de entrar en espacios nuevos.\n\nEn su mejor version, este Ascendente da ${profile.gift}. Cuando se exagera, otras personas pueden encontrarte a traves de ${profile.shadow} antes de ver tu profundidad real.\n\nLa tarea no es esconder el Ascendente, sino usarlo con conciencia. El crecimiento viene por ${profile.growth}.`;
      case 'descendant':
        return `La pareja te atrae hacia ${profile.signature}. Las personas que se vuelven significativas para ti suelen traer esta energia, sobre todo cuando la vida te esta pidiendo evolucion relacional.\n\nEn vinculos maduros, este Descendente sostiene ${profile.gift}. En sombra, puede repetir dinamicas marcadas por ${profile.shadow}.\n\nEsta posicion mejora cuando entiendes la relacion como aprendizaje y no solo como atraccion. La leccion aqui es ${profile.growth}.`;
      case 'mercury':
        return `La historia mental aqui es ${profile.signature}. En su mejor version da ${profile.gift}; bajo presion puede deslizarse hacia ${profile.shadow}.\n\nMercurio muestra como aprendes, hablas y das sentido a lo que ocurre. En este signo, la claridad crece cuando tu mente tiene ${profile.need}.\n\nLa version madura de esta posicion no es solo rapidez o silencio: es ${profile.growth}.`;
      case 'venus':
        return `La historia vincular aqui es ${profile.signature}. En expresion sana ofrece ${profile.gift}; en sombra puede inclinarse hacia ${profile.shadow}.\n\nVenus describe que se siente bello, valioso y emocionalmente satisfactorio. En este signo, el amor y el gusto se restauran a traves de ${profile.need}.\n\nEl crecimiento llega cuando la atraccion se vuelve mas consciente. La leccion aqui es ${profile.growth}.`;
      case 'mars':
        return `El patron de accion aqui es ${profile.signature}. En su fuerza trae ${profile.gift}; en sombra puede volverse ${profile.shadow}.\n\nMarte habla del impulso, los limites, el enojo y la forma de perseguir resultados. En este signo, tu energia funciona mejor cuando tiene ${profile.need}.\n\nLa version madura de este Marte es ${profile.growth}.`;
      case 'midheaven':
        return `La historia publica aqui es ${profile.signature}. Cuando se vive bien, esta posicion sostiene ${profile.gift}; cuando se distorsiona, puede caer en ${profile.shadow}.\n\nEl Medio Cielo apunta a vocacion, reputacion y a lo que el mundo llega a reconocer en ti. Este signo florece cuando el rumbo profesional incluye ${profile.need}.\n\nEl crecimiento consiste en construir un camino donde el reconocimiento llegue a traves de ${profile.growth}.`;
      case 'jupiter':
        return `La historia de expansion aqui es ${profile.signature}. En su version fuerte trae ${profile.gift}; en exceso puede irse hacia ${profile.shadow}.\n\nJupiter describe como la vida se abre a traves de sentido, confianza, oportunidad y generosidad. En este signo, la expansion sana suele necesitar ${profile.need}.\n\nLa version madura de esta posicion es ${profile.growth}.`;
      case 'saturn':
        return `La historia de disciplina aqui es ${profile.signature}. En su fuerza se vuelve ${profile.gift}; en sombra puede endurecerse en ${profile.shadow}.\n\nSaturno muestra donde la vida exige constancia, estructura, responsabilidad y maestria lenta. En este signo, la madurez crece cuando hay ${profile.need}.\n\nLa leccion madura de este Saturno es ${profile.growth}.`;
      case 'northNode':
        return `La historia evolutiva aqui es ${profile.signature}. Indica un camino donde el crecimiento pide ${profile.gift}, aunque al principio no se sienta del todo automatico.\n\nEl Nodo Norte no habla de comodidad inmediata: muestra la direccion que vuelve la vida mas consciente, mas grande y mas viva. En este signo, el camino sigue invitando a ${profile.need}.\n\nLa tarea de crecimiento es ${profile.growth}.`;
      case 'southNode':
        return `La historia familiar aqui es ${profile.signature}. Se siente habil y conocida porque trae competencia antigua y reflejos aprendidos. En su mejor expresion conserva ${profile.gift}, pero en exceso puede deslizarse hacia ${profile.shadow}.\n\nEl Nodo Sur no es un error: es una zona conocida. El crecimiento aparece cuando este signo sigue siendo recurso sin convertirse en toda la historia.\n\nLa leccion madura es ${profile.growth}.`;
      case 'chiron':
        return `La historia de sanacion aqui es ${profile.signature}. Esta posicion puede contener al mismo tiempo ${profile.gift} y ${profile.shadow}, porque dolor y medicina suelen nacer del mismo terreno.\n\nQuiron muestra donde la sensibilidad puede transformarse en sabiduria y donde la inseguridad puede convertirse mas tarde en guia para ti y para otros. En este signo, la sanacion suele necesitar ${profile.need}.\n\nLa forma madura de esta posicion es ${profile.growth}.`;
    }
  }

  switch (placement) {
    case 'sun':
      return `Базовый сюжет этого положения — ${profile.signature}. В сильной версии оно даёт ${profile.gift}, а в тени может уходить в ${profile.shadow}.\n\nСолнце — это не просто стиль, а источник внутренней включённости. Для этого знака жизненная энергия обычно восстанавливается через ${profile.need}.\n\nРост начинается там, где вы не подавляете свой знак, а учитесь проживать его зрелее. Здесь задача — ${profile.growth}.`;
    case 'moon':
      return `Эмоциональный сюжет этого положения — ${profile.signature}. В повседневности оно помогает через ${profile.gift}, но под стрессом может превращаться в ${profile.shadow}.\n\nЛунные уроки всегда практичны: они показывают, что именно нужно вашей нервной системе для чувства опоры. Для этой Луны особенно важны ${profile.need}.\n\nРост начинается там, где вы не стыдите свою чувствительность, а учитесь её направлять. Зрелая версия этой Луны — ${profile.growth}.`;
    case 'ascendant':
      return `Во внешнем слое вашей карты читается ${profile.signature}. Именно эта часть формирует первое впечатление, темп, манеру входа в контакт и общую подачу.\n\nВ сильной версии такой Асцендент даёт ${profile.gift}. В перегрузе он может делать вас заметным через ${profile.shadow}, даже если внутри вы устроены глубже и мягче.\n\nЗадача не в том, чтобы скрыть Асцендент, а в том, чтобы использовать его осознанно. Рост здесь идёт через ${profile.growth}.`;
    case 'descendant':
      return `В близких отношениях вас тянет к энергии, где есть ${profile.signature}. Люди, которые становятся значимыми, часто несут этот тон особенно сильно.\n\nВ зрелом союзе такой Десцендент помогает раскрывать ${profile.gift}. В теневой версии он может втягивать в повторяющиеся сценарии, где проявляется ${profile.shadow}.\n\nЭта точка становится здоровой, когда отношения воспринимаются не только как притяжение, но и как обучение. Главный урок здесь — ${profile.growth}.`;
    case 'mercury':
      return `Ментальный сюжет этого положения — ${profile.signature}. В сильной версии он даёт ${profile.gift}, а под давлением может уходить в ${profile.shadow}.\n\nМеркурий показывает, как вы думаете, учитесь, говорите и связываете факты в смысл. Для этого знака ясность особенно хорошо растёт, когда ума хватает на ${profile.need}.\n\nЗрелая версия такого Меркурия — ${profile.growth}.`;
    case 'venus':
      return `Сюжет отношений и ценностей здесь строится через ${profile.signature}. В сильной версии это даёт ${profile.gift}, а в тени может приводить к ${profile.shadow}.\n\nВенера показывает, что ощущается красивым, ценным и достойным любви. Для этого знака ощущение близости и вкуса восстанавливается через ${profile.need}.\n\nРост начинается там, где притяжение становится осознаннее. Здесь урок — ${profile.growth}.`;
    case 'mars':
      return `Сюжет действия здесь строится через ${profile.signature}. В сильной версии он приносит ${profile.gift}, а в перегрузе может превращаться в ${profile.shadow}.\n\nМарс описывает ваш драйв, границы, раздражение и способ идти к результату. Для этого знака энергия лучше всего собирается, когда в жизни есть ${profile.need}.\n\nЗрелая версия такого Марса — ${profile.growth}.`;
    case 'midheaven':
      return `Публичный и карьерный сюжет здесь строится через ${profile.signature}. В зрелом выражении он поддерживает ${profile.gift}, а в тени может уходить в ${profile.shadow}.\n\nMC показывает не просто профессию, а образ пути, который вы строите в глазах мира. Для этого знака направление сильнее всего раскрывается, когда в карьере есть ${profile.need}.\n\nРост здесь означает строить траекторию, где признание приходит через ${profile.growth}.`;
    case 'jupiter':
      return `Сюжет роста здесь строится через ${profile.signature}. В сильной версии это даёт ${profile.gift}, а в избытке может уходить в ${profile.shadow}.\n\nЮпитер показывает, как жизнь расширяется через смысл, доверие, возможности и щедрость. Для этого знака здоровый рост особенно связан с тем, что в жизни есть ${profile.need}.\n\nЗрелая версия такого Юпитера — ${profile.growth}.`;
    case 'saturn':
      return `Сюжет дисциплины здесь строится через ${profile.signature}. В сильной версии он даёт ${profile.gift}, а в тени может застывать в ${profile.shadow}.\n\nСатурн показывает, где жизнь просит последовательности, структуры, ответственности и медленного мастерства. Для этого знака зрелость особенно растёт там, где есть ${profile.need}.\n\nЗрелый урок такого Сатурна — ${profile.growth}.`;
    case 'northNode':
      return `Сюжет развития здесь строится через ${profile.signature}. Он указывает на путь, где рост требует ${profile.gift}, даже если сначала это ощущается не так естественно.\n\nСеверный узел не про мгновенный комфорт, а про направление, которое со временем делает жизнь больше, осознаннее и живее. В этом знаке путь всё время зовёт к ${profile.need}.\n\nГлавная задача роста здесь — ${profile.growth}.`;
    case 'southNode':
      return `Сюжет привычного здесь строится через ${profile.signature}. Эта энергия ощущается знакомой и компетентной, потому что в ней есть прошлый навык и автоматическая реакция. В сильной версии она всё ещё даёт ${profile.gift}, но в избытке может скатываться в ${profile.shadow}.\n\nЮжный узел не ошибка, а ресурсная зона комфорта. Рост начинается там, где этот знак остаётся опорой, но перестаёт быть единственным сценарием.\n\nЗрелый урок здесь — ${profile.growth}.`;
    case 'chiron':
      return `Сюжет исцеления здесь строится через ${profile.signature}. Эта позиция может одновременно держать в себе и ${profile.gift}, и ${profile.shadow}, потому что боль и лекарство часто растут на одной почве.\n\nХирон показывает, где чувствительность может стать мудростью, а неуверенность — позже превратиться в поддержку для себя и других. Для этого знака исцеление особенно связано с тем, что в жизни есть ${profile.need}.\n\nЗрелая форма этого положения — ${profile.growth}.`;
  }
};

const buildKeyPoints = (
  locale: SupportedLessonsLocale,
  placement: NatalPlacement,
  sign: SignKey
): string[] => {
  const profile = SIGN_PROFILES[sign][locale];

  if (locale === 'en') {
    switch (placement) {
      case 'sun':
        return [
          `Core expression: ${profile.signature}`,
          `Main strength: ${profile.gift}`,
          `Typical risk: ${profile.shadow}`,
          `Growth path: ${profile.growth}`,
        ];
      case 'moon':
        return [
          `Emotional need: ${profile.need}`,
          `Healthy response: ${profile.gift}`,
          `Stress pattern: ${profile.shadow}`,
          `Maturity comes through ${profile.growth}`,
        ];
      case 'ascendant':
        return [
          `First impression: ${profile.signature}`,
          `Visible advantage: ${profile.gift}`,
          `Possible distortion: ${profile.shadow}`,
          `Best use: ${profile.growth}`,
        ];
      case 'descendant':
        return [
          `You seek: ${profile.signature}`,
          `What partnership can grow: ${profile.gift}`,
          `Relationship risk: ${profile.shadow}`,
          `Lesson of balance: ${profile.growth}`,
        ];
      case 'mercury':
        return [
          `Thinking style: ${profile.signature}`,
          `Communication gift: ${profile.gift}`,
          `Mental blind spot: ${profile.shadow}`,
          `Growth path: ${profile.growth}`,
        ];
      case 'venus':
        return [
          `Relational tone: ${profile.signature}`,
          `What you value: ${profile.gift}`,
          `Love risk: ${profile.shadow}`,
          `Mature attraction: ${profile.growth}`,
        ];
      case 'mars':
        return [
          `Action style: ${profile.signature}`,
          `Strength in motion: ${profile.gift}`,
          `Conflict risk: ${profile.shadow}`,
          `Disciplined drive: ${profile.growth}`,
        ];
      case 'midheaven':
        return [
          `Public tone: ${profile.signature}`,
          `Career strength: ${profile.gift}`,
          `Professional distortion: ${profile.shadow}`,
          `Growth direction: ${profile.growth}`,
        ];
      case 'jupiter':
        return [
          `Expansion style: ${profile.signature}`,
          `Growth gift: ${profile.gift}`,
          `Risk of excess: ${profile.shadow}`,
          `Mature abundance: ${profile.growth}`,
        ];
      case 'saturn':
        return [
          `Discipline style: ${profile.signature}`,
          `Long-term strength: ${profile.gift}`,
          `Pressure point: ${profile.shadow}`,
          `Mature structure: ${profile.growth}`,
        ];
      case 'northNode':
        return [
          `Growth direction: ${profile.signature}`,
          `What life is asking for: ${profile.gift}`,
          `Why it feels harder: less automatic comfort`,
          `Development path: ${profile.growth}`,
        ];
      case 'southNode':
        return [
          `Familiar pattern: ${profile.signature}`,
          `Inherited strength: ${profile.gift}`,
          `Stagnation risk: ${profile.shadow}`,
          `How to evolve: ${profile.growth}`,
        ];
      case 'chiron':
        return [
          `Sensitive theme: ${profile.signature}`,
          `Healing gift: ${profile.gift}`,
          `Pain pattern: ${profile.shadow}`,
          `Integration path: ${profile.growth}`,
        ];
    }
  }

  if (locale === 'es') {
    switch (placement) {
      case 'sun':
        return [
          `Expresion central: ${profile.signature}`,
          `Fortaleza principal: ${profile.gift}`,
          `Riesgo tipico: ${profile.shadow}`,
          `Via de crecimiento: ${profile.growth}`,
        ];
      case 'moon':
        return [
          `Necesidad emocional: ${profile.need}`,
          `Respuesta sana: ${profile.gift}`,
          `Patron bajo estres: ${profile.shadow}`,
          `La madurez llega por ${profile.growth}`,
        ];
      case 'ascendant':
        return [
          `Primera impresion: ${profile.signature}`,
          `Ventaja visible: ${profile.gift}`,
          `Distorsion posible: ${profile.shadow}`,
          `Mejor uso: ${profile.growth}`,
        ];
      case 'descendant':
        return [
          `Lo que buscas: ${profile.signature}`,
          `Lo que la relacion puede desarrollar: ${profile.gift}`,
          `Riesgo vincular: ${profile.shadow}`,
          `Leccion de equilibrio: ${profile.growth}`,
        ];
      case 'mercury':
        return [
          `Estilo mental: ${profile.signature}`,
          `Don comunicativo: ${profile.gift}`,
          `Punto ciego mental: ${profile.shadow}`,
          `Via de crecimiento: ${profile.growth}`,
        ];
      case 'venus':
        return [
          `Tono vincular: ${profile.signature}`,
          `Lo que valoras: ${profile.gift}`,
          `Riesgo amoroso: ${profile.shadow}`,
          `Atraccion madura: ${profile.growth}`,
        ];
      case 'mars':
        return [
          `Estilo de accion: ${profile.signature}`,
          `Fuerza en movimiento: ${profile.gift}`,
          `Riesgo de conflicto: ${profile.shadow}`,
          `Impulso maduro: ${profile.growth}`,
        ];
      case 'midheaven':
        return [
          `Tono publico: ${profile.signature}`,
          `Fortaleza profesional: ${profile.gift}`,
          `Distorsion profesional: ${profile.shadow}`,
          `Direccion de crecimiento: ${profile.growth}`,
        ];
      case 'jupiter':
        return [
          `Estilo de expansion: ${profile.signature}`,
          `Don de crecimiento: ${profile.gift}`,
          `Riesgo de exceso: ${profile.shadow}`,
          `Abundancia madura: ${profile.growth}`,
        ];
      case 'saturn':
        return [
          `Estilo de disciplina: ${profile.signature}`,
          `Fortaleza a largo plazo: ${profile.gift}`,
          `Punto de presion: ${profile.shadow}`,
          `Estructura madura: ${profile.growth}`,
        ];
      case 'northNode':
        return [
          `Direccion de crecimiento: ${profile.signature}`,
          `Lo que la vida pide: ${profile.gift}`,
          `Por que cuesta: es menos automatico`,
          `Via de desarrollo: ${profile.growth}`,
        ];
      case 'southNode':
        return [
          `Patron familiar: ${profile.signature}`,
          `Fortaleza heredada: ${profile.gift}`,
          `Riesgo de estancamiento: ${profile.shadow}`,
          `Como evolucionar: ${profile.growth}`,
        ];
      case 'chiron':
        return [
          `Tema sensible: ${profile.signature}`,
          `Don de sanacion: ${profile.gift}`,
          `Patron de dolor: ${profile.shadow}`,
          `Via de integracion: ${profile.growth}`,
        ];
    }
  }

  switch (placement) {
    case 'sun':
      return [
        `Ядро проявляется через ${profile.signature}`,
        `Сильная сторона: ${profile.gift}`,
        `Теневая реакция: ${profile.shadow}`,
        `Точка роста: ${profile.growth}`,
      ];
    case 'moon':
      return [
        `Эмоциональная потребность: ${profile.need}`,
        `Здоровая реакция: ${profile.gift}`,
        `Стрессовый паттерн: ${profile.shadow}`,
        `Зрелость приходит через ${profile.growth}`,
      ];
    case 'ascendant':
      return [
        `Первое впечатление: ${profile.signature}`,
        `Внешний плюс: ${profile.gift}`,
        `Искажение в перегрузе: ${profile.shadow}`,
        `Лучшее раскрытие: ${profile.growth}`,
      ];
    case 'descendant':
      return [
        `В партнёрстве тянет к энергии ${profile.signature}`,
        `Союз раскрывает ${profile.gift}`,
        `Риск отношений: ${profile.shadow}`,
        `Урок баланса: ${profile.growth}`,
      ];
    case 'mercury':
      return [
        `Стиль мышления: ${profile.signature}`,
        `Сильная сторона общения: ${profile.gift}`,
        `Ментальный риск: ${profile.shadow}`,
        `Точка роста: ${profile.growth}`,
      ];
    case 'venus':
      return [
        `Стиль притяжения: ${profile.signature}`,
        `Что вы особенно цените: ${profile.gift}`,
        `Риск в любви и вкусе: ${profile.shadow}`,
        `Зрелая версия Венеры: ${profile.growth}`,
      ];
    case 'mars':
      return [
        `Стиль действия: ${profile.signature}`,
        `Сильная сторона в борьбе: ${profile.gift}`,
        `Риск конфликта: ${profile.shadow}`,
        `Зрелая воля: ${profile.growth}`,
      ];
    case 'midheaven':
      return [
        `Публичный тон: ${profile.signature}`,
        `Карьерная сила: ${profile.gift}`,
        `Профессиональное искажение: ${profile.shadow}`,
        `Вектор роста: ${profile.growth}`,
      ];
    case 'jupiter':
      return [
        `Стиль роста: ${profile.signature}`,
        `Сильная сторона расширения: ${profile.gift}`,
        `Риск избытка: ${profile.shadow}`,
        `Зрелая версия изобилия: ${profile.growth}`,
      ];
    case 'saturn':
      return [
        `Стиль дисциплины: ${profile.signature}`,
        `Долгая сильная сторона: ${profile.gift}`,
        `Точка давления: ${profile.shadow}`,
        `Зрелая структура: ${profile.growth}`,
      ];
    case 'northNode':
      return [
        `Направление роста: ${profile.signature}`,
        `Что требует жизнь: ${profile.gift}`,
        `Почему это не сразу легко: меньше автоматизма`,
        `Вектор развития: ${profile.growth}`,
      ];
    case 'southNode':
      return [
        `Привычный сценарий: ${profile.signature}`,
        `Наследованная сила: ${profile.gift}`,
        `Риск застревания: ${profile.shadow}`,
        `Как расти дальше: ${profile.growth}`,
      ];
    case 'chiron':
      return [
        `Чувствительная тема: ${profile.signature}`,
        `Дар исцеления: ${profile.gift}`,
        `Паттерн боли: ${profile.shadow}`,
        `Путь интеграции: ${profile.growth}`,
      ];
  }
};

const buildExample = (
  locale: SupportedLessonsLocale,
  placement: NatalPlacement,
  sign: SignKey
): string => {
  const profile = SIGN_PROFILES[sign][locale];

  if (locale === 'en') {
    switch (placement) {
      case 'sun':
        return `In practice, this Sun comes alive when life gives space for ${profile.need}. That is where confidence and authorship become visible.`;
      case 'moon':
        return `A simple check: when you are tired or overloaded, do you move toward ${profile.need} or fall into ${profile.shadow}? That contrast explains this Moon well.`;
      case 'ascendant':
        return `People may first notice ${profile.signature}, while only later discovering that your deeper motives are more nuanced than the first impression.`;
      case 'descendant':
        return `A recurring pattern of attraction often starts with people who embody ${profile.signature}. The lesson is learning how to build balance, not just chemistry.`;
      case 'mercury':
        return `Notice how you explain an idea, reply under pressure, or learn something new: this placement becomes obvious when your mind has to move fast and organize meaning.`;
      case 'venus':
        return `Watch what kind of people, aesthetics, and emotional climates pull you in first. That pattern often describes this Venus more clearly than abstract theory.`;
      case 'mars':
        return `Notice what happens when you need to act quickly or defend a boundary: the first move, the tone, and the recovery after conflict usually reveal this Mars clearly.`;
      case 'midheaven':
        return `A useful check is to compare what people recognize you for publicly with what feels naturally prestigious or meaningful to you. That gap often explains this Midheaven.`;
      case 'jupiter':
        return `Look at where life tends to open doors, bring mentors, or reward trust. The sign shows what kind of expansion feels natural and sustainable for you.`;
      case 'saturn':
        return `Notice where progress comes more slowly but becomes solid over time. That pressure point often describes the lesson and strength of this Saturn.`;
      case 'northNode':
        return `A simple check: what direction feels slightly less practiced, but more alive and development-oriented? That usually points closer to the North Node.`;
      case 'southNode':
        return `Notice which reactions feel highly competent and familiar even when they no longer create growth. That comfort pattern is often your South Node speaking.`;
      case 'chiron':
        return `Watch where sensitivity keeps repeating, but also where your lived experience could later help someone else. That overlap often reveals Chiron very clearly.`;
    }
  }

  if (locale === 'es') {
    switch (placement) {
      case 'sun':
        return `En la practica, este Sol se enciende cuando la vida deja espacio para ${profile.need}. Alli aparecen con claridad confianza y autoria.`;
      case 'moon':
        return `Una prueba simple: cuando estas cansado o saturado, te mueves hacia ${profile.need} o caes en ${profile.shadow}? Esa diferencia explica bien esta Luna.`;
      case 'ascendant':
        return `Muchas personas notan primero ${profile.signature} y solo despues descubren que tu fondo real es mas complejo que esa primera imagen.`;
      case 'descendant':
        return `Un patron de atraccion repetido suele comenzar con personas que encarnan ${profile.signature}. La leccion es construir equilibrio y no solo quimica.`;
      case 'mercury':
        return `Observa como explicas una idea, respondes bajo presion o aprendes algo nuevo: esta posicion se ve con claridad cuando tu mente tiene que ordenar significado rapido.`;
      case 'venus':
        return `Mira que personas, esteticas y climas emocionales te atraen primero. Ese patron suele describir esta Venus mejor que una teoria abstracta.`;
      case 'mars':
        return `Observa que pasa cuando necesitas actuar rapido o defender un limite: el primer movimiento, el tono y la recuperacion despues del conflicto muestran bien este Marte.`;
      case 'midheaven':
        return `Una buena prueba es comparar por que te reconoce la gente publicamente con lo que para ti se siente prestigioso o significativo. Esa distancia explica mucho este Medio Cielo.`;
      case 'jupiter':
        return `Observa donde la vida tiende a abrir puertas, acercar mentores o recompensar la confianza. El signo muestra que tipo de expansion se siente natural para ti.`;
      case 'saturn':
        return `Fijate en que area el progreso va mas lento pero se vuelve solido con el tiempo. Ese punto de presion suele describir bien la leccion de este Saturno.`;
      case 'northNode':
        return `Una prueba simple: que direccion se siente menos practicada, pero mas viva y orientada al desarrollo? Eso suele acercarte al Nodo Norte.`;
      case 'southNode':
        return `Observa que reacciones se sienten muy competentes y familiares incluso cuando ya no crean crecimiento. Ese patron comodo suele ser la voz del Nodo Sur.`;
      case 'chiron':
        return `Mira donde la sensibilidad se repite, pero tambien donde tu experiencia podria ayudar mas tarde a otra persona. Ese cruce suele mostrar muy bien a Quiron.`;
    }
  }

  switch (placement) {
    case 'sun':
      return `На практике это Солнце сильнее всего включается, когда в жизни есть ${profile.need}. Именно там становятся видны уверенность и авторство.`;
    case 'moon':
      return `Простой тест: когда вы устали или перегружены, вы идёте к ${profile.need} или срываетесь в ${profile.shadow}? Эта разница хорошо показывает работу такой Луны.`;
    case 'ascendant':
      return `Окружающие могут сначала видеть в вас ${profile.signature}, а уже потом замечать, что внутренняя мотивация глубже и сложнее первого впечатления.`;
    case 'descendant':
      return `Повторяющееся притяжение часто начинается с людей, в которых ярко есть ${profile.signature}. Урок в том, чтобы строить не только химию, но и баланс.`;
    case 'mercury':
      return `Наблюдайте, как вы объясняете идею, отвечаете под давлением или осваиваете новое: эта позиция особенно хорошо видна там, где уму нужно быстро собрать смысл в слова.`;
    case 'venus':
      return `Посмотрите, какие люди, эстетика и эмоциональная атмосфера притягивают вас первыми. Этот повторяющийся паттерн часто точнее всего описывает вашу Венеру.`;
    case 'mars':
      return `Заметьте, что происходит, когда нужно действовать быстро или защитить границу: первый импульс, тон и восстановление после конфликта хорошо показывают такой Марс.`;
    case 'midheaven':
      return `Полезно сравнить, за что вас считывают и признают снаружи, и что для вас самих ощущается престижным и значимым. Этот зазор часто хорошо раскрывает MC.`;
    case 'jupiter':
      return `Посмотрите, где жизнь чаще открывает двери, приносит учителей или вознаграждает доверие. Этот знак показывает, какой тип расширения для вас естественен.`;
    case 'saturn':
      return `Обратите внимание, где прогресс идёт медленнее, но со временем становится по-настоящему надёжным. Эта точка давления часто очень точно описывает урок Сатурна.`;
    case 'northNode':
      return `Простой ориентир: какое направление ощущается менее наработанным, но при этом более живым и развивающим? Обычно именно там слышнее Северный узел.`;
    case 'southNode':
      return `Заметьте, какие реакции кажутся очень знакомыми и компетентными даже тогда, когда уже не дают роста. Этот комфортный паттерн часто и есть голос Южного узла.`;
    case 'chiron':
      return `Посмотрите, где чувствительность повторяется снова и снова, но где ваш личный опыт однажды может стать поддержкой для других. Это пересечение часто лучше всего показывает Хирон.`;
  }
};

const buildHouseShortText = (
  locale: SupportedLessonsLocale,
  houseNumber: PersonalizedHouseNumber,
  sign: SignKey
): string => {
  const profile = SIGN_PROFILES[sign][locale];
  const house = HOUSE_PROFILES[houseNumber][locale];

  if (locale === 'en') {
    return `${house.title} ${profile.inSign} shows how the sphere of ${house.theme} moves through ${profile.signature}. This lesson explains how that sign colors ${house.focus}.`;
  }

  if (locale === 'es') {
    return `${house.title} ${profile.inSign} muestra como la esfera de ${house.theme} se expresa a traves de ${profile.signature}. Esta leccion explica como ese signo colorea ${house.focus}.`;
  }

  return `${house.title} ${profile.inSign} показывает, как тема ${house.theme} проходит через ${profile.signature}. Этот урок объясняет, как знак окрашивает ${house.focus}.`;
};

const buildHouseFullText = (
  locale: SupportedLessonsLocale,
  houseNumber: PersonalizedHouseNumber,
  sign: SignKey
): string => {
  const profile = SIGN_PROFILES[sign][locale];
  const house = HOUSE_PROFILES[houseNumber][locale];

  if (locale === 'en') {
    return `${house.title} ${profile.inSign} turns the house of ${house.theme} toward ${profile.signature}. In a strong expression, this gives ${profile.gift}; in shadow, it may lean into ${profile.shadow}.\n\nHouses show where life happens. This house is about ${house.focus}, and in this sign the sphere often feels healthiest when it has ${profile.need}.\n\nThe main growth task here is moving away from ${house.risk} and growing toward ${house.growth} through ${profile.growth}.`;
  }

  if (locale === 'es') {
    return `${house.title} ${profile.inSign} orienta la esfera de ${house.theme} a traves de ${profile.signature}. En su expresion fuerte esto da ${profile.gift}; en sombra puede irse hacia ${profile.shadow}.\n\nLas casas muestran donde sucede la vida. Esta casa habla de ${house.focus}, y en este signo suele sentirse mas sana cuando existe ${profile.need}.\n\nLa tarea principal aqui es salir de ${house.risk} y crecer hacia ${house.growth} a traves de ${profile.growth}.`;
  }

  return `${house.title} ${profile.inSign} направляет сферу ${house.theme} через ${profile.signature}. В сильной версии это даёт ${profile.gift}, а в тени может уходить в ${profile.shadow}.\n\nДома показывают, где именно разворачивается жизнь. Эта сфера связана с тем, ${house.focus}, и в этом знаке она обычно раскрывается здоровее, когда в ней есть ${profile.need}.\n\nГлавная задача здесь — выходить из ${house.risk} и расти к ${house.growth} через ${profile.growth}.`;
};

const buildHouseKeyPoints = (
  locale: SupportedLessonsLocale,
  houseNumber: PersonalizedHouseNumber,
  sign: SignKey
): string[] => {
  const profile = SIGN_PROFILES[sign][locale];
  const house = HOUSE_PROFILES[houseNumber][locale];

  if (locale === 'en') {
    return [
      `Life sphere: ${house.theme}`,
      `House focus: ${house.focus}`,
      `Strength of the sign here: ${profile.gift}`,
      `Growth away from ${house.risk}`,
    ];
  }

  if (locale === 'es') {
    return [
      `Esfera de vida: ${house.theme}`,
      `Foco de la casa: ${house.focus}`,
      `Fortaleza del signo aqui: ${profile.gift}`,
      `Crecimiento saliendo de ${house.risk}`,
    ];
  }

  return [
    `Сфера жизни: ${house.theme}`,
    `Фокус дома: ${house.focus}`,
    `Сильная сторона знака здесь: ${profile.gift}`,
    `Рост через выход из ${house.risk}`,
  ];
};

const buildHouseExample = (
  locale: SupportedLessonsLocale,
  houseNumber: PersonalizedHouseNumber,
  sign: SignKey
): string => {
  const house = HOUSE_PROFILES[houseNumber][locale];
  const profile = SIGN_PROFILES[sign][locale];

  if (locale === 'en') {
    return `A practical check is to notice how this house behaves in real decisions: does the area of ${house.theme} move through ${profile.signature} in a conscious way, or does it default to ${profile.shadow}?`;
  }

  if (locale === 'es') {
    return `Una prueba util es observar como se mueve esta casa en decisiones reales: la esfera de ${house.theme} se expresa de forma consciente a traves de ${profile.signature} o cae por defecto en ${profile.shadow}?`;
  }

  return `Полезно наблюдать, как эта сфера работает в реальных решениях: тема ${house.theme} проявляется через ${profile.signature} осознанно или по привычке уходит в ${profile.shadow}?`;
};

const createHouseLesson = (
  locale: SupportedLessonsLocale,
  houseNumber: PersonalizedHouseNumber,
  sign: SignKey
): AstroLesson => {
  const house = HOUSE_PROFILES[houseNumber][locale];
  const profile = SIGN_PROFILES[sign][locale];

  return {
    id: buildHouseLessonId(houseNumber, sign),
    category: 'houses',
    title: `${house.title} ${profile.inSign}`,
    subtitle:
      locale === 'ru'
        ? `Как знак окрашивает сферу ${house.theme}`
        : locale === 'es'
          ? `Como el signo colorea la esfera de ${house.theme}`
          : `How the sign colors the sphere of ${house.theme}`,
    icon:
      houseNumber === 10
        ? 'business'
        : houseNumber === 12
          ? 'moon'
          : houseNumber === 9
            ? 'compass'
            : houseNumber === 6
              ? 'fitness'
              : houseNumber === 4
                ? 'home'
                : houseNumber === 3
                  ? 'chatbubbles'
                  : houseNumber === 11
                    ? 'people'
                    : houseNumber === 8
                      ? 'infinite'
                      : houseNumber === 5
                        ? 'sparkles'
                        : houseNumber === 2
                          ? 'wallet'
                          : 'home',
    emoji:
      houseNumber === 10
        ? 'MC'
        : houseNumber === 12
          ? '12'
          : houseNumber === 9
            ? '9'
            : houseNumber === 6
              ? '6'
              : houseNumber === 4
                ? '4'
                : houseNumber === 3
                  ? '3'
                  : houseNumber === 11
                    ? '11'
                    : houseNumber === 8
                      ? '8'
                      : houseNumber === 7
                        ? '7'
                        : houseNumber === 5
                          ? '5'
                          : houseNumber === 2
                            ? '2'
                            : '1',
    gradient:
      houseNumber === 10
        ? ['#8B5CF6', '#6366F1']
        : houseNumber === 12
          ? ['#6366F1', '#0F172A']
          : houseNumber === 9
            ? ['#0EA5E9', '#3B82F6']
            : houseNumber === 6
              ? ['#14B8A6', '#10B981']
              : houseNumber === 4
                ? ['#F97316', '#EF4444']
                : houseNumber === 3
                  ? ['#06B6D4', '#3B82F6']
                  : houseNumber === 11
                    ? ['#14B8A6', '#0EA5E9']
                    : houseNumber === 8
                      ? ['#A855F7', '#EC4899']
                      : houseNumber === 7
                        ? ['#EC4899', '#F43F5E']
                        : houseNumber === 5
                          ? ['#F59E0B', '#F97316']
                          : houseNumber === 2
                            ? ['#10B981', '#14B8A6']
                            : ['#3B82F6', '#2563EB'],
    shortText: buildHouseShortText(locale, houseNumber, sign),
    fullText: buildHouseFullText(locale, houseNumber, sign),
    keyPoints: buildHouseKeyPoints(locale, houseNumber, sign),
    example: buildHouseExample(locale, houseNumber, sign),
    difficulty: 'intermediate',
    readTime: 80,
    order: 300 + houseNumber,
    relatedLessons: [`houses_${String(houseNumber).padStart(3, '0')}`].filter(
      Boolean
    ),
  };
};

const createLesson = (
  locale: SupportedLessonsLocale,
  placement: NatalPlacement,
  sign: SignKey,
  signIndex: number
): AstroLesson => {
  const placementMeta = PLACEMENT_META[placement];
  const profile = SIGN_PROFILES[sign][locale];

  return {
    id: buildNatalPlacementLessonId(placement, sign),
    category: 'signs',
    title:
      locale === 'ru'
        ? `${placementMeta.title.ru} ${profile.inSign}`
        : `${placementMeta.title[locale]} ${profile.inSign}`,
    subtitle: placementMeta.subtitle[locale],
    icon: placementMeta.icon,
    emoji: placementMeta.emoji,
    gradient: placementMeta.gradient,
    shortText: buildShortText(locale, placement, sign),
    fullText: buildFullText(locale, placement, sign),
    keyPoints: buildKeyPoints(locale, placement, sign),
    example: buildExample(locale, placement, sign),
    difficulty: 'beginner',
    readTime: placementMeta.readTime,
    order: placementMeta.orderBase + signIndex,
    relatedLessons: placementMeta.relatedLessons,
  };
};

export const normalizeSignKey = (rawSign?: string | null): SignKey | null => {
  const normalized = String(rawSign || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  return SIGN_ALIASES[normalized] || null;
};

export const getOppositeSignKey = (sign: SignKey): SignKey => {
  return SIGN_OPPOSITES[sign];
};

export const buildNatalPlacementLessonId = (
  placement: NatalPlacement,
  sign: SignKey
): string => {
  return `signs_${placement}_${sign}`;
};

const buildPersonalizedAspectLessonId = (
  pointA: PersonalizedAspectPoint,
  pointB: PersonalizedAspectPoint,
  aspect: PersonalizedAspectKind
): string => {
  return `aspects_personal_${pointA}_${aspect}_${pointB}`;
};

export const isGeneratedNatalPlacementLessonId = (
  lessonId: string
): boolean => {
  return (
    lessonId.startsWith('aspects_personal_') ||
    lessonId.startsWith('houses_personal_') ||
    lessonId.startsWith('signs_sun_') ||
    lessonId.startsWith('signs_moon_') ||
    lessonId.startsWith('signs_ascendant_') ||
    lessonId.startsWith('signs_descendant_') ||
    lessonId.startsWith('signs_mercury_') ||
    lessonId.startsWith('signs_venus_') ||
    lessonId.startsWith('signs_mars_') ||
    lessonId.startsWith('signs_midheaven_') ||
    lessonId.startsWith('signs_jupiter_') ||
    lessonId.startsWith('signs_saturn_') ||
    lessonId.startsWith('signs_northNode_') ||
    lessonId.startsWith('signs_southNode_') ||
    lessonId.startsWith('signs_chiron_')
  );
};

export const getGeneratedNatalLessons = (
  locale: SupportedLessonsLocale
): AstroLesson[] => {
  if (GENERATED_LESSONS_CACHE[locale]) {
    return GENERATED_LESSONS_CACHE[locale] as AstroLesson[];
  }

  const signLessons = (
    [
      'sun',
      'moon',
      'ascendant',
      'descendant',
      'mercury',
      'venus',
      'mars',
      'midheaven',
      'jupiter',
      'saturn',
      'northNode',
      'southNode',
      'chiron',
    ] as NatalPlacement[]
  ).flatMap((placement) =>
    SIGN_ORDER.map((sign, index) =>
      createLesson(locale, placement, sign, index)
    )
  );

  const houseLessons = HOUSE_ORDER.flatMap((houseNumber) =>
    SIGN_ORDER.map((sign) => createHouseLesson(locale, houseNumber, sign))
  );

  const lessons = [...signLessons, ...houseLessons];

  GENERATED_LESSONS_CACHE[locale] = lessons;
  return lessons;
};

export const buildPersonalizedNatalLessonIds = (
  placements: NatalLessonPlacements
): string[] => {
  const sunSign = normalizeSignKey(placements.sunSign);
  const moonSign = normalizeSignKey(placements.moonSign);
  const ascendantSign = normalizeSignKey(placements.ascendantSign);
  const descendantSign =
    normalizeSignKey(placements.descendantSign) ||
    (ascendantSign ? getOppositeSignKey(ascendantSign) : null);
  const mercurySign = normalizeSignKey(placements.mercurySign);
  const venusSign = normalizeSignKey(placements.venusSign);
  const marsSign = normalizeSignKey(placements.marsSign);
  const midheavenSign = normalizeSignKey(placements.midheavenSign);
  const jupiterSign = normalizeSignKey(placements.jupiterSign);
  const saturnSign = normalizeSignKey(placements.saturnSign);
  const northNodeSign = normalizeSignKey(placements.northNodeSign);
  const southNodeSign = normalizeSignKey(placements.southNodeSign);
  const chironSign = normalizeSignKey(placements.chironSign);
  const houseSigns = placements.houseSigns || {};

  return [
    sunSign ? buildNatalPlacementLessonId('sun', sunSign) : null,
    moonSign ? buildNatalPlacementLessonId('moon', moonSign) : null,
    ascendantSign
      ? buildNatalPlacementLessonId('ascendant', ascendantSign)
      : null,
    descendantSign
      ? buildNatalPlacementLessonId('descendant', descendantSign)
      : null,
    mercurySign ? buildNatalPlacementLessonId('mercury', mercurySign) : null,
    venusSign ? buildNatalPlacementLessonId('venus', venusSign) : null,
    marsSign ? buildNatalPlacementLessonId('mars', marsSign) : null,
    midheavenSign
      ? buildNatalPlacementLessonId('midheaven', midheavenSign)
      : null,
    jupiterSign ? buildNatalPlacementLessonId('jupiter', jupiterSign) : null,
    saturnSign ? buildNatalPlacementLessonId('saturn', saturnSign) : null,
    northNodeSign
      ? buildNatalPlacementLessonId('northNode', northNodeSign)
      : null,
    southNodeSign
      ? buildNatalPlacementLessonId('southNode', southNodeSign)
      : null,
    chironSign ? buildNatalPlacementLessonId('chiron', chironSign) : null,
    ...HOUSE_ORDER.map((houseNumber) => {
      const sign = normalizeSignKey(houseSigns[houseNumber]);
      return sign ? buildHouseLessonId(houseNumber, sign) : null;
    }),
  ].filter((lessonId): lessonId is string => Boolean(lessonId));
};

const normalizeAspectPoint = (
  value: string | null | undefined
): PersonalizedAspectPoint | null => {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const aliases: Record<string, PersonalizedAspectPoint> = {
    sun: 'sun',
    moon: 'moon',
    asc: 'ascendant',
    ascendant: 'ascendant',
    venus: 'venus',
    mars: 'mars',
    jupiter: 'jupiter',
    saturn: 'saturn',
  };

  return aliases[key] || null;
};

const normalizePersonalizedAspect = (
  value: string | null | undefined
): PersonalizedAspectKind | null => {
  const key = String(value || '')
    .trim()
    .toLowerCase();
  if (
    key === 'conjunction' ||
    key === 'sextile' ||
    key === 'square' ||
    key === 'trine' ||
    key === 'opposition'
  ) {
    return key;
  }
  return null;
};

const isPersonalizedAspectPair = (
  pointA: PersonalizedAspectPoint,
  pointB: PersonalizedAspectPoint
): boolean => {
  return (
    (PERSONALIZED_ASPECT_CORE_POINTS.includes(pointA) &&
      PERSONALIZED_ASPECT_TARGET_POINTS.includes(pointB)) ||
    (PERSONALIZED_ASPECT_CORE_POINTS.includes(pointB) &&
      PERSONALIZED_ASPECT_TARGET_POINTS.includes(pointA))
  );
};

const canonicalizeAspectPair = (
  pointA: PersonalizedAspectPoint,
  pointB: PersonalizedAspectPoint
): [PersonalizedAspectPoint, PersonalizedAspectPoint] => {
  if (
    PERSONALIZED_ASPECT_CORE_POINTS.includes(pointA) &&
    PERSONALIZED_ASPECT_TARGET_POINTS.includes(pointB)
  ) {
    return [pointA, pointB];
  }

  if (
    PERSONALIZED_ASPECT_CORE_POINTS.includes(pointB) &&
    PERSONALIZED_ASPECT_TARGET_POINTS.includes(pointA)
  ) {
    return [pointB, pointA];
  }

  return [pointA, pointB].sort(
    (left, right) =>
      PERSONALIZED_ASPECT_POINT_ORDER.indexOf(left) -
      PERSONALIZED_ASPECT_POINT_ORDER.indexOf(right)
  ) as [PersonalizedAspectPoint, PersonalizedAspectPoint];
};

const getAspectTone = (aspect: PersonalizedAspectKind): AspectTone => {
  if (aspect === 'trine' || aspect === 'sextile') return 'harmonious';
  if (aspect === 'square' || aspect === 'opposition') return 'challenging';
  return 'intense';
};

const getAspectPriority = (aspect: PersonalizedAspectKind): number => {
  return PERSONALIZED_ASPECT_ORDER.indexOf(aspect);
};

const getAspectIcon = (aspect: PersonalizedAspectKind): string => {
  switch (aspect) {
    case 'trine':
      return 'triangle';
    case 'sextile':
      return 'sparkles';
    case 'square':
      return 'square';
    case 'opposition':
      return 'swap-horizontal';
    case 'conjunction':
    default:
      return 'add-circle';
  }
};

const getAspectEmoji = (aspect: PersonalizedAspectKind): string => {
  switch (aspect) {
    case 'trine':
      return '△';
    case 'sextile':
      return '✶';
    case 'square':
      return '□';
    case 'opposition':
      return '☍';
    case 'conjunction':
    default:
      return '☌';
  }
};

const getAspectGradient = (
  tone: AspectTone
): readonly [string, string, ...string[]] => {
  switch (tone) {
    case 'harmonious':
      return ['#14B8A6', '#10B981'];
    case 'challenging':
      return ['#F97316', '#EF4444'];
    case 'intense':
    default:
      return ['#8B5CF6', '#6366F1'];
  }
};

const buildAspectShortText = (
  locale: SupportedLessonsLocale,
  entry: PersonalizedAspectEntry
): string => {
  const left = ASPECT_POINT_PROFILES[entry.pointA][locale];
  const right = ASPECT_POINT_PROFILES[entry.pointB][locale];
  const aspect = PERSONALIZED_ASPECT_PROFILES[entry.aspect][locale];

  if (locale === 'en') {
    return `${left.title} ${aspect.title} ${right.title} shows how ${left.domainShort} interacts with ${right.domainShort}. This ${aspect.toneLabel} ${aspect.overview}.`;
  }

  if (locale === 'es') {
    return `${left.title} ${aspect.title} ${right.title} muestra como ${left.domainShort} interactua con ${right.domainShort}. Este ${aspect.toneLabel} ${aspect.overview}.`;
  }

  return `${left.title} ${aspect.title} ${right.title} показывает, как ${left.domainShort} взаимодействуют с темой ${right.domainShort}. Этот ${aspect.toneLabel} ${aspect.overview}.`;
};

const buildAspectFullText = (
  locale: SupportedLessonsLocale,
  entry: PersonalizedAspectEntry
): string => {
  const left = ASPECT_POINT_PROFILES[entry.pointA][locale];
  const right = ASPECT_POINT_PROFILES[entry.pointB][locale];
  const aspect = PERSONALIZED_ASPECT_PROFILES[entry.aspect][locale];

  if (locale === 'en') {
    return `${left.title} ${aspect.title} ${right.title} describes how ${left.domain} meets ${right.domain}. In your chart this aspect ${aspect.overview}.\n\nIts gift is that it ${aspect.gift}. The main risk is ${aspect.risk}.\n\nThe practical growth task here is to notice this pattern in real decisions and relationships, then ${aspect.growth}.`;
  }

  if (locale === 'es') {
    return `${left.title} ${aspect.title} ${right.title} describe como ${left.domain} se encuentra con ${right.domain}. En tu carta este aspecto ${aspect.overview}.\n\nSu regalo es que ${aspect.gift}. El principal riesgo es ${aspect.risk}.\n\nLa tarea practica aqui es notar este patron en decisiones y relaciones reales, y despues ${aspect.growth}.`;
  }

  return `${left.title} ${aspect.title} ${right.title} описывает, как ${left.domain} встречаются с темой ${right.domain}. В вашей карте этот аспект ${aspect.overview}.\n\nЕго сильная сторона в том, что он ${aspect.gift}. Главный риск в том, что он может увести в ${aspect.risk}.\n\nПрактическая задача здесь — замечать этот паттерн в реальных решениях и отношениях, а затем ${aspect.growth}.`;
};

const buildAspectKeyPoints = (
  locale: SupportedLessonsLocale,
  entry: PersonalizedAspectEntry
): string[] => {
  const left = ASPECT_POINT_PROFILES[entry.pointA][locale];
  const right = ASPECT_POINT_PROFILES[entry.pointB][locale];
  const aspect = PERSONALIZED_ASPECT_PROFILES[entry.aspect][locale];

  if (locale === 'en') {
    return [
      `Main dynamic: ${left.title} + ${right.title}`,
      `Aspect tone: ${aspect.toneLabel}`,
      `Strength: ${aspect.gift}`,
      `Growth edge: ${aspect.growth}`,
    ];
  }

  if (locale === 'es') {
    return [
      `Dinamica principal: ${left.title} + ${right.title}`,
      `Tono del aspecto: ${aspect.toneLabel}`,
      `Fortaleza: ${aspect.gift}`,
      `Zona de crecimiento: ${aspect.growth}`,
    ];
  }

  return [
    `Главная связка: ${left.title} + ${right.title}`,
    `Тон аспекта: ${aspect.toneLabel}`,
    `Сильная сторона: ${aspect.gift}`,
    `Зона роста: ${aspect.growth}`,
  ];
};

const buildAspectExample = (
  locale: SupportedLessonsLocale,
  entry: PersonalizedAspectEntry
): string => {
  const left = ASPECT_POINT_PROFILES[entry.pointA][locale];
  const right = ASPECT_POINT_PROFILES[entry.pointB][locale];
  const aspect = PERSONALIZED_ASPECT_PROFILES[entry.aspect][locale];

  if (locale === 'en') {
    return `A useful check is to watch what happens when ${left.title.toLowerCase()} gets activated and immediately runs into ${right.title.toLowerCase()}: this is where the ${aspect.toneLabel} becomes visible in real life.`;
  }

  if (locale === 'es') {
    return `Una buena prueba es observar que pasa cuando ${left.title.toLowerCase()} se activa y enseguida se encuentra con ${right.title.toLowerCase()}: alli se vuelve visible este ${aspect.toneLabel} en la vida real.`;
  }

  return `Полезно понаблюдать, что происходит, когда включается ${left.title.toLowerCase()} и сразу встречается с темой ${right.title.toLowerCase()}: именно там этот ${aspect.toneLabel} становится виден в реальной жизни.`;
};

const createPersonalizedAspectLesson = (
  locale: SupportedLessonsLocale,
  entry: PersonalizedAspectEntry,
  index: number
): AstroLesson => {
  const left = ASPECT_POINT_PROFILES[entry.pointA][locale];
  const right = ASPECT_POINT_PROFILES[entry.pointB][locale];
  const aspect = PERSONALIZED_ASPECT_PROFILES[entry.aspect][locale];
  const tone = getAspectTone(entry.aspect);

  return {
    id: buildPersonalizedAspectLessonId(
      entry.pointA,
      entry.pointB,
      entry.aspect
    ),
    category: 'aspects',
    title: `${left.title} ${aspect.title} ${right.title}`,
    subtitle:
      locale === 'ru'
        ? `Ключевой паттерн вашей натальной карты`
        : locale === 'es'
          ? `Patron clave de tu carta natal`
          : `A key pattern in your natal chart`,
    icon: getAspectIcon(entry.aspect),
    emoji: getAspectEmoji(entry.aspect),
    gradient: getAspectGradient(tone),
    shortText: buildAspectShortText(locale, entry),
    fullText: buildAspectFullText(locale, entry),
    keyPoints: buildAspectKeyPoints(locale, entry),
    example: buildAspectExample(locale, entry),
    difficulty: 'advanced',
    readTime: 95,
    order: 3000 + index,
    relatedLessons: ['aspects_001', 'aspects_002', 'basics_003'],
  };
};

const buildSyntheticAscendantAspects = (
  chart: Chart
): PersonalizedAspectEntry[] => {
  const ascLongitude = chart.data?.ascendant?.longitude;
  const planets = chart.data?.planets ?? chart.planets;

  if (typeof ascLongitude !== 'number' || !planets) {
    return [];
  }

  return PERSONALIZED_ASPECT_TARGET_POINTS.flatMap((point) => {
    const longitude = planets[point]?.longitude;
    if (typeof longitude !== 'number') return [];

    const result = calculateAspect(ascLongitude, longitude);
    const aspect = normalizePersonalizedAspect(result.aspect);
    if (!aspect) return [];

    return [
      {
        pointA: 'ascendant' as PersonalizedAspectPoint,
        pointB: point,
        aspect,
        orb: result.orb,
        strength: Math.max(10, Math.round(100 - result.orb * 8)),
      },
    ];
  });
};

const buildExistingPersonalizedAspects = (
  aspects: Aspect[] | undefined
): PersonalizedAspectEntry[] => {
  if (!Array.isArray(aspects)) return [];

  const deduped = new Map<string, PersonalizedAspectEntry>();

  aspects.forEach((aspect) => {
    const rawA = normalizeAspectPoint(aspect.planetA);
    const rawB = normalizeAspectPoint(aspect.planetB);
    const type = normalizePersonalizedAspect(aspect.aspect);

    if (!rawA || !rawB || !type || !isPersonalizedAspectPair(rawA, rawB)) {
      return;
    }

    const [pointA, pointB] = canonicalizeAspectPair(rawA, rawB);
    const key = buildPersonalizedAspectLessonId(pointA, pointB, type);
    const candidate: PersonalizedAspectEntry = {
      pointA,
      pointB,
      aspect: type,
      orb: aspect.orb,
      strength: aspect.strength,
    };
    const existing = deduped.get(key);

    if (
      !existing ||
      candidate.strength > existing.strength ||
      candidate.orb < existing.orb
    ) {
      deduped.set(key, candidate);
    }
  });

  return Array.from(deduped.values());
};

export const getPersonalizedNatalAspectLessons = (
  locale: SupportedLessonsLocale,
  chart: Chart | null
): AstroLesson[] => {
  if (!chart) return [];

  const explicitAspects = buildExistingPersonalizedAspects(
    chart.data?.aspects ?? chart.aspects
  );
  const syntheticAscendantAspects = buildSyntheticAscendantAspects(chart);

  const merged = new Map<string, PersonalizedAspectEntry>();

  [...explicitAspects, ...syntheticAscendantAspects].forEach((entry) => {
    const key = buildPersonalizedAspectLessonId(
      entry.pointA,
      entry.pointB,
      entry.aspect
    );
    const existing = merged.get(key);

    if (
      !existing ||
      entry.strength > existing.strength ||
      entry.orb < existing.orb
    ) {
      merged.set(key, entry);
    }
  });

  return Array.from(merged.values())
    .sort((left, right) => {
      if (right.strength !== left.strength) {
        return right.strength - left.strength;
      }
      if (left.orb !== right.orb) {
        return left.orb - right.orb;
      }
      if (getAspectPriority(left.aspect) !== getAspectPriority(right.aspect)) {
        return getAspectPriority(left.aspect) - getAspectPriority(right.aspect);
      }
      return (
        PERSONALIZED_ASPECT_POINT_ORDER.indexOf(left.pointA) -
          PERSONALIZED_ASPECT_POINT_ORDER.indexOf(right.pointA) ||
        PERSONALIZED_ASPECT_POINT_ORDER.indexOf(left.pointB) -
          PERSONALIZED_ASPECT_POINT_ORDER.indexOf(right.pointB)
      );
    })
    .slice(0, PERSONALIZED_ASPECT_MAX_LESSONS)
    .map((entry, index) =>
      createPersonalizedAspectLesson(locale, entry, index)
    );
};
