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
    Gemini: 'El Sol en Géminis te brinda curiosidad, comunicación y mente flexible. Te adaptas fácilmente a los cambios.',
    Cancer: 'El Sol en Cáncer te hace sensible, cuidadoso y emocional. La familia y el hogar son primordiales para ti.',
    Leo: 'El Sol en Leo te da confianza, potencial creativo y deseo de reconocimiento. Eres un líder e inspirador nato.',
    Virgo: 'El Sol en Virgo te otorga mente analítica, practicidad y búsqueda de perfección. Prestas atención a los detalles.',
    Libra: 'El Sol en Libra te da búsqueda de armonía, justicia y belleza. Eres diplomático y pacificador nato.',
    Scorpio: 'El Sol en Escorpio te otorga intensidad, pasión y perspicacia. Posees poderosa fuerza interior.',
    Sagittarius: 'El Sol en Sagitario te da optimismo, amor a la libertad y deseo de conocimiento. Eres filósofo y buscador de aventuras.',
    Capricorn: 'El Sol en Capricornio te otorga ambición, responsabilidad y determinación. Construirás una carrera exitosa.',
    Aquarius: 'El Sol en Acuario te da originalidad, independencia e ideales humanísticos. Eres innovador y reformador.',
    Pisces: 'El Sol en Piscis te otorga sensibilidad, intuición e imaginación creativa. Eres soñador y buscador espiritual.',
  },
  moon: {
    Aries: 'La Luna en Aries te hace emocionalmente impulsivo y apasionado. Reaccionas rápidamente a los eventos y no ocultas sentimientos.',
    Taurus: 'La Luna en Tauro da estabilidad emocional y necesidad de comodidad. Eres calmado y equilibrado.',
    Gemini: 'La Luna en Géminis te otorga flexibilidad emocional y curiosidad. Necesitas estimulación intelectual.',
    Cancer: 'La Luna en Cáncer intensifica tu emocionalidad e intuición. Sientes profundamente y necesitas seguridad emocional.',
    Leo: 'La Luna en Leo te da generosidad emocional y necesidad de reconocimiento. Eres dramático y expresivo en sentimientos.',
    Virgo: 'La Luna en Virgo te hace emocionalmente reservado y práctico. Expresas cuidado a través de acciones concretas.',
    Libra: 'La Luna en Libra da necesidad de armonía y balance. Buscas equilibrio emocional en relaciones.',
    Scorpio: 'La Luna en Escorpio te otorga emociones intensas y profundas. Experimentas todo muy fuertemente.',
    Sagittarius: 'La Luna en Sagitario da optimismo emocional y amor a la libertad. Necesitas aventuras y experiencia nueva.',
    Capricorn: 'La Luna en Capricornio te hace emocionalmente reservado y responsable. Controlas tus sentimientos.',
    Aquarius: 'La Luna en Acuario da independencia emocional y originalidad. Valoras libertad y amistad.',
    Pisces: 'La Luna en Piscis te otorga alta sensibilidad emocional y empatía. Eres intuitivo y soñador.',
  },
  mercury: {
    Aries: 'Mercurio en Aries acelera el pensamiento y aporta franqueza al habla.',
    Taurus: 'Mercurio en Tauro trae practicidad y pensamiento secuencial.',
    Gemini: 'Mercurio en Géminis intensifica comunicación, curiosidad y velocidad de pensamiento.',
    Cancer: 'Mercurio en Cáncer añade intuición y memoria emocional.',
    Leo: 'Mercurio en Leo expresa pensamientos con confianza y amplitud.',
    Virgo: 'Mercurio en Virgo da analítica, atención al detalle y mente práctica.',
    Libra: 'Mercurio en Libra busca balance y justicia en el diálogo.',
    Scorpio: 'Mercurio en Escorpio profundiza la perspicacia y precisión psicológica.',
    Sagittarius: 'Mercurio en Sagitario amplía horizonte y pensamiento filosófico.',
    Capricorn: 'Mercurio en Capricornio estructura ideas y planes estratégicamente.',
    Aquarius: 'Mercurio en Acuario piensa de manera no convencional e inventiva.',
    Pisces: 'Mercurio en Piscis intensifica imaginación, empatía y conexiones intuitivas.',
  },
  venus: {
    Aries: 'Venus en Aries ama audazmente y directamente, valora iniciativa y sinceridad.',
    Taurus: 'Venus en Tauro ama estabilidad, sensualidad y placeres terrenales. Importan comodidad y conexiones confiables.',
    Gemini: 'Venus en Géminis se inclina hacia ligereza, curiosidad y conversaciones.',
    Cancer: 'Venus en Cáncer es cuidadoso, busca cercanía y seguridad.',
    Leo: 'Venus en Leo es generoso y teatral en manifestaciones de sentimientos.',
    Virgo: 'Venus en Virgo cuida a través de práctica y atención a detalles.',
    Libra: 'Venus en Libra busca armonía, belleza y balance de pareja.',
    Scorpio: 'Venus en Escorpio ama profundamente y de manera transformadora.',
    Sagittarius: 'Venus en Sagitario valora libertad y aventuras compartidas.',
    Capricorn: 'Venus en Capricornio es confiable, valora responsabilidad y tiempo.',
    Aquarius: 'Venus en Acuario valora independencia y amor amistoso.',
    Pisces: 'Venus en Piscis enfatiza empatía, inspiración y romanticismo.',
  },
  mars: {
    Aries: 'Marte en Aries da fuerza, velocidad e iniciativa. La energía se dirige a acciones directas e inicio de proyectos.',
    Taurus: 'Marte en Tauro actúa persistente y secuencialmente, valora ritmo constante.',
    Gemini: 'Marte en Géminis actúa flexiblemente, a través de ideas y comunicación.',
    Cancer: 'Marte en Cáncer protege, actúa indirectamente, basándose en intuición.',
    Leo: 'Marte en Leo actúa orgullosamente y creativamente, busca reconocimiento.',
    Virgo: 'Marte en Virgo actúa precisamente y eficientemente, orientado a resultados.',
    Libra: 'Marte en Libra actúa diplomáticamente, a través de asociación.',
    Scorpio: 'Marte en Escorpio aporta profundidad, persistencia y estrategia. Enfoque en transformación y fuerza de voluntad.',
    Sagittarius: 'Marte en Sagitario actúa ampliamente y optimistamente, expandiendo horizontes.',
    Capricorn: 'Marte en Capricornio estructura impulso y determinación. La energía es efectiva en objetivos a largo plazo.',
    Aquarius: 'Marte en Acuario actúa de manera no convencional y colectiva.',
    Pisces: 'Marte en Piscis actúa inspiradamente y sensiblemente.',
  },
  jupiter: {
    Aries: 'Júpiter en Aries expande valentía e iniciativa.',
    Taurus: 'Júpiter en Tauro apoya crecimiento material y estabilidad.',
    Gemini: 'Júpiter en Géminis expande aprendizaje y comunicaciones.',
    Cancer: 'Júpiter en Cáncer intensifica cuidado y valores familiares.',
    Leo: 'Júpiter en Leo expande creatividad y autoexpresión.',
    Virgo: 'Júpiter en Virgo desarrolla servicio y maestría.',
    Libra: 'Júpiter en Libra apoya justicia y asociaciones.',
    Scorpio: 'Júpiter en Escorpio profundiza transformación y fuerza interior.',
    Sagittarius: 'Júpiter en Sagitario expande horizontes, sed de conocimiento y optimismo.',
    Capricorn: 'Júpiter en Capricornio fortalece responsabilidad y trae resultados.',
    Aquarius: 'Júpiter en Acuario expande innovaciones y conexiones sociales.',
    Pisces: 'Júpiter en Piscis intensifica fe, compasión e imaginación.',
  },
  saturn: {
    Aries: 'Saturno en Aries requiere disciplina de iniciativa y responsabilidad madura.',
    Taurus: 'Saturno en Tauro requiere manejo cuidadoso de recursos y estabilidad.',
    Gemini: 'Saturno en Géminis requiere estructura en aprendizaje y habla.',
    Cancer: 'Saturno en Cáncer requiere madurez emocional y límites.',
    Leo: 'Saturno en Leo requiere responsabilidad en autoexpresión.',
    Virgo: 'Saturno en Virgo requiere precisión y servicio práctico.',
    Libra: 'Saturno en Libra requiere balance, justicia y compromisos.',
    Scorpio: 'Saturno en Escorpio requiere honestidad en temas de poder y profundidad.',
    Sagittarius: 'Saturno en Sagitario requiere responsabilidad en convicciones y crecimiento.',
    Capricorn: 'Saturno en Capricornio disciplina, intensifica responsabilidad y pensamiento estratégico. Importan calidad y estructura.',
    Aquarius: 'Saturno en Acuario estructura innovaciones y comunidades. Enfatiza principios y perspectiva lejana.',
    Pisces: 'Saturno en Piscis estructura compasión e imaginación, enseña límites.',
  },
  uranus: {
    Aries: 'Urano en Aries electrifica iniciativa y avances.',
    Taurus: 'Urano en Tauro reestructura estabilidad y valores para renovación.',
    Gemini: 'Urano en Géminis moderniza ideas y comunicación.',
    Cancer: 'Urano en Cáncer despierta nuevos patrones emocionales.',
    Leo: 'Urano en Leo libera creatividad y autoexpresión.',
    Virgo: 'Urano en Virgo renueva métodos y hábitos de salud.',
    Libra: 'Urano en Libra reforma relaciones y justicia.',
    Scorpio: 'Urano en Escorpio intensifica transformación y verdad.',
    Sagittarius: 'Urano en Sagitario libera convicciones y expande horizontes.',
    Capricorn: 'Urano en Capricornio reforma estructuras y poder.',
    Aquarius: 'Urano en Acuario intensifica originalidad y redes sociales.',
    Pisces: 'Urano en Piscis disuelve límites e inspira intuición.',
  },
  neptune: {
    Aries: 'Neptuno en Aries espiritualiza voluntad y acción.',
    Taurus: 'Neptuno en Tauro suaviza valores rígidos y refina sensualidad.',
    Gemini: 'Neptuno en Géminis inspira pensamiento poético y flexibilidad de visión.',
    Cancer: 'Neptuno en Cáncer intensifica empatía y necesidad de pertenencia.',
    Leo: 'Neptuno en Leo idealiza creatividad y expresión del corazón.',
    Virgo: 'Neptuno en Virgo ennoblece servicio y atención a sutilezas.',
    Libra: 'Neptuno en Libra idealiza armonía y belleza conjunta.',
    Scorpio: 'Neptuno en Escorpio profundiza misterios y procesos de sanación.',
    Sagittarius: 'Neptuno en Sagitario inspira visión y fe.',
    Capricorn: 'Neptuno en Capricornio disuelve reglas obsoletas en nombre de orden superior.',
    Aquarius: 'Neptuno en Acuario sueña con innovación humana.',
    Pisces: 'Neptuno en Piscis intensifica imaginación y unión.',
  },
  pluto: {
    Aries: 'Plutón en Aries transforma identidad y voluntad primaria.',
    Taurus: 'Plutón en Tauro transforma valores y apegos materiales.',
    Gemini: 'Plutón en Géminis transforma pensamiento y poder de información.',
    Cancer: 'Plutón en Cáncer transforma familia y raíces emocionales.',
    Leo: 'Plutón en Leo transforma fuerza creativa y orgullo personal.',
    Virgo: 'Plutón en Virgo transforma trabajo, salud y análisis.',
    Libra: 'Plutón en Libra transforma relaciones y contratos sociales.',
    Scorpio: 'Plutón en Escorpio intensifica regeneración y búsqueda de verdad.',
    Sagittarius: 'Plutón en Sagitario transforma visión del mundo y expansión.',
    Capricorn: 'Plutón en Capricornio transforma instituciones y poder.',
    Aquarius: 'Plutón en Acuario transforma comunidades y progreso colectivo.',
    Pisces: 'Plutón en Piscis transforma espiritualidad y procesos invisibles.',
  },
  north_node: {
    Aries: 'Nodo Norte en Aries llama a desarrollar independencia y valentía.',
    Taurus: 'Nodo Norte en Tauro dirige a construir estabilidad y autovaloración.',
    Gemini: 'Nodo Norte en Géminis fomenta comunicación y aprendizaje.',
    Cancer: 'Nodo Norte en Cáncer enfoca en seguridad emocional y cuidado.',
    Leo: 'Nodo Norte en Leo promueve autoexpresión y liderazgo.',
    Virgo: 'Nodo Norte en Virgo enfatiza servicio y habilidades prácticas.',
    Libra: 'Nodo Norte en Libra enseña balance y relaciones armoniosas.',
    Scorpio: 'Nodo Norte en Escorpio requiere transformación e intimidad.',
    Sagittarius: 'Nodo Norte en Sagitario expande horizontes y filosofía.',
    Capricorn: 'Nodo Norte en Capricornio construye responsabilidad y estructura.',
    Aquarius: 'Nodo Norte en Acuario promueve innovaciones y comunidad.',
    Pisces: 'Nodo Norte en Piscis desarrolla compasión y espiritualidad.',
  },
  south_node: {
    Aries: 'Nodo Sur en Aries indica independencia pasada para balance.',
    Taurus: 'Nodo Sur en Tauro muestra patrones cómodos para soltar.',
    Gemini: 'Nodo Sur en Géminis revela hábitos de comunicación para evolución.',
    Cancer: 'Nodo Sur en Cáncer indica dependencias emocionales para sanación.',
    Leo: 'Nodo Sur en Leo sugiere orgullo creativo para suavizar.',
    Virgo: 'Nodo Sur en Virgo indica patrones de servicio para transformación.',
    Libra: 'Nodo Sur en Libra muestra dinámica de relaciones para balance.',
    Scorpio: 'Nodo Sur en Escorpio revela problemas de poder para resolución.',
    Sagittarius: 'Nodo Sur en Sagitario indica convicciones para expansión.',
    Capricorn: 'Nodo Sur en Capricornio indica estructuras para reestructuración.',
    Aquarius: 'Nodo Sur en Acuario muestra desapego para integración.',
    Pisces: 'Nodo Sur en Piscis revela ilusiones para clarificación.',
  },
  lilith: {
    Aries: 'Lilith en Aries expresa poder femenino crudo e independencia.',
    Taurus: 'Lilith en Tauro se rebela contra limitaciones materiales y valores.',
    Gemini: 'Lilith en Géminis desafía normas de comunicación y curiosidad.',
    Cancer: 'Lilith en Cáncer confronta vulnerabilidad emocional y cuidado.',
    Leo: 'Lilith en Leo rechaza orgullo falso y exige expresión auténtica.',
    Virgo: 'Lilith en Virgo resiste perfeccionismo y acepta imperfección.',
    Libra: 'Lilith en Libra desafía armonía superficial y justicia.',
    Scorpio: 'Lilith en Escorpio encarna poder femenino oscuro y verdad.',
    Sagittarius: 'Lilith en Sagitario rechaza dogmas y busca libertad.',
    Capricorn: 'Lilith en Capricornio rechaza autoridad y construye poder auténtico.',
    Aquarius: 'Lilith en Acuario revoluciona normas y acepta singularidad.',
    Pisces: 'Lilith en Piscis disuelve límites y acepta misterio.',
  },
  chiron: {
    Aries: 'Quirón en Aries sana heridas de identidad y autoafirmación.',
    Taurus: 'Quirón en Tauro toca heridas de autovaloración y seguridad.',
    Gemini: 'Quirón en Géminis sana traumas de comunicación y aprendizaje.',
    Cancer: 'Quirón en Cáncer cura heridas emocionales y familiares.',
    Leo: 'Quirón en Leo sana heridas de expresión creativa y reconocimiento.',
    Virgo: 'Quirón en Virgo toca heridas de salud y servicio.',
    Libra: 'Quirón en Libra sana heridas de relaciones y balance.',
    Scorpio: 'Quirón en Escorpio transforma trauma profundo y heridas de poder.',
    Sagittarius: 'Quirón en Sagitario sana heridas de convicciones y expansión.',
    Capricorn: 'Quirón en Capricornio toca heridas de autoridad y estructura.',
    Aquarius: 'Quirón en Acuario sana heridas de desapego y comunidad.',
    Pisces: 'Quirón en Piscis cura heridas espirituales y de límites.',
  },
};

// Detailed house interpretations by sign
export const HOUSE_SIGN_INTERPRETATIONS_ES: Partial<
  Record<number, Partial<Record<Sign, string>>>
> = {
  1: {
    Aries: 'Casa 1 en Aries te hace brillante y dinámico en autoexpresión. Produces impresión de líder seguro, siempre listo para la acción. Tu personalidad irradia energía e iniciativa, lo que atrae a otros y ayuda a alcanzar metas.',
    Taurus: 'Casa 1 en Tauro da a tu personalidad estabilidad y confiabilidad. Pareces persona calmada y aterrizada que valora comodidad y belleza. Tu autoexpresión es práctica y sensual, creando impresión de compañero confiable.',
    Gemini: 'Casa 1 en Géminis te hace comunicativo y flexible en autoexpresión. Produces impresión de persona inteligente y adaptativa que establece contactos fácilmente. Tu personalidad es curiosa y vivaz, lo que ayuda en comunicación y aprendizaje.',
    Cancer: 'Casa 1 en Cáncer da a tu personalidad cuidado e intuición. Pareces persona sensible y hogareña que crea atmósfera acogedora. Tu autoexpresión es emocional y cuidadosa, lo que ayuda en relaciones cercanas.',
    Leo: 'Casa 1 en Leo te hace brillante y seguro en autoexpresión. Produces impresión de líder carismático que ama estar en centro de atención. Tu personalidad es creativa y generosa, lo que inspira a otros.',
    Virgo: 'Casa 1 en Virgo da a tu personalidad pulcritud y atención. Pareces persona práctica y confiable que presta atención a detalles. Tu autoexpresión es sistemática y servicial, lo que ayuda en trabajo y cuidado de otros.',
    Libra: 'Casa 1 en Libra te hace diplomático y estético en autoexpresión. Produces impresión de persona armoniosa y táctil que valora belleza. Tu personalidad es equilibrada y asociativa, lo que ayuda en relaciones.',
    Scorpio: 'Casa 1 en Escorpio da a tu personalidad profundidad y magnetismo. Pareces persona misteriosa y fuerte que posee poder interno. Tu autoexpresión es intensa y transformadora, lo que atrae conexiones profundas.',
    Sagittarius: 'Casa 1 en Sagitario te hace optimista y directo en autoexpresión. Produces impresión de filósofo y buscador de aventuras. Tu personalidad es abierta y honesta, lo que ayuda en aprendizaje y viajes.',
    Capricorn: 'Casa 1 en Capricornio da a tu personalidad responsabilidad y ambición. Pareces persona disciplinada y estratégica que construye planes a largo plazo. Tu autoexpresión es práctica y decidida.',
    Aquarius: 'Casa 1 en Acuario te hace original e independiente en autoexpresión. Produces impresión de innovador y humanista que piensa de manera no convencional. Tu personalidad es objetiva y amistosa, lo que ayuda en comunidad.',
    Pisces: 'Casa 1 en Piscis da a tu personalidad empatía y creatividad. Pareces persona soñadora e intuitiva con rica imaginación. Tu autoexpresión es compasiva e inspiradora.',
  },
  2: {
    Aries: 'Casa 2 en Aries hace tu actitud hacia finanzas activa e iniciativa. Ganas a través de acciones audaces y liderazgo. Tus valores están vinculados con independencia y logro, lo que ayuda en crecimiento financiero.',
    Taurus: 'Casa 2 en Tauro intensifica practicidad en asuntos financieros. Valoras estabilidad y comodidad material. Tus valores están vinculados con confiabilidad y placeres sensuales, lo que ayuda a acumular recursos.',
    Gemini: 'Casa 2 en Géminis hace tu pensamiento financiero flexible y comunicativo. Ganas a través de comunicación y aprendizaje. Tus valores están vinculados con diversidad y adaptabilidad, lo que ayuda en diferentes áreas.',
    Cancer: 'Casa 2 en Cáncer da emocionalidad a asuntos financieros. Valoras seguridad y valores familiares. Tus recursos están vinculados con cuidado y hogar, lo que ayuda en acumulación estable.',
    Leo: 'Casa 2 en Leo hace tu actitud hacia finanzas generosa y creativa. Ganas a través de autoexpresión y liderazgo. Tus valores están vinculados con reconocimiento y magnanimidad.',
    Virgo: 'Casa 2 en Virgo da practicidad y atención a detalles en finanzas. Valoras enfoque sistemático de recursos. Tus valores están vinculados con servicio y eficiencia, lo que ayuda en crecimiento estable.',
    Libra: 'Casa 2 en Libra hace tu pensamiento financiero diplomático y estético. Valoras armonía en asociaciones. Tus recursos están vinculados con belleza y balance en relaciones.',
    Scorpio: 'Casa 2 en Escorpio da profundidad e intensidad a asuntos financieros. Valoras transformación y recursos compartidos. Tus valores están vinculados con fuerza y profundidad, lo que ayuda en crisis.',
    Sagittarius: 'Casa 2 en Sagitario hace tu actitud hacia finanzas optimista y amplia. Valoras libertad y viajes. Tus recursos están vinculados con filosofía y expansión de horizontes.',
    Capricorn: 'Casa 2 en Capricornio da disciplina y ambición a finanzas. Valoras inversiones a largo plazo. Tus valores están vinculados con responsabilidad y estructura, lo que ayuda en crecimiento estable.',
    Aquarius: 'Casa 2 en Acuario hace tu pensamiento financiero innovador e independiente. Valoras proyectos sociales. Tus recursos están vinculados con comunidad y progreso.',
    Pisces: 'Casa 2 en Piscis da intuición y compasión a asuntos financieros. Valoras valores espirituales. Tus recursos están vinculados con imaginación y ayuda a otros.',
  },
  3: {
    Aries: 'Casa 3 en Aries hace tu pensamiento rápido y directo. Te comunicas y aprendes eficientemente a través de acción. Tu comunicación es iniciativa y enérgica, lo que ayuda en aprendizaje y contactos.',
    Taurus: 'Casa 3 en Tauro da practicidad y secuencia al pensamiento. Aprendes a través de experiencia y valoras estabilidad. Tu comunicación es confiable y sensual, lo que ayuda en comunicación cercana.',
    Gemini: 'Casa 3 en Géminis intensifica curiosidad y flexibilidad de mente. Eres maestro de comunicación y aprendizaje. Tu comunicación es vivaz y adaptativa, lo que ayuda en contactos diversos.',
    Cancer: 'Casa 3 en Cáncer da emocionalidad e intuición al pensamiento. Aprendes a través de sentimientos y cuidado. Tu comunicación es sensible y familiar, lo que ayuda en conexiones cercanas.',
    Leo: 'Casa 3 en Leo hace tu autoexpresión brillante y creativa. Aprendes a través de autoexpresión. Tu comunicación es segura e inspiradora, lo que ayuda en enseñanza.',
    Virgo: 'Casa 3 en Virgo da analítica y atención a detalles al pensamiento. Aprendes a través de análisis y servicio. Tu comunicación es precisa y práctica, lo que ayuda en aprendizaje.',
    Libra: 'Casa 3 en Libra hace tu pensamiento diplomático y estético. Aprendes a través de armonía. Tu comunicación es táctil y equilibrada, lo que ayuda en asociaciones.',
    Scorpio: 'Casa 3 en Escorpio da profundidad e intensidad al pensamiento. Aprendes a través de transformación. Tu comunicación es perspicaz y poderosa, lo que ayuda en conexiones profundas.',
    Sagittarius: 'Casa 3 en Sagitario hace tu pensamiento amplio y filosófico. Aprendes a través de viajes. Tu comunicación es honesta y optimista, lo que ayuda en aprendizaje.',
    Capricorn: 'Casa 3 en Capricornio da disciplina y ambición al pensamiento. Aprendes a través de estructura. Tu comunicación es responsable y estratégica, lo que ayuda en carrera.',
    Aquarius: 'Casa 3 en Acuario hace tu pensamiento innovador e independiente. Aprendes a través de comunidad. Tu comunicación es original y objetiva, lo que ayuda en progreso.',
    Pisces: 'Casa 3 en Piscis da intuición e imaginación al pensamiento. Aprendes a través de empatía. Tu comunicación es compasiva y creativa, lo que ayuda en arte.',
  },
  4: {
    Aries: 'Casa 4 en Aries hace tu hogar activo e iniciativo. Creas atmósfera familiar enérgica. Tus raíces están vinculadas con independencia y acción, lo que ayuda en nuevos comienzos.',
    Taurus: 'Casa 4 en Tauro da estabilidad y comodidad al hogar. Valoras seguridad material. Tus raíces están vinculadas con practicidad y placeres sensuales, lo que crea comodidad.',
    Gemini: 'Casa 4 en Géminis hace tu hogar comunicativo y flexible. Valoras atmósfera intelectual. Tus raíces están vinculadas con aprendizaje y diversidad, lo que ayuda en adaptación.',
    Cancer: 'Casa 4 en Cáncer intensifica emocionalidad y cuidado en familia. Creas atmósfera de amor. Tus raíces están vinculadas con intuición y hogar, lo que da seguridad profunda.',
    Leo: 'Casa 4 en Leo hace tu hogar brillante y creativo. Valoras autoexpresión en familia. Tus raíces están vinculadas con orgullo y magnanimidad, lo que crea atmósfera inspiradora.',
    Virgo: 'Casa 4 en Virgo da practicidad y orden al hogar. Valoras enfoque sistemático de familia. Tus raíces están vinculadas con servicio y salud, lo que crea estabilidad.',
    Libra: 'Casa 4 en Libra hace tu hogar armonioso y estético. Valoras asociación en familia. Tus raíces están vinculadas con balance y belleza, lo que crea atmósfera pacífica.',
    Scorpio: 'Casa 4 en Escorpio da profundidad e intensidad a familia. Valoras transformación. Tus raíces están vinculadas con fuerza y profundidad, lo que ayuda en crisis.',
    Sagittarius: 'Casa 4 en Sagitario hace tu hogar optimista y abierto. Valoras viajes. Tus raíces están vinculadas con libertad y filosofía, lo que expande horizontes.',
    Capricorn: 'Casa 4 en Capricornio da responsabilidad y ambición al hogar. Construyes base sólida. Tus raíces están vinculadas con disciplina y estructura, lo que da estabilidad.',
    Aquarius: 'Casa 4 en Acuario hace tu hogar innovador e independiente. Valoras progreso. Tus raíces están vinculadas con comunidad y originalidad, lo que ayuda en cambios.',
    Pisces: 'Casa 4 en Piscis da compasión e imaginación al hogar. Creas atmósfera de amor. Tus raíces están vinculadas con empatía y espiritualidad, lo que da conexión profunda.',
  },
  5: {
    Aries: 'Casa 5 en Aries hace tu creatividad activa e iniciativa. Te expresas a través de acción. Tus hijos y romance están vinculados con energía y valentía, lo que trae alegría.',
    Taurus: 'Casa 5 en Tauro da practicidad y sensualidad a creatividad. Disfrutas de comodidad. Tus hijos y romance están vinculados con estabilidad y placeres.',
    Gemini: 'Casa 5 en Géminis hace tu creatividad flexible y comunicativa. Amas diversidad. Tus hijos y romance están vinculados con aprendizaje y comunicación.',
    Cancer: 'Casa 5 en Cáncer da cuidado y emocionalidad a creatividad. Amas cuidar. Tus hijos y romance están vinculados con familia y seguridad.',
    Leo: 'Casa 5 en Leo intensifica creatividad y autoexpresión. Amas estar en centro. Tus hijos y romance están vinculados con orgullo y magnanimidad.',
    Virgo: 'Casa 5 en Virgo da practicidad y atención a detalles a creatividad. Amas servir. Tus hijos y romance están vinculados con cuidado y salud.',
    Libra: 'Casa 5 en Libra hace tu creatividad armoniosa y estética. Amas belleza. Tus hijos y romance están vinculados con asociación y balance.',
    Scorpio: 'Casa 5 en Escorpio da profundidad e intensidad a creatividad. Amas transformación. Tus hijos y romance están vinculados con fuerza y profundidad.',
    Sagittarius: 'Casa 5 en Sagitario hace tu creatividad optimista y amplia. Amas libertad. Tus hijos y romance están vinculados con viajes y filosofía.',
    Capricorn: 'Casa 5 en Capricornio da responsabilidad y ambición a creatividad. Construyes futuro. Tus hijos y romance están vinculados con disciplina y metas.',
    Aquarius: 'Casa 5 en Acuario hace tu creatividad innovadora e independiente. Amas progreso. Tus hijos y romance están vinculados con comunidad y originalidad.',
    Pisces: 'Casa 5 en Piscis da imaginación y compasión a creatividad. Amas soñar. Tus hijos y romance están vinculados con empatía y espiritualidad.',
  },
  6: {
    Aries: 'Casa 6 en Aries hace tu servicio activo e iniciativo. Actúas decididamente. Tu salud y trabajo están vinculados con energía y liderazgo, lo que ayuda en superación.',
    Taurus: 'Casa 6 en Tauro da practicidad y estabilidad al servicio. Valoras comodidad. Tu salud y trabajo están vinculados con placeres sensuales y confiabilidad.',
    Gemini: 'Casa 6 en Géminis hace tu servicio flexible y comunicativo. Amas diversidad. Tu salud y trabajo están vinculados con aprendizaje y comunicación.',
    Cancer: 'Casa 6 en Cáncer da cuidado y emocionalidad al servicio. Amas cuidar. Tu salud y trabajo están vinculados con familia y seguridad.',
    Leo: 'Casa 6 en Leo hace tu servicio brillante y creativo. Amas inspirar. Tu salud y trabajo están vinculados con autoexpresión y orgullo.',
    Virgo: 'Casa 6 en Virgo intensifica atención a detalles y sistemática en servicio. Eres maestro de análisis. Tu salud y trabajo están vinculados con perfección y cuidado.',
    Libra: 'Casa 6 en Libra hace tu servicio armonioso y estético. Amas balance. Tu salud y trabajo están vinculados con asociación y belleza.',
    Scorpio: 'Casa 6 en Escorpio da profundidad e intensidad al servicio. Amas transformación. Tu salud y trabajo están vinculados con fuerza y profundidad.',
    Sagittarius: 'Casa 6 en Sagitario hace tu servicio optimista y amplio. Amas libertad. Tu salud y trabajo están vinculados con viajes y filosofía.',
    Capricorn: 'Casa 6 en Capricornio da responsabilidad y ambición al servicio. Construyes carrera. Tu salud y trabajo están vinculados con disciplina y metas.',
    Aquarius: 'Casa 6 en Acuario hace tu servicio innovador e independiente. Amas progreso. Tu salud y trabajo están vinculados con comunidad y originalidad.',
    Pisces: 'Casa 6 en Piscis da compasión e imaginación al servicio. Amas ayudar. Tu salud y trabajo están vinculados con empatía y espiritualidad.',
  },
  7: {
    Aries: 'Casa 7 en Aries hace tus asociaciones activas e iniciativas. Buscas compañero igual. Tus relaciones están vinculadas con energía e independencia, lo que trae dinámica.',
    Taurus: 'Casa 7 en Tauro da estabilidad y practicidad a asociaciones. Valoras confiabilidad. Tus relaciones están vinculadas con comodidad y placeres sensuales.',
    Gemini: 'Casa 7 en Géminis hace asociaciones flexibles y comunicativas. Amas comunicación. Tus relaciones están vinculadas con aprendizaje y diversidad.',
    Cancer: 'Casa 7 en Cáncer da cuidado y emocionalidad a asociaciones. Buscas cuidado. Tus relaciones están vinculadas con familia y seguridad.',
    Leo: 'Casa 7 en Leo hace asociaciones brillantes y creativas. Amas atención. Tus relaciones están vinculadas con autoexpresión y orgullo.',
    Virgo: 'Casa 7 en Virgo da practicidad y atención a detalles a asociaciones. Valoras servicio. Tus relaciones están vinculadas con cuidado y salud.',
    Libra: 'Casa 7 en Libra intensifica armonía y estética en asociaciones. Eres maestro de diplomacia. Tus relaciones están vinculadas con balance y belleza.',
    Scorpio: 'Casa 7 en Escorpio da profundidad e intensidad a asociaciones. Buscas transformación. Tus relaciones están vinculadas con fuerza y profundidad.',
    Sagittarius: 'Casa 7 en Sagitario hace asociaciones optimistas y amplias. Amas libertad. Tus relaciones están vinculadas con viajes y filosofía.',
    Capricorn: 'Casa 7 en Capricornio da responsabilidad y ambición a asociaciones. Construyes futuro. Tus relaciones están vinculadas con disciplina y metas.',
    Aquarius: 'Casa 7 en Acuario hace asociaciones innovadoras e independientes. Valoras igualdad. Tus relaciones están vinculadas con comunidad y progreso.',
    Pisces: 'Casa 7 en Piscis da compasión e imaginación a asociaciones. Buscas alma. Tus relaciones están vinculadas con empatía y espiritualidad.',
  },
  8: {
    Aries: 'Casa 8 en Aries hace transformación activa e iniciativa. Actúas audazmente. Tus crisis y recursos compartidos están vinculados con energía e independencia.',
    Taurus: 'Casa 8 en Tauro da practicidad y estabilidad a transformación. Valoras seguridad. Tus crisis y recursos están vinculados con comodidad y confiabilidad.',
    Gemini: 'Casa 8 en Géminis hace transformación flexible y comunicativa. Te adaptas. Tus crisis y recursos están vinculados con aprendizaje y diversidad.',
    Cancer: 'Casa 8 en Cáncer da emocionalidad y cuidado a transformación. Sientes profundamente. Tus crisis y recursos están vinculados con familia y seguridad.',
    Leo: 'Casa 8 en Leo hace transformación brillante y creativa. Expresas fuerza. Tus crisis y recursos están vinculados con autoexpresión y orgullo.',
    Virgo: 'Casa 8 en Virgo da practicidad y atención a detalles a transformación. Analizas. Tus crisis y recursos están vinculados con cuidado y salud.',
    Libra: 'Casa 8 en Libra hace transformación armoniosa y estética. Buscas balance. Tus crisis y recursos están vinculados con asociación y belleza.',
    Scorpio: 'Casa 8 en Escorpio intensifica profundidad e intensidad de transformación. Eres maestro de crisis. Tus crisis y recursos están vinculados con fuerza y profundidad.',
    Sagittarius: 'Casa 8 en Sagitario hace transformación optimista y amplia. Buscas sentido. Tus crisis y recursos están vinculados con viajes y filosofía.',
    Capricorn: 'Casa 8 en Capricornio da responsabilidad y ambición a transformación. Construyes de nuevo. Tus crisis y recursos están vinculados con disciplina y metas.',
    Aquarius: 'Casa 8 en Acuario hace transformación innovadora e independiente. Cambias sistema. Tus crisis y recursos están vinculados con comunidad y progreso.',
    Pisces: 'Casa 8 en Piscis da compasión e imaginación a transformación. Disuelves. Tus crisis y recursos están vinculados con empatía y espiritualidad.',
  },
  9: {
    Aries: 'Casa 9 en Aries hace tu visión del mundo activa e iniciativa. Actúas audazmente. Tus viajes y filosofía están vinculados con energía e independencia.',
    Taurus: 'Casa 9 en Tauro da practicidad y estabilidad a visión del mundo. Valoras comodidad. Tus viajes y filosofía están vinculados con confiabilidad y placeres.',
    Gemini: 'Casa 9 en Géminis hace visión del mundo flexible y comunicativa. Amas aprender. Tus viajes y filosofía están vinculados con diversidad y comunicación.',
    Cancer: 'Casa 9 en Cáncer da cuidado y emocionalidad a visión del mundo. Sientes conexión. Tus viajes y filosofía están vinculados con familia y seguridad.',
    Leo: 'Casa 9 en Leo hace visión del mundo brillante y creativa. Inspiras. Tus viajes y filosofía están vinculados con autoexpresión y orgullo.',
    Virgo: 'Casa 9 en Virgo da practicidad y atención a detalles a visión del mundo. Analizas. Tus viajes y filosofía están vinculados con servicio y salud.',
    Libra: 'Casa 9 en Libra hace visión del mundo armoniosa y estética. Buscas balance. Tus viajes y filosofía están vinculados con belleza y asociación.',
    Scorpio: 'Casa 9 en Escorpio da profundidad e intensidad a visión del mundo. Penetras en esencia. Tus viajes y filosofía están vinculados con fuerza y transformación.',
    Sagittarius: 'Casa 9 en Sagitario intensifica optimismo y amplitud de visión del mundo. Eres buscador. Tus viajes y filosofía están vinculados con libertad y sentido.',
    Capricorn: 'Casa 9 en Capricornio da responsabilidad y ambición a visión del mundo. Construyes futuro. Tus viajes y filosofía están vinculados con disciplina y metas.',
    Aquarius: 'Casa 9 en Acuario hace visión del mundo innovadora e independiente. Cambias mundo. Tus viajes y filosofía están vinculados con progreso y comunidad.',
    Pisces: 'Casa 9 en Piscis da imaginación y compasión a visión del mundo. Te conectas. Tus viajes y filosofía están vinculados con empatía y unión.',
  },
  10: {
    Aries: 'Casa 10 en Aries hace tu carrera activa e iniciativa. Eres líder. Tu vida pública está vinculada con energía e independencia, lo que ayuda en logros.',
    Taurus: 'Casa 10 en Tauro da practicidad y estabilidad a carrera. Eres confiable. Tu vida pública está vinculada con comodidad y valores materiales.',
    Gemini: 'Casa 10 en Géminis hace carrera flexible y comunicativa. Eres adaptativo. Tu vida pública está vinculada con aprendizaje y diversidad de contactos.',
    Cancer: 'Casa 10 en Cáncer da cuidado y emocionalidad a carrera. Cuidas. Tu vida pública está vinculada con familia y seguridad.',
    Leo: 'Casa 10 en Leo hace carrera brillante y creativa. Inspiras. Tu vida pública está vinculada con autoexpresión y reconocimiento.',
    Virgo: 'Casa 10 en Virgo da practicidad y atención a detalles a carrera. Sirves. Tu vida pública está vinculada con cuidado y eficiencia.',
    Libra: 'Casa 10 en Libra hace carrera armoniosa y estética. Eres diplomático. Tu vida pública está vinculada con asociación y belleza.',
    Scorpio: 'Casa 10 en Escorpio da profundidad e intensidad a carrera. Transformas. Tu vida pública está vinculada con fuerza y profundidad.',
    Sagittarius: 'Casa 10 en Sagitario hace carrera optimista y amplia. Expandes. Tu vida pública está vinculada con viajes y filosofía.',
    Capricorn: 'Casa 10 en Capricornio intensifica responsabilidad y ambición en carrera. Construyes. Tu vida pública está vinculada con disciplina y logros.',
    Aquarius: 'Casa 10 en Acuario hace carrera innovadora e independiente. Cambias. Tu vida pública está vinculada con progreso y comunidad.',
    Pisces: 'Casa 10 en Piscis da compasión e imaginación a carrera. Ayudas. Tu vida pública está vinculada con empatía y espiritualidad.',
  },
  11: {
    Aries: 'Casa 11 en Aries hace tus metas activas e iniciativas. Actúas audazmente. Tus amigos y aspiraciones están vinculados con energía e independencia.',
    Taurus: 'Casa 11 en Tauro da practicidad y estabilidad a metas. Eres confiable. Tus amigos y aspiraciones están vinculados con comodidad y valores materiales.',
    Gemini: 'Casa 11 en Géminis hace metas flexibles y comunicativas. Eres adaptativo. Tus amigos y aspiraciones están vinculados con aprendizaje y diversidad.',
    Cancer: 'Casa 11 en Cáncer da cuidado y emocionalidad a metas. Cuidas. Tus amigos y aspiraciones están vinculados con familia y seguridad.',
    Leo: 'Casa 11 en Leo hace metas brillantes y creativas. Inspiras. Tus amigos y aspiraciones están vinculados con autoexpresión y reconocimiento.',
    Virgo: 'Casa 11 en Virgo da practicidad y atención a detalles a metas. Sirves. Tus amigos y aspiraciones están vinculados con cuidado y eficiencia.',
    Libra: 'Casa 11 en Libra hace metas armoniosas y estéticas. Eres diplomático. Tus amigos y aspiraciones están vinculados con asociación y belleza.',
    Scorpio: 'Casa 11 en Escorpio da profundidad e intensidad a metas. Transformas. Tus amigos y aspiraciones están vinculados con fuerza y profundidad.',
    Sagittarius: 'Casa 11 en Sagitario hace metas optimistas y amplias. Expandes. Tus amigos y aspiraciones están vinculados con viajes y filosofía.',
    Capricorn: 'Casa 11 en Capricornio da responsabilidad y ambición a metas. Construyes. Tus amigos y aspiraciones están vinculados con disciplina y logros.',
    Aquarius: 'Casa 11 en Acuario intensifica innovación e independencia en metas. Cambias. Tus amigos y aspiraciones están vinculados con progreso y comunidad.',
    Pisces: 'Casa 11 en Piscis da compasión e imaginación a metas. Ayudas. Tus amigos y aspiraciones están vinculados con empatía y espiritualidad.',
  },
  12: {
    Aries: 'Casa 12 en Aries hace tu subconsciente activo e iniciativo. Actúas intuitivamente. Tus secretos y espiritualidad están vinculados con energía e independencia.',
    Taurus: 'Casa 12 en Tauro da practicidad y estabilidad al subconsciente. Estás aterrizado. Tus secretos y espiritualidad están vinculados con comodidad y valores materiales.',
    Gemini: 'Casa 12 en Géminis hace subconsciente flexible y comunicativo. Eres adaptativo. Tus secretos y espiritualidad están vinculados con aprendizaje y diversidad.',
    Cancer: 'Casa 12 en Cáncer da cuidado y emocionalidad al subconsciente. Sientes. Tus secretos y espiritualidad están vinculados con familia y seguridad.',
    Leo: 'Casa 12 en Leo hace subconsciente brillante y creativo. Expresas. Tus secretos y espiritualidad están vinculados con autoexpresión y orgullo.',
    Virgo: 'Casa 12 en Virgo da practicidad y atención a detalles al subconsciente. Analizas. Tus secretos y espiritualidad están vinculados con cuidado y salud.',
    Libra: 'Casa 12 en Libra hace subconsciente armonioso y estético. Balanceas. Tus secretos y espiritualidad están vinculados con asociación y belleza.',
    Scorpio: 'Casa 12 en Escorpio da profundidad e intensidad al subconsciente. Transformas. Tus secretos y espiritualidad están vinculados con fuerza y profundidad.',
    Sagittarius: 'Casa 12 en Sagitario hace subconsciente optimista y amplio. Expandes. Tus secretos y espiritualidad están vinculados con viajes y filosofía.',
    Capricorn: 'Casa 12 en Capricornio da responsabilidad y ambición al subconsciente. Construyes. Tus secretos y espiritualidad están vinculados con disciplina y metas.',
    Aquarius: 'Casa 12 en Acuario hace subconsciente innovador e independiente. Cambias. Tus secretos y espiritualidad están vinculados con progreso y comunidad.',
    Pisces: 'Casa 12 en Piscis intensifica imaginación y compasión en subconsciente. Te conectas. Tus secretos y espiritualidad están vinculados con empatía y unión.',
  },
};

// Ascendant short texts
export const ASCENDANT_ES: Partial<Record<Sign, string>> = {
  Aries: 'Ascendente en Aries te hace enérgico, directo e iniciativo. Produces impresión de líder seguro.',
  Taurus: 'Ascendente en Tauro te da calma, confiabilidad y practicidad. Pareces persona estable y aterrizada.',
  Gemini: 'Ascendente en Géminis da vivacidad, comunicabilidad y flexibilidad. Tu presentación es ligera y curiosa.',
  Cancer: 'Ascendente en Cáncer añade cuidado, intuición y suavidad. Eres percibido como persona sensible y hogareña.',
  Leo: 'Ascendente en Leo da brillo, confianza y generosidad. Tu imagen es expresiva y atractiva.',
  Virgo: 'Ascendente en Virgo enfatiza pulcritud, atención y practicidad. Pareces persona confiable y organizada.',
  Libra: 'Ascendente en Libra busca armonía, balance y estética. Interactúas suavemente y diplomáticamente.',
  Scorpio: 'Ascendente en Escorpio da intensidad, profundidad y magnetismo. Produces impresión fuerte y misteriosa.',
  Sagittarius: 'Ascendente en Sagitario aporta apertura, franqueza y optimismo. Eres percibido como persona de ideas y viajes.',
  Capricorn: 'Ascendente en Capricornio enfatiza responsabilidad, resistencia y ambición. Tu presentación es reservada y profesional.',
  Aquarius: 'Ascendente en Acuario da originalidad, independencia y amabilidad. Pareces innovador y humanista.',
  Pisces: 'Ascendente en Piscis añade suavidad, inspiración y empatía. Eres percibido como soñador y romántico.',
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
    saturn: [
      'mañana exige planificación para',
      'mañana organiza y sistematiza',
    ],
    mars: ['mañana trae impulso para', 'mañana puedes acelerar en'],
    neutral: ['mañana enfócate en', 'mañana continúa refinando'],
  },
  'На этой неделе': {
    jupiter: [
      'esta semana favorece crecer en',
      'esta semana apoya el escalado de',
    ],
    saturn: ['esta semana requiere', 'esta semana es para estructurar'],
    mars: ['esta semana añade empuje para', 'esta semana permite un avance en'],
    neutral: [
      'esta semana conviene trabajo constante en',
      'esta semana consolida resultados en',
    ],
  },
  'В этом месяце': {
    jupiter: [
      'este mes abre crecimiento en',
      'este mes apoya iniciativas estratégicas en',
    ],
    saturn: ['este mes llama a', 'este mes es para disciplina en'],
    mars: [
      'este mes añade energía para progresar en',
      'este mes fortalece el momentum en',
    ],
    neutral: [
      'este mes favorece el desarrollo de',
      'este mes mejora procesos en',
    ],
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
      jupiter:
        'Mercurio trígono Júpiter trae claridad, aprendizaje y oportunidad.',
    },
  },
  square: {
    mars: {
      saturn:
        'Marte cuadratura Saturno exige paciencia y disciplina estructurada.',
    },
  },
};

// Ascendant meta
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
  Gemini: {
    keywords: ['comunicativo', 'flexible', 'curioso'],
    strengths: ['Facilidad de contacto', 'Mente rápida', 'Adaptabilidad'],
    challenges: ['Superficialidad', 'Dispersión de atención', 'Inconstancia'],
  },
  Cancer: {
    keywords: ['sensible', 'cuidadoso', 'intuitivo'],
    strengths: ['Empatía', 'Protección', 'Confort hogareño'],
    challenges: ['Vulnerabilidad', 'Reserva', 'Cambios de humor'],
  },
  Leo: {
    keywords: ['brillante', 'generoso', 'seguro'],
    strengths: ['Carisma', 'Creatividad', 'Magnanimidad'],
    challenges: ['Dramatismo', 'Orgullo', 'Necesidad de reconocimiento'],
  },
  Virgo: {
    keywords: ['pulcro', 'atento', 'práctico'],
    strengths: ['Sistemática', 'Servicio', 'Analítica'],
    challenges: ['Crítica', 'Ansiedad', 'Perfeccionismo'],
  },
  Libra: {
    keywords: ['diplomático', 'estético', 'equilibrado'],
    strengths: ['Tacto', 'Habilidad de negociar', 'Sentido de medida'],
    challenges: ['Vacilación', 'Dependencia de opinión ajena', 'Evasión de conflictos'],
  },
  Scorpio: {
    keywords: ['profundo', 'magnético', 'decidido'],
    strengths: ['Perspicacia', 'Fuerza de voluntad', 'Resistencia'],
    challenges: ['Sospecha', 'Celos', 'Intensidad'],
  },
  Sagittarius: {
    keywords: ['optimista', 'directo', 'filosófico'],
    strengths: ['Amplitud de visión', 'Entusiasmo', 'Honestidad'],
    challenges: ['Impulsividad', 'Falta de disciplina', 'Superficialidad'],
  },
  Capricorn: {
    keywords: ['responsable', 'ambicioso', 'práctico'],
    strengths: ['Disciplina', 'Confiabilidad', 'Estrategia'],
    challenges: ['Rigidez', 'Aislamiento', 'Sobrecarga'],
  },
  Aquarius: {
    keywords: ['original', 'independiente', 'humano'],
    strengths: ['Innovación', 'Amabilidad', 'Objetividad'],
    challenges: ['Desapego', 'Terquedad', 'Impracticidad'],
  },
  Pisces: {
    keywords: ['soñador', 'empático', 'creativo'],
    strengths: ['Intuición', 'Compasión', 'Imaginación'],
    challenges: ['Distracción', 'Sacrificio', 'Indefinición'],
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
