/**
 * Shared astronomical calculations utilities
 * Централизованные функции для астрологических вычислений
 */

export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition';

export interface AspectDefinition {
  type: AspectType;
  angle: number;
  orb: number;
}

export interface AspectResult {
  type: AspectType;
  orb: number;
  strength: number; // 0-1, где 1 = exact aspect
}

/**
 * Default orbs for major aspects
 */
export const DEFAULT_ASPECT_ORBS: Record<AspectType, number> = {
  conjunction: 8,
  sextile: 6,
  square: 8,
  trine: 8,
  opposition: 8,
};

/**
 * Aspect definitions with angles
 */
export const ASPECT_DEFINITIONS: Array<Omit<AspectDefinition, 'orb'>> = [
  { type: 'conjunction', angle: 0 },
  { type: 'sextile', angle: 60 },
  { type: 'square', angle: 90 },
  { type: 'trine', angle: 120 },
  { type: 'opposition', angle: 180 },
];

/**
 * Normalize angle difference to 0-180 range
 */
export function normalizeAngleDiff(longitude1: number, longitude2: number): number {
  const diff = Math.abs(longitude1 - longitude2);
  return Math.min(diff, 360 - diff);
}

/**
 * Calculate aspect between two celestial longitudes
 *
 * @param longitude1 - First celestial longitude (0-360)
 * @param longitude2 - Second celestial longitude (0-360)
 * @param customOrbs - Optional custom orbs for each aspect type
 * @returns AspectResult if aspect found within orb, null otherwise
 *
 * @example
 * ```typescript
 * const aspect = calculateAspect(45, 135); // 90° = square
 * // Returns: { type: 'square', orb: 0, strength: 1 }
 *
 * const aspect2 = calculateAspect(45, 140); // 95° ≈ square
 * // Returns: { type: 'square', orb: 5, strength: 0.375 }
 * ```
 */
export function calculateAspect(
  longitude1: number,
  longitude2: number,
  customOrbs?: Partial<Record<AspectType, number>>,
): AspectResult | null {
  const normalizedDiff = normalizeAngleDiff(longitude1, longitude2);
  const orbs = { ...DEFAULT_ASPECT_ORBS, ...customOrbs };

  for (const aspectDef of ASPECT_DEFINITIONS) {
    const aspectType = aspectDef.type;
    const aspectAngle = aspectDef.angle;
    const allowedOrb = orbs[aspectType];

    const orbDelta = Math.abs(normalizedDiff - aspectAngle);

    if (orbDelta <= allowedOrb) {
      return {
        type: aspectType,
        orb: orbDelta,
        strength: 1 - orbDelta / allowedOrb,
      };
    }
  }

  return null;
}

/**
 * Calculate aspect and return only the type (simplified version)
 * Used for backward compatibility with chart.service.ts
 *
 * @param longitude1 - First celestial longitude
 * @param longitude2 - Second celestial longitude
 * @returns Aspect type string or 'other' if no major aspect found
 */
export function calculateAspectType(
  longitude1: number,
  longitude2: number,
): AspectType | 'other' {
  const aspect = calculateAspect(longitude1, longitude2);
  return aspect ? aspect.type : 'other';
}

/**
 * Calculate aspect with custom orb specifications (for advisor service)
 *
 * @param longitude1 - First longitude
 * @param longitude2 - Second longitude
 * @param orbSpecs - Custom orb specifications with base weights
 * @returns Aspect with type and orb, or null
 */
export function calculateAspectWithSpecs(
  longitude1: number,
  longitude2: number,
  orbSpecs: Record<AspectType, { base: number; orb: number }>,
): { type: AspectType; orb: number } | null {
  const normalizedDiff = normalizeAngleDiff(longitude1, longitude2);

  for (const aspectDef of ASPECT_DEFINITIONS) {
    const aspectType = aspectDef.type;
    const spec = orbSpecs[aspectType];

    if (!spec) continue;

    const orbDelta = Math.abs(normalizedDiff - aspectDef.angle);

    if (orbDelta <= spec.orb) {
      return {
        type: aspectType,
        orb: orbDelta,
      };
    }
  }

  return null;
}

/**
 * Calculate aspect strength (0-1) given orb and max orb
 * Utility function for various strength calculations
 */
export function calculateAspectStrength(orb: number, maxOrb: number): number {
  return Math.max(0, 1 - orb / maxOrb);
}

/**
 * Planet position for stellium detection
 */
export interface PlanetPosition {
  planet: string;
  longitude: number;
  sign?: string;
}

/**
 * Stellium - 3+ planets within tight orb
 */
export interface Stellium {
  planets: string[];
  sign?: string;
  averageLongitude: number;
  orb: number; // Maximum distance between planets
  strength: number; // Based on number of planets and tightness
}

/**
 * Detect stelliums (concentrations of 3+ planets)
 *
 * A stellium is traditionally defined as 3 or more planets within:
 * - Same zodiac sign (30° span), OR
 * - Within 8° orb (tight conjunction)
 *
 * @param planets - Array of planet positions with longitudes
 * @param maxOrb - Maximum orb to consider (default 8°)
 * @param minPlanets - Minimum planets to form stellium (default 3)
 * @returns Array of detected stelliums
 *
 * @example
 * ```typescript
 * const planets = [
 *   { planet: 'sun', longitude: 45, sign: 'Taurus' },
 *   { planet: 'mercury', longitude: 50, sign: 'Taurus' },
 *   { planet: 'venus', longitude: 52, sign: 'Taurus' },
 * ];
 *
 * const stelliums = detectStelliums(planets);
 * // Returns: [{ planets: ['sun', 'mercury', 'venus'], sign: 'Taurus', ... }]
 * ```
 */
export function detectStelliums(
  planets: PlanetPosition[],
  maxOrb: number = 8,
  minPlanets: number = 3,
): Stellium[] {
  const stelliums: Stellium[] = [];

  // Sort planets by longitude for easier clustering
  const sortedPlanets = [...planets].sort((a, b) => a.longitude - b.longitude);

  // Track which planets are already in a stellium
  const usedPlanets = new Set<string>();

  // Check each planet as potential stellium start
  for (let i = 0; i < sortedPlanets.length; i++) {
    if (usedPlanets.has(sortedPlanets[i].planet)) continue;

    const cluster: PlanetPosition[] = [sortedPlanets[i]];
    const startLongitude = sortedPlanets[i].longitude;

    // Find planets within orb
    for (let j = i + 1; j < sortedPlanets.length; j++) {
      const diff = normalizeAngleDiff(startLongitude, sortedPlanets[j].longitude);

      if (diff <= maxOrb) {
        cluster.push(sortedPlanets[j]);
      } else {
        break; // Planets are sorted, so no point checking further
      }
    }

    // If we have enough planets for a stellium
    if (cluster.length >= minPlanets) {
      const planetNames = cluster.map((p) => p.planet);

      // Calculate average longitude
      const avgLon =
        cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;

      // Calculate maximum spread (orb)
      const minLon = Math.min(...cluster.map((p) => p.longitude));
      const maxLon = Math.max(...cluster.map((p) => p.longitude));
      const spread = maxLon - minLon;

      // Calculate strength (more planets + tighter = stronger)
      // Base strength from number of planets (3=1.0, 4=1.5, 5=2.0, etc.)
      const countStrength = (cluster.length - 2) * 0.5;
      // Tightness strength (0° = 1.0, 8° = 0.0)
      const tightnessStrength = 1 - spread / maxOrb;
      const totalStrength = countStrength * (0.5 + tightnessStrength * 0.5);

      // Determine sign (use most common sign if available)
      let sign: string | undefined;
      if (cluster[0].sign) {
        const signCounts: Record<string, number> = {};
        cluster.forEach((p) => {
          if (p.sign) {
            signCounts[p.sign] = (signCounts[p.sign] || 0) + 1;
          }
        });
        sign = Object.keys(signCounts).reduce((a, b) =>
          signCounts[a] > signCounts[b] ? a : b
        );
      }

      stelliums.push({
        planets: planetNames,
        sign,
        averageLongitude: avgLon,
        orb: spread,
        strength: totalStrength,
      });

      // Mark planets as used
      planetNames.forEach((p) => usedPlanets.add(p));
    }
  }

  // Sort stelliums by strength (strongest first)
  return stelliums.sort((a, b) => b.strength - a.strength);
}

/**
 * Check if a natal chart has any stelliums
 */
export function hasStellium(planets: PlanetPosition[], maxOrb: number = 8): boolean {
  return detectStelliums(planets, maxOrb).length > 0;
}

/**
 * Lunar phase types
 */
export type LunarPhase =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

/**
 * Lunar phase information
 */
export interface LunarPhaseInfo {
  phase: LunarPhase;
  phaseAngle: number; // 0-360°, elongation from Sun
  illumination: number; // 0-1, percentage of visible disc
  description: string;
  emoji: string;
}

/**
 * Calculate lunar phase from Sun and Moon longitudes
 *
 * @param sunLongitude - Sun's ecliptic longitude (0-360°)
 * @param moonLongitude - Moon's ecliptic longitude (0-360°)
 * @returns LunarPhaseInfo with phase name, angle, and illumination
 *
 * @example
 * ```typescript
 * const phase = calculateLunarPhase(45, 225); // 180° = Full Moon
 * // Returns: { phase: 'full_moon', phaseAngle: 180, illumination: 1.0, ... }
 * ```
 */
export function calculateLunarPhase(
  sunLongitude: number,
  moonLongitude: number,
): LunarPhaseInfo {
  // Calculate elongation (angular distance from Sun to Moon)
  let phaseAngle = moonLongitude - sunLongitude;

  // Normalize to 0-360 range
  if (phaseAngle < 0) {
    phaseAngle += 360;
  }
  phaseAngle = phaseAngle % 360;

  // Calculate illumination (0 = New Moon, 1 = Full Moon)
  // Illumination = (1 - cos(phase angle)) / 2
  const illumination = (1 - Math.cos((phaseAngle * Math.PI) / 180)) / 2;

  // Determine phase name based on angle
  let phase: LunarPhase;
  let description: string;
  let emoji: string;

  if (phaseAngle < 22.5 || phaseAngle >= 337.5) {
    phase = 'new_moon';
    description = 'New Moon';
    emoji = '🌑';
  } else if (phaseAngle < 67.5) {
    phase = 'waxing_crescent';
    description = 'Waxing Crescent';
    emoji = '🌒';
  } else if (phaseAngle < 112.5) {
    phase = 'first_quarter';
    description = 'First Quarter';
    emoji = '🌓';
  } else if (phaseAngle < 157.5) {
    phase = 'waxing_gibbous';
    description = 'Waxing Gibbous';
    emoji = '🌔';
  } else if (phaseAngle < 202.5) {
    phase = 'full_moon';
    description = 'Full Moon';
    emoji = '🌕';
  } else if (phaseAngle < 247.5) {
    phase = 'waning_gibbous';
    description = 'Waning Gibbous';
    emoji = '🌖';
  } else if (phaseAngle < 292.5) {
    phase = 'last_quarter';
    description = 'Last Quarter';
    emoji = '🌗';
  } else {
    phase = 'waning_crescent';
    description = 'Waning Crescent';
    emoji = '🌘';
  }

  return {
    phase,
    phaseAngle,
    illumination,
    description,
    emoji,
  };
}

/**
 * Get lunar phase interpretation for horoscopes
 *
 * @param phase - Lunar phase type
 * @param locale - Language locale (ru, en, es)
 * @returns Interpretation text for the lunar phase
 */
export function getLunarPhaseInterpretation(
  phase: LunarPhase,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const interpretations: Record<LunarPhase, Record<string, string>> = {
    new_moon: {
      ru: 'Новолуние — время новых начинаний и посева семян будущего. Идеальный период для постановки целей и планирования.',
      en: 'New Moon — time for new beginnings and planting seeds for the future. Perfect period for setting goals and planning.',
      es: 'Luna Nueva — tiempo para nuevos comienzos y sembrar semillas para el futuro. Período perfecto para establecer metas y planificar.',
    },
    waxing_crescent: {
      ru: 'Растущая луна (серп) — время активных действий и реализации планов. Энергия растет, используйте её для движения вперёд.',
      en: 'Waxing Crescent — time for active actions and implementing plans. Energy is growing, use it to move forward.',
      es: 'Luna Creciente — tiempo para acciones activas e implementar planes. La energía crece, úsala para avanzar.',
    },
    first_quarter: {
      ru: 'Первая четверть — время преодоления препятствий и принятия решений. Могут возникнуть вызовы, требующие действий.',
      en: 'First Quarter — time to overcome obstacles and make decisions. Challenges may arise requiring action.',
      es: 'Cuarto Creciente — tiempo para superar obstáculos y tomar decisiones. Pueden surgir desafíos que requieren acción.',
    },
    waxing_gibbous: {
      ru: 'Растущая луна (выпуклая) — время доработки и совершенствования. Энергия на пике, финальный рывок перед кульминацией.',
      en: 'Waxing Gibbous — time for refinement and improvement. Energy is peaking, final push before culmination.',
      es: 'Luna Gibosa Creciente — tiempo para refinamiento y mejora. La energía está en su punto máximo, empuje final antes de la culminación.',
    },
    full_moon: {
      ru: 'Полнолуние — пик эмоциональной энергии и озарений. Время завершения проектов, празднования достижений и отпускания старого.',
      en: 'Full Moon — peak of emotional energy and insights. Time to complete projects, celebrate achievements, and release the old.',
      es: 'Luna Llena — pico de energía emocional e insights. Tiempo para completar proyectos, celebrar logros y liberar lo viejo.',
    },
    waning_gibbous: {
      ru: 'Убывающая луна (выпуклая) — время благодарности и передачи знаний. Делитесь опытом и помогайте другим.',
      en: 'Waning Gibbous — time for gratitude and sharing knowledge. Share experience and help others.',
      es: 'Luna Gibosa Menguante — tiempo para gratitud y compartir conocimiento. Comparte experiencia y ayuda a otros.',
    },
    last_quarter: {
      ru: 'Последняя четверть — время освобождения от ненужного и переоценки. Отпустите то, что больше не служит вам.',
      en: 'Last Quarter — time to release what no longer serves and reassess. Let go of what doesn\'t serve you anymore.',
      es: 'Cuarto Menguante — tiempo para liberar lo que ya no sirve y reevaluar. Deja ir lo que ya no te sirve.',
    },
    waning_crescent: {
      ru: 'Убывающая луна (серп) — время отдыха, восстановления и внутренней работы. Готовьтесь к новому циклу через медитацию и рефлексию.',
      en: 'Waning Crescent — time for rest, recovery, and inner work. Prepare for new cycle through meditation and reflection.',
      es: 'Luna Menguante — tiempo para descanso, recuperación y trabajo interior. Prepárate para un nuevo ciclo a través de la meditación y reflexión.',
    },
  };

  return interpretations[phase][locale] || interpretations[phase]['ru'];
}

/**
 * Part of Fortune calculation result
 */
export interface PartOfFortune {
  longitude: number; // Ecliptic longitude (0-360°)
  sign: string; // Zodiac sign
  house?: number; // House number (1-12)
  description: string;
}

/**
 * Calculate Part of Fortune (Pars Fortunae / Lot of Fortune)
 *
 * Traditional formula:
 * - Day birth: Ascendant + Moon - Sun
 * - Night birth: Ascendant + Sun - Moon
 *
 * @param ascendantLongitude - Ascendant longitude (0-360°)
 * @param sunLongitude - Sun longitude (0-360°)
 * @param moonLongitude - Moon longitude (0-360°)
 * @param isDayBirth - True if birth during day (Sun above horizon)
 * @returns Part of Fortune with longitude, sign, and description
 *
 * @example
 * ```typescript
 * const pof = calculatePartOfFortune(45, 120, 200, true);
 * // Day birth: 45 + 200 - 120 = 125° (Leo)
 * ```
 */
export function calculatePartOfFortune(
  ascendantLongitude: number,
  sunLongitude: number,
  moonLongitude: number,
  isDayBirth: boolean = true,
): PartOfFortune {
  let longitude: number;

  if (isDayBirth) {
    // Day birth formula: ASC + Moon - Sun
    longitude = ascendantLongitude + moonLongitude - sunLongitude;
  } else {
    // Night birth formula: ASC + Sun - Moon
    longitude = ascendantLongitude + sunLongitude - moonLongitude;
  }

  // Normalize to 0-360 range
  longitude = longitude % 360;
  if (longitude < 0) {
    longitude += 360;
  }

  // Determine zodiac sign (30° per sign)
  const signs = [
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
  ];
  const signIndex = Math.floor(longitude / 30);
  const sign = signs[signIndex];

  return {
    longitude,
    sign,
    description: `Part of Fortune in ${sign}`,
  };
}

/**
 * Get Part of Fortune interpretation
 *
 * @param sign - Zodiac sign where Part of Fortune is located
 * @param locale - Language locale (ru, en, es)
 * @returns Interpretation text for Part of Fortune in the sign
 */
export function getPartOfFortuneInterpretation(
  sign: string,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const interpretations: Record<string, Record<string, string>> = {
    Aries: {
      ru: 'Парс Фортуны в Овне: Успех через инициативу, лидерство и независимость. Счастье приходит через действие и самоутверждение.',
      en: 'Part of Fortune in Aries: Success through initiative, leadership, and independence. Happiness comes through action and self-assertion.',
      es: 'Parte de la Fortuna en Aries: Éxito a través de la iniciativa, el liderazgo y la independencia. La felicidad llega a través de la acción y la autoafirmación.',
    },
    Taurus: {
      ru: 'Парс Фортуны в Тельце: Успех через стабильность, материальную безопасность и природную связь. Счастье в накоплении и комфорте.',
      en: 'Part of Fortune in Taurus: Success through stability, material security, and connection to nature. Happiness in accumulation and comfort.',
      es: 'Parte de la Fortuna en Tauro: Éxito a través de la estabilidad, la seguridad material y la conexión con la naturaleza. Felicidad en la acumulación y el confort.',
    },
    Gemini: {
      ru: 'Парс Фортуны в Близнецах: Успех через коммуникацию, обучение и разнообразие. Счастье в обмене идеями и связях.',
      en: 'Part of Fortune in Gemini: Success through communication, learning, and variety. Happiness in exchanging ideas and connections.',
      es: 'Parte de la Fortuna en Géminis: Éxito a través de la comunicación, el aprendizaje y la variedad. Felicidad en el intercambio de ideas y conexiones.',
    },
    Cancer: {
      ru: 'Парс Фортуны в Раке: Успех через семью, заботу и эмоциональную безопасность. Счастье в домашнем очаге и близких отношениях.',
      en: 'Part of Fortune in Cancer: Success through family, nurturing, and emotional security. Happiness in home and close relationships.',
      es: 'Parte de la Fortuna en Cáncer: Éxito a través de la familia, el cuidado y la seguridad emocional. Felicidad en el hogar y las relaciones cercanas.',
    },
    Leo: {
      ru: 'Парс Фортуны во Льве: Успех через творчество, самовыражение и признание. Счастье в том, чтобы сиять и вдохновлять других.',
      en: 'Part of Fortune in Leo: Success through creativity, self-expression, and recognition. Happiness in shining and inspiring others.',
      es: 'Parte de la Fortuna en Leo: Éxito a través de la creatividad, la autoexpresión y el reconocimiento. Felicidad al brillar e inspirar a otros.',
    },
    Virgo: {
      ru: 'Парс Фортуны в Деве: Успех через служение, совершенствование и внимание к деталям. Счастье в порядке и полезной работе.',
      en: 'Part of Fortune in Virgo: Success through service, improvement, and attention to detail. Happiness in order and useful work.',
      es: 'Parte de la Fortuna en Virgo: Éxito a través del servicio, la mejora y la atención al detalle. Felicidad en el orden y el trabajo útil.',
    },
    Libra: {
      ru: 'Парс Фортуны в Весах: Успех через партнёрство, гармонию и справедливость. Счастье в балансе и красивых отношениях.',
      en: 'Part of Fortune in Libra: Success through partnership, harmony, and justice. Happiness in balance and beautiful relationships.',
      es: 'Parte de la Fortuna en Libra: Éxito a través de la asociación, la armonía y la justicia. Felicidad en el equilibrio y las relaciones hermosas.',
    },
    Scorpio: {
      ru: 'Парс Фортуны в Скорпионе: Успех через трансформацию, глубину и психологическую работу. Счастье в личной силе и возрождении.',
      en: 'Part of Fortune in Scorpio: Success through transformation, depth, and psychological work. Happiness in personal power and rebirth.',
      es: 'Parte de la Fortuna en Escorpio: Éxito a través de la transformación, la profundidad y el trabajo psicológico. Felicidad en el poder personal y el renacimiento.',
    },
    Sagittarius: {
      ru: 'Парс Фортуны в Стрельце: Успех через путешествия, философию и расширение горизонтов. Счастье в свободе и приключениях.',
      en: 'Part of Fortune in Sagittarius: Success through travel, philosophy, and expanding horizons. Happiness in freedom and adventure.',
      es: 'Parte de la Fortuna en Sagitario: Éxito a través de los viajes, la filosofía y la expansión de horizontes. Felicidad en la libertad y la aventura.',
    },
    Capricorn: {
      ru: 'Парс Фортуны в Козероге: Успех через дисциплину, амбиции и достижения. Счастье в карьере и признании авторитета.',
      en: 'Part of Fortune in Capricorn: Success through discipline, ambition, and achievements. Happiness in career and recognition of authority.',
      es: 'Parte de la Fortuna en Capricornio: Éxito a través de la disciplina, la ambición y los logros. Felicidad en la carrera y el reconocimiento de la autoridad.',
    },
    Aquarius: {
      ru: 'Парс Фортуны в Водолее: Успех через инновации, дружбу и гуманитарную деятельность. Счастье в свободе мышления и уникальности.',
      en: 'Part of Fortune in Aquarius: Success through innovation, friendship, and humanitarian work. Happiness in freedom of thought and uniqueness.',
      es: 'Parte de la Fortuna en Acuario: Éxito a través de la innovación, la amistad y el trabajo humanitario. Felicidad en la libertad de pensamiento y la singularidad.',
    },
    Pisces: {
      ru: 'Парс Фортуны в Рыбах: Успех через сострадание, творчество и духовность. Счастье в служении и трансцендентных переживаниях.',
      en: 'Part of Fortune in Pisces: Success through compassion, creativity, and spirituality. Happiness in service and transcendent experiences.',
      es: 'Parte de la Fortuna en Piscis: Éxito a través de la compasión, la creatividad y la espiritualidad. Felicidad en el servicio y las experiencias trascendentes.',
    },
  };

  return (
    interpretations[sign]?.[locale] ||
    interpretations[sign]?.['ru'] ||
    `Part of Fortune in ${sign}`
  );
}

/**
 * Determine if birth was during day or night
 * Day birth = Sun above horizon (in houses 7-12)
 * Night birth = Sun below horizon (in houses 1-6)
 *
 * @param sunLongitude - Sun's longitude
 * @param ascendantLongitude - Ascendant longitude
 * @returns True if day birth, false if night birth
 */
export function isDayBirth(sunLongitude: number, ascendantLongitude: number): boolean {
  // Calculate difference between Sun and Ascendant
  let diff = sunLongitude - ascendantLongitude;

  // Normalize to 0-360 range
  if (diff < 0) {
    diff += 360;
  }
  diff = diff % 360;

  // If Sun is 0-180° ahead of ASC, it's above horizon (day birth)
  return diff >= 0 && diff < 180;
}
