// backend/src/modules/shared/astro-text/en/data.ts
// EN locale dictionaries for astro-text module
// Note: PeriodFrame keys remain RU ('Сегодня', 'Завтра', 'На этой неделе', 'В этом месяце')
// to keep compatibility with current pipeline. Text content is in English.

import type { PlanetKey, Sign, AspectType, PeriodFrame, Tone } from '../types';

export const ASPECT_NAMES_EN: Record<AspectType, string> = {
  conjunction: 'in conjunction with',
  opposition: 'in opposition to',
  trine: 'in trine to',
  square: 'in square to',
  sextile: 'in sextile to',
};

// Minimal planet-in-sign phrases for all planets (generic but distinct).
export const PLANET_IN_SIGN_EN: Partial<
  Record<PlanetKey, Partial<Record<Sign, string>>>
> = {
  sun: {
    Aries: 'Sun in Aries brings initiative, vitality, and leadership.',
    Taurus:
      'Sun in Taurus brings consistency, practicality, and appreciation of comfort.',
    Gemini: 'Sun in Gemini brings curiosity, adaptability, and communication.',
    Cancer: 'Sun in Cancer brings sensitivity, care, and emphasis on home.',
    Leo: 'Sun in Leo brings confidence, creativity, and radiance.',
    Virgo: 'Sun in Virgo brings analysis, precision, and service.',
    Libra: 'Sun in Libra brings harmony, fairness, and diplomacy.',
    Scorpio: 'Sun in Scorpio brings intensity, depth, and transformation.',
    Sagittarius: 'Sun in Sagittarius brings openness, philosophy, and growth.',
    Capricorn:
      'Sun in Capricorn brings responsibility, ambition, and structure.',
    Aquarius: 'Sun in Aquarius brings originality, independence, and ideals.',
    Pisces: 'Sun in Pisces brings imagination, intuition, and compassion.',
  },
  moon: {
    Aries: 'Moon in Aries intensifies emotional spontaneity and passion.',
    Taurus: 'Moon in Taurus stabilizes emotions and loves comfort.',
    Gemini: 'Moon in Gemini brings emotional flexibility and curiosity.',
    Cancer: 'Moon in Cancer heightens sensitivity and intuition.',
    Leo: 'Moon in Leo adds generosity and a need for recognition.',
    Virgo: 'Moon in Virgo adds practicality and care in details.',
    Libra: 'Moon in Libra seeks balance and harmony in relationships.',
    Scorpio: 'Moon in Scorpio deepens feelings and intensity.',
    Sagittarius: 'Moon in Sagittarius uplifts mood and desire for freedom.',
    Capricorn: 'Moon in Capricorn adds restraint and responsibility.',
    Aquarius: 'Moon in Aquarius values independence and originality.',
    Pisces: 'Moon in Pisces raises empathy and dreaminess.',
  },
  mercury: {
    Aries: 'Mercury in Aries quickens thought and direct speech.',
    Taurus: 'Mercury in Taurus brings practicality and consistency of thought.',
    Gemini: 'Mercury in Gemini boosts communication and versatility.',
    Cancer: 'Mercury in Cancer adds intuition and emotional memory.',
    Leo: 'Mercury in Leo expresses with confidence and flair.',
    Virgo: 'Mercury in Virgo refines analysis and attention to detail.',
    Libra: 'Mercury in Libra seeks balance and fairness in dialogue.',
    Scorpio:
      'Mercury in Scorpio penetrates to the core and speaks with intensity.',
    Sagittarius:
      'Mercury in Sagittarius broadens perspectives and philosophical thinking.',
    Capricorn: 'Mercury in Capricorn structures ideas and plans strategically.',
    Aquarius: 'Mercury in Aquarius innovates and thinks unconventionally.',
    Pisces: 'Mercury in Pisces imagines, empathizes, and connects intuitively.',
  },
  venus: {
    Aries: 'Venus in Aries loves boldly and directly.',
    Taurus: 'Venus in Taurus values stability, comfort, and sensuality.',
    Gemini: 'Venus in Gemini enjoys lightness, curiosity, and conversation.',
    Cancer: 'Venus in Cancer nurtures closeness and safety.',
    Leo: 'Venus in Leo loves generously and theatrically.',
    Virgo: 'Venus in Virgo cares through practical acts and attention.',
    Libra: 'Venus in Libra seeks harmony, beauty, and cooperation.',
    Scorpio: 'Venus in Scorpio bonds intensely and transforms through love.',
    Sagittarius: 'Venus in Sagittarius loves freedom and shared adventures.',
    Capricorn: 'Venus in Capricorn commits steadily and values reliability.',
    Aquarius: 'Venus in Aquarius values independence and friendly love.',
    Pisces: 'Venus in Pisces loves compassionately and poetically.',
  },
  mars: {
    Aries: 'Mars in Aries acts fast, direct, and boldly.',
    Taurus: 'Mars in Taurus acts steadily and persistently.',
    Gemini: 'Mars in Gemini acts flexibly and through ideas.',
    Cancer: 'Mars in Cancer acts protectively and indirectly.',
    Leo: 'Mars in Leo acts proudly and creatively.',
    Virgo: 'Mars in Virgo acts precisely and efficiently.',
    Libra: 'Mars in Libra acts diplomatically and cooperatively.',
    Scorpio: 'Mars in Scorpio acts intensely and strategically.',
    Sagittarius: 'Mars in Sagittarius acts expansively and optimistically.',
    Capricorn: 'Mars in Capricorn acts disciplined and goal-oriented.',
    Aquarius: 'Mars in Aquarius acts innovatively and collectively.',
    Pisces: 'Mars in Pisces acts sensitively and inspired.',
  },
  jupiter: {
    Aries: 'Jupiter in Aries expands courage and initiative.',
    Taurus: 'Jupiter in Taurus expands stability and material growth.',
    Gemini: 'Jupiter in Gemini expands learning and communication.',
    Cancer: 'Jupiter in Cancer expands care and family values.',
    Leo: 'Jupiter in Leo expands creativity and self-expression.',
    Virgo: 'Jupiter in Virgo expands service and craftsmanship.',
    Libra: 'Jupiter in Libra expands fairness and partnerships.',
    Scorpio: 'Jupiter in Scorpio expands depth and transformation.',
    Sagittarius: 'Jupiter in Sagittarius expands horizons and faith.',
    Capricorn: 'Jupiter in Capricorn expands responsibility and results.',
    Aquarius: 'Jupiter in Aquarius expands innovation and networks.',
    Pisces: 'Jupiter in Pisces expands compassion and imagination.',
  },
  saturn: {
    Aries: 'Saturn in Aries demands disciplined initiative.',
    Taurus: 'Saturn in Taurus demands stable resource management.',
    Gemini: 'Saturn in Gemini demands structured learning and speech.',
    Cancer: 'Saturn in Cancer demands emotional maturity and boundaries.',
    Leo: 'Saturn in Leo demands responsibility in self-expression.',
    Virgo: 'Saturn in Virgo demands precision and practical service.',
    Libra: 'Saturn in Libra demands balanced commitment and fairness.',
    Scorpio: 'Saturn in Scorpio demands integrity in power and depth.',
    Sagittarius:
      'Saturn in Sagittarius demands responsibility in beliefs and expansion.',
    Capricorn: 'Saturn in Capricorn structures ambition and leadership.',
    Aquarius: 'Saturn in Aquarius structures innovation and community.',
    Pisces: 'Saturn in Pisces structures compassion and imagination.',
  },
  uranus: {
    Aries: 'Uranus in Aries electrifies initiative and breakthroughs.',
    Taurus: 'Uranus in Taurus disrupts stability and values for renewal.',
    Gemini: 'Uranus in Gemini innovates ideas and communication.',
    Cancer: 'Uranus in Cancer awakens new emotional patterns.',
    Leo: 'Uranus in Leo liberates creativity and self-expression.',
    Virgo: 'Uranus in Virgo modernizes methods and health routines.',
    Libra: 'Uranus in Libra revolutionizes relationships and fairness.',
    Scorpio: 'Uranus in Scorpio intensifies transformation and truth.',
    Sagittarius: 'Uranus in Sagittarius frees beliefs and expands horizons.',
    Capricorn: 'Uranus in Capricorn reforms structures and authority.',
    Aquarius: 'Uranus in Aquarius amplifies originality and networks.',
    Pisces: 'Uranus in Pisces dissolves limits and inspires intuition.',
  },
  neptune: {
    Aries: 'Neptune in Aries spiritualizes will and action.',
    Taurus: 'Neptune in Taurus dissolves rigid values and refines senses.',
    Gemini: 'Neptune in Gemini inspires poetic thinking and flexible views.',
    Cancer: 'Neptune in Cancer heightens empathy and longing for belonging.',
    Leo: 'Neptune in Leo idealizes creativity and heart expression.',
    Virgo: 'Neptune in Virgo refines service and compassionate details.',
    Libra: 'Neptune in Libra idealizes harmony and shared beauty.',
    Scorpio: 'Neptune in Scorpio deepens mysteries and healing.',
    Sagittarius: 'Neptune in Sagittarius inspires vision and faith.',
    Capricorn: 'Neptune in Capricorn dissolves stale rules for higher order.',
    Aquarius: 'Neptune in Aquarius dreams of humane innovation.',
    Pisces: 'Neptune in Pisces amplifies imagination and unity.',
  },
  pluto: {
    Aries: 'Pluto in Aries transforms identity and raw drive.',
    Taurus: 'Pluto in Taurus transforms values and material attachments.',
    Gemini: 'Pluto in Gemini transforms thought and information power.',
    Cancer: 'Pluto in Cancer transforms family and emotional roots.',
    Leo: 'Pluto in Leo transforms creative power and personal pride.',
    Virgo: 'Pluto in Virgo transforms work, health, and analysis.',
    Libra: 'Pluto in Libra transforms relationships and social contracts.',
    Scorpio: 'Pluto in Scorpio empowers regeneration and truth.',
    Sagittarius:
      'Pluto in Sagittarius transforms belief systems and expansion.',
    Capricorn: 'Pluto in Capricorn transforms institutions and authority.',
    Aquarius: 'Pluto in Aquarius transforms networks and collective progress.',
    Pisces: 'Pluto in Pisces transforms spirituality and the unseen.',
  },
};

export const ASCENDANT_EN: Partial<Record<Sign, string>> = {
  Aries: 'Ascendant in Aries appears bold, direct, and energetic.',
  Taurus: 'Ascendant in Taurus appears steady, practical, and grounded.',
  Gemini: 'Ascendant in Gemini appears lively, communicative, and curious.',
  Cancer: 'Ascendant in Cancer appears caring, sensitive, and intuitive.',
  Leo: 'Ascendant in Leo appears bright, confident, and generous.',
  Virgo: 'Ascendant in Virgo appears neat, attentive, and practical.',
  Libra: 'Ascendant in Libra appears balanced, aesthetic, and diplomatic.',
  Scorpio: 'Ascendant in Scorpio appears intense, deep, and magnetic.',
  Sagittarius: 'Ascendant in Sagittarius appears open, direct, and optimistic.',
  Capricorn:
    'Ascendant in Capricorn appears responsible, reserved, and ambitious.',
  Aquarius:
    'Ascendant in Aquarius appears original, independent, and friendly.',
  Pisces: 'Ascendant in Pisces appears gentle, inspired, and empathetic.',
};

export const HOUSES_THEMES_EN: Record<number, string> = {
  1: 'personality and self-expression',
  2: 'finances and values',
  3: 'communication and learning',
  4: 'home and family',
  5: 'creativity and romance',
  6: 'health and service',
  7: 'partnership and marriage',
  8: 'transformation and shared resources',
  9: 'philosophy and journeys',
  10: 'career and public standing',
  11: 'friendship and aspirations',
  12: 'subconscious and spirituality',
};

export const HOUSES_AREAS_EN: Record<number, string> = {
  1: 'Personality',
  2: 'Finances',
  3: 'Communication',
  4: 'Home and Family',
  5: 'Creativity',
  6: 'Health',
  7: 'Partnership',
  8: 'Transformation',
  9: 'Journeys',
  10: 'Career',
  11: 'Friendship',
  12: 'Spirituality',
};

export const GENERAL_TEMPLATES_EN: Record<
  PeriodFrame,
  Record<Tone, string[]>
> = {
  Сегодня: {
    positive: [
      'Today is supportive: planetary energy opens favorable opportunities.',
    ],
    neutral: [
      'Today is balanced: keep a steady pace and follow your intuition.',
    ],
    challenging: [
      'Today requires patience: treat obstacles as growth lessons.',
    ],
  },
  Завтра: {
    positive: ['Tomorrow brings inspiration and positive movement.'],
    neutral: ['Tomorrow is steady: plan and prepare with care.'],
    challenging: ['Tomorrow may be testing: proceed mindfully.'],
  },
  'На этой неделе': {
    positive: ['This week supports progress and meaningful steps.'],
    neutral: ['This week is stable: focus on priorities.'],
    challenging: ['This week may challenge your balance: be patient.'],
  },
  'В этом месяце': {
    positive: ['This month favors long-term projects and grounded growth.'],
    neutral: ['This month moves steadily: refine routines.'],
    challenging: ['This month requires resilience and careful pacing.'],
  },
};

export const LOVE_PERIOD_PHRASES_EN: Record<
  PeriodFrame,
  { positive: string[]; neutral: string[]; negative: string[] }
> = {
  Сегодня: {
    positive: [
      'creates a romantic atmosphere',
      'strengthens mutual attraction',
      'invites tenderness and care',
      'aligns you for warm dialogue',
    ],
    neutral: [
      'influences your mood',
      'encourages calm exchanges',
      'invites honest conversation',
      'reminds you to be attentive',
    ],
    negative: [
      'creates tension',
      'can heighten sensitivity',
      'demands restraint in reactions',
      'tests the harmony of bonds',
    ],
  },
  Завтра: {
    positive: [
      'promises pleasant encounters',
      'favors reconciliations and confessions',
      'boosts charm and mutual interest',
      'supports sincere connection',
    ],
    neutral: [
      'facilitates communication',
      'helps you hear each other',
      'promotes gentle compromises',
      'invites quiet closeness',
    ],
    negative: [
      'may trigger misunderstandings',
      'requires patience and tact',
      'reminds about personal boundaries',
      'can reveal unspoken expectations',
    ],
  },
  'На этой неделе': {
    positive: [
      'opens perspectives for relationships',
      'supports deepening trust',
      'encourages shared plans',
      'brings warm gestures of attention',
    ],
    neutral: [
      'maintains stability in a couple',
      'encourages balance of roles',
      'calls for moderation and care',
      'aligns you to a common rhythm',
    ],
    negative: [
      'demands work on the relationship',
      'raises questions of mutual support',
      'highlights misalignments',
      'tests agreements for resilience',
    ],
  },
  'В этом месяце': {
    positive: [
      'creates favorable conditions for love',
      'supports long-term harmony',
      'strengthens mutual understanding',
      'gives time for warm traditions',
    ],
    neutral: [
      'promotes relationship development',
      'sets a mature dialogue',
      'encourages joint decisions',
      'supports a steady rhythm',
    ],
    negative: [
      'calls for priority re-evaluation',
      'invites honesty and responsibility',
      'may require a pause for restoration',
      'suggests the need for boundaries',
    ],
  },
};

export const CAREER_PERIOD_ACTIONS_EN: Record<
  PeriodFrame,
  { jupiter: string[]; saturn: string[]; mars: string[]; neutral: string[] }
> = {
  Сегодня: {
    jupiter: ['today is favorable for', 'today opens opportunities for'],
    saturn: ['today requires', 'today is important to focus on'],
    mars: ['today brings energy for', 'today invites active push in'],
    neutral: ['today continue working on', 'today maintain stable pace in'],
  },
  Завтра: {
    jupiter: [
      'tomorrow opens possibilities for',
      'tomorrow is good to expand in',
    ],
    saturn: [
      'tomorrow requires planning for',
      'tomorrow organize and systematize',
    ],
    mars: ['tomorrow brings impulse to', 'tomorrow you can speed up'],
    neutral: ['tomorrow focus on', 'tomorrow continue refining'],
  },
  'На этой неделе': {
    jupiter: ['this week favors growth in', 'this week supports scaling of'],
    saturn: ['this week requires', 'this week is for structuring'],
    mars: ['this week adds drive for', 'this week enables a breakthrough in'],
    neutral: [
      'this week suits steady work on',
      'this week consolidates results in',
    ],
  },
  'В этом месяце': {
    jupiter: [
      'this month opens growth in',
      'this month supports strategic initiatives in',
    ],
    saturn: ['this month calls for', 'this month is for discipline in'],
    mars: [
      'this month adds energy for progress in',
      'this month strengthens momentum in',
    ],
    neutral: [
      'this month favors development of',
      'this month improves processes in',
    ],
  },
};

export const ADVICE_POOLS_EN: Record<PeriodFrame, string[]> = {
  Сегодня: [
    'Today trust your intuition and take the first step.',
    'Today stay open to new experiences and surprises.',
    'Today practice gratitude for what you have.',
  ],
  Завтра: [
    'Tomorrow start with clear intentions and a positive tone.',
    'Tomorrow be flexible and ready for opportunities.',
    'Tomorrow spend time planning important tasks.',
  ],
  'На этой неделе': [
    'This week balance work and rest.',
    'This week strengthen your strengths and talents.',
    'This week foster meaningful relationships.',
  ],
  'В этом месяце': [
    'This month focus on long-term goals with patience.',
    'This month invest in learning and growth.',
    'This month build a solid foundation for future success.',
  ],
};

export const SIGN_COLORS_EN: Record<Sign, string[]> = {
  Aries: ['Red', 'Orange'],
  Taurus: ['Green', 'Pink'],
  Gemini: ['Yellow', 'Light Blue'],
  Cancer: ['Silver', 'White'],
  Leo: ['Gold', 'Orange'],
  Virgo: ['Brown', 'Beige'],
  Libra: ['Pink', 'Light Blue'],
  Scorpio: ['Burgundy', 'Black'],
  Sagittarius: ['Purple', 'Blue'],
  Capricorn: ['Gray', 'Green'],
  Aquarius: ['Sky Blue', 'Silver'],
  Pisces: ['Turquoise', 'Lavender'],
};

export const ASPECT_PAIR_TEMPLATES_EN: Partial<
  Record<
    AspectType,
    Partial<Record<PlanetKey, Partial<Record<PlanetKey, string>>>>
  >
> = {
  conjunction: {
    sun: {
      moon: 'Sun in conjunction with Moon unifies will and emotion—good for initiatives.',
    },
    venus: {
      mars: 'Venus conjunct Mars excites passion and creative momentum.',
    },
    jupiter: {
      pluto: 'Jupiter conjunct Pluto transforms growth with deep power.',
    },
  },
  trine: {
    mercury: {
      jupiter:
        'Mercury trine Jupiter brings clarity, learning, and opportunity.',
    },
    sun: {
      moon: 'Sun trine Moon supports emotional flow and clear intentions.',
    },
    venus: {
      jupiter: 'Venus trine Jupiter favors relationships, art, and generosity.',
    },
  },
  square: {
    mars: {
      saturn:
        'Mars square Saturn demands patience, discipline, and structured action.',
    },
    moon: {
      mars: 'Moon square Mars tests emotional control—mind impulses.',
    },
    saturn: {
      uranus:
        'Saturn square Uranus clashes stability with change—balance required.',
    },
  },
  opposition: {
    moon: {
      neptune:
        'Moon opposite Neptune blurs feelings—seek grounding and clarity.',
    },
    sun: {
      saturn: 'Sun opposite Saturn emphasizes responsibility and boundaries.',
    },
  },
  sextile: {
    mercury: {
      venus:
        'Mercury sextile Venus smooths conversations and creative collaboration.',
    },
    neptune: {
      pluto: 'Neptune sextile Pluto deepens insight and subtle transformation.',
    },
  },
};

export const ASCENDANT_META_EN: Partial<
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
    keywords: ['initiative', 'direct', 'energetic'],
    strengths: ['Courage', 'Quick response', 'Leadership'],
    challenges: ['Impulsiveness', 'Bluntness', 'Impatience'],
  },
  Taurus: {
    keywords: ['steady', 'practical', 'reliable'],
    strengths: ['Endurance', 'Consistency', 'Sensuality'],
    challenges: ['Stubbornness', 'Routine preference', 'Slowness'],
  },
  Gemini: {
    keywords: ['communicative', 'flexible', 'curious'],
    strengths: ['Ease of contact', 'Quick mind', 'Adaptability'],
    challenges: ['Superficiality', 'Attention scatter', 'Inconstancy'],
  },
  Cancer: {
    keywords: ['sensitive', 'caring', 'intuitive'],
    strengths: ['Empathy', 'Care', 'Home comfort'],
    challenges: ['Vulnerability', 'Closure', 'Mood swings'],
  },
  Leo: {
    keywords: ['bright', 'generous', 'confident'],
    strengths: ['Charisma', 'Creativity', 'Magnanimity'],
    challenges: ['Dramatics', 'Pride', 'Need for recognition'],
  },
  Virgo: {
    keywords: ['neat', 'attentive', 'practical'],
    strengths: ['Systematicity', 'Service', 'Analyticity'],
    challenges: ['Criticism', 'Anxiety', 'Perfectionism'],
  },
  Libra: {
    keywords: ['diplomatic', 'aesthetic', 'balanced'],
    strengths: ['Tact', 'Agreement skills', 'Sense of measure'],
    challenges: [
      'Indecision',
      "Dependence on others' opinions",
      'Conflict avoidance',
    ],
  },
  Scorpio: {
    keywords: ['deep', 'magnetic', 'decisive'],
    strengths: ['Insight', 'Willpower', 'Resilience'],
    challenges: ['Suspicion', 'Jealousy', 'Bluntness'],
  },
  Sagittarius: {
    keywords: ['optimistic', 'direct', 'philosophical'],
    strengths: ['Broad outlook', 'Enthusiasm', 'Honesty'],
    challenges: ['Impulsiveness', 'Discipline lack', 'Superficiality'],
  },
  Capricorn: {
    keywords: ['responsible', 'ambitious', 'practical'],
    strengths: ['Discipline', 'Reliability', 'Strategic thinking'],
    challenges: ['Rigidity', 'Isolation', 'Overwork'],
  },
  Aquarius: {
    keywords: ['original', 'independent', 'humane'],
    strengths: ['Innovation', 'Friendliness', 'Objectivity'],
    challenges: ['Detachment', 'Stubbornness', 'Impracticality'],
  },
  Pisces: {
    keywords: ['dreamy', 'empathetic', 'creative'],
    strengths: ['Intuition', 'Empathy', 'Imagination'],
    challenges: ['Distraction', 'Self-sacrifice', 'Indecision'],
  },
};
