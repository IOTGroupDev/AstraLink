'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TRIAL_CONFIG =
  exports.UPGRADE_SUGGESTIONS =
  exports.FEATURE_REQUIREMENTS =
  exports.SUBSCRIPTION_PLANS =
  exports.SubscriptionTier =
    void 0;
exports.getPlanByTier = getPlanByTier;
exports.requiresTier = requiresTier;
exports.getRequiredTiers = getRequiredTiers;
exports.formatPrice = formatPrice;
exports.getTierColors = getTierColors;
exports.getTierName = getTierName;
var SubscriptionTier;
(function (SubscriptionTier) {
  SubscriptionTier['FREE'] = 'free';
  SubscriptionTier['PREMIUM'] = 'premium';
  SubscriptionTier['MAX'] = 'max';
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
exports.SUBSCRIPTION_PLANS = [
  {
    tier: SubscriptionTier.FREE,
    name: 'Free',
    price: 0,
    currency: 'RUB',
    period: 'month',
    features: [
      'Базовая натальная карта',
      'Гороскопы (правила)',
      'Транзиты без деталей',
      '1 анализ совместимости',
      'Лунный календарь (день)',
    ],
    limits: {
      natalChart: 'basic',
      horoscope: 'interpreter',
      transits: 'basic',
      connections: 1,
      dating: 0,
      lunarCalendar: 'day',
    },
    colors: ['#6B7280', '#9CA3AF'],
  },
  {
    tier: SubscriptionTier.PREMIUM,
    name: 'Premium',
    price: 599,
    currency: 'RUB',
    period: 'month',
    features: [
      'Все функции Free',
      'Полная натальная карта с AI',
      'AI-гороскопы',
      'Детальные транзиты',
      'Неограниченная совместимость',
      'Астросимулятор',
      'Cosmic Dating',
      'Кто лайкнул',
      'Лунный календарь (месяц)',
    ],
    limits: {
      natalChart: 'full',
      horoscope: 'ai',
      transits: 'detailed',
      connections: Infinity,
      dating: Infinity,
      lunarCalendar: 'month',
    },
    isPopular: true,
    colors: ['#8B5CF6', '#A855F7'],
  },
  {
    tier: SubscriptionTier.MAX,
    name: 'Cosmic MAX',
    price: 999,
    currency: 'RUB',
    period: 'month',
    features: [
      'Все функции Premium',
      '2 консультации астролога/год',
      'Эксклюзивные прогнозы',
      'Ранний доступ',
      'VIP поддержка',
      'Годовой гороскоп PDF',
      'Приоритет в Dating',
    ],
    limits: {
      natalChart: 'full',
      horoscope: 'ai',
      transits: 'detailed',
      connections: Infinity,
      dating: Infinity,
      lunarCalendar: 'month',
      astrologerConsultations: 2,
      priority: true,
    },
    colors: ['#FBBF24', '#F59E0B'],
  },
];
exports.FEATURE_REQUIREMENTS = {
  fullNatalChart: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  natalInterpretation: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  aiHoroscope: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  detailedTransits: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  astroSimulator: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  unlimitedConnections: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  detailedSynastry: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  cosmicDating: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  unlimitedLikes: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  seeWhoLiked: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  fullLunarCalendar: [SubscriptionTier.PREMIUM, SubscriptionTier.MAX],
  astrologerConsultations: [SubscriptionTier.MAX],
  vipSupport: [SubscriptionTier.MAX],
  exclusiveContent: [SubscriptionTier.MAX],
};
function getPlanByTier(tier) {
  return (
    exports.SUBSCRIPTION_PLANS.find((plan) => plan.tier === tier) ||
    exports.SUBSCRIPTION_PLANS[0]
  );
}
function requiresTier(feature, currentTier) {
  const requiredTiers = exports.FEATURE_REQUIREMENTS[feature];
  return requiredTiers ? requiredTiers.includes(currentTier) : true;
}
function getRequiredTiers(feature) {
  return exports.FEATURE_REQUIREMENTS[feature] || [];
}
function formatPrice(price, currency = 'RUB') {
  if (price === 0) return 'Бесплатно';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}
function getTierColors(tier) {
  const plan = getPlanByTier(tier);
  return plan.colors;
}
function getTierName(tier) {
  const plan = getPlanByTier(tier);
  return plan.name;
}
exports.UPGRADE_SUGGESTIONS = {
  fullNatalChart: {
    featureName: 'Полная натальная карта',
    requiredTier: SubscriptionTier.PREMIUM,
    benefit: 'Откройте все секреты вашей карты с AI интерпретацией',
    icon: 'star',
  },
  aiHoroscope: {
    featureName: 'AI-гороскопы',
    requiredTier: SubscriptionTier.PREMIUM,
    benefit: 'Персональные прогнозы на основе вашей карты',
    icon: 'sparkles',
  },
  astroSimulator: {
    featureName: 'Астросимулятор',
    requiredTier: SubscriptionTier.PREMIUM,
    benefit: 'Путешествуйте во времени и изучайте транзиты',
    icon: 'time',
  },
  cosmicDating: {
    featureName: 'Cosmic Dating',
    requiredTier: SubscriptionTier.PREMIUM,
    benefit: 'Находите совместимых партнеров по звездам',
    icon: 'heart',
  },
  astrologerConsultations: {
    featureName: 'Консультации астролога',
    requiredTier: SubscriptionTier.MAX,
    benefit: 'Персональные сессии с профессиональным астрологом',
    icon: 'person',
  },
};
exports.TRIAL_CONFIG = {
  duration: 7,
  tier: SubscriptionTier.PREMIUM,
  enabled: true,
};
//# sourceMappingURL=subscription.js.map
