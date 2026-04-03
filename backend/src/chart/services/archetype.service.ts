import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { normalizeBirthDateValue } from '@/common/utils/birth-data.util';
import type { Sign } from '@/modules/shared/types';
import { ChartRepository } from '@/repositories/chart.repository';
import { SupabaseService } from '@/supabase/supabase.service';

type ArchetypeLocale = 'ru' | 'en' | 'es';
type ArchetypeSource = 'natal' | 'date_only';
type ArchetypeElement = 'fire' | 'earth' | 'air' | 'water';

interface LocalizedText {
  ru: string;
  en: string;
  es: string;
}

interface SignProfile {
  title: LocalizedText;
  signature: LocalizedText;
  strengths: LocalizedText[];
  shadows: LocalizedText[];
  relationshipNeed: LocalizedText;
  workFocus: LocalizedText;
  growthFocus: LocalizedText;
}

interface LifePathProfile {
  label: LocalizedText;
  gift: LocalizedText;
  lesson: LocalizedText;
}

interface LifePathResult {
  reducedNumber: number;
  masterNumber: number | null;
}

interface ArchetypeBlueprint {
  birthDate: string;
  sunSign: Sign;
  moonSign: Sign | null;
  ascendantSign: Sign | null;
  dominantElement: string;
  lifePathNumber: number;
  masterNumber: number | null;
}

export interface ArchetypeResult {
  source: ArchetypeSource;
  generatedBy: 'algorithm';
  title: string;
  subtitle: string;
  essence: string;
  overview: string;
  strengths: string[];
  shadowPatterns: string[];
  relationships: string;
  work: string;
  growthTask: string;
  note: string;
  blueprint: ArchetypeBlueprint;
}

type ChartDataLike = {
  birthDate?: string;
  planets?: Record<string, { sign?: string | null } | undefined>;
  ascendant?: { sign?: string | null } | null;
  houses?: Array<{ sign?: string | null } | undefined> | Record<string, any>;
};

const SIGN_NAMES: Record<Sign, LocalizedText> = {
  Aries: { ru: 'Овен', en: 'Aries', es: 'Aries' },
  Taurus: { ru: 'Телец', en: 'Taurus', es: 'Tauro' },
  Gemini: { ru: 'Близнецы', en: 'Gemini', es: 'Géminis' },
  Cancer: { ru: 'Рак', en: 'Cancer', es: 'Cáncer' },
  Leo: { ru: 'Лев', en: 'Leo', es: 'Leo' },
  Virgo: { ru: 'Дева', en: 'Virgo', es: 'Virgo' },
  Libra: { ru: 'Весы', en: 'Libra', es: 'Libra' },
  Scorpio: { ru: 'Скорпион', en: 'Scorpio', es: 'Escorpio' },
  Sagittarius: { ru: 'Стрелец', en: 'Sagittarius', es: 'Sagitario' },
  Capricorn: { ru: 'Козерог', en: 'Capricorn', es: 'Capricornio' },
  Aquarius: { ru: 'Водолей', en: 'Aquarius', es: 'Acuario' },
  Pisces: { ru: 'Рыбы', en: 'Pisces', es: 'Piscis' },
};

const ELEMENT_NAMES: Record<ArchetypeElement, LocalizedText> = {
  fire: { ru: 'Огонь', en: 'Fire', es: 'Fuego' },
  earth: { ru: 'Земля', en: 'Earth', es: 'Tierra' },
  air: { ru: 'Воздух', en: 'Air', es: 'Aire' },
  water: { ru: 'Вода', en: 'Water', es: 'Agua' },
};

const SIGN_ELEMENTS: Record<Sign, ArchetypeElement> = {
  Aries: 'fire',
  Taurus: 'earth',
  Gemini: 'air',
  Cancer: 'water',
  Leo: 'fire',
  Virgo: 'earth',
  Libra: 'air',
  Scorpio: 'water',
  Sagittarius: 'fire',
  Capricorn: 'earth',
  Aquarius: 'air',
  Pisces: 'water',
};

const SIGN_PROFILES: Record<Sign, SignProfile> = {
  Aries: {
    title: {
      ru: 'Первопроходец',
      en: 'The Pioneer',
      es: 'La Pionera',
    },
    signature: {
      ru: 'смелость, прямоту и импульс к действию',
      en: 'courage, directness, and an instinct to move first',
      es: 'valentía, franqueza e impulso para actuar primero',
    },
    strengths: [
      {
        ru: 'быстро включает инициативу',
        en: 'activates initiative fast',
        es: 'activa la iniciativa con rapidez',
      },
      {
        ru: 'не боится начинать с нуля',
        en: 'is not afraid to start from zero',
        es: 'no teme empezar desde cero',
      },
    ],
    shadows: [
      {
        ru: 'может спешить быстрее, чем понимает последствия',
        en: 'may rush before seeing the consequences',
        es: 'puede apresurarse antes de ver las consecuencias',
      },
      {
        ru: 'легко сгорает, если всё время живёт на рывке',
        en: 'burns out when living only on adrenaline',
        es: 'se desgasta si vive solo a base de impulso',
      },
    ],
    relationshipNeed: {
      ru: 'живость, честность и ощущение движения',
      en: 'aliveness, honesty, and a sense of movement',
      es: 'vitalidad, honestidad y sensación de movimiento',
    },
    workFocus: {
      ru: 'запуск, лидерство и быстрые решения',
      en: 'launches, leadership, and fast decisions',
      es: 'inicios, liderazgo y decisiones rápidas',
    },
    growthFocus: {
      ru: 'действовать не только быстро, но и стратегично',
      en: 'act with strategy, not only speed',
      es: 'actuar con estrategia y no solo con velocidad',
    },
  },
  Taurus: {
    title: {
      ru: 'Созидатель Опоры',
      en: 'The Grounded Builder',
      es: 'La Constructora Serena',
    },
    signature: {
      ru: 'устойчивость, чувственность и практичность',
      en: 'stability, sensuality, and practicality',
      es: 'estabilidad, sensualidad y practicidad',
    },
    strengths: [
      {
        ru: 'умеет создавать надёжную базу',
        en: 'creates a reliable foundation',
        es: 'crea una base confiable',
      },
      {
        ru: 'держит долгий ритм без лишней суеты',
        en: 'holds a steady pace without unnecessary chaos',
        es: 'mantiene un ritmo constante sin caos innecesario',
      },
    ],
    shadows: [
      {
        ru: 'может застревать в привычном из страха перемен',
        en: 'can stay stuck in the familiar out of fear of change',
        es: 'puede quedarse atrapada en lo conocido por miedo al cambio',
      },
      {
        ru: 'иногда защищает комфорт сильнее, чем собственный рост',
        en: 'may protect comfort more than growth',
        es: 'a veces protege la comodidad más que su crecimiento',
      },
    ],
    relationshipNeed: {
      ru: 'надёжность, телесную теплоту и спокойную верность',
      en: 'reliability, warmth, and calm loyalty',
      es: 'fiabilidad, calidez y lealtad tranquila',
    },
    workFocus: {
      ru: 'качество, ресурсность и устойчивый результат',
      en: 'quality, resourcefulness, and durable results',
      es: 'calidad, recursos y resultados duraderos',
    },
    growthFocus: {
      ru: 'не путать безопасность с остановкой',
      en: 'avoid confusing safety with stagnation',
      es: 'no confundir seguridad con estancamiento',
    },
  },
  Gemini: {
    title: {
      ru: 'Связующий Ум',
      en: 'The Connector Mind',
      es: 'La Mente Conectora',
    },
    signature: {
      ru: 'любознательность, гибкость и дар связывать идеи',
      en: 'curiosity, flexibility, and the gift of connecting ideas',
      es: 'curiosidad, flexibilidad y el don de conectar ideas',
    },
    strengths: [
      {
        ru: 'быстро собирает информацию',
        en: 'gathers information quickly',
        es: 'recoge información con rapidez',
      },
      {
        ru: 'умеет находить язык с разными людьми',
        en: 'finds a language with very different people',
        es: 'encuentra lenguaje común con personas muy distintas',
      },
    ],
    shadows: [
      {
        ru: 'может распыляться между слишком многими направлениями',
        en: 'may scatter across too many directions',
        es: 'puede dispersarse entre demasiadas direcciones',
      },
      {
        ru: 'иногда прячет тревогу за бесконечным движением ума',
        en: 'may hide anxiety behind endless mental movement',
        es: 'puede esconder ansiedad detrás del movimiento mental constante',
      },
    ],
    relationshipNeed: {
      ru: 'интеллектуальный обмен, лёгкость и живой диалог',
      en: 'mental exchange, lightness, and vivid dialogue',
      es: 'intercambio mental, ligereza y diálogo vivo',
    },
    workFocus: {
      ru: 'коммуникацию, идеи и быстрые адаптации',
      en: 'communication, ideas, and fast adaptation',
      es: 'comunicación, ideas y adaptación rápida',
    },
    growthFocus: {
      ru: 'выбирать глубину, а не только разнообразие',
      en: 'choose depth, not only variety',
      es: 'elegir profundidad y no solo variedad',
    },
  },
  Cancer: {
    title: {
      ru: 'Хранитель Сердца',
      en: 'The Heart Keeper',
      es: 'La Guardiana del Corazón',
    },
    signature: {
      ru: 'заботу, память, эмоциональную глубину и интуицию',
      en: 'care, memory, emotional depth, and intuition',
      es: 'cuidado, memoria, profundidad emocional e intuición',
    },
    strengths: [
      {
        ru: 'тонко считывает эмоциональный фон',
        en: 'reads emotional atmosphere with precision',
        es: 'lee con precisión el clima emocional',
      },
      {
        ru: 'умеет создавать чувство дома и безопасности',
        en: 'creates a feeling of home and safety',
        es: 'crea sensación de hogar y seguridad',
      },
    ],
    shadows: [
      {
        ru: 'может закрываться, если становится слишком больно',
        en: 'may withdraw when things become too painful',
        es: 'puede cerrarse cuando algo duele demasiado',
      },
      {
        ru: 'иногда держится за прошлое дольше, чем полезно',
        en: 'can hold onto the past longer than helpful',
        es: 'puede aferrarse al pasado más de lo útil',
      },
    ],
    relationshipNeed: {
      ru: 'эмоциональную надёжность, тепло и ощущение дома',
      en: 'emotional safety, warmth, and a sense of home',
      es: 'seguridad emocional, calidez y sensación de hogar',
    },
    workFocus: {
      ru: 'заботу о людях, сохранение ценного и долгую лояльность',
      en: 'care for people, preservation, and long loyalty',
      es: 'cuidado de las personas, preservación y lealtad duradera',
    },
    growthFocus: {
      ru: 'не путать чувствительность с самоизоляцией',
      en: 'avoid confusing sensitivity with self-isolation',
      es: 'no confundir sensibilidad con aislamiento',
    },
  },
  Leo: {
    title: {
      ru: 'Солнечный Лидер',
      en: 'The Solar Leader',
      es: 'La Líder Solar',
    },
    signature: {
      ru: 'яркость, щедрость, достоинство и творческое самовыражение',
      en: 'radiance, generosity, dignity, and creative self-expression',
      es: 'brillo, generosidad, dignidad y autoexpresión creativa',
    },
    strengths: [
      {
        ru: 'умеет вдохновлять своим присутствием',
        en: 'inspires through presence',
        es: 'inspira con su presencia',
      },
      {
        ru: 'приносит в процессы тепло и масштаб',
        en: 'brings warmth and scale into processes',
        es: 'aporta calidez y amplitud a los procesos',
      },
    ],
    shadows: [
      {
        ru: 'может болезненно реагировать на непризнание',
        en: 'may react painfully to lack of recognition',
        es: 'puede reaccionar con dolor ante la falta de reconocimiento',
      },
      {
        ru: 'иногда путает искреннюю силу с необходимостью постоянно сиять',
        en: 'may confuse true strength with the need to always shine',
        es: 'a veces confunde la fuerza real con la necesidad de brillar siempre',
      },
    ],
    relationshipNeed: {
      ru: 'преданность, восхищение и щедрый обмен теплом',
      en: 'loyalty, admiration, and generous warmth',
      es: 'lealtad, admiración e intercambio generoso de calidez',
    },
    workFocus: {
      ru: 'видимость, лидерство и творческое влияние',
      en: 'visibility, leadership, and creative influence',
      es: 'visibilidad, liderazgo e influencia creativa',
    },
    growthFocus: {
      ru: 'опираться на внутреннюю ценность, а не только на внешний отклик',
      en: 'rest on inner worth, not only external response',
      es: 'apoyarse en el valor interno y no solo en la respuesta externa',
    },
  },
  Virgo: {
    title: {
      ru: 'Точный Алхимик',
      en: 'The Precise Alchemist',
      es: 'La Alquimista Precisa',
    },
    signature: {
      ru: 'наблюдательность, точность и умение улучшать системы',
      en: 'discernment, precision, and the ability to improve systems',
      es: 'discernimiento, precisión y capacidad de mejorar sistemas',
    },
    strengths: [
      {
        ru: 'видит, где нужна настройка и доработка',
        en: 'sees exactly where adjustment is needed',
        es: 've con claridad dónde hace falta ajustar',
      },
      {
        ru: 'умеет превращать хаос в рабочий порядок',
        en: 'turns chaos into functional order',
        es: 'convierte el caos en orden funcional',
      },
    ],
    shadows: [
      {
        ru: 'может быть слишком критичной к себе и другим',
        en: 'may become overly critical of self and others',
        es: 'puede volverse demasiado crítica consigo misma y con otros',
      },
      {
        ru: 'иногда откладывает шаг из-за желания всё довести до идеала',
        en: 'may delay action waiting for perfection',
        es: 'puede retrasar la acción esperando la perfección',
      },
    ],
    relationshipNeed: {
      ru: 'надёжность, заботу в деталях и практическую взаимность',
      en: 'reliability, care in details, and practical reciprocity',
      es: 'fiabilidad, cuidado en los detalles y reciprocidad práctica',
    },
    workFocus: {
      ru: 'аналитику, улучшение процессов и прикладную пользу',
      en: 'analysis, process improvement, and practical usefulness',
      es: 'análisis, mejora de procesos y utilidad práctica',
    },
    growthFocus: {
      ru: 'оставлять место для живого процесса, а не только для идеального стандарта',
      en: 'leave room for life, not only flawless standards',
      es: 'dejar espacio al proceso vivo y no solo al estándar perfecto',
    },
  },
  Libra: {
    title: {
      ru: 'Дипломат Баланса',
      en: 'The Balance Diplomat',
      es: 'La Diplomática del Equilibrio',
    },
    signature: {
      ru: 'чувство меры, эстетики и умение выстраивать равновесие',
      en: 'proportion, aesthetics, and the ability to create balance',
      es: 'sentido de proporción, estética y capacidad de crear equilibrio',
    },
    strengths: [
      {
        ru: 'умеет соединять противоположные позиции',
        en: 'connects opposing positions',
        es: 'conecta posiciones opuestas',
      },
      {
        ru: 'создаёт красивую и уважительную среду',
        en: 'creates beautiful and respectful environments',
        es: 'crea entornos bellos y respetuosos',
      },
    ],
    shadows: [
      {
        ru: 'может слишком долго колебаться, чтобы никого не задеть',
        en: 'may hesitate too long to avoid upsetting others',
        es: 'puede dudar demasiado para no incomodar a nadie',
      },
      {
        ru: 'иногда жертвует собственным вектором ради внешней гармонии',
        en: 'may sacrifice personal direction for outer harmony',
        es: 'puede sacrificar su dirección personal por armonía externa',
      },
    ],
    relationshipNeed: {
      ru: 'партнёрство, взаимное уважение и красоту взаимодействия',
      en: 'partnership, mutual respect, and beauty in interaction',
      es: 'alianza, respeto mutuo y belleza en la interacción',
    },
    workFocus: {
      ru: 'переговоры, дизайн решений и координацию людей',
      en: 'negotiation, solution design, and people coordination',
      es: 'negociación, diseño de soluciones y coordinación de personas',
    },
    growthFocus: {
      ru: 'уметь выбирать, а не только согласовывать',
      en: 'learn to choose, not only to harmonize',
      es: 'aprender a elegir y no solo armonizar',
    },
  },
  Scorpio: {
    title: {
      ru: 'Глубинный Трансформатор',
      en: 'The Deep Transformer',
      es: 'La Transformadora Profunda',
    },
    signature: {
      ru: 'интенсивность, проницательность и способность проходить через кризисы',
      en: 'intensity, insight, and the power to move through crisis',
      es: 'intensidad, lucidez y poder para atravesar crisis',
    },
    strengths: [
      {
        ru: 'видит скрытую мотивацию и суть процессов',
        en: 'sees hidden motivations and the core of processes',
        es: 've motivaciones ocultas y el núcleo de los procesos',
      },
      {
        ru: 'умеет собирать себя заново после сильных перемен',
        en: 'rebuilds after major change',
        es: 'sabe reconstruirse tras grandes cambios',
      },
    ],
    shadows: [
      {
        ru: 'может идти в контроль, если не чувствует безопасности',
        en: 'may move into control when safety is lacking',
        es: 'puede volverse controladora cuando no siente seguridad',
      },
      {
        ru: 'иногда держит напряжение внутри слишком долго',
        en: 'may hold tension inside for too long',
        es: 'a veces retiene demasiada tensión por dentro',
      },
    ],
    relationshipNeed: {
      ru: 'глубину, честность и эмоциональную верность',
      en: 'depth, honesty, and emotional loyalty',
      es: 'profundidad, honestidad y lealtad emocional',
    },
    workFocus: {
      ru: 'кризисное мышление, стратегию и работу с закрытыми слоями реальности',
      en: 'crisis strategy, depth work, and hidden layers of reality',
      es: 'estrategia en crisis, trabajo profundo y capas ocultas de la realidad',
    },
    growthFocus: {
      ru: 'заменять контроль на осознанное доверие',
      en: 'replace control with conscious trust',
      es: 'reemplazar el control por confianza consciente',
    },
  },
  Sagittarius: {
    title: {
      ru: 'Искатель Горизонта',
      en: 'The Horizon Seeker',
      es: 'La Buscadora del Horizonte',
    },
    signature: {
      ru: 'свободу, смысл, масштаб и стремление к росту',
      en: 'freedom, meaning, scale, and a drive for growth',
      es: 'libertad, sentido, amplitud y deseo de crecimiento',
    },
    strengths: [
      {
        ru: 'умеет видеть большую картину',
        en: 'sees the big picture',
        es: 've el panorama completo',
      },
      {
        ru: 'зажигает людей идеей и перспективой',
        en: 'ignites people with perspective and possibility',
        es: 'enciende a las personas con perspectiva y posibilidad',
      },
    ],
    shadows: [
      {
        ru: 'может обещать больше, чем готова закрепить в реальности',
        en: 'may promise more than can be grounded',
        es: 'puede prometer más de lo que luego aterriza',
      },
      {
        ru: 'иногда убегает в идею, чтобы не встречаться с ограничениями',
        en: 'may escape into ideals to avoid limits',
        es: 'puede huir hacia ideales para evitar límites',
      },
    ],
    relationshipNeed: {
      ru: 'свободу, честность и общее чувство пути',
      en: 'freedom, honesty, and a shared direction',
      es: 'libertad, honestidad y dirección compartida',
    },
    workFocus: {
      ru: 'видение, обучение, расширение и новые территории',
      en: 'vision, teaching, expansion, and new territory',
      es: 'visión, enseñanza, expansión y nuevos territorios',
    },
    growthFocus: {
      ru: 'связывать вдохновение с дисциплиной',
      en: 'tie inspiration to discipline',
      es: 'unir inspiración con disciplina',
    },
  },
  Capricorn: {
    title: {
      ru: 'Стратег-Строитель',
      en: 'The Strategic Builder',
      es: 'La Constructora Estratégica',
    },
    signature: {
      ru: 'дисциплину, стратегичность и умение выдерживать длинную дистанцию',
      en: 'discipline, strategy, and endurance for the long game',
      es: 'disciplina, estrategia y resistencia para el largo plazo',
    },
    strengths: [
      {
        ru: 'умеет строить систему и держать рамку',
        en: 'builds systems and holds structure',
        es: 'construye sistemas y sostiene estructura',
      },
      {
        ru: 'сохраняет серьёзность там, где другим не хватает опоры',
        en: 'stays solid where others lose stability',
        es: 'mantiene solidez donde otros pierden estabilidad',
      },
    ],
    shadows: [
      {
        ru: 'может жить только через долг и контроль',
        en: 'may live only through duty and control',
        es: 'puede vivir solo a través del deber y el control',
      },
      {
        ru: 'иногда прячет чувства за ролью сильного человека',
        en: 'may hide feelings behind the role of the strong one',
        es: 'a veces esconde sentimientos detrás del rol de la fuerte',
      },
    ],
    relationshipNeed: {
      ru: 'надёжность, уважение и зрелую взаимность',
      en: 'reliability, respect, and mature reciprocity',
      es: 'fiabilidad, respeto y reciprocidad madura',
    },
    workFocus: {
      ru: 'стратегию, ответственность и долгий горизонт',
      en: 'strategy, responsibility, and a long horizon',
      es: 'estrategia, responsabilidad y horizonte largo',
    },
    growthFocus: {
      ru: 'давать место не только долгу, но и живому желанию',
      en: 'make room for desire, not only duty',
      es: 'dar espacio no solo al deber sino también al deseo vivo',
    },
  },
  Aquarius: {
    title: {
      ru: 'Визионер Систем',
      en: 'The Systems Visionary',
      es: 'La Visionaria de Sistemas',
    },
    signature: {
      ru: 'независимость, дальнее мышление и ориентацию на будущее',
      en: 'independence, future vision, and systems thinking',
      es: 'independencia, visión de futuro y pensamiento sistémico',
    },
    strengths: [
      {
        ru: 'видит нестандартные решения',
        en: 'spots unconventional solutions',
        es: 'detecta soluciones no convencionales',
      },
      {
        ru: 'умеет мыслить на уровне сообщества и модели',
        en: 'thinks at the level of systems and communities',
        es: 'piensa a nivel de sistemas y comunidades',
      },
    ],
    shadows: [
      {
        ru: 'может уходить в отстранённость вместо близости',
        en: 'may retreat into detachment instead of closeness',
        es: 'puede refugiarse en la distancia en lugar de la cercanía',
      },
      {
        ru: 'иногда ставит идею выше человеческого ритма',
        en: 'may place the idea above human rhythm',
        es: 'a veces pone la idea por encima del ritmo humano',
      },
    ],
    relationshipNeed: {
      ru: 'свободу, дружбу и уважение к индивидуальности',
      en: 'freedom, friendship, and respect for individuality',
      es: 'libertad, amistad y respeto por la individualidad',
    },
    workFocus: {
      ru: 'инновации, системные реформы и новое видение',
      en: 'innovation, systems reform, and new vision',
      es: 'innovación, reforma de sistemas y nueva visión',
    },
    growthFocus: {
      ru: 'оставаться включённой в чувства, пока строите будущее',
      en: 'stay emotionally present while building the future',
      es: 'mantenerse emocionalmente presente mientras construye el futuro',
    },
  },
  Pisces: {
    title: {
      ru: 'Интуитивный Проводник',
      en: 'The Intuitive Guide',
      es: 'La Guía Intuitiva',
    },
    signature: {
      ru: 'эмпатию, воображение и чувствительность к невидимым слоям',
      en: 'empathy, imagination, and sensitivity to invisible layers',
      es: 'empatía, imaginación y sensibilidad a las capas invisibles',
    },
    strengths: [
      {
        ru: 'чувствует глубинный подтекст ситуации',
        en: 'feels the deeper subtext of situations',
        es: 'percibe el subtexto profundo de las situaciones',
      },
      {
        ru: 'умеет вдохновлять через образ и сострадание',
        en: 'inspires through image and compassion',
        es: 'inspira mediante imagen y compasión',
      },
    ],
    shadows: [
      {
        ru: 'может растворяться в чужих состояниях',
        en: 'may dissolve into other people’s states',
        es: 'puede disolverse en los estados de otras personas',
      },
      {
        ru: 'иногда избегает прямого действия, уходя в мечту',
        en: 'may avoid direct action by escaping into fantasy',
        es: 'puede evitar la acción directa refugiándose en la fantasía',
      },
    ],
    relationshipNeed: {
      ru: 'тонкость, душевную близость и мягкость контакта',
      en: 'sensitivity, soul closeness, and softness in contact',
      es: 'sensibilidad, cercanía del alma y suavidad en el contacto',
    },
    workFocus: {
      ru: 'творчество, интуицию и работу с символами и смыслами',
      en: 'creativity, intuition, and work with symbols and meaning',
      es: 'creatividad, intuición y trabajo con símbolos y sentido',
    },
    growthFocus: {
      ru: 'добавлять границы и форму к сильной чувствительности',
      en: 'add boundaries and form to high sensitivity',
      es: 'añadir límites y forma a una sensibilidad intensa',
    },
  },
};

const LIFE_PATH_PROFILES: Record<number, LifePathProfile> = {
  1: {
    label: { ru: 'Путь 1', en: 'Path 1', es: 'Camino 1' },
    gift: {
      ru: 'личную инициативу и импульс вести',
      en: 'personal initiative and the impulse to lead',
      es: 'iniciativa personal e impulso para liderar',
    },
    lesson: {
      ru: 'не превращать самостоятельность в одиночество',
      en: 'avoid turning independence into isolation',
      es: 'no convertir la independencia en aislamiento',
    },
  },
  2: {
    label: { ru: 'Путь 2', en: 'Path 2', es: 'Camino 2' },
    gift: {
      ru: 'чувство партнёрства и дипломатии',
      en: 'partnership intelligence and diplomacy',
      es: 'inteligencia de alianza y diplomacia',
    },
    lesson: {
      ru: 'не терять собственный голос ради мира любой ценой',
      en: 'not lose your own voice for peace at any price',
      es: 'no perder la propia voz por paz a cualquier precio',
    },
  },
  3: {
    label: { ru: 'Путь 3', en: 'Path 3', es: 'Camino 3' },
    gift: {
      ru: 'дар самовыражения и вдохновения',
      en: 'the gift of expression and inspiration',
      es: 'el don de la expresión y la inspiración',
    },
    lesson: {
      ru: 'не маскировать уязвимость лёгкостью',
      en: 'not cover vulnerability with performance',
      es: 'no tapar la vulnerabilidad con actuación',
    },
  },
  4: {
    label: { ru: 'Путь 4', en: 'Path 4', es: 'Camino 4' },
    gift: {
      ru: 'умение строить форму, ритм и опору',
      en: 'the ability to build structure, rhythm, and support',
      es: 'la capacidad de construir estructura, ritmo y soporte',
    },
    lesson: {
      ru: 'не застревать в жёсткости, когда жизнь меняется',
      en: 'not get stuck in rigidity when life changes',
      es: 'no quedar atrapada en la rigidez cuando la vida cambia',
    },
  },
  5: {
    label: { ru: 'Путь 5', en: 'Path 5', es: 'Camino 5' },
    gift: {
      ru: 'любовь к переменам, свободе и опыту',
      en: 'a love of change, freedom, and direct experience',
      es: 'amor por el cambio, la libertad y la experiencia directa',
    },
    lesson: {
      ru: 'не путать свободу с бегством от глубины',
      en: 'not confuse freedom with escape from depth',
      es: 'no confundir libertad con huida de la profundidad',
    },
  },
  6: {
    label: { ru: 'Путь 6', en: 'Path 6', es: 'Camino 6' },
    gift: {
      ru: 'способность заботиться, объединять и лечить отношения',
      en: 'the ability to care, unify, and heal relationships',
      es: 'la capacidad de cuidar, unir y sanar relaciones',
    },
    lesson: {
      ru: 'не брать ответственность за всех вокруг',
      en: 'not take responsibility for everyone around you',
      es: 'no asumir la responsabilidad de todos a tu alrededor',
    },
  },
  7: {
    label: { ru: 'Путь 7', en: 'Path 7', es: 'Camino 7' },
    gift: {
      ru: 'аналитическую глубину и внутреннее знание',
      en: 'analytical depth and inner knowledge',
      es: 'profundidad analítica y conocimiento interior',
    },
    lesson: {
      ru: 'не закрываться от мира в попытке всё понять',
      en: 'not close off from life in order to understand it',
      es: 'no cerrarse al mundo intentando entenderlo todo',
    },
  },
  8: {
    label: { ru: 'Путь 8', en: 'Path 8', es: 'Camino 8' },
    gift: {
      ru: 'силу управлять ресурсами и влиять на масштаб',
      en: 'power to manage resources and shape scale',
      es: 'poder para gestionar recursos y crear escala',
    },
    lesson: {
      ru: 'не сводить ценность только к результату и контролю',
      en: 'not reduce worth to achievement and control',
      es: 'no reducir el valor al logro y al control',
    },
  },
  9: {
    label: { ru: 'Путь 9', en: 'Path 9', es: 'Camino 9' },
    gift: {
      ru: 'широкое сердце и способность видеть общий смысл',
      en: 'a wide heart and the ability to see the bigger meaning',
      es: 'un corazón amplio y la capacidad de ver el sentido mayor',
    },
    lesson: {
      ru: 'не растворяться в спасении мира',
      en: 'not dissolve into saving everyone',
      es: 'no disolverse intentando salvar a todos',
    },
  },
  11: {
    label: {
      ru: 'Мастер-путь 11',
      en: 'Master Path 11',
      es: 'Camino Maestro 11',
    },
    gift: {
      ru: 'сильную интуицию, символическое видение и способность зажигать смыслом',
      en: 'strong intuition, symbolic vision, and the power to ignite meaning',
      es: 'fuerte intuición, visión simbólica y poder para encender sentido',
    },
    lesson: {
      ru: 'не жить на постоянном внутреннем перенапряжении',
      en: 'not live in constant inner overvoltage',
      es: 'no vivir en un sobrevoltaje interno constante',
    },
  },
  22: {
    label: {
      ru: 'Мастер-путь 22',
      en: 'Master Path 22',
      es: 'Camino Maestro 22',
    },
    gift: {
      ru: 'способность воплощать большие идеи в реальность',
      en: 'the ability to bring large visions into reality',
      es: 'la capacidad de llevar grandes visiones a la realidad',
    },
    lesson: {
      ru: 'не ломать себя под тяжестью большого масштаба',
      en: 'not break yourself under the weight of scale',
      es: 'no quebrarte bajo el peso de la escala',
    },
  },
  33: {
    label: {
      ru: 'Мастер-путь 33',
      en: 'Master Path 33',
      es: 'Camino Maestro 33',
    },
    gift: {
      ru: 'дар сострадания, наставничества и эмоционального исцеления',
      en: 'the gift of compassion, mentoring, and emotional healing',
      es: 'el don de la compasión, la mentoría y la sanación emocional',
    },
    lesson: {
      ru: 'не жертвовать собой в роли спасателя',
      en: 'not sacrifice yourself in the role of rescuer',
      es: 'no sacrificarte en el papel de salvadora',
    },
  },
};

const SUPPORTED_SIGNS = new Set<Sign>([
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]);

@Injectable()
export class ArchetypeService {
  private readonly logger = new Logger(ArchetypeService.name);

  constructor(
    private readonly chartRepository: ChartRepository,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getUserArchetype(
    userId: string,
    locale: ArchetypeLocale = 'ru',
  ): Promise<ArchetypeResult> {
    const chart = await this.chartRepository.findByUserId(userId);
    const chartData = this.extractChartData(chart?.data);

    let birthDate =
      normalizeBirthDateValue(chartData?.birthDate) ??
      normalizeBirthDateValue(chart?.data?.birthDate);

    let profile: {
      birth_date?: string | null;
    } | null = null;

    if (!birthDate) {
      const { data } = await this.supabaseService.getUserProfileAdmin(userId);
      profile = data ?? null;
      birthDate = normalizeBirthDateValue(profile?.birth_date);
    }

    if (!birthDate) {
      throw new BadRequestException(
        this.localize(
          locale,
          'Недостаточно данных для расчёта архетипа',
          'Not enough birth data to calculate the archetype',
          'No hay suficientes datos de nacimiento para calcular el arquetipo',
        ),
      );
    }

    const sunSign = this.resolveSunSign(chartData, birthDate);
    if (!sunSign) {
      throw new NotFoundException(
        this.localize(
          locale,
          'Не удалось определить солнечный знак для архетипа',
          'Failed to resolve the Sun sign for the archetype',
          'No se pudo determinar el signo solar para el arquetipo',
        ),
      );
    }

    const moonSign = this.resolveMoonSign(chartData);
    const ascendantSign = this.resolveAscendantSign(chartData);
    const source: ArchetypeSource =
      moonSign && ascendantSign ? 'natal' : 'date_only';
    const lifePath = this.calculateLifePath(birthDate);
    const pathProfile =
      LIFE_PATH_PROFILES[lifePath.masterNumber ?? lifePath.reducedNumber];
    const signProfile = SIGN_PROFILES[sunSign];
    const dominantElement = this.resolveDominantElement(
      chartData,
      sunSign,
      ascendantSign,
    );
    const dominantElementLabel = ELEMENT_NAMES[dominantElement][locale];
    const moonSignature = moonSign
      ? SIGN_PROFILES[moonSign].signature[locale]
      : null;
    const ascSignature = ascendantSign
      ? SIGN_PROFILES[ascendantSign].signature[locale]
      : null;

    const result: ArchetypeResult = {
      source,
      generatedBy: 'algorithm',
      title: signProfile.title[locale],
      subtitle: this.buildSubtitle(locale, sunSign, ascendantSign, lifePath),
      essence: this.buildEssence(locale, signProfile, pathProfile),
      overview: this.buildOverview(locale, {
        source,
        sunSign,
        moonSign,
        ascendantSign,
        dominantElementLabel,
        signProfile,
        pathProfile,
        moonSignature,
        ascSignature,
      }),
      strengths: [
        signProfile.strengths[0][locale],
        signProfile.strengths[1][locale],
        this.buildLifePathStrength(locale, pathProfile),
      ],
      shadowPatterns: [
        signProfile.shadows[0][locale],
        signProfile.shadows[1][locale],
        this.buildLifePathShadow(locale, pathProfile),
      ],
      relationships: this.buildRelationships(locale, {
        source,
        sunSign,
        moonSign,
        signProfile,
        moonSignature,
      }),
      work: this.buildWork(locale, {
        source,
        ascendantSign,
        signProfile,
        pathProfile,
        ascSignature,
      }),
      growthTask: this.buildGrowthTask(locale, signProfile, pathProfile),
      note: this.buildNote(locale, source),
      blueprint: {
        birthDate,
        sunSign,
        moonSign,
        ascendantSign,
        dominantElement: dominantElementLabel,
        lifePathNumber: lifePath.masterNumber ?? lifePath.reducedNumber,
        masterNumber: lifePath.masterNumber,
      },
    };

    this.logger.debug(
      `Archetype generated for user ${userId} with source ${source}`,
    );

    return result;
  }

  private buildEssence(
    locale: ArchetypeLocale,
    signProfile: SignProfile,
    pathProfile: LifePathProfile,
  ): string {
    if (locale === 'en') {
      return `This archetype combines ${signProfile.signature.en} with ${pathProfile.gift.en}.`;
    }
    if (locale === 'es') {
      return `Este arquetipo combina ${signProfile.signature.es} con ${pathProfile.gift.es}.`;
    }
    return `Этот архетип соединяет ${signProfile.signature.ru} с ${pathProfile.gift.ru}.`;
  }

  private buildSubtitle(
    locale: ArchetypeLocale,
    sunSign: Sign,
    ascendantSign: Sign | null,
    lifePath: LifePathResult,
  ): string {
    const sunName = SIGN_NAMES[sunSign][locale];
    const pathNumber = lifePath.masterNumber ?? lifePath.reducedNumber;

    if (locale === 'en') {
      return ascendantSign
        ? `Sun in ${sunName}, Ascendant in ${SIGN_NAMES[ascendantSign].en}, Life Path ${pathNumber}`
        : `Sun in ${sunName}, Life Path ${pathNumber}`;
    }
    if (locale === 'es') {
      return ascendantSign
        ? `Sol en ${sunName}, Ascendente en ${SIGN_NAMES[ascendantSign].es}, Camino ${pathNumber}`
        : `Sol en ${sunName}, Camino ${pathNumber}`;
    }
    return ascendantSign
      ? `Солнце в знаке ${sunName}, Асцендент в знаке ${SIGN_NAMES[ascendantSign].ru}, путь ${pathNumber}`
      : `Солнце в знаке ${sunName}, путь ${pathNumber}`;
  }

  private buildOverview(
    locale: ArchetypeLocale,
    input: {
      source: ArchetypeSource;
      sunSign: Sign;
      moonSign: Sign | null;
      ascendantSign: Sign | null;
      dominantElementLabel: string;
      signProfile: SignProfile;
      pathProfile: LifePathProfile;
      moonSignature: string | null;
      ascSignature: string | null;
    },
  ): string {
    const sunName = SIGN_NAMES[input.sunSign][locale];

    if (locale === 'en') {
      if (input.source === 'natal' && input.moonSign && input.ascendantSign) {
        return `${input.signProfile.title.en} is built around a ${sunName} core: ${input.signProfile.signature.en}. Moon in ${SIGN_NAMES[input.moonSign].en} adds an emotional layer shaped by ${input.moonSignature}, while Ascendant in ${SIGN_NAMES[input.ascendantSign].en} makes your visible style read through ${input.ascSignature}. ${input.pathProfile.label.en} adds ${input.pathProfile.gift.en}, and the dominant ${input.dominantElementLabel} element keeps the whole pattern coherent.`;
      }

      return `${input.signProfile.title.en} is a lighter archetype built from your birth date. At its center is the ${sunName} signature: ${input.signProfile.signature.en}. ${input.pathProfile.label.en} adds ${input.pathProfile.gift.en}, and the overall tone leans toward ${input.dominantElementLabel.toLowerCase()} expression.`;
    }

    if (locale === 'es') {
      if (input.source === 'natal' && input.moonSign && input.ascendantSign) {
        return `${input.signProfile.title.es} se construye alrededor de un núcleo en ${sunName}: ${input.signProfile.signature.es}. La Luna en ${SIGN_NAMES[input.moonSign].es} añade una capa emocional marcada por ${input.moonSignature}, mientras que el Ascendente en ${SIGN_NAMES[input.ascendantSign].es} hace visible tu energía a través de ${input.ascSignature}. ${input.pathProfile.label.es} aporta ${input.pathProfile.gift.es}, y el elemento dominante ${input.dominantElementLabel} mantiene la coherencia del conjunto.`;
      }

      return `${input.signProfile.title.es} es un arquetipo ligero basado solo en tu fecha de nacimiento. En el centro está la firma de ${sunName}: ${input.signProfile.signature.es}. ${input.pathProfile.label.es} añade ${input.pathProfile.gift.es}, y el tono general se inclina hacia la expresión de ${input.dominantElementLabel.toLowerCase()}.`;
    }

    if (input.source === 'natal' && input.moonSign && input.ascendantSign) {
      return `${input.signProfile.title.ru} строится вокруг солнечного ядра в знаке ${sunName}: это ${input.signProfile.signature.ru}. Луна в знаке ${SIGN_NAMES[input.moonSign].ru} добавляет эмоциональный слой, окрашенный через ${input.moonSignature}, а Асцендент в знаке ${SIGN_NAMES[input.ascendantSign].ru} делает вашу внешнюю подачу заметной через ${input.ascSignature}. ${input.pathProfile.label.ru} приносит ${input.pathProfile.gift.ru}, а доминирующая стихия ${input.dominantElementLabel} собирает всё в единый паттерн.`;
    }

    return `${input.signProfile.title.ru} — это облегчённый архетип, построенный только по дате рождения. В его центре стоит солнечная подпись знака ${sunName}: ${input.signProfile.signature.ru}. ${input.pathProfile.label.ru} добавляет ${input.pathProfile.gift.ru}, а общий тон тяготеет к проявлению стихии ${input.dominantElementLabel}.`;
  }

  private buildRelationships(
    locale: ArchetypeLocale,
    input: {
      source: ArchetypeSource;
      sunSign: Sign;
      moonSign: Sign | null;
      signProfile: SignProfile;
      moonSignature: string | null;
    },
  ): string {
    if (locale === 'en') {
      if (input.source === 'natal' && input.moonSign && input.moonSignature) {
        return `In relationships you usually seek ${input.signProfile.relationshipNeed.en}. Moon in ${SIGN_NAMES[input.moonSign].en} shows that emotionally you also need ${input.moonSignature}, so your bond deepens when reliability and emotional nuance are both present.`;
      }

      return `In relationships you usually seek ${input.signProfile.relationshipNeed.en}. This reading is based only on the birth date, so your deeper emotional style will become sharper once birth time is included.`;
    }

    if (locale === 'es') {
      if (input.source === 'natal' && input.moonSign && input.moonSignature) {
        return `En las relaciones sueles buscar ${input.signProfile.relationshipNeed.es}. La Luna en ${SIGN_NAMES[input.moonSign].es} muestra que emocionalmente también necesitas ${input.moonSignature}, así que el vínculo se fortalece cuando coinciden estabilidad y matiz afectivo.`;
      }

      return `En las relaciones sueles buscar ${input.signProfile.relationshipNeed.es}. Esta lectura se basa solo en la fecha de nacimiento, por eso el estilo emocional profundo se afinará cuando haya hora de nacimiento.`;
    }

    if (input.source === 'natal' && input.moonSign && input.moonSignature) {
      return `В отношениях вы обычно тянетесь к тем, с кем возможны ${input.signProfile.relationshipNeed.ru}. Луна в знаке ${SIGN_NAMES[input.moonSign].ru} показывает, что эмоционально вам также нужны ${input.moonSignature}, поэтому связь становится глубже, когда рядом есть и надёжность, и тонкость чувств.`;
    }

    return `В отношениях вы обычно тянетесь к тем, с кем возможны ${input.signProfile.relationshipNeed.ru}. Но это чтение построено только по дате рождения, поэтому эмоциональный стиль станет точнее после учёта времени рождения.`;
  }

  private buildWork(
    locale: ArchetypeLocale,
    input: {
      source: ArchetypeSource;
      ascendantSign: Sign | null;
      signProfile: SignProfile;
      pathProfile: LifePathProfile;
      ascSignature: string | null;
    },
  ): string {
    if (locale === 'en') {
      if (
        input.source === 'natal' &&
        input.ascendantSign &&
        input.ascSignature
      ) {
        return `At work you are strongest where ${input.signProfile.workFocus.en}. Ascendant in ${SIGN_NAMES[input.ascendantSign].en} makes your style visible through ${input.ascSignature}, and ${input.pathProfile.label.en} adds ${input.pathProfile.gift.en}.`;
      }

      return `At work you are strongest where ${input.signProfile.workFocus.en}. ${input.pathProfile.label.en} adds ${input.pathProfile.gift.en}, even in the lighter date-based version of the archetype.`;
    }

    if (locale === 'es') {
      if (
        input.source === 'natal' &&
        input.ascendantSign &&
        input.ascSignature
      ) {
        return `En el trabajo brillan mejor los contextos donde importan ${input.signProfile.workFocus.es}. El Ascendente en ${SIGN_NAMES[input.ascendantSign].es} hace visible tu estilo a través de ${input.ascSignature}, y ${input.pathProfile.label.es} suma ${input.pathProfile.gift.es}.`;
      }

      return `En el trabajo brillan mejor los contextos donde importan ${input.signProfile.workFocus.es}. ${input.pathProfile.label.es} añade ${input.pathProfile.gift.es}, incluso en la versión ligera basada solo en la fecha.`;
    }

    if (input.source === 'natal' && input.ascendantSign && input.ascSignature) {
      return `В работе вас сильнее всего раскрывают задачи, где нужны ${input.signProfile.workFocus.ru}. Асцендент в знаке ${SIGN_NAMES[input.ascendantSign].ru} делает ваш стиль заметным через ${input.ascSignature}, а ${input.pathProfile.label.ru} добавляет ${input.pathProfile.gift.ru}.`;
    }

    return `В работе вас сильнее всего раскрывают задачи, где нужны ${input.signProfile.workFocus.ru}. ${input.pathProfile.label.ru} всё равно добавляет ${input.pathProfile.gift.ru}, даже в облегчённой версии архетипа по дате рождения.`;
  }

  private buildGrowthTask(
    locale: ArchetypeLocale,
    signProfile: SignProfile,
    pathProfile: LifePathProfile,
  ): string {
    if (locale === 'en') {
      return `Your growth task is to ${signProfile.growthFocus.en} and remember ${pathProfile.lesson.en}.`;
    }
    if (locale === 'es') {
      return `Tu tarea de crecimiento es ${signProfile.growthFocus.es} y recordar ${pathProfile.lesson.es}.`;
    }
    return `Задача роста — ${signProfile.growthFocus.ru} и помнить, что важно ${pathProfile.lesson.ru}.`;
  }

  private buildNote(locale: ArchetypeLocale, source: ArchetypeSource): string {
    if (locale === 'en') {
      return source === 'natal'
        ? 'This archetype uses Sun, Moon, Ascendant, and date numerology, so it is more specific than a date-only reading.'
        : 'This is a date-only archetype. It is useful as an entry point, but birth time and place will make it more precise.';
    }
    if (locale === 'es') {
      return source === 'natal'
        ? 'Este arquetipo usa Sol, Luna, Ascendente y numerología de la fecha, por lo que es más específico que una lectura solo por fecha.'
        : 'Este es un arquetipo basado solo en la fecha. Sirve como punto de entrada, pero con hora y lugar de nacimiento será más preciso.';
    }
    return source === 'natal'
      ? 'Этот архетип использует Солнце, Луну, Асцендент и нумерологию даты, поэтому он точнее, чем чтение только по дате.'
      : 'Это архетип только по дате рождения. Он полезен как входная версия, но время и место рождения сделают его заметно точнее.';
  }

  private buildLifePathStrength(
    locale: ArchetypeLocale,
    profile: LifePathProfile,
  ): string {
    if (locale === 'en') {
      return `Life path adds ${profile.gift.en}.`;
    }
    if (locale === 'es') {
      return `El camino añade ${profile.gift.es}.`;
    }
    return `Путь добавляет ${profile.gift.ru}.`;
  }

  private buildLifePathShadow(
    locale: ArchetypeLocale,
    profile: LifePathProfile,
  ): string {
    if (locale === 'en') {
      return `The life-path challenge is to remember ${profile.lesson.en}.`;
    }
    if (locale === 'es') {
      return `El reto del camino es recordar ${profile.lesson.es}.`;
    }
    return `Тень пути — помнить, как важно ${profile.lesson.ru}.`;
  }

  private extractChartData(data: unknown): ChartDataLike | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const raw = data as Record<string, unknown>;
    if (raw.planets || raw.ascendant || raw.houses) {
      return raw as ChartDataLike;
    }

    if (raw.data && typeof raw.data === 'object') {
      return this.extractChartData(raw.data);
    }

    return raw as ChartDataLike;
  }

  private resolveSunSign(
    chartData: ChartDataLike | null,
    birthDate: string,
  ): Sign | null {
    const chartSign = this.toSign(chartData?.planets?.sun?.sign);
    if (chartSign) {
      return chartSign;
    }

    const [year, month, day] = birthDate.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    return this.getSunSignFromDate(month, day);
  }

  private resolveMoonSign(chartData: ChartDataLike | null): Sign | null {
    return this.toSign(chartData?.planets?.moon?.sign);
  }

  private resolveAscendantSign(chartData: ChartDataLike | null): Sign | null {
    const direct = this.toSign(chartData?.ascendant?.sign);
    if (direct) {
      return direct;
    }

    const houses = chartData?.houses;
    if (Array.isArray(houses)) {
      const firstHouse =
        houses.find((house: any) => house?.number === 1) ?? houses[0];
      return this.toSign(firstHouse?.sign);
    }

    if (houses && typeof houses === 'object') {
      const firstHouse = (
        houses as Record<string, { sign?: unknown } | undefined>
      )['1'];
      return this.toSign(firstHouse?.sign);
    }

    return null;
  }

  private resolveDominantElement(
    chartData: ChartDataLike | null,
    sunSign: Sign,
    ascendantSign: Sign | null,
  ): ArchetypeElement {
    if (!chartData?.planets) {
      return SIGN_ELEMENTS[sunSign];
    }

    const counts: Record<ArchetypeElement, number> = {
      fire: 0,
      earth: 0,
      air: 0,
      water: 0,
    };

    const planetsToCount = [
      chartData.planets.sun,
      chartData.planets.moon,
      chartData.planets.mercury,
      chartData.planets.venus,
      chartData.planets.mars,
      chartData.planets.jupiter,
      chartData.planets.saturn,
    ];

    planetsToCount.forEach((planet) => {
      const sign = this.toSign(planet?.sign);
      if (sign) {
        counts[SIGN_ELEMENTS[sign]] += 1;
      }
    });

    if (ascendantSign) {
      counts[SIGN_ELEMENTS[ascendantSign]] += 1;
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return (
      (sorted[0]?.[0] as ArchetypeElement | undefined) ?? SIGN_ELEMENTS[sunSign]
    );
  }

  private calculateLifePath(birthDate: string): LifePathResult {
    const digits = birthDate.replace(/\D/g, '');
    let sum = digits.split('').reduce((acc, digit) => acc + Number(digit), 0);

    while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
      sum = String(sum)
        .split('')
        .reduce((acc, digit) => acc + Number(digit), 0);
    }

    if (sum === 11 || sum === 22 || sum === 33) {
      return {
        reducedNumber:
          String(sum)
            .split('')
            .reduce((acc, digit) => acc + Number(digit), 0) || sum,
        masterNumber: sum,
      };
    }

    return {
      reducedNumber: sum,
      masterNumber: null,
    };
  }

  private getSunSignFromDate(month: number, day: number): Sign {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
      return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
      return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
      return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
      return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
      return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
      return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
      return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
      return 'Sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
      return 'Capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
      return 'Aquarius';
    return 'Pisces';
  }

  private toSign(value: unknown): Sign | null {
    if (typeof value !== 'string') {
      return null;
    }

    return SUPPORTED_SIGNS.has(value as Sign) ? (value as Sign) : null;
  }

  private localize(
    locale: ArchetypeLocale,
    ru: string,
    en: string,
    es: string,
  ): string {
    if (locale === 'en') return en;
    if (locale === 'es') return es;
    return ru;
  }
}
