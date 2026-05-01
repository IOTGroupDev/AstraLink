import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { StackScreenProps } from '@react-navigation/stack';
import CosmicBackground from '../components/shared/CosmicBackground';
import CompactScreenHeader from '../components/shared/CompactScreenHeader';
import AstralCityInput from '../components/shared/AstralCityInput';
import AstralDateTimePicker from '../components/shared/DateTimePicker';
import { compatibilityAPI } from '../services/api';
import type { CityOption } from '../services/api/geo.api';
import type { RootStackParamList } from '../types/navigation';
import type {
  CompatibilityAspect,
  CompatibilityCategory,
  CompatibilityQuotaStatus,
  CompatibilityReport,
} from '../types/compatibility';
import { logger } from '../services/logger';
import { useSharedValue } from 'react-native-reanimated';

type Props = StackScreenProps<RootStackParamList, 'Compatibility'>;

type Copy = {
  title: string;
  subtitle: string;
  formTitle: string;
  date: string;
  time: string;
  place: string;
  ai: string;
  aiHint: string;
  submit: string;
  loading: string;
  history: string;
  noHistory: string;
  result: string;
  score: string;
  upgradeTitle: string;
  upgradeBody: string;
  upgradeAction: string;
  required: string;
  invalidDate: string;
  invalidTime: string;
  privacy: string;
  aiUnavailable: string;
  astrologySummaryTitle: string;
  astrologySummaryFallback: string;
  quotaTitle: string;
  quotaReset: string;
  quotaUnavailable: string;
  requestsThisWeek: string;
  duplicateRequest: string;
  deleteTitle: string;
  deleteBody: string;
  deleteAction: string;
  deleteFailed: string;
  cancel: string;
};

const copyByLocale = (language: string): Copy => {
  const lang = language.toLowerCase();
  if (lang.startsWith('en')) {
    return {
      title: 'Compatibility',
      subtitle: 'Private synastry check for a partner birth chart.',
      formTitle: 'Partner birth data',
      date: 'Birth date',
      time: 'Birth time',
      place: 'Birth place',
      ai: 'AI interpretation',
      aiHint:
        'Uses the calculated synastry; the core score is always algorithmic.',
      submit: 'Calculate compatibility',
      loading: 'Calculating',
      history: 'Recent reports',
      noHistory: 'No compatibility reports yet.',
      result: 'Current report',
      score: 'Score',
      upgradeTitle: 'Premium required',
      upgradeBody: 'Compatibility reports are available for Premium and MAX.',
      upgradeAction: 'View subscription',
      required: 'Fill in date, time, and place.',
      invalidDate: 'Use date format YYYY-MM-DD.',
      invalidTime: 'Use time format HH:mm.',
      privacy: 'Partner data is private and does not include a name.',
      aiUnavailable:
        'AI text is unavailable; the astrological score was saved.',
      astrologySummaryTitle: 'Why this score',
      astrologySummaryFallback:
        'The score is based on the calculated synastry aspects between both charts.',
      quotaTitle: 'Weekly AI requests',
      quotaReset: 'Resets',
      quotaUnavailable: 'Weekly request counter is unavailable.',
      requestsThisWeek: 'AI requests this week',
      duplicateRequest:
        'This compatibility request has already been calculated.',
      deleteTitle: 'Delete report?',
      deleteBody: 'This compatibility report will be removed permanently.',
      deleteAction: 'Delete',
      deleteFailed: 'Failed to delete report.',
      cancel: 'Cancel',
    };
  }

  if (lang.startsWith('es')) {
    return {
      title: 'Compatibilidad',
      subtitle: 'Sinastría privada basada en la carta natal de la pareja.',
      formTitle: 'Datos de nacimiento',
      date: 'Fecha de nacimiento',
      time: 'Hora de nacimiento',
      place: 'Lugar de nacimiento',
      ai: 'Interpretación AI',
      aiHint:
        'Usa la sinastría calculada; la puntuación base siempre es algorítmica.',
      submit: 'Calcular compatibilidad',
      loading: 'Calculando',
      history: 'Informes recientes',
      noHistory: 'Aún no hay informes.',
      result: 'Informe actual',
      score: 'Puntuación',
      upgradeTitle: 'Se requiere Premium',
      upgradeBody: 'Los informes están disponibles para Premium y MAX.',
      upgradeAction: 'Ver suscripción',
      required: 'Completa fecha, hora y lugar.',
      invalidDate: 'Usa el formato YYYY-MM-DD.',
      invalidTime: 'Usa el formato HH:mm.',
      privacy: 'Los datos de la pareja son privados y no incluyen nombre.',
      aiUnavailable:
        'AI no disponible; la puntuación astrológica fue guardada.',
      astrologySummaryTitle: 'Por qué esta puntuación',
      astrologySummaryFallback:
        'La puntuación se basa en los aspectos de sinastría calculados entre ambas cartas.',
      quotaTitle: 'Solicitudes AI semanales',
      quotaReset: 'Se reinicia',
      quotaUnavailable: 'El contador semanal no está disponible.',
      requestsThisWeek: 'solicitudes AI esta semana',
      duplicateRequest: 'Esta solicitud de compatibilidad ya fue calculada.',
      deleteTitle: '¿Eliminar informe?',
      deleteBody:
        'Este informe de compatibilidad se eliminará definitivamente.',
      deleteAction: 'Eliminar',
      deleteFailed: 'No se pudo eliminar el informe.',
      cancel: 'Cancelar',
    };
  }

  return {
    title: 'Совместимость',
    subtitle: 'Приватная синастрия по натальной карте партнера.',
    formTitle: 'Данные рождения партнера',
    date: 'Дата рождения',
    time: 'Время рождения',
    place: 'Место рождения',
    ai: 'AI-интерпретация',
    aiHint:
      'AI объясняет рассчитанную синастрию; базовый балл всегда алгоритмический.',
    submit: 'Проверить совместимость',
    loading: 'Расчет',
    history: 'Последние отчеты',
    noHistory: 'Пока нет отчетов совместимости.',
    result: 'Текущий отчет',
    score: 'Балл',
    upgradeTitle: 'Нужна подписка',
    upgradeBody: 'Отчеты совместимости доступны на Premium и MAX.',
    upgradeAction: 'Открыть подписку',
    required: 'Заполните дату, время и место рождения.',
    invalidDate: 'Используйте формат YYYY-MM-DD.',
    invalidTime: 'Используйте формат HH:mm.',
    privacy: 'Данные партнера приватны и не включают имя.',
    aiUnavailable: 'AI-текст недоступен; астрологический расчет сохранен.',
    astrologySummaryTitle: 'Почему такая совместимость',
    astrologySummaryFallback:
      'Балл основан на рассчитанных аспектах синастрии между двумя картами.',
    quotaTitle: 'AI-запросы на неделю',
    quotaReset: 'Обновится',
    quotaUnavailable: 'Счетчик недельных запросов недоступен.',
    requestsThisWeek: 'AI-запросов на этой неделе',
    duplicateRequest: 'Этот расчет совместимости уже был выполнен.',
    deleteTitle: 'Удалить отчет?',
    deleteBody: 'Этот отчет совместимости будет удален без восстановления.',
    deleteAction: 'Удалить',
    deleteFailed: 'Не удалось удалить отчет.',
    cancel: 'Отмена',
  };
};

const getCategoryDetailedDescription = (
  key: string,
  category: CompatibilityCategory,
  language: string
): string => {
  const score = Math.max(0, Math.min(100, Math.round(category.score)));
  const lang = language.toLowerCase();
  const band =
    score >= 80 ? 'high' : score >= 65 ? 'good' : score >= 45 ? 'mixed' : 'low';

  const detailsByKey: Record<
    string,
    Record<'ru' | 'en' | 'es', Record<typeof band, string>>
  > = {
    emotional: {
      ru: {
        high: 'Эмоциональный ритм хорошо совпадает: легче понимать реакции друг друга, угадывать настроение и восстанавливаться после напряжения. Такой показатель помогает строить теплую повседневную близость без постоянного объяснения базовых потребностей.',
        good: 'Эмоциональная связь в целом поддерживающая, но временами потребуются проговоренные договоренности о темпе, заботе и личном пространстве. Потенциал хороший, если не ждать, что партнер всегда почувствует все без слов.',
        mixed:
          'Эмоциональная динамика неоднородная: притяжение может сочетаться с разными реакциями на стресс, быт и уязвимость. Здесь особенно важны честные разговоры, мягкие границы и привычка уточнять, а не додумывать.',
        low: 'Эмоциональные потребности могут заметно различаться, поэтому без осознанности легко возникнут обиды или ощущение, что вас не слышат. Такая связь требует зрелой коммуникации и бережного отношения к различиям.',
      },
      en: {
        high: 'The emotional rhythm is strongly aligned: it is easier to read each other, recover after tension, and feel naturally supported. This score favors warm everyday closeness without constantly explaining basic needs.',
        good: 'The emotional bond is generally supportive, though agreements around care, pace, and personal space still matter. The potential is strong if neither person expects the other to intuit everything without words.',
        mixed:
          'The emotional dynamic is uneven: attraction may coexist with different stress responses, domestic habits, and vulnerability patterns. Honest conversations, soft boundaries, and clarification are especially important here.',
        low: 'Emotional needs may differ noticeably, so misunderstandings or a feeling of not being heard can arise quickly. This connection needs mature communication and careful respect for differences.',
      },
      es: {
        high: 'El ritmo emocional encaja bien: es más fácil leerse, recuperarse después de tensión y sentirse apoyados de forma natural. Este indicador favorece una cercanía cotidiana cálida sin explicar constantemente necesidades básicas.',
        good: 'El vínculo emocional es generalmente sostenedor, aunque conviene acordar cuidado, ritmo y espacio personal. El potencial es bueno si nadie espera que la otra persona lo intuya todo sin palabras.',
        mixed:
          'La dinámica emocional es irregular: la atracción puede convivir con distintas reacciones al estrés, la rutina y la vulnerabilidad. Aquí son claves las conversaciones honestas, límites suaves y aclarar antes de suponer.',
        low: 'Las necesidades emocionales pueden diferir bastante, por lo que pueden aparecer malentendidos o sensación de no ser escuchado. Esta conexión requiere comunicación madura y respeto cuidadoso por las diferencias.',
      },
    },
    attraction: {
      ru: {
        high: 'Притяжение выражено ярко: между картами есть энергия симпатии, интереса и телесно-эмоционального отклика. Важно не сводить все к химии — при таком показателе лучше сразу добавлять ясность намерений и уважение к темпу каждого.',
        good: 'Романтический потенциал заметный и может развиваться естественно, если поддерживать игру, внимание и взаимную инициативу. Напряжение возможно, но оно скорее добавляет динамики, чем разрушает контакт.',
        mixed:
          'Притяжение может быть волнообразным: периоды сильной химии способны сменяться сомнениями или разным пониманием близости. Здесь помогает не торопить события и смотреть, совпадают ли желания с реальными действиями.',
        low: 'Романтическая химия может требовать времени или осознанного раскрытия. Это не отменяет интереса, но показывает, что отношения лучше строить не только на импульсе, а на доверии, уважении и постепенном сближении.',
      },
      en: {
        high: 'Attraction is strongly emphasized: the charts show sympathy, curiosity, and a body-emotional response. The key is not to reduce everything to chemistry—clear intentions and respect for pace make this energy healthier.',
        good: 'Romantic potential is visible and can develop naturally through playfulness, attention, and mutual initiative. Some tension may appear, but it is more likely to add movement than break the connection.',
        mixed:
          'Attraction may come in waves: strong chemistry can alternate with doubts or different expectations of closeness. It helps to slow down and check whether desire is matched by consistent actions.',
        low: 'Romantic chemistry may need time or conscious opening. Interest is still possible, but the relationship is better built on trust, respect, and gradual closeness rather than impulse alone.',
      },
      es: {
        high: 'La atracción está muy marcada: las cartas muestran simpatía, curiosidad y respuesta corporal-emocional. La clave es no reducir todo a química; claridad de intención y respeto por el ritmo vuelven esta energía más sana.',
        good: 'El potencial romántico es visible y puede crecer con juego, atención e iniciativa mutua. Puede haber tensión, pero tiende más a dar movimiento que a romper el contacto.',
        mixed:
          'La atracción puede ser ondulante: la química fuerte puede alternar con dudas o distintas expectativas de cercanía. Conviene ir despacio y observar si el deseo coincide con acciones consistentes.',
        low: 'La química romántica puede necesitar tiempo o apertura consciente. Puede haber interés, pero conviene construir desde confianza, respeto y cercanía gradual, no solo desde el impulso.',
      },
    },
    communication: {
      ru: {
        high: 'Коммуникация — сильная сторона пары: проще договариваться, объяснять мотивы и переводить напряжение в разговор. Такой показатель помогает решать конфликты до того, как они превращаются в дистанцию.',
        good: 'Общение в целом продуктивное, особенно если оба готовы говорить прямо и не прятать важные темы. Иногда возможны разные стили формулировок, но при внимательности это становится ресурсом, а не проблемой.',
        mixed:
          'Ментальный контакт может быть интересным, но не всегда простым: один может говорить быстрее, другой — глубже или осторожнее. Нужны паузы, уточнения и уважение к разному способу мыслить.',
        low: 'В общении возможны частые недопонимания, разные ожидания от диалога или склонность слышать не то, что было сказано. Здесь особенно важно не спорить ради победы, а возвращаться к сути и проверять смысл.',
      },
      en: {
        high: 'Communication is a strength of the pair: it is easier to negotiate, explain motives, and turn tension into dialogue. This score helps conflicts get addressed before they become distance.',
        good: 'Communication is generally productive when both people speak directly and do not hide important topics. Different phrasing styles may appear, but with attention they become a resource rather than a problem.',
        mixed:
          'The mental connection can be interesting but not always simple: one person may speak faster while the other is deeper or more cautious. Pauses, clarification, and respect for different thinking styles matter.',
        low: 'Misunderstandings may happen often, with different expectations of dialogue or a tendency to hear something other than what was said. It is important not to argue to win, but to return to meaning.',
      },
      es: {
        high: 'La comunicación es una fortaleza: es más fácil negociar, explicar motivos y convertir tensión en diálogo. Este indicador ayuda a resolver conflictos antes de que se vuelvan distancia.',
        good: 'La comunicación suele ser productiva si ambos hablan con claridad y no esconden temas importantes. Pueden existir estilos distintos, pero con atención se vuelven recurso más que problema.',
        mixed:
          'El contacto mental puede ser interesante pero no siempre sencillo: una persona puede ir más rápido y la otra ser más profunda o cautelosa. Importan las pausas, aclaraciones y respeto por distintos estilos de pensamiento.',
        low: 'Pueden aparecer malentendidos frecuentes, expectativas distintas del diálogo o tendencia a escuchar algo diferente de lo dicho. Conviene no discutir para ganar, sino volver al sentido real.',
      },
    },
    stability: {
      ru: {
        high: 'Долгосрочный потенциал устойчивый: карты поддерживают ответственность, надежность и способность строить общие планы. Это хороший показатель для отношений, где важны не только чувства, но и реальные действия во времени.',
        good: 'Основа для стабильности есть, особенно если пара умеет распределять ответственность и обсуждать будущее без давления. Периодические разногласия вероятны, но они могут укреплять союз, если превращаются в договоренности.',
        mixed:
          'Потенциал на дистанции зависит от зрелости обоих: связь может быть значимой, но потребует работы с ожиданиями, обязательствами и разным темпом движения. Чем яснее правила, тем устойчивее контакт.',
        low: 'Стабильность может быть слабым местом: одному может не хватать надежности, другому — свободы или предсказуемости. Для долгого формата нужны ясные границы, честность в планах и готовность не избегать сложных разговоров.',
      },
      en: {
        high: 'Long-term potential is stable: the charts support responsibility, reliability, and the ability to build shared plans. This is favorable for relationships where feelings are backed by consistent action over time.',
        good: 'There is a foundation for stability, especially if responsibility is shared and the future can be discussed without pressure. Occasional disagreements may strengthen the bond when they become agreements.',
        mixed:
          'Long-term potential depends on maturity: the connection may be meaningful but requires work with expectations, commitments, and different pacing. The clearer the rules, the steadier the contact.',
        low: 'Stability may be a weak point: one person may miss reliability while the other needs freedom or predictability. A long-term format requires clear boundaries, honest plans, and willingness to face hard conversations.',
      },
      es: {
        high: 'El potencial a largo plazo es estable: las cartas apoyan responsabilidad, fiabilidad y capacidad de construir planes comunes. Es favorable para relaciones donde los sentimientos se sostienen con acciones constantes.',
        good: 'Hay base para estabilidad, sobre todo si se reparte responsabilidad y se habla del futuro sin presión. Los desacuerdos ocasionales pueden fortalecer el vínculo si se transforman en acuerdos.',
        mixed:
          'El potencial a largo plazo depende de la madurez: la conexión puede ser importante, pero exige trabajar expectativas, compromisos y ritmos diferentes. Cuanto más claras las reglas, más estable el contacto.',
        low: 'La estabilidad puede ser un punto débil: a una persona puede faltarle fiabilidad y a la otra libertad o previsibilidad. Para algo duradero hacen falta límites claros, planes honestos y conversaciones difíciles.',
      },
    },
  };

  const locale = lang.startsWith('en')
    ? 'en'
    : lang.startsWith('es')
      ? 'es'
      : 'ru';
  const normalizedKey = key in detailsByKey ? key : 'emotional';

  return detailsByKey[normalizedKey][locale][band];
};

const PLANET_LABELS: Record<string, { ru: string; en: string; es: string }> = {
  sun: { ru: 'Солнце', en: 'Sun', es: 'Sol' },
  moon: { ru: 'Луна', en: 'Moon', es: 'Luna' },
  mercury: { ru: 'Меркурий', en: 'Mercury', es: 'Mercurio' },
  venus: { ru: 'Венера', en: 'Venus', es: 'Venus' },
  mars: { ru: 'Марс', en: 'Mars', es: 'Marte' },
  jupiter: { ru: 'Юпитер', en: 'Jupiter', es: 'Júpiter' },
  saturn: { ru: 'Сатурн', en: 'Saturn', es: 'Saturno' },
  uranus: { ru: 'Уран', en: 'Uranus', es: 'Urano' },
  neptune: { ru: 'Нептун', en: 'Neptune', es: 'Neptuno' },
  pluto: { ru: 'Плутон', en: 'Pluto', es: 'Plutón' },
  chiron: { ru: 'Хирон', en: 'Chiron', es: 'Quirón' },
};

const ASPECT_LABELS: Record<string, { ru: string; en: string; es: string }> = {
  conjunction: { ru: 'соединение', en: 'conjunction', es: 'conjunción' },
  trine: { ru: 'трин', en: 'trine', es: 'trígono' },
  sextile: { ru: 'секстиль', en: 'sextile', es: 'sextil' },
  square: { ru: 'квадрат', en: 'square', es: 'cuadratura' },
  opposition: { ru: 'оппозиция', en: 'opposition', es: 'oposición' },
};

const HARMONIOUS_ASPECTS = new Set(['trine', 'sextile', 'conjunction']);

const getLocaleKey = (language: string): 'ru' | 'en' | 'es' => {
  const lang = language.toLowerCase();
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('es')) return 'es';
  return 'ru';
};

const getPlanetLabel = (planet: string, locale: 'ru' | 'en' | 'es'): string =>
  PLANET_LABELS[planet]?.[locale] ?? planet;

const getAspectLabel = (aspect: string, locale: 'ru' | 'en' | 'es'): string =>
  ASPECT_LABELS[aspect]?.[locale] ?? aspect;

const getAspectTheme = (
  aspect: CompatibilityAspect,
  locale: 'ru' | 'en' | 'es'
): string => {
  const planets = new Set([aspect.planetA, aspect.planetB]);
  const isHarmonious = HARMONIOUS_ASPECTS.has(aspect.aspect);

  if (planets.has('venus') && planets.has('mars')) {
    return locale === 'en'
      ? isHarmonious
        ? 'there is natural attraction and the relationship can feel alive, playful, and physically warm'
        : 'there is strong chemistry, but it can easily turn into arguments about pace, jealousy, initiative, or who wants more closeness right now'
      : locale === 'es'
        ? isHarmonious
          ? 'hay atracción natural y la relación puede sentirse viva, juguetona y corporalmente cálida'
          : 'hay química fuerte, pero puede convertirse fácilmente en discusiones por ritmo, celos, iniciativa o necesidad de cercanía'
        : isHarmonious
          ? 'есть естественное притяжение: отношения могут ощущаться живыми, теплыми, телесными и романтически заряженными'
          : 'есть сильная химия, но она легко переходит в споры из-за темпа, ревности, инициативы или того, кому сейчас нужно больше близости';
  }

  if (planets.has('moon')) {
    return locale === 'en'
      ? isHarmonious
        ? 'it is easier to calm each other down, feel safe in daily life, and understand emotional needs without too many explanations'
        : 'emotional reactions can differ: one person may need closeness while the other withdraws, so small domestic moments may become sensitive'
      : locale === 'es'
        ? isHarmonious
          ? 'es más fácil calmarse mutuamente, sentirse seguros en lo cotidiano y entender necesidades emocionales sin demasiadas explicaciones'
          : 'las reacciones emocionales pueden diferir: una persona busca cercanía y la otra se cierra, por eso lo cotidiano puede volverse sensible'
        : isHarmonious
          ? 'партнерам проще успокаивать друг друга, чувствовать безопасность в быту и понимать эмоциональные потребности без лишних объяснений'
          : 'эмоциональные реакции могут расходиться: один тянется к близости, другой закрывается, поэтому даже бытовые мелочи становятся чувствительными';
  }

  if (planets.has('mercury')) {
    return locale === 'en'
      ? isHarmonious
        ? 'the couple can talk things through, explain motives, and resolve tension before it becomes distance'
        : 'words may be heard differently than intended, so sarcasm, haste, or unfinished explanations can provoke conflict'
      : locale === 'es'
        ? isHarmonious
          ? 'la pareja puede hablar las cosas, explicar motivos y resolver tensión antes de que se vuelva distancia'
          : 'las palabras pueden escucharse distinto de lo que se quiso decir, así que ironía, prisa o explicaciones incompletas provocan conflicto'
        : isHarmonious
          ? 'паре проще проговаривать сложное, объяснять мотивы и решать напряжение до того, как оно станет дистанцией'
          : 'слова могут восприниматься не так, как были задуманы: сарказм, спешка или недосказанность легко провоцируют конфликт';
  }

  if (planets.has('saturn')) {
    return locale === 'en'
      ? isHarmonious
        ? 'there is a chance to build trust through consistency, responsibility, and real actions over time'
        : 'the relationship may feel serious or heavy at times: control, criticism, duty, and fear of rejection need careful handling'
      : locale === 'es'
        ? isHarmonious
          ? 'hay posibilidad de construir confianza con constancia, responsabilidad y acciones reales en el tiempo'
          : 'la relación puede sentirse seria o pesada: control, crítica, deber y miedo al rechazo requieren cuidado'
        : isHarmonious
          ? 'есть шанс строить доверие через стабильность, ответственность и реальные поступки во времени'
          : 'отношения временами могут ощущаться тяжелыми: контроль, критика, долг и страх отвержения требуют аккуратного обращения';
  }

  if (planets.has('chiron')) {
    return locale === 'en'
      ? isHarmonious
        ? 'the bond can feel healing when both people treat each other’s weak spots gently'
        : 'old wounds can be touched quickly, so jokes, rejection, or coldness may hurt more than expected'
      : locale === 'es'
        ? isHarmonious
          ? 'el vínculo puede sentirse sanador si ambos tratan con cuidado los puntos sensibles del otro'
          : 'viejas heridas pueden tocarse rápido, así que bromas, rechazo o frialdad pueden doler más de lo esperado'
        : isHarmonious
          ? 'связь может быть исцеляющей, если оба бережно относятся к слабым местам друг друга'
          : 'старые раны могут задеваться быстро: шутки, отвержение или холодность могут ранить сильнее, чем кажется';
  }

  return locale === 'en'
    ? isHarmonious
      ? 'adds supportive resonance between the charts'
      : 'adds a growth point that needs awareness'
    : locale === 'es'
      ? isHarmonious
        ? 'añade resonancia de apoyo entre las cartas'
        : 'añade un punto de crecimiento que pide consciencia'
      : isHarmonious
        ? 'добавляет поддерживающий резонанс между картами'
        : 'добавляет точку роста, требующую осознанности';
};

const buildAstrologySummary = (
  aspects: CompatibilityAspect[] | undefined,
  language: string,
  fallback: string
): string => {
  if (!aspects?.length) {
    return fallback;
  }

  const locale = getLocaleKey(language);
  const topAspects = aspects.slice(0, 5);
  const aspectLines = topAspects.map((aspect, index) => {
    const planetA = getPlanetLabel(aspect.planetA, locale);
    const planetB = getPlanetLabel(aspect.planetB, locale);
    const aspectLabel = getAspectLabel(aspect.aspect, locale);
    const pair = `${planetA}–${planetB}`;
    const orb =
      typeof aspect.orb === 'number'
        ? locale === 'en'
          ? ` The close orb (${Math.abs(aspect.orb).toFixed(1)}°) makes this theme more noticeable.`
          : locale === 'es'
            ? ` El orbe cerrado (${Math.abs(aspect.orb).toFixed(1)}°) vuelve este tema más visible.`
            : ` Близкий орб (${Math.abs(aspect.orb).toFixed(1)}°) делает эту тему заметнее.`
        : '';
    const theme = getAspectTheme(aspect, locale);

    if (locale === 'en') {
      const templates = [
        `${pair} is one of the main reasons for the score: through ${aspectLabel}, ${theme}.${orb}`,
        `Another important layer is ${pair}. Here ${aspectLabel} shows that ${theme}.${orb}`,
        `There is also a ${pair} accent: it does not work abstractly, it means that ${theme}.${orb}`,
        `${pair} adds a separate tone to the relationship — ${theme}.${orb}`,
        `Finally, ${pair} explains part of the dynamic: ${theme}.${orb}`,
      ];

      return templates[index] ?? `${pair}: ${theme}.${orb}`;
    }

    if (locale === 'es') {
      const templates = [
        `${pair} es una de las razones principales de la puntuación: a través de ${aspectLabel}, ${theme}.${orb}`,
        `Otra capa importante es ${pair}. Aquí ${aspectLabel} muestra que ${theme}.${orb}`,
        `También hay un acento ${pair}: no actúa de forma abstracta, significa que ${theme}.${orb}`,
        `${pair} añade un tono aparte a la relación: ${theme}.${orb}`,
        `Por último, ${pair} explica parte de la dinámica: ${theme}.${orb}`,
      ];

      return templates[index] ?? `${pair}: ${theme}.${orb}`;
    }

    const templates = [
      `${pair} — одна из главных причин такого балла: через аспект «${aspectLabel}» ${theme}.${orb}`,
      `Второй важный слой — ${pair}. Здесь «${aspectLabel}» показывает, что ${theme}.${orb}`,
      `Еще один акцент дает ${pair}: это не абстрактная связь, а указание на то, что ${theme}.${orb}`,
      `${pair} добавляет отдельный оттенок отношениям — ${theme}.${orb}`,
      `И наконец, ${pair} объясняет часть динамики: ${theme}.${orb}`,
    ];

    return templates[index] ?? `${pair}: ${theme}.${orb}`;
  });

  const intro =
    locale === 'en'
      ? 'This score is not random: it comes from several concrete synastry links. In human terms, they show where the couple is naturally pulled together and where friction can appear.'
      : locale === 'es'
        ? 'Esta puntuación no es casual: sale de varios vínculos concretos de sinastría. En términos humanos, muestran dónde la pareja se atrae naturalmente y dónde puede aparecer fricción.'
        : 'Этот балл не случайный: он складывается из конкретных связей в синастрии. По-человечески они показывают, где пару естественно тянет друг к другу, а где могут возникать трение, ссоры или уязвимые места.';

  return `${intro}\n\n${aspectLines.join('\n\n')}`;
};

const cleanCompatibilityDescription = (value?: string): string | undefined => {
  const cleaned = value
    ?.replace(
      /^\s*(?:совместимость|compatibility|compatibilidad)\s*:\s*\d{1,3}%\s*[\n\r]*/i,
      ''
    )
    .trim();

  return cleaned || undefined;
};

const buildCompatibilityRequestKey = (params: {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  useAi: boolean;
}): string =>
  JSON.stringify({
    birthDate: params.birthDate.trim(),
    birthTime: params.birthTime.trim(),
    birthPlace: params.birthPlace.trim().toLowerCase(),
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    timezone: params.timezone ?? null,
    useAi: params.useAi,
  });

export default function CompatibilityScreen({ navigation }: Props) {
  const { i18n } = useTranslation();
  const copy = useMemo(() => copyByLocale(i18n.language), [i18n.language]);
  const insets = useSafeAreaInsets();
  const pickerAnimation = useSharedValue(1);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [useAi, setUseAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<CompatibilityReport[]>([]);
  const [quotaStatus, setQuotaStatus] =
    useState<CompatibilityQuotaStatus | null>(null);
  const [currentReport, setCurrentReport] =
    useState<CompatibilityReport | null>(null);
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const lastSuccessfulRequestKeyRef = useRef<string | null>(null);

  const loadQuota = useCallback(async () => {
    try {
      const data = await compatibilityAPI.getQuota();
      setQuotaStatus(data);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status !== 403) {
        logger.warn('Compatibility quota load failed', status, error);
      }
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const data = await compatibilityAPI.getReports();
      setReports(data);
      setCurrentReport((current) => current ?? data[0] ?? null);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status !== 403) {
        logger.warn('Compatibility reports load failed', status, error);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadReports(), loadQuota()]);
  }, [loadReports, loadQuota]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadReports(), loadQuota()]);
    setRefreshing(false);
  };

  const validate = (): string | null => {
    if (!birthDate.trim() || !birthTime.trim() || !birthPlace.trim()) {
      return copy.required;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert(copy.title, validationError);
      return;
    }

    const shouldConsumeAiQuota = useAi && !isQuotaExhausted;
    const requestKey = buildCompatibilityRequestKey({
      birthDate,
      birthTime,
      birthPlace,
      latitude: selectedCity?.lat,
      longitude: selectedCity?.lon,
      timezone: selectedCity?.tzid,
      useAi: shouldConsumeAiQuota,
    });

    if (
      requestKey === inFlightRequestKeyRef.current ||
      requestKey === lastSuccessfulRequestKeyRef.current
    ) {
      Alert.alert(copy.title, copy.duplicateRequest);
      return;
    }

    setLoading(true);
    inFlightRequestKeyRef.current = requestKey;
    try {
      const report = await compatibilityAPI.createReport({
        birthDate,
        birthTime,
        birthPlace: birthPlace.trim(),
        latitude: selectedCity?.lat,
        longitude: selectedCity?.lon,
        timezone: selectedCity?.tzid,
        useAi: shouldConsumeAiQuota,
      });
      setCurrentReport(report);
      setReports((items) => [
        report,
        ...items.filter((item) => item.id !== report.id),
      ]);
      lastSuccessfulRequestKeyRef.current = requestKey;
      if (shouldConsumeAiQuota && report.isDuplicate !== true) {
        setQuotaStatus((current) => {
          if (!current || current.totalLimit <= 0) {
            return current;
          }

          const remaining = Math.max(0, current.remaining - 1);
          return {
            ...current,
            remaining,
            used: Math.min(current.totalLimit, current.used + 1),
            allowed: remaining > 0,
          };
        });
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error?.message;
      if (status === 403) {
        Alert.alert(copy.upgradeTitle, message || copy.upgradeBody, [
          {
            text: copy.upgradeAction,
            onPress: () => navigation.navigate('Subscription'),
          },
          { text: 'OK', style: 'cancel' },
        ]);
      } else {
        Alert.alert(copy.title, message || 'Request failed');
      }
      logger.error('Compatibility report create failed', status, error);
    } finally {
      if (inFlightRequestKeyRef.current === requestKey) {
        inFlightRequestKeyRef.current = null;
      }
      setLoading(false);
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      await compatibilityAPI.deleteReport(reportId);
      setReports((items) => {
        const nextReports = items.filter((item) => item.id !== reportId);
        setCurrentReport((current) => {
          if (current?.id !== reportId) {
            return current;
          }

          return nextReports[0] ?? null;
        });
        return nextReports;
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message;
      Alert.alert(copy.title, message || copy.deleteFailed);
      logger.error('Compatibility report delete failed', error);
    }
  };

  const confirmDeleteReport = (reportId: string) => {
    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.deleteAction,
        style: 'destructive',
        onPress: () => void deleteReport(reportId),
      },
    ]);
  };

  const renderCategory = (key: string, category: CompatibilityCategory) => {
    const categoryDescription = getCategoryDetailedDescription(
      key,
      category,
      i18n.language
    );

    return (
      <View key={key} style={styles.categoryRow}>
        <View style={styles.categoryCopy}>
          <Text style={styles.categoryTitle}>{category.title || key}</Text>
          <Text style={styles.categoryDescription}>{categoryDescription}</Text>
        </View>
        <Text style={styles.categoryScore}>{category.score}</Text>
      </View>
    );
  };

  const result = currentReport?.result;
  const resultCategories = result?.categories
    ? Object.entries(result.categories).filter(
        ([, category]) => category && typeof category === 'object'
      )
    : [];
  const resultDescriptions = [
    cleanCompatibilityDescription(result?.summary),
    cleanCompatibilityDescription(result?.synastrySummary),
    cleanCompatibilityDescription(result?.aiNarrative),
  ].filter((item, index, items): item is string => {
    if (!item?.trim()) {
      return false;
    }

    return (
      items.findIndex((candidate) => candidate?.trim() === item.trim()) ===
      index
    );
  });
  const visibleResultDescriptions =
    resultDescriptions.length > 0 ? resultDescriptions : ['Отчет рассчитан.'];
  const astrologySummary = buildAstrologySummary(
    result?.keyAspects,
    i18n.language,
    copy.astrologySummaryFallback
  );
  const quotaUsagePercent =
    quotaStatus && quotaStatus.totalLimit > 0
      ? Math.min(
          100,
          Math.round((quotaStatus.used / quotaStatus.totalLimit) * 100)
        )
      : 0;
  const quotaResetText = quotaStatus?.resetAt
    ? new Date(quotaStatus.resetAt).toLocaleDateString()
    : '—';
  const isQuotaExhausted =
    !!quotaStatus && quotaStatus.totalLimit > 0 && quotaStatus.remaining <= 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <CosmicBackground active />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

        <CompactScreenHeader
          title={copy.title}
          description={copy.subtitle}
          icon={<Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />}
          style={styles.compactHeader}
        />

        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed-outline" size={16} color="#A7F3D0" />
          <Text style={styles.privacyText}>{copy.privacy}</Text>
        </View>

        <View style={styles.quotaCard}>
          <View style={styles.quotaHeader}>
            <View style={styles.quotaTitleRow}>
              <Ionicons name="calendar-outline" size={17} color="#C4B5FD" />
              <Text style={styles.quotaTitle}>{copy.quotaTitle}</Text>
            </View>
            {quotaStatus ? (
              <Text
                style={[
                  styles.quotaCount,
                  isQuotaExhausted && styles.quotaCountExhausted,
                ]}
              >
                {quotaStatus.remaining}/{quotaStatus.totalLimit}
              </Text>
            ) : (
              <Text style={styles.quotaCountMuted}>—</Text>
            )}
          </View>
          {quotaStatus ? (
            <>
              <View style={styles.quotaTrack}>
                <View
                  style={[
                    styles.quotaFill,
                    {
                      width: `${quotaUsagePercent}%`,
                      backgroundColor: isQuotaExhausted ? '#F87171' : '#A78BFA',
                    },
                  ]}
                />
              </View>
              <View style={styles.quotaMetaRow}>
                <Text style={styles.quotaMeta}>
                  {quotaStatus.used} {copy.requestsThisWeek}
                </Text>
                <Text style={styles.quotaMeta}>
                  {copy.quotaReset}: {quotaResetText}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.quotaMeta}>{copy.quotaUnavailable}</Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{copy.formTitle}</Text>

          <View style={styles.compactPickerGroup}>
            <Text style={styles.label}>{copy.date}</Text>
            <AstralDateTimePicker
              placeholder="YYYY-MM-DD"
              value={birthDate}
              onChangeText={setBirthDate}
              icon="calendar"
              mode="date"
              required
              compact
              animationValue={pickerAnimation}
            />
          </View>

          <View style={styles.compactPickerGroup}>
            <Text style={styles.label}>{copy.time}</Text>
            <AstralDateTimePicker
              placeholder="HH:mm"
              value={birthTime}
              onChangeText={setBirthTime}
              icon="time"
              mode="time"
              required
              compact
              animationValue={pickerAnimation}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{copy.place}</Text>
            <AstralCityInput
              value={birthPlace}
              onChangeText={(text) => {
                setBirthPlace(text);
                setSelectedCity(null);
              }}
              onCitySelect={setSelectedCity}
              placeholder={copy.place}
              icon="location-outline"
            />
          </View>

          <View style={styles.aiRow}>
            <View style={styles.aiCopy}>
              <Text style={styles.aiTitle}>{copy.ai}</Text>
              <Text style={styles.aiHint}>{copy.aiHint}</Text>
            </View>
            <Switch
              value={useAi && !isQuotaExhausted}
              onValueChange={setUseAi}
              trackColor={{
                false: 'rgba(148,163,184,0.35)',
                true: 'rgba(167,139,250,0.65)',
              }}
              thumbColor={useAi && !isQuotaExhausted ? '#FFFFFF' : '#CBD5E1'}
              disabled={isQuotaExhausted}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            disabled={loading}
            activeOpacity={0.85}
            onPress={handleSubmit}
          >
            <LinearGradient
              colors={['#7C3AED', '#DB2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="pulse-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitText}>{copy.submit}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.panel}>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.panelTitle}>{copy.result}</Text>
                <Text style={styles.resultDate}>
                  {new Date(currentReport.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreValue}>{currentReport.score}</Text>
                <Text style={styles.scoreLabel}>{copy.score}</Text>
              </View>
            </View>

            <View style={styles.descriptionStack}>
              {visibleResultDescriptions.map((description, index) => (
                <Text
                  key={`${currentReport.id}-${index}`}
                  style={[styles.summary, index > 0 && styles.secondarySummary]}
                >
                  {description}
                </Text>
              ))}
            </View>

            <View style={styles.astrologySummaryBlock}>
              <View style={styles.astrologySummaryHeader}>
                <Ionicons name="planet-outline" size={17} color="#C4B5FD" />
                <Text style={styles.astrologySummaryTitle}>
                  {copy.astrologySummaryTitle}
                </Text>
              </View>
              <Text style={styles.astrologySummaryText}>
                {astrologySummary}
              </Text>
            </View>

            {(result.aiStatus === 'unavailable' ||
              result.aiStatus === 'failed') && (
              <Text style={styles.aiStatus}>{copy.aiUnavailable}</Text>
            )}

            {resultCategories.length > 0 && (
              <View style={styles.categories}>
                {resultCategories.map(([key, category]) =>
                  renderCategory(key, category)
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{copy.history}</Text>
          {reports.length === 0 ? (
            <Text style={styles.emptyText}>{copy.noHistory}</Text>
          ) : (
            reports.slice(0, 8).map((report) => (
              <TouchableOpacity
                key={report.id}
                style={[
                  styles.historyRow,
                  currentReport?.id === report.id && styles.historyRowActive,
                ]}
                onPress={() => setCurrentReport(report)}
                activeOpacity={0.75}
              >
                <View>
                  <Text style={styles.historyScore}>{report.score}/100</Text>
                  <Text style={styles.historyDate}>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.historyActions}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      confirmDeleteReport(report.id);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FCA5A5" />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  compactHeader: {
    borderRadius: 16,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  privacyText: {
    flex: 1,
    color: 'rgba(209,250,229,0.86)',
    fontSize: 12,
    lineHeight: 16,
  },
  quotaCard: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.22)',
    gap: 10,
  },
  quotaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quotaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quotaTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  quotaCount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  quotaCountExhausted: {
    color: '#FCA5A5',
  },
  quotaCountMuted: {
    color: 'rgba(203, 213, 225, 0.72)',
    fontSize: 16,
    fontWeight: '800',
  },
  quotaTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  quotaFill: {
    height: '100%',
    borderRadius: 999,
  },
  quotaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  quotaMeta: {
    color: 'rgba(203, 213, 225, 0.72)',
    fontSize: 12,
    lineHeight: 16,
  },
  panel: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    gap: 14,
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 7,
  },
  label: {
    color: 'rgba(226, 232, 240, 0.78)',
    fontSize: 13,
    fontWeight: '600',
  },
  compactPickerGroup: {
    gap: 7,
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    fontSize: 16,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 2,
  },
  aiCopy: {
    flex: 1,
    gap: 3,
  },
  aiTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  aiHint: {
    color: 'rgba(203, 213, 225, 0.72)',
    fontSize: 12,
    lineHeight: 16,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.72,
  },
  submitGradient: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultDate: {
    marginTop: 3,
    color: 'rgba(203, 213, 225, 0.68)',
    fontSize: 12,
  },
  scoreBadge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.26)',
    borderWidth: 1,
    borderColor: 'rgba(216, 180, 254, 0.36)',
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  scoreLabel: {
    color: 'rgba(233, 213, 255, 0.82)',
    fontSize: 11,
    fontWeight: '700',
  },
  descriptionStack: {
    gap: 10,
  },
  summary: {
    color: 'rgba(248, 250, 252, 0.92)',
    fontSize: 15,
    lineHeight: 21,
  },
  secondarySummary: {
    color: 'rgba(248, 250, 252, 0.82)',
  },
  aiStatus: {
    color: '#FDE68A',
    fontSize: 12,
    lineHeight: 17,
  },
  astrologySummaryBlock: {
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.2)',
  },
  astrologySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  astrologySummaryTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  astrologySummaryText: {
    color: 'rgba(248, 250, 252, 0.88)',
    fontSize: 13,
    lineHeight: 19,
  },
  categories: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.14)',
  },
  categoryCopy: {
    flex: 1,
    gap: 3,
  },
  categoryTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryDescription: {
    color: 'rgba(203, 213, 225, 0.68)',
    fontSize: 12,
    lineHeight: 16,
  },
  categoryScore: {
    color: '#C4B5FD',
    fontSize: 20,
    fontWeight: '800',
  },
  narrativeBlock: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.14)',
  },
  narrativeText: {
    color: 'rgba(248, 250, 252, 0.9)',
    fontSize: 14,
    lineHeight: 21,
  },
  emptyText: {
    color: 'rgba(203, 213, 225, 0.72)',
    fontSize: 14,
    lineHeight: 19,
  },
  historyRow: {
    minHeight: 58,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  historyRowActive: {
    borderColor: 'rgba(196, 181, 253, 0.42)',
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
  },
  historyScore: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  historyDate: {
    marginTop: 3,
    color: 'rgba(203, 213, 225, 0.68)',
    fontSize: 12,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.18)',
  },
});
