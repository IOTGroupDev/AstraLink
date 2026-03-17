import { AstroLesson } from '../types/lessons';

export const ASTRO_LESSONS_ES: AstroLesson[] = [
  {
    id: 'basics_001',
    category: 'basics',
    title: '¿Qué es una carta natal?',
    subtitle: 'Una fotografía cósmica de tu nacimiento',
    icon: 'map',
    emoji: '🗺️',
    gradient: ['#8B5CF6', '#6366F1'],
    shortText:
      'La carta natal es una instantánea del cielo en el momento de tu nacimiento. Muestra dónde estaban los planetas, el Sol y la Luna.',
    fullText:
      'La carta natal (o horóscopo de nacimiento) es tu huella cósmica única. Se calcula con la fecha, hora y lugar de nacimiento.\n\nLa carta muestra la posición de todos los planetas en signos y casas astrológicas. Es un GPS cósmico personal que ayuda a entender tus talentos, desafíos y camino de vida.',
    keyPoints: [
      'Única para cada persona',
      'Se calcula con fecha, hora y lugar de nacimiento',
      'Muestra planetas en signos y casas',
      'No cambia durante la vida',
    ],
    example:
      'Si naciste el 15 de mayo de 1990 a las 14:30 en Moscú, tu carta mostraría el Sol en Tauro, la Luna en Cáncer y el Ascendente en Virgo. ¡Esa combinación es lo que te hace único!',
    quiz: {
      question: '¿Qué se necesita para calcular una carta natal?',
      options: [
        { text: 'Solo la fecha de nacimiento', isCorrect: false },
        { text: 'Fecha, hora y lugar de nacimiento', isCorrect: true },
        { text: 'Solo el signo zodiacal', isCorrect: false },
        { text: 'Nombre y apellido', isCorrect: false },
      ],
      hint: 'Se requieren todos los parámetros para precisión',
    },
    difficulty: 'beginner',
    readTime: 60,
    order: 1,
    relatedLessons: ['basics_002', 'houses_001'],
  },
  {
    id: 'basics_002',
    category: 'basics',
    title: '¿Qué son los tránsitos?',
    subtitle: 'Planetas en movimiento',
    icon: 'planet',
    emoji: '🌍',
    gradient: ['#EC4899', '#F43F5E'],
    shortText:
      'Los tránsitos son el movimiento actual de los planetas. Cuando un planeta en tránsito forma un aspecto con tu carta natal, sientes su influencia.',
    fullText:
      'Imagina: tu carta natal es una foto del cielo al nacer. Los tránsitos muestran dónde están los planetas ahora.\n\nCuando un planeta en movimiento toca un punto importante de tu carta, activa energías específicas en tu vida. Es como si el cosmos pulsara los botones de tu carácter.',
    keyPoints: [
      'Los tránsitos cambian constantemente',
      'Afectan a todos, pero de forma personal',
      'Planetas lentos (Saturno, Júpiter) = influencias largas',
      'Planetas rápidos (Luna, Mercurio) = efectos breves',
    ],
    example:
      'Saturno en tránsito en cuadratura a tu Sol puede traer pruebas y lecciones de responsabilidad durante 1–2 años. Venus en tránsito en trígono a tu Venus: ¡día afortunado para el amor!',
    task: {
      type: 'check_transit',
      title: 'Revisa tus tránsitos',
      description:
        'Abre el simulador y mira qué tránsitos están activos hoy para ti',
      actionLabel: 'Abrir simulador',
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
    title: 'Tres puntos clave de la carta',
    subtitle: 'Sol, Luna, Ascendente',
    icon: 'sunny',
    emoji: '☀️',
    gradient: ['#F59E0B', '#EAB308'],
    shortText:
      'El Sol es tu ego y fuerza vital. La Luna son tus emociones y subconsciente. El Ascendente es tu apariencia y primera impresión.',
    fullText:
      'Estos son los tres pilares de tu personalidad:\n\n☀️ SOL — tu esencia, ego y propósito de vida. "Yo soy"\n🌙 LUNA — tus emociones, necesidades, mundo interno. "Yo siento"\n⬆️ ASCENDENTE — tu máscara, cómo te ven los demás. "Yo parezco"\n\nJuntos crean el retrato de tu personalidad.',
    keyPoints: [
      'Sol = tu personalidad consciente',
      'Luna = subconsciente y emociones',
      'Ascendente = capa externa, estilo de conducta',
      'Los tres son importantes para entenderte',
    ],
    example:
      'Sol en Aries (líder activo), Luna en Cáncer (sensible por dentro), Ascendente en Capricornio (serio por fuera). Te ven serio, pero por dentro eres suave y sensible, y tu meta es ser pionero.',
    quiz: {
      question: '¿Qué muestra el Ascendente?',
      options: [
        { text: 'Tu propósito de vida', isCorrect: false },
        { text: 'Tus emociones', isCorrect: false },
        { text: 'Cómo te perciben los demás', isCorrect: true },
        { text: 'Tu signo zodiacal', isCorrect: false },
      ],
    },
    difficulty: 'beginner',
    readTime: 80,
    order: 3,
  },
  {
    id: 'planets_001',
    category: 'planets',
    title: 'Sol: Ego y autoexpresión',
    subtitle: 'El centro de tu personalidad',
    icon: 'sunny',
    emoji: '☀️',
    gradient: ['#F59E0B', '#FBBF24'],
    shortText:
      'El Sol es tu "yo", ego, fuerza vital y propósito. El signo solar define los rasgos principales de tu carácter.',
    fullText:
      'El Sol es el planeta más importante en la astrología. Es tu núcleo interno y fuente de vitalidad.\n\nEl Sol muestra:\n• Tu esencia e identidad\n• Cómo te expresas en el mundo\n• Tu propósito de vida\n• La fuente de energía creativa\n\nEl signo donde está el Sol es tu signo zodiacal principal.',
    keyPoints: [
      'Rige el signo de Leo',
      'Simboliza el principio masculino y el padre',
      'Ciclo completo por el zodíaco: 1 año',
      'Pasa ~30 días en cada signo',
    ],
    example:
      'Sol en Aries te hace un líder enérgico. Sol en Tauro te hace tranquilo y estable. Sol en Géminis te hace social y curioso.',
    difficulty: 'beginner',
    readTime: 70,
    order: 1,
    relatedLessons: ['signs_001', 'basics_003'],
  },
  {
    id: 'planets_002',
    category: 'planets',
    title: 'Luna: Emociones y subconsciente',
    subtitle: 'Tu mundo interior',
    icon: 'moon',
    emoji: '🌙',
    gradient: ['#6366F1', '#8B5CF6'],
    shortText:
      'La Luna rige las emociones, el estado de ánimo, los instintos y el subconsciente. Es tu niño interior.',
    fullText:
      'La Luna es el segundo planeta más importante. Si el Sol es quién eres, la Luna es cómo sientes.\n\nLa Luna muestra:\n• Tus necesidades emocionales\n• Cómo reaccionas al estrés\n• Qué te da confort\n• Tus hábitos e instintos\n• Tu relación con la madre',
    keyPoints: [
      'Rige el signo de Cáncer',
      'Simboliza el principio femenino y la madre',
      'Ciclo completo por el zodíaco: 28 días',
      'Pasa ~2.5 días en cada signo',
      'El planeta más rápido',
    ],
    example:
      'Luna en Aries — reacciones emocionales rápidas. Luna en Cáncer — gran sensibilidad. Luna en Capricornio — reserva al expresar emociones.',
    task: {
      type: 'find_in_chart',
      title: 'Encuentra tu Luna',
      description: 'Abre "Mi Carta" y mira en qué signo está tu Luna',
      actionLabel: 'Abrir carta',
      navigationTarget: 'Chart',
    },
    difficulty: 'beginner',
    readTime: 75,
    order: 2,
  },
  {
    id: 'planets_003',
    category: 'planets',
    title: 'Mercurio: Comunicación y pensamiento',
    subtitle: 'Cómo piensas y hablas',
    icon: 'chatbubbles',
    emoji: '💬',
    gradient: ['#10B981', '#14B8A6'],
    shortText:
      'Mercurio rige la comunicación, el pensamiento, el aprendizaje y el transporte. Es tu estilo comunicativo.',
    fullText:
      'Mercurio es el mensajero de los dioses, el planeta del intelecto y la conexión.\n\nMercurio rige:\n• Comunicación y habla\n• Pensamiento lógico\n• Aprendizaje y memoria\n• Escritura y lectura\n• Transporte y viajes\n• Comercio y acuerdos',
    keyPoints: [
      'Rige Géminis y Virgo',
      'El planeta más cercano al Sol',
      'Retrograda 3–4 veces al año',
      'Ciclo completo: ~88 días',
    ],
    example:
      'Mercurio en Géminis — habla rápida y multitarea. Mercurio en Tauro — pensamiento lento pero profundo.',
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
    title: 'Venus: Amor y valores',
    subtitle: 'Lo que amas y valoras',
    icon: 'heart',
    emoji: '💕',
    gradient: ['#EC4899', '#EF4444'],
    shortText:
      'Venus rige el amor, la belleza, el dinero y las relaciones. Muestra lo que te da placer.',
    fullText:
      'Venus es la diosa del amor y la belleza. Muestra lo que valoras y cómo amas.\n\nVenus rige:\n• Amor romántico\n• Belleza y estética\n• Dinero y valores\n• Arte y creatividad\n• Relaciones sociales\n• Placeres',
    keyPoints: [
      'Rige Tauro y Libra',
      'Siempre cerca del Sol (máx. 48°)',
      'Ciclo completo: ~225 días',
      'Estrella de la mañana y de la tarde',
    ],
    example:
      'Venus en Aries — amor apasionado e impulsivo. Venus en Libra — armonía y pareja. Venus en Capricornio — relaciones serias y estables.',
    difficulty: 'beginner',
    readTime: 70,
    order: 4,
  },
  {
    id: 'planets_005',
    category: 'planets',
    title: 'Marte: Acción y energía',
    subtitle: 'Tu planeta guerrero',
    icon: 'flame',
    emoji: '🔥',
    gradient: ['#EF4444', '#DC2626'],
    shortText:
      'Marte es el planeta de la acción, la energía, la pasión y la agresión. Es tu voluntad de victoria.',
    fullText:
      'Marte es el dios de la guerra, el planeta de la acción y la energía masculina.\n\nMarte muestra:\n• Cómo actúas\n• Tu energía y empuje\n• Cómo expresas la ira\n• Sexualidad (masculina)\n• Cómo logras tus metas\n• Actividad física',
    keyPoints: [
      'Rige Aries (y Escorpio)',
      'Símbolo de la voluntad',
      'Ciclo completo: ~2 años',
      'Retrograda cada 2 años',
    ],
    example:
      'Marte en Aries — acción directa y rápida. Marte en Cáncer — energía protectora y emocional. Marte en Capricornio — determinación y resistencia.',
    difficulty: 'beginner',
    readTime: 65,
    order: 5,
  },
  {
    id: 'planets_006',
    category: 'planets',
    title: 'Júpiter: Expansión y suerte',
    subtitle: 'El gran benéfico',
    icon: 'gift',
    emoji: '🎁',
    gradient: ['#3B82F6', '#2563EB'],
    shortText:
      'Júpiter es el planeta del crecimiento, la suerte, la sabiduría y la abundancia. Expande todo lo que toca.',
    fullText:
      'Júpiter es el rey de los dioses, el planeta más grande y el gran benéfico.\n\nJúpiter trae:\n• Suerte y oportunidades\n• Crecimiento y expansión\n• Sabiduría y conocimiento\n• Optimismo y fe\n• Abundancia y generosidad\n• Viajes lejanos',
    keyPoints: [
      'Rige Sagitario (y Piscis)',
      'El planeta más grande',
      'Ciclo completo: 12 años',
      'Pasa ~1 año en cada signo',
    ],
    example:
      'Tránsito de Júpiter por la casa 2 puede traer suerte financiera. Júpiter en la casa 7 — momento favorable para el matrimonio.',
    difficulty: 'intermediate',
    readTime: 70,
    order: 6,
  },
  {
    id: 'planets_007',
    category: 'planets',
    title: 'Saturno: Estructura y lecciones',
    subtitle: 'El gran maestro',
    icon: 'school',
    emoji: '📚',
    gradient: ['#6B7280', '#4B5563'],
    shortText:
      'Saturno es el planeta de las limitaciones, la disciplina y la responsabilidad. Enseña a través de pruebas.',
    fullText:
      'Saturno es el dios del tiempo, el planeta del karma y de las lecciones de vida.\n\nSaturno trae:\n• Disciplina y estructura\n• Responsabilidad y madurez\n• Limitaciones y obstáculos\n• Lecciones y pruebas\n• Paciencia y resistencia\n• Logros a largo plazo',
    keyPoints: [
      'Rige Capricornio (y Acuario)',
      'Ciclo completo: 29,5 años',
      'Retorno de Saturno a los 29 y 58 años',
      'Pasa 2,5 años en cada signo',
    ],
    example:
      'Retorno de Saturno cerca de los 29: maduración y decisiones importantes. Tránsito por la casa 10 — logros profesionales mediante esfuerzo.',
    difficulty: 'intermediate',
    readTime: 75,
    order: 7,
  },
  {
    id: 'aspects_001',
    category: 'aspects',
    title: 'Conjunción (0°): Fusión de energías',
    subtitle: 'El aspecto más poderoso',
    icon: 'radio-button-on',
    emoji: '⭕',
    gradient: ['#8B5CF6', '#7C3AED'],
    shortText:
      'Una conjunción es cuando dos planetas están en el mismo grado. Sus energías se fusionan y se amplifican.',
    fullText:
      'La conjunción es un aspecto de 0° cuando dos planetas están juntos.\n\nCaracterísticas:\n• El aspecto más fuerte\n• Los planetas actúan como uno\n• Puede ser armónico o tenso\n• Orbe: hasta 8–10°',
    keyPoints: [
      'Amplifica las cualidades de ambos planetas',
      'Crea una nueva cualidad a partir de dos',
      'Aspecto neutral (depende de los planetas)',
      'La Luna nueva es una conjunción del Sol y la Luna',
    ],
    example:
      'Sol + Venus = carisma y atractivo\nMarte + Plutón = enorme fuerza de voluntad\nLuna + Neptuno = intuición profunda y empatía',
    quiz: {
      question: '¿Qué ángulo entre planetas es una conjunción?',
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
    title: 'Sextil (60°): Oportunidades fáciles',
    subtitle: 'El aspecto del talento',
    icon: 'star',
    emoji: '⭐',
    gradient: ['#10B981', '#059669'],
    shortText:
      'El sextil es un aspecto armónico de 60°. Da talentos y oportunidades que hay que usar.',
    fullText:
      'El sextil es un ángulo de 60° entre planetas. Es un aspecto suave y armónico.\n\nCaracterísticas:\n• Armónico pero más débil que el trígono\n• Requiere activación (hay que actuar)\n• Da talentos y habilidades\n• Conecta elementos compatibles',
    keyPoints: [
      'Conecta elementos compatibles',
      'Fuego ↔ Aire, Tierra ↔ Agua',
      'Orbe: hasta 6°',
      'Las oportunidades hay que aprovecharlas',
    ],
    example:
      'Sol sextil Marte — energía y confianza en la acción. Mercurio sextil Venus — talento para escribir y el arte.',
    difficulty: 'intermediate',
    readTime: 55,
    order: 2,
  },
  {
    id: 'aspects_003',
    category: 'aspects',
    title: 'Cuadratura (90°): Desafío y tensión',
    subtitle: 'El aspecto de la acción',
    icon: 'square',
    emoji: '🟥',
    gradient: ['#EF4444', '#DC2626'],
    shortText:
      'La cuadratura es un aspecto tenso de 90°. Crea conflicto y exige resolver un problema.',
    fullText:
      'La cuadratura es un ángulo de 90° entre planetas. Es un aspecto tenso y dinámico.\n\nCaracterísticas:\n• Crea conflicto interno\n• Obliga a actuar\n• Da fuerza a través de la superación\n• Conecta elementos incompatibles',
    keyPoints: [
      'El principal aspecto tenso',
      'Motiva el cambio',
      'Orbe: hasta 8°',
      'La fuerza llega tras superar',
    ],
    example:
      'Sol cuadratura Saturno — lucha con limitaciones, desarrollo de disciplina. Luna cuadratura Marte — impulsividad emocional, necesidad de control.',
    difficulty: 'intermediate',
    readTime: 60,
    order: 3,
  },
  {
    id: 'aspects_004',
    category: 'aspects',
    title: 'Trígono (120°): Armonía y facilidad',
    subtitle: 'El aspecto más favorable',
    icon: 'triangle',
    emoji: '🔺',
    gradient: ['#3B82F6', '#2563EB'],
    shortText:
      'El trígono es el aspecto más armónico de 120°. Todo fluye con facilidad.',
    fullText:
      'El trígono es un ángulo de 120° entre planetas. Es el aspecto más armónico.\n\nCaracterísticas:\n• Máxima armonía\n• Todo ocurre con facilidad\n• Conecta un solo elemento\n• Puede llevar a la pereza',
    keyPoints: [
      'Conecta planetas del mismo elemento',
      'Fuego, Tierra, Aire o Agua',
      'Orbe: hasta 8°',
      'Talento innato',
    ],
    example:
      'Sol trígono Júpiter — suerte y optimismo. Venus trígono Neptuno — talento artístico, romanticismo.',
    quiz: {
      question: 'Un trígono conecta planetas en...',
      options: [
        { text: 'Elementos diferentes', isCorrect: false },
        { text: 'El mismo elemento', isCorrect: true },
        { text: 'Signos opuestos', isCorrect: false },
        { text: 'Signos vecinos', isCorrect: false },
      ],
    },
    difficulty: 'intermediate',
    readTime: 55,
    order: 4,
  },
  {
    id: 'aspects_005',
    category: 'aspects',
    title: 'Oposición (180°): Confrontación',
    subtitle: 'El aspecto del equilibrio',
    icon: 'git-compare',
    emoji: '⚖️',
    gradient: ['#F59E0B', '#D97706'],
    shortText:
      'La oposición es un aspecto tenso de 180°. Los planetas se enfrentan y exigen equilibrio.',
    fullText:
      'La oposición es un ángulo de 180° entre planetas. Es el aspecto de los opuestos.\n\nCaracterísticas:\n• Planetas en signos opuestos\n• El conflicto requiere integración\n• Conciencia a través de los demás\n• La Luna llena es una oposición',
    keyPoints: [
      'Requiere encontrar equilibrio',
      'Puede manifestarse a través de otras personas',
      'Orbe: hasta 8°',
      'Conciencia mediante contraste',
    ],
    example:
      'Sol oposición Luna — conflicto entre voluntad y emociones. Marte oposición Venus — tensión en relaciones, pasión.',
    difficulty: 'intermediate',
    readTime: 60,
    order: 5,
  },
  {
    id: 'houses_001',
    category: 'houses',
    title: 'Casa 1: Personalidad y apariencia',
    subtitle: 'La casa del "Yo"',
    icon: 'person',
    emoji: '🙋',
    gradient: ['#EF4444', '#DC2626'],
    shortText:
      'La casa 1 comienza con el Ascendente y muestra tu apariencia, temperamento y cómo te perciben.',
    fullText:
      'La casa 1 es la más importante del horóscopo. Es tú en estado puro.\n\nLa casa 1 muestra:\n• Apariencia y constitución\n• Temperamento y carácter\n• Primera impresión\n• Inicio de los asuntos\n• Salud y vitalidad',
    keyPoints: [
      'Comienza con el Ascendente',
      'Rige Aries y Marte',
      'La casa más personal',
      'El signo en el Ascendente es tu máscara',
    ],
    example:
      'Ascendente en Aries — energético e impulsivo. Ascendente en Libra — encantador y diplomático.',
    difficulty: 'beginner',
    readTime: 60,
    order: 1,
  },
  {
    id: 'houses_002',
    category: 'houses',
    title: 'Casa 2: Dinero y valores',
    subtitle: 'La casa de las posesiones',
    icon: 'cash',
    emoji: '💰',
    gradient: ['#10B981', '#059669'],
    shortText:
      'La casa 2 gobierna el dinero, las posesiones, la autoestima y lo que valoras.',
    fullText:
      'La casa 2 son tus recursos, materiales y no materiales.\n\nLa casa 2 muestra:\n• Actitud frente al dinero\n• Fuentes de ingresos\n• Valores materiales\n• Autoestima\n• Talentos y habilidades',
    keyPoints: [
      'Rige Tauro y Venus',
      'Dinero que ganas tú mismo',
      'Tus talentos y recursos',
      'Lo que valoras en la vida',
    ],
    example:
      'Júpiter en la casa 2 — suerte financiera y generosidad. Saturno en la casa 2 — acumulación lenta pero estable.',
    difficulty: 'beginner',
    readTime: 55,
    order: 2,
  },
  {
    id: 'houses_007',
    category: 'houses',
    title: 'Casa 7: Pareja y matrimonio',
    subtitle: 'La casa de las relaciones',
    icon: 'heart',
    emoji: '💑',
    gradient: ['#EC4899', '#DB2777'],
    shortText:
      'La casa 7 comienza con el Descendente y rige el matrimonio, las asociaciones y los enemigos abiertos.',
    fullText:
      'La casa 7 es la casa del "Otro". Opuesta a la casa 1.\n\nLa casa 7 muestra:\n• Matrimonio y relaciones serias\n• Asociaciones de negocio\n• Enemigos abiertos y oponentes\n• Cualidades que buscas en un compañero\n• Asuntos legales',
    keyPoints: [
      'Comienza con el Descendente',
      'Rige Libra y Venus',
      'Opuesta a la casa 1',
      'Muestra a quién atraes',
    ],
    example:
      'Venus en la casa 7 — matrimonio feliz y relaciones armoniosas. Saturno en la casa 7 — matrimonio tardío o serio, responsabilidad en relaciones.',
    task: {
      type: 'find_in_chart',
      title: 'Revisa tu casa 7',
      description: 'Mira qué signo y planetas hay en tu casa 7',
      actionLabel: 'Abrir carta',
      navigationTarget: 'Chart',
    },
    difficulty: 'intermediate',
    readTime: 65,
    order: 7,
  },
  {
    id: 'houses_010',
    category: 'houses',
    title: 'Casa 10: Carrera y vocación',
    subtitle: 'La casa del éxito',
    icon: 'briefcase',
    emoji: '💼',
    gradient: ['#6366F1', '#4F46E5'],
    shortText:
      'La casa 10 empieza en el MC (Medio Cielo) y muestra carrera, reputación y misión de vida.',
    fullText:
      'La casa 10 es el punto más alto de la carta. Tu vida pública.\n\nLa casa 10 muestra:\n• Carrera y profesión\n• Reputación y estatus\n• Misión de vida\n• Logros y metas\n• Relaciones con autoridades',
    keyPoints: [
      'Comienza con el MC (Medio Cielo)',
      'Rige Capricornio y Saturno',
      'La casa más pública',
      'Tu realización profesional',
    ],
    example:
      'Sol en la casa 10 — la carrera en el centro de la vida, liderazgo. Neptuno en la casa 10 — profesión creativa, arte.',
    difficulty: 'intermediate',
    readTime: 60,
    order: 10,
  },
  {
    id: 'transits_001',
    category: 'transits',
    title: 'Mercurio retrógrado',
    subtitle: 'Tiempo de revisión',
    icon: 'refresh',
    emoji: '🔄',
    gradient: ['#F59E0B', '#D97706'],
    shortText:
      'Mercurio retrógrado ocurre 3–4 veces al año durante unas 3 semanas. Tiempo para RE-: revisar, reevaluar, corregir.',
    fullText:
      'Mercurio retrógrado es el evento astral más famoso.\n\nQué ocurre:\n📱 Fallos técnicos y problemas de comunicación\n💬 Malentendidos y errores\n✈️ Retrasos en viajes\n📝 Problemas con documentos\n\nQué hacer:\n✅ Revisar todo\n✅ Terminar tareas antiguas\n✅ Reconectar con personas\n❌ Evitar firmar contratos importantes',
    keyPoints: [
      'Ocurre 3–4 veces al año',
      'Dura aprox. 3 semanas',
      'Tiene sombra previa y posterior',
      'No es tan temido como parece',
    ],
    example:
      'Retrógrado en Géminis — problemas de comunicación. En Virgo — errores en documentos. En Acuario — fallos tecnológicos.',
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
    title: 'Retorno de Saturno',
    subtitle: 'El examen de adultez',
    icon: 'school',
    emoji: '🎓',
    gradient: ['#6B7280', '#4B5563'],
    shortText:
      'A los 29–30 y 58–60 años Saturno vuelve a su posición natal. Es un tiempo de grandes lecciones y maduración.',
    fullText:
      'El retorno de Saturno es uno de los tránsitos más importantes.\n\nQué ocurre:\n• Revisión del camino de vida\n• Decisiones y elecciones importantes\n• Aceptación de responsabilidad\n• Fin de un ciclo antiguo\n• Inicio de una nueva etapa\n\nPrimer retorno (≈29):\nTe vuelves realmente adulto. Tiempo de decisiones serias.',
    keyPoints: [
      'Ocurre cada 29,5 años',
      'Dura aprox. 2–3 años',
      'Primero alrededor de 28–30 años',
      'Segundo alrededor de 58–60 años',
    ],
    example:
      'Muchos a los 29 se casan, cambian de carrera o se mudan — Saturno exige madurez y dirección.',
    difficulty: 'advanced',
    readTime: 80,
    order: 2,
  },
  {
    id: 'practical_001',
    category: 'practical',
    title: '¿Cómo usar la Luna nueva?',
    subtitle: 'Tiempo de intenciones',
    icon: 'moon-outline',
    emoji: '🌑',
    gradient: ['#1F2937', '#111827'],
    shortText:
      'La Luna nueva es el mejor momento para comenzar y fijar metas. Energía de crecimiento y renovación.',
    fullText:
      'La Luna nueva ocurre cuando el Sol y la Luna están en conjunción (0°).\n\nQué hacer:\n✍️ Escribir una lista de metas\n🕯️ Hacer un ritual de intención\n🧘 Meditar sobre lo deseado\n🌱 Empezar nuevos proyectos\n\nQué evitar:\n❌ Decisiones importantes (energía baja)\n❌ Cirugías\n❌ Confrontaciones en relaciones',
    keyPoints: [
      'Ocurre una vez al mes',
      'Dura aprox. 3 días',
      'Ventana de manifestación: 48 horas',
      'Cada Luna nueva es en un signo distinto',
    ],
    example:
      'Luna nueva en Aries — metas de liderazgo. En Tauro — finanzas. En Géminis — aprendizaje.',
    task: {
      type: 'practice',
      title: 'Ritual de Luna nueva',
      description: 'En la próxima Luna nueva escribe 10 intenciones',
      actionLabel: 'Recuérdame',
    },
    difficulty: 'beginner',
    readTime: 70,
    order: 1,
  },
  {
    id: 'practical_002',
    category: 'practical',
    title: 'Luna llena: tiempo de soltar',
    subtitle: 'Culminación y cierre',
    icon: 'moon',
    emoji: '🌕',
    gradient: ['#F59E0B', '#FBBF24'],
    shortText:
      'La Luna llena es el pico del ciclo lunar. Tiempo de finalización, soltar lo viejo y agradecer.',
    fullText:
      'La Luna llena es cuando el Sol y la Luna están en oposición (180°). Energía máxima.\n\nQué hacer:\n✨ Terminar lo empezado\n🙏 Agradecer\n🔥 Dejar ir lo viejo\n🧹 Limpiar el espacio\n📝 Revisar resultados\n\nQué evitar:\n❌ Empezar proyectos nuevos\n❌ Cirugías\n❌ Reuniones importantes',
    keyPoints: [
      'Ocurre dos semanas después de la Luna nueva',
      'Las emociones están en su pico',
      'Tiempo de toma de conciencia',
      'En el signo opuesto a la Luna nueva',
    ],
    example:
      'Luna llena en Escorpio — soltar emociones profundas. En Acuario — liberarse de limitaciones.',
    difficulty: 'beginner',
    readTime: 65,
    order: 2,
  },
  {
    id: 'practical_003',
    category: 'practical',
    title: '¿Cómo leer tu carta?',
    subtitle: 'Guía paso a paso',
    icon: 'map',
    emoji: '🗺️',
    gradient: ['#8B5CF6', '#7C3AED'],
    shortText:
      'Empieza con la Gran Tríada: Sol (ego), Luna (emociones), Ascendente (máscara). Luego estudia los planetas por casas.',
    fullText:
      'Lectura paso a paso de una carta natal:\n\n1️⃣ Sol, Luna, Ascendente\nRasgos centrales\n\n2️⃣ Planetas personales (Mercurio, Venus, Marte)\nCómo piensas, amas y actúas\n\n3️⃣ Planetas sociales (Júpiter, Saturno)\nSuerte y lecciones de vida\n\n4️⃣ Planetas transpersonales (Urano, Neptuno, Plutón)\nInfluencias generacionales\n\n5️⃣ Casas\nDónde se manifiestan los planetas\n\n6️⃣ Aspectos\nCómo interactúan los planetas',
    keyPoints: [
      'Empieza por lo simple',
      'Aprende gradualmente',
      'Lleva un diario de observaciones',
      'Compara con la vida real',
    ],
    task: {
      type: 'find_in_chart',
      title: 'Estudia tu carta',
      description: 'Abre "Mi Carta" y encuentra tu Gran Tríada',
      actionLabel: 'Abrir carta',
      navigationTarget: 'Chart',
    },
    difficulty: 'beginner',
    readTime: 90,
    order: 3,
  },
  {
    id: 'practical_004',
    category: 'practical',
    title: 'Astrología y elección del momento',
    subtitle: 'Astrología electiva — arte antiguo',
    icon: 'time',
    emoji: '⏰',
    gradient: ['#3B82F6', '#2563EB'],
    shortText:
      'La astrología electiva ayuda a elegir el momento favorable para eventos importantes: bodas, lanzamientos, cirugías.',
    fullText:
      'La astrología electiva es el arte de elegir el momento adecuado.\n\nCuándo usarla:\n💍 Bodas\n🏢 Lanzamientos de negocio\n🏠 Compra de inmuebles\n✈️ Viajes\n🏥 Cirugías\n📝 Firma de contratos\n\nReglas generales:\n✅ Luna creciente para comenzar\n✅ Sol fuerte\n✅ Aspectos armónicos\n❌ Evitar retrogrados\n❌ Evitar la Luna Void of Course',
    keyPoints: [
      'Práctica antigua',
      'Requiere conocimiento',
      'Puede ayudar mucho',
      'No garantiza, pero apoya',
    ],
    difficulty: 'advanced',
    readTime: 75,
    order: 4,
  },
  {
    id: 'lunar_001',
    category: 'lunar',
    title: 'La Luna en los signos',
    subtitle: 'Estado de ánimo cada 2,5 días',
    icon: 'moon',
    emoji: '🌙',
    gradient: ['#6366F1', '#8B5CF6'],
    shortText:
      'La Luna recorre el zodíaco en 28 días y cambia de signo cada 2,5 días. Esto influye en el ánimo general.',
    fullText:
      'La Luna en tránsito es el planeta más rápido. Define el clima emocional.\n\nCómo usarla:\n🔥 Luna en Aries — actúa rápido\n💰 Luna en Tauro — finanzas\n💬 Luna en Géminis — comunicación\n🏠 Luna en Cáncer — quedarse en casa\n🎭 Luna en Leo — crear\n🧹 Luna en Virgo — ordenar',
    keyPoints: [
      'Cambia de signo cada 2,5 días',
      'Influye en el ánimo de todos',
      'Planifica tareas según la Luna',
      'Especialmente importante para mujeres',
    ],
    example:
      'Programa reuniones con la Luna en Libra (diplomacia) y firma contratos con la Luna en Capricornio (seriedad).',
    difficulty: 'intermediate',
    readTime: 70,
    order: 1,
  },
  {
    id: 'lunar_002',
    category: 'lunar',
    title: 'Luna Void of Course',
    subtitle: 'La Luna sin curso',
    icon: 'pause',
    emoji: '⏸️',
    gradient: ['#6B7280', '#9CA3AF'],
    shortText:
      'La Luna VOC es el periodo en que no forma aspectos. Un tiempo NO para inicios importantes.',
    fullText:
      'Void of Course (VOC) — la Luna entre su último aspecto y la entrada a un nuevo signo.\n\nDurante este periodo:\n❌ No comiences tareas importantes\n❌ No firmes contratos\n❌ Evita compras grandes\n❌ Las decisiones pueden no funcionar\n\n✅ Bueno para:\n• Rutina\n• Descanso\n• Meditación\n• Terminar tareas',
    keyPoints: [
      'Puede durar de minutos a 2 días',
      'Ocurre 2–3 veces por semana',
      'Las cosas “quedan en el aire”',
      'Importante para la planificación',
    ],
    example:
      '¿Compraste un coche en Luna VOC? Puede haber problemas. ¿Empezaste un trabajo? Puede no durar.',
    difficulty: 'advanced',
    readTime: 65,
    order: 2,
  },
];
