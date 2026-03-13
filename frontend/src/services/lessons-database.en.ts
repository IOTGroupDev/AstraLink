import { AstroLesson } from '../types/lessons';

export const ASTRO_LESSONS_EN: AstroLesson[] = [
  {
    id: 'basics_001',
    category: 'basics',
    title: 'What is a natal chart?',
    subtitle: 'A cosmic snapshot of your birth',
    icon: 'map',
    emoji: '🗺️',
    gradient: ['#8B5CF6', '#6366F1'],
    shortText:
      'A natal chart is a snapshot of the sky at the moment you were born. It shows where the planets, the Sun, and the Moon were at that time.',
    fullText:
      'A natal chart (birth horoscope) is your unique cosmic fingerprint. It is calculated from your date, time, and place of birth.\n\nThe chart shows the positions of all planets in zodiac signs and astrological houses. It is a personal cosmic GPS that helps you understand your talents, challenges, and life path.',
    keyPoints: [
      'Unique for each person',
      'Calculated by date, time, and place of birth',
      'Shows planets in signs and houses',
      'Does not change throughout life',
    ],
    example:
      'If you were born on May 15, 1990 at 14:30 in Moscow, your chart would show the Sun in Taurus, the Moon in Cancer, and the Ascendant in Virgo. That combination is what makes you unique!',
    quiz: {
      question: 'What do you need to know to calculate a natal chart?',
      options: [
        { text: 'Only the date of birth', isCorrect: false },
        { text: 'Date, time, and place of birth', isCorrect: true },
        { text: 'Only the zodiac sign', isCorrect: false },
        { text: 'Name and surname', isCorrect: false },
      ],
      hint: 'All parameters are required for accuracy',
    },
    difficulty: 'beginner',
    readTime: 60,
    order: 1,
    relatedLessons: ['basics_002', 'houses_001'],
  },
  {
    id: 'basics_002',
    category: 'basics',
    title: 'What are transits?',
    subtitle: 'Planets in motion',
    icon: 'planet',
    emoji: '🌍',
    gradient: ['#EC4899', '#F43F5E'],
    shortText:
      'Transits are the current movement of planets across the sky. When a transit planet forms an aspect to your natal chart, you feel its influence.',
    fullText:
      'Imagine: your natal chart is a photo of the sky at birth. Transits show where the planets are right now.\n\nWhen a moving planet touches an important point in your chart, it activates specific energies in your life. It is like the cosmos presses the buttons of your character.',
    keyPoints: [
      'Transits are constantly changing',
      'They affect everyone but in a personal way',
      'Slow planets (Saturn, Jupiter) bring long influences',
      'Fast planets (Moon, Mercury) bring short-term effects',
    ],
    example:
      'Transiting Saturn square your Sun may bring tests and lessons of responsibility for 1–2 years. Transiting Venus trine your Venus is a lucky day for love!',
    task: {
      type: 'check_transit',
      title: 'Check your transits',
      description:
        'Open the simulator and see which transits are active for you today',
      actionLabel: 'Open simulator',
      navigationTarget: 'Simulator',
    },
    difficulty: 'beginner',
    readTime: 75,
    order: 2,
    relatedLessons: ['aspects_001', 'transits_001'],
  },
  {
    id: 'basics_003',
    category: 'basics',
    title: 'Three main points of the chart',
    subtitle: 'Sun, Moon, Ascendant',
    icon: 'sunny',
    emoji: '☀️',
    gradient: ['#F59E0B', '#EAB308'],
    shortText:
      'The Sun is your ego and life force. The Moon is your emotions and subconscious. The Ascendant is your appearance and first impression.',
    fullText:
      'These are the three pillars of your personality:\n\n☀️ SUN — your core, ego, and life purpose. "I am"\n🌙 MOON — your emotions, needs, inner world. "I feel"\n⬆️ ASCENDANT — your mask, how others see you. "I appear"\n\nTogether they create the portrait of your personality.',
    keyPoints: [
      'Sun = your conscious personality',
      'Moon = your subconscious and emotions',
      'Ascendant = outer shell, behavior style',
      'All three are important for full self-understanding',
    ],
    example:
      'Sun in Aries (active leader), Moon in Cancer (sensitive inside), Ascendant in Capricorn (serious outside). Others see a serious person, but inside you are soft and sensitive, and your goal is to be a pioneer!',
    quiz: {
      question: 'What does the Ascendant show?',
      options: [
        { text: 'Your life purpose', isCorrect: false },
        { text: 'Your emotions', isCorrect: false },
        { text: 'How others perceive you', isCorrect: true },
        { text: 'Your zodiac sign', isCorrect: false },
      ],
    },
    difficulty: 'beginner',
    readTime: 80,
    order: 3,
  },
  {
    id: 'planets_001',
    category: 'planets',
    title: 'Sun: Ego and self-expression',
    subtitle: 'The center of your personality',
    icon: 'sunny',
    emoji: '☀️',
    gradient: ['#F59E0B', '#FBBF24'],
    shortText:
      'The Sun is your "I", ego, life force, and purpose. The Sun sign defines the core traits of your character.',
    fullText:
      'The Sun is the most important planet in astrology. It is your inner core and source of vitality.\n\nThe Sun shows:\n• Your essence and identity\n• How you express yourself in the world\n• Your life purpose\n• The source of creative energy\n\nThe sign where the Sun is located is your main zodiac sign.',
    keyPoints: [
      'Rules the sign Leo',
      'Symbolizes the masculine principle and the father',
      'Full cycle through the zodiac is 1 year',
      'Spends about 30 days in each sign',
    ],
    example:
      'Sun in Aries makes you an energetic leader. Sun in Taurus makes you calm and stable. Sun in Gemini makes you social and curious.',
    difficulty: 'beginner',
    readTime: 70,
    order: 1,
    relatedLessons: ['signs_001', 'basics_003'],
  },
  {
    id: 'planets_002',
    category: 'planets',
    title: 'Moon: Emotions and subconscious',
    subtitle: 'Your inner world',
    icon: 'moon',
    emoji: '🌙',
    gradient: ['#6366F1', '#8B5CF6'],
    shortText:
      'The Moon governs emotions, moods, instincts, and the subconscious. It is your inner child.',
    fullText:
      'The Moon is the second most important planet. If the Sun is who you are, the Moon is how you feel.\n\nThe Moon shows:\n• Your emotional needs\n• How you react to stress\n• What brings you comfort\n• Your habits and instincts\n• Your relationship with the mother',
    keyPoints: [
      'Rules the sign Cancer',
      'Symbolizes the feminine principle and the mother',
      'Full cycle through the zodiac is 28 days',
      'Spends ~2.5 days in each sign',
      'The fastest planet',
    ],
    example:
      'Moon in Aries — quick emotional reactions. Moon in Cancer — deeply sensitive. Moon in Capricorn — reserved in expressing emotions.',
    task: {
      type: 'find_in_chart',
      title: 'Find your Moon',
      description: 'Open "My Chart" and see which sign your Moon is in',
      actionLabel: 'Open chart',
      navigationTarget: 'Chart',
    },
    difficulty: 'beginner',
    readTime: 75,
    order: 2,
  },
  {
    id: 'planets_003',
    category: 'planets',
    title: 'Mercury: Communication and thinking',
    subtitle: 'How you think and speak',
    icon: 'chatbubbles',
    emoji: '💬',
    gradient: ['#10B981', '#14B8A6'],
    shortText:
      'Mercury rules communication, thinking, learning, and transport. It is your communication style.',
    fullText:
      'Mercury is the messenger of the gods, the planet of intellect and connection.\n\nMercury governs:\n• Communication and speech\n• Logical thinking\n• Learning and memory\n• Writing and reading\n• Transport and travel\n• Trade and agreements',
    keyPoints: [
      'Rules Gemini and Virgo',
      'Closest planet to the Sun',
      'Retrogrades 3–4 times a year',
      'Full cycle is about 88 days',
    ],
    example:
      'Mercury in Gemini — fast speech and multitasking. Mercury in Taurus — slow but thorough thinking.',
    difficulty: 'beginner',
    readTime: 65,
    order: 3,
    showConditions: {
      showOnTransit: 'mercury_retrograde',
    },
  },
  {
    id: 'planets_004',
    category: 'planets',
    title: 'Venus: Love and values',
    subtitle: 'What you love and value',
    icon: 'heart',
    emoji: '💕',
    gradient: ['#EC4899', '#EF4444'],
    shortText:
      'Venus governs love, beauty, money, and relationships. It shows what brings you pleasure.',
    fullText:
      'Venus is the goddess of love and beauty. It shows what you value and how you love.\n\nVenus governs:\n• Romantic love\n• Beauty and aesthetics\n• Money and values\n• Art and creativity\n• Social relationships\n• Pleasures',
    keyPoints: [
      'Rules Taurus and Libra',
      'Always close to the Sun (max 48°)',
      'Full cycle is about 225 days',
      'Morning and evening star',
    ],
    example:
      'Venus in Aries — passionate, impulsive love. Venus in Libra — harmony and partnership. Venus in Capricorn — serious, stable relationships.',
    difficulty: 'beginner',
    readTime: 70,
    order: 4,
  },
  {
    id: 'planets_005',
    category: 'planets',
    title: 'Mars: Action and energy',
    subtitle: 'Your warrior planet',
    icon: 'flame',
    emoji: '🔥',
    gradient: ['#EF4444', '#DC2626'],
    shortText:
      'Mars is the planet of action, energy, passion, and aggression. It is your will to win.',
    fullText:
      'Mars is the god of war, the planet of action and masculine energy.\n\nMars shows:\n• How you act\n• Your energy and drive\n• How you express anger\n• Sexuality (masculine)\n• How you achieve goals\n• Physical activity',
    keyPoints: [
      'Rules Aries (and Scorpio)',
      'Symbol of masculinity and will',
      'Full cycle is about 2 years',
      'Retrogrades once every 2 years',
    ],
    example:
      'Mars in Aries — direct, fast action. Mars in Cancer — protective, emotional energy. Mars in Capricorn — determination and endurance.',
    difficulty: 'beginner',
    readTime: 65,
    order: 5,
  },
  {
    id: 'planets_006',
    category: 'planets',
    title: 'Jupiter: Expansion and luck',
    subtitle: 'The great benefic',
    icon: 'gift',
    emoji: '🎁',
    gradient: ['#3B82F6', '#2563EB'],
    shortText:
      'Jupiter is the planet of growth, luck, wisdom, and abundance. It expands whatever it touches.',
    fullText:
      'Jupiter is the king of the gods, the largest planet and the great benefic.\n\nJupiter brings:\n• Luck and opportunities\n• Growth and expansion\n• Wisdom and knowledge\n• Optimism and faith\n• Abundance and generosity\n• Long-distance travel',
    keyPoints: [
      'Rules Sagittarius (and Pisces)',
      'The largest planet',
      'Full cycle is 12 years',
      'Spends about a year in each sign',
    ],
    example:
      'Jupiter transit through your 2nd house can bring financial luck. Jupiter through the 7th house — a favorable time for marriage.',
    difficulty: 'intermediate',
    readTime: 70,
    order: 6,
  },
  {
    id: 'planets_007',
    category: 'planets',
    title: 'Saturn: Structure and lessons',
    subtitle: 'The great teacher',
    icon: 'school',
    emoji: '📚',
    gradient: ['#6B7280', '#4B5563'],
    shortText:
      'Saturn is the planet of limitations, discipline, and responsibility. It teaches through tests.',
    fullText:
      'Saturn is the god of time, the planet of karma and life lessons.\n\nSaturn brings:\n• Discipline and structure\n• Responsibility and maturity\n• Limitations and obstacles\n• Lessons and tests\n• Patience and endurance\n• Long-term achievements',
    keyPoints: [
      'Rules Capricorn (and Aquarius)',
      'Full cycle is 29.5 years',
      'Saturn return at 29 and 58 years',
      'Spends 2.5 years in each sign',
    ],
    example:
      'Saturn return around age 29 — time of adulthood and important decisions. Saturn transit through the 10th house — career achievements through hard work.',
    difficulty: 'intermediate',
    readTime: 75,
    order: 7,
  },
  {
    id: 'aspects_001',
    category: 'aspects',
    title: 'Conjunction (0°): Merging energies',
    subtitle: 'The most powerful aspect',
    icon: 'radio-button-on',
    emoji: '⭕',
    gradient: ['#8B5CF6', '#7C3AED'],
    shortText:
      'A conjunction is two planets in the same degree. Their energies merge and amplify each other.',
    fullText:
      'A conjunction is a 0° aspect when two planets are next to each other.\n\nFeatures:\n• The strongest aspect\n• Planets work as one\n• Can be harmonious or tense\n• Orb: usually up to 8–10°',
    keyPoints: [
      'Amplifies the qualities of both planets',
      'Creates a new quality from two',
      'Neutral aspect (depends on planets)',
      'A New Moon is a conjunction of Sun and Moon',
    ],
    example:
      'Sun + Venus = charisma and attractiveness\nMars + Pluto = enormous willpower\nMoon + Neptune = deep intuition and empathy',
    quiz: {
      question: 'What angle between planets is a conjunction?',
      options: [
        { text: '0°', isCorrect: true },
        { text: '60°', isCorrect: false },
        { text: '90°', isCorrect: false },
        { text: '180°', isCorrect: false },
      ],
    },
    difficulty: 'beginner',
    readTime: 60,
    order: 1,
  },
  {
    id: 'aspects_002',
    category: 'aspects',
    title: 'Sextile (60°): Easy opportunities',
    subtitle: 'The aspect of talent',
    icon: 'star',
    emoji: '⭐',
    gradient: ['#10B981', '#059669'],
    shortText:
      'A sextile is a harmonious 60° aspect. It gives talents and opportunities that need to be used.',
    fullText:
      'A sextile is a 60° angle between planets. It is a gentle, harmonious aspect.\n\nFeatures:\n• Harmonious but weaker than a trine\n• Requires activation (you need to act)\n• Gives talents and abilities\n• Connects friendly elements',
    keyPoints: [
      'Connects compatible elements',
      'Fire ↔ Air, Earth ↔ Water',
      'Orb: up to 6°',
      'Opportunities need to be used',
    ],
    example:
      'Sun sextile Mars — energy and confidence in actions. Mercury sextile Venus — talent for writing and art.',
    difficulty: 'intermediate',
    readTime: 55,
    order: 2,
  },
  {
    id: 'aspects_003',
    category: 'aspects',
    title: 'Square (90°): Challenge and tension',
    subtitle: 'The aspect of action',
    icon: 'square',
    emoji: '🟥',
    gradient: ['#EF4444', '#DC2626'],
    shortText:
      'A square is a tense 90° aspect. It creates conflict and requires solving a problem.',
    fullText:
      'A square is a 90° angle between planets. It is a tense, dynamic aspect.\n\nFeatures:\n• Creates inner conflict\n• Forces you to act\n• Gives strength through overcoming\n• Connects incompatible elements',
    keyPoints: [
      'Main tense aspect',
      'Motivates change',
      'Orb: up to 8°',
      'Strength comes through overcoming',
    ],
    example:
      'Sun square Saturn — struggle with limitations, developing discipline. Moon square Mars — emotional impulsiveness, need to learn control.',
    difficulty: 'intermediate',
    readTime: 60,
    order: 3,
  },
  {
    id: 'aspects_004',
    category: 'aspects',
    title: 'Trine (120°): Harmony and ease',
    subtitle: 'The most favorable aspect',
    icon: 'triangle',
    emoji: '🔺',
    gradient: ['#3B82F6', '#2563EB'],
    shortText:
      'A trine is the most harmonious 120° aspect. Everything comes easily and naturally.',
    fullText:
      'A trine is a 120° angle between planets. It is the most harmonious aspect.\n\nFeatures:\n• Maximum harmony\n• Everything happens easily\n• Connects one element\n• Can lead to laziness',
    keyPoints: [
      'Connects planets in the same element',
      'Fire, Earth, Air, or Water',
      'Orb: up to 8°',
      'Innate talent',
    ],
    example:
      'Sun trine Jupiter — luck and optimism in life. Venus trine Neptune — artistic talent, romanticism.',
    quiz: {
      question: 'A trine connects planets in...',
      options: [
        { text: 'Different elements', isCorrect: false },
        { text: 'The same element', isCorrect: true },
        { text: 'Opposite signs', isCorrect: false },
        { text: 'Neighboring signs', isCorrect: false },
      ],
    },
    difficulty: 'intermediate',
    readTime: 55,
    order: 4,
  },
  {
    id: 'aspects_005',
    category: 'aspects',
    title: 'Opposition (180°): Confrontation',
    subtitle: 'The aspect of balance',
    icon: 'git-compare',
    emoji: '⚖️',
    gradient: ['#F59E0B', '#D97706'],
    shortText:
      'An opposition is a tense 180° aspect. Planets oppose each other, requiring balance.',
    fullText:
      'An opposition is a 180° angle between planets. It is the aspect of opposites.\n\nFeatures:\n• Planets in opposite signs\n• Conflict requires integration\n• Awareness through others\n• Full Moon is an opposition',
    keyPoints: [
      'Requires finding balance',
      'Can manifest through other people',
      'Orb: up to 8°',
      'Awareness through contrast',
    ],
    example:
      'Sun opposition Moon — conflict between will and emotions. Mars opposition Venus — tension in relationships, passion.',
    difficulty: 'intermediate',
    readTime: 60,
    order: 5,
  },
  {
    id: 'houses_001',
    category: 'houses',
    title: '1st House: Personality and appearance',
    subtitle: 'The house of "I"',
    icon: 'person',
    emoji: '🙋',
    gradient: ['#EF4444', '#DC2626'],
    shortText:
      'The 1st house starts with the Ascendant and shows your appearance, temperament, and how others see you.',
    fullText:
      'The 1st house is the most important house of the horoscope. It is you in pure form.\n\nThe 1st house shows:\n• Appearance and body type\n• Temperament and character\n• First impression\n• The start of all matters\n• Health and vitality',
    keyPoints: [
      'Begins with the Ascendant',
      'Ruled by Aries and Mars',
      'The most personal house',
      'The sign on the Ascendant is your mask',
    ],
    example:
      'Aries Ascendant — energetic, impulsive, athletic. Libra Ascendant — charming, diplomatic, attractive.',
    difficulty: 'beginner',
    readTime: 60,
    order: 1,
  },
  {
    id: 'houses_002',
    category: 'houses',
    title: '2nd House: Money and values',
    subtitle: 'The house of possessions',
    icon: 'cash',
    emoji: '💰',
    gradient: ['#10B981', '#059669'],
    shortText:
      'The 2nd house governs money, possessions, self-esteem, and what you value.',
    fullText:
      'The 2nd house is your resources, material and non-material.\n\nThe 2nd house shows:\n• Attitude toward money\n• Sources of income\n• Material values\n• Self-esteem\n• Talents and abilities',
    keyPoints: [
      'Ruled by Taurus and Venus',
      'Money you earn yourself',
      'Your talents and resources',
      'What you value in life',
    ],
    example:
      'Jupiter in the 2nd house — financial luck and generosity. Saturn in the 2nd house — slow but stable accumulation.',
    difficulty: 'beginner',
    readTime: 55,
    order: 2,
  },
  {
    id: 'houses_007',
    category: 'houses',
    title: '7th House: Partnership and marriage',
    subtitle: 'The house of relationships',
    icon: 'heart',
    emoji: '💑',
    gradient: ['#EC4899', '#DB2777'],
    shortText:
      'The 7th house begins with the Descendant and rules marriage, partnerships, and open enemies.',
    fullText:
      'The 7th house is the house of "the Other". The opposite of the 1st house.\n\nThe 7th house shows:\n• Marriage and serious relationships\n• Business partnerships\n• Open enemies and opponents\n• Qualities you seek in a partner\n• Legal matters',
    keyPoints: [
      'Begins with the Descendant',
      'Ruled by Libra and Venus',
      'Opposite the 1st house',
      'Shows whom you attract',
    ],
    example:
      'Venus in the 7th house — happy marriage, harmonious relationships. Saturn in the 7th house — late or serious marriage, responsibility in relationships.',
    task: {
      type: 'find_in_chart',
      title: 'Check your 7th house',
      description: 'See which sign and planets are in your 7th house',
      actionLabel: 'Open chart',
      navigationTarget: 'Chart',
    },
    difficulty: 'intermediate',
    readTime: 65,
    order: 7,
  },
  {
    id: 'houses_010',
    category: 'houses',
    title: '10th House: Career and vocation',
    subtitle: 'The house of success',
    icon: 'briefcase',
    emoji: '💼',
    gradient: ['#6366F1', '#4F46E5'],
    shortText:
      'The 10th house starts with the MC (Midheaven) and shows career, reputation, and life mission.',
    fullText:
      'The 10th house is the highest point of the chart. Your public life.\n\nThe 10th house shows:\n• Career and profession\n• Reputation and status\n• Life mission\n• Achievements and goals\n• Relations with authority',
    keyPoints: [
      'Begins with the MC (Midheaven)',
      'Ruled by Capricorn and Saturn',
      'The most public house',
      'Your professional realization',
    ],
    example:
      'Sun in the 10th house — career at the center of life, leadership. Neptune in the 10th house — creative profession, artistry.',
    difficulty: 'intermediate',
    readTime: 60,
    order: 10,
  },
  {
    id: 'transits_001',
    category: 'transits',
    title: 'Mercury retrograde',
    subtitle: 'Time for review',
    icon: 'refresh',
    emoji: '🔄',
    gradient: ['#F59E0B', '#D97706'],
    shortText:
      'Mercury retrogrades 3–4 times a year for about 3 weeks. A time for RE-: review, reassess, revise.',
    fullText:
      'Mercury retrograde is the most famous astro event.\n\nWhat happens:\n📱 Technical glitches and communication issues\n💬 Misunderstandings and mistakes\n✈️ Travel delays\n📝 Document problems\n\nWhat to do:\n✅ Double-check everything\n✅ Finish old tasks\n✅ Reconnect with people\n❌ Avoid signing important contracts',
    keyPoints: [
      'Happens 3–4 times a year',
      'Lasts about 3 weeks',
      'Has pre- and post-shadow',
      'Not as scary as it seems',
    ],
    example:
      'Retrograde in Gemini — communication problems. Retrograde in Virgo — document errors. Retrograde in Aquarius — tech glitches.',
    difficulty: 'beginner',
    readTime: 70,
    order: 1,
    showConditions: {
      showOnTransit: 'mercury_retrograde',
    },
  },
  {
    id: 'transits_002',
    category: 'transits',
    title: 'Saturn return',
    subtitle: 'The adulthood exam',
    icon: 'school',
    emoji: '🎓',
    gradient: ['#6B7280', '#4B5563'],
    shortText:
      'At ages 29–30 and 58–60 Saturn returns to its natal position. It is a time of major lessons and adulthood.',
    fullText:
      'Saturn return is one of the most important transits in life.\n\nWhat happens:\n• Reassessment of your life path\n• Important decisions and choices\n• Accepting responsibility\n• Ending an old cycle\n• Beginning a new stage\n\nFirst return (around 29):\nYou become truly adult. A time for serious decisions.',
    keyPoints: [
      'Occurs every 29.5 years',
      'Lasts about 2–3 years',
      'First around ages 28–30',
      'Second around ages 58–60',
    ],
    example:
      'Many people at 29 get married, change careers, or move — Saturn demands adulthood and a clear direction.',
    difficulty: 'advanced',
    readTime: 80,
    order: 2,
  },
  {
    id: 'practical_001',
    category: 'practical',
    title: 'How to use a New Moon?',
    subtitle: 'Time for intentions',
    icon: 'moon-outline',
    emoji: '🌑',
    gradient: ['#1F2937', '#111827'],
    shortText:
      'The New Moon is the best time for beginnings and goal setting. Energy of growth and renewal.',
    fullText:
      'The New Moon happens when the Sun and Moon are in conjunction (0°).\n\nWhat to do:\n✍️ Write a list of goals\n🕯️ Do an intention ritual\n🧘 Meditate on what you want\n🌱 Start new projects\n\nWhat to avoid:\n❌ Major decisions (energy is low)\n❌ Surgeries\n❌ Relationship confrontations',
    keyPoints: [
      'Happens once a month',
      'Lasts about 3 days',
      'Manifestation window is 48 hours',
      'Each New Moon occurs in a different sign',
    ],
    example:
      'New Moon in Aries — set goals for leadership. In Taurus — for finances. In Gemini — for learning.',
    task: {
      type: 'practice',
      title: 'New Moon ritual',
      description: 'At the next New Moon, write down 10 intentions',
      actionLabel: 'Remind me',
    },
    difficulty: 'beginner',
    readTime: 70,
    order: 1,
  },
  {
    id: 'practical_002',
    category: 'practical',
    title: 'Full Moon: time to release',
    subtitle: 'Culmination and completion',
    icon: 'moon',
    emoji: '🌕',
    gradient: ['#F59E0B', '#FBBF24'],
    shortText:
      'The Full Moon is the peak of the lunar cycle. Time to finish tasks, release the old, and practice gratitude.',
    fullText:
      'The Full Moon is when the Sun and Moon are in opposition (180°). Maximum energy.\n\nWhat to do:\n✨ Finish what you started\n🙏 Express gratitude\n🔥 Let go of the old\n🧹 Clean your space\n📝 Review results\n\nWhat to avoid:\n❌ Start new projects\n❌ Surgeries\n❌ Important meetings',
    keyPoints: [
      'Happens two weeks after the New Moon',
      'Emotions are at their peak',
      'Time for awareness',
      'In the opposite sign of the New Moon',
    ],
    example:
      'Full Moon in Scorpio — release deep emotions. In Aquarius — break free from constraints.',
    difficulty: 'beginner',
    readTime: 65,
    order: 2,
  },
  {
    id: 'practical_003',
    category: 'practical',
    title: 'How to read your chart?',
    subtitle: 'Step-by-step guide',
    icon: 'map',
    emoji: '🗺️',
    gradient: ['#8B5CF6', '#7C3AED'],
    shortText:
      'Start with the Big Three: Sun (ego), Moon (emotions), Ascendant (mask). Then study planets by houses.',
    fullText:
      'Step-by-step reading of a natal chart:\n\n1️⃣ Sun, Moon, Ascendant\nCore personality traits\n\n2️⃣ Personal planets (Mercury, Venus, Mars)\nHow you think, love, and act\n\n3️⃣ Social planets (Jupiter, Saturn)\nLuck and life lessons\n\n4️⃣ Outer planets (Uranus, Neptune, Pluto)\nGenerational influences\n\n5️⃣ Houses\nWhere planets show themselves\n\n6️⃣ Aspects\nHow planets interact',
    keyPoints: [
      'Start simple',
      'Learn gradually',
      'Keep a journal of observations',
      'Compare with real life',
    ],
    task: {
      type: 'find_in_chart',
      title: 'Study your chart',
      description: 'Open "My Chart" and find your Big Three',
      actionLabel: 'Open chart',
      navigationTarget: 'Chart',
    },
    difficulty: 'beginner',
    readTime: 90,
    order: 3,
  },
  {
    id: 'practical_004',
    category: 'practical',
    title: 'Astrology and timing',
    subtitle: 'Electional astrology — the ancient art',
    icon: 'time',
    emoji: '⏰',
    gradient: ['#3B82F6', '#2563EB'],
    shortText:
      'Electional astrology helps you choose favorable timing for important events: weddings, business launches, surgeries.',
    fullText:
      'Electional astrology is the art of choosing the right time for events.\n\nWhen to use:\n💍 Weddings\n🏢 Business launches\n🏠 Real estate purchases\n✈️ Travel\n🏥 Surgeries\n📝 Contract signing\n\nGeneral rules:\n✅ Waxing Moon for new beginnings\n✅ Strong Sun\n✅ Harmonious aspects\n❌ Avoid retrogrades\n❌ Avoid Void of Course Moon',
    keyPoints: [
      'Ancient practice',
      'Requires knowledge',
      'Can greatly help',
      'Not a guarantee, but support',
    ],
    difficulty: 'advanced',
    readTime: 75,
    order: 4,
  },
  {
    id: 'lunar_001',
    category: 'lunar',
    title: 'Moon in zodiac signs',
    subtitle: 'Mood every 2.5 days',
    icon: 'moon',
    emoji: '🌙',
    gradient: ['#6366F1', '#8B5CF6'],
    shortText:
      'The Moon goes through the entire zodiac in 28 days, changing signs every 2.5 days. This influences the overall mood.',
    fullText:
      'The transiting Moon is the fastest planet. It sets the emotional background.\n\nHow to use it:\n🔥 Moon in Aries — act quickly\n💰 Moon in Taurus — deal with finances\n💬 Moon in Gemini — communicate\n🏠 Moon in Cancer — stay home\n🎭 Moon in Leo — create\n🧹 Moon in Virgo — organize',
    keyPoints: [
      'Changes sign every 2.5 days',
      'Affects everyone’s mood',
      'Plan your tasks by the Moon',
      'Especially important for women',
    ],
    example:
      'Schedule meetings with the Moon in Libra (diplomacy) and sign contracts with the Moon in Capricorn (seriousness).',
    difficulty: 'intermediate',
    readTime: 70,
    order: 1,
  },
  {
    id: 'lunar_002',
    category: 'lunar',
    title: 'Void of Course Moon',
    subtitle: 'The Moon without course',
    icon: 'pause',
    emoji: '⏸️',
    gradient: ['#6B7280', '#9CA3AF'],
    shortText:
      'The Moon VOC is a period when it makes no aspects. A time NOT for important beginnings.',
    fullText:
      'Void of Course (VOC) — the Moon between its last aspect and entering a new sign.\n\nDuring this period:\n❌ Do not start important tasks\n❌ Do not sign contracts\n❌ Avoid big purchases\n❌ Decisions may not work out\n\n✅ Good for:\n• Routine work\n• Rest\n• Meditation\n• Finishing tasks',
    keyPoints: [
      'Can last from minutes to 2 days',
      'Happens 2–3 times a week',
      'Things "hang in the air"',
      'Important for planning',
    ],
    example:
      'Bought a car during VOC Moon? There may be issues. Started a job? It may not last.',
    difficulty: 'advanced',
    readTime: 65,
    order: 2,
  },
];
