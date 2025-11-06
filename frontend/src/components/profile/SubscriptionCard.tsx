// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
//   withRepeat,
//   withSequence,
// } from 'react-native-reanimated';
// import { Subscription } from '../types';
//
// const { width } = Dimensions.get('window');
//
// interface SubscriptionCardProps {
//   subscription: Subscription | null;
//   onUpgrade: () => void;
// }
//
// const SUBSCRIPTION_LEVELS = {
//   free: {
//     name: 'Free',
//     color: '#6B7280',
//     gradient: ['#6B7280', '#4B5563'],
//     icon: 'star-outline',
//     features: ['Базовые функции', 'Лимитированный доступ'],
//   },
//   basic: {
//     name: 'AstraPlus',
//     color: '#8B5CF6',
//     gradient: ['#8B5CF6', '#7C3AED'],
//     icon: 'star',
//     features: ['Полные натальные карты', 'Транзиты', 'Совместимость'],
//   },
//   premium: {
//     name: 'DatingPremium',
//     color: '#EC4899',
//     gradient: ['#EC4899', '#DB2777'],
//     icon: 'heart',
//     features: ['Неограниченные лайки', 'Супер-лайки', 'Кто лайкнул'],
//   },
//   max: {
//     name: 'MAX',
//     color: '#F59E0B',
//     gradient: ['#F59E0B', '#D97706', '#DC2626'],
//     icon: 'diamond',
//     features: ['Все функции', 'Приоритетная поддержка', 'Эксклюзивный контент'],
//   },
// };
//
// const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
//   subscription,
//   onUpgrade,
// }) => {
//   const glowAnim = useSharedValue(0);
//   const scaleAnim = useSharedValue(1);
//
//   React.useEffect(() => {
//     glowAnim.value = withRepeat(
//       withSequence(
//         withTiming(1, { duration: 2000 }),
//         withTiming(0.4, { duration: 2000 })
//       ),
//       -1,
//       true
//     );
//   }, []);
//
//   const handlePressIn = () => {
//     scaleAnim.value = withTiming(0.98, { duration: 100 });
//   };
//
//   const handlePressOut = () => {
//     scaleAnim.value = withTiming(1, { duration: 100 });
//   };
//
//   const currentLevel = subscription?.tier || 'free';
//   const levelConfig =
//     SUBSCRIPTION_LEVELS[currentLevel] || SUBSCRIPTION_LEVELS.free;
//
//   const animatedGlowStyle = useAnimatedStyle(() => {
//     return {
//       opacity: glowAnim.value,
//     };
//   });
//
//   const animatedScaleStyle = useAnimatedStyle(() => {
//     return {
//       transform: [{ scale: scaleAnim.value }],
//     };
//   });
//
//   const formatExpiryDate = (dateString: string): string => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('ru-RU', {
//       day: 'numeric',
//       month: 'long',
//       year: 'numeric',
//     });
//   };
//
//   const isExpired = subscription?.expiresAt
//     ? new Date(subscription.expiresAt) < new Date()
//     : false;
//
//   const daysLeft = subscription?.expiresAt
//     ? Math.max(
//         0,
//         Math.ceil(
//           (new Date(subscription.expiresAt).getTime() - new Date().getTime()) /
//             (1000 * 60 * 60 * 24)
//         )
//       )
//     : 0;
//
//   return (
//     <Animated.View style={[styles.container, animatedScaleStyle]}>
//       <View style={styles.card}>
//         {/* Background Glow */}
//         <Animated.View style={[styles.backgroundGlow, animatedGlowStyle]}>
//           <LinearGradient
//             colors={[...levelConfig.gradient, 'transparent']}
//             style={StyleSheet.absoluteFillObject}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//           />
//         </Animated.View>
//
//         {/* Card Content */}
//         <LinearGradient
//           colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
//           style={styles.cardGradient}
//         >
//           {/* Header */}
//           <View style={styles.header}>
//             <View style={styles.levelBadge}>
//               <LinearGradient
//                 colors={levelConfig.gradient}
//                 style={styles.badgeGradient}
//               >
//                 <Ionicons
//                   name={levelConfig.icon}
//                   size={20}
//                   color="#fff"
//                   style={styles.badgeIcon}
//                 />
//                 <Text style={styles.levelName}>{levelConfig.name}</Text>
//               </LinearGradient>
//             </View>
//
//             {currentLevel !== 'max' && (
//               <TouchableOpacity
//                 style={styles.upgradeButton}
//                 onPress={onUpgrade}
//                 onPressIn={handlePressIn}
//                 onPressOut={handlePressOut}
//                 activeOpacity={0.8}
//               >
//                 <LinearGradient
//                   colors={['#8B5CF6', '#7C3AED']}
//                   style={styles.upgradeGradient}
//                 >
//                   <Ionicons name="arrow-up" size={16} color="#fff" />
//                   <Text style={styles.upgradeText}>Улучшить</Text>
//                 </LinearGradient>
//               </TouchableOpacity>
//             )}
//           </View>
//
//           {/* Status */}
//           <View style={styles.statusContainer}>
//             {subscription?.tier === 'free' ? (
//               <Text style={styles.statusText}>Бесплатный аккаунт</Text>
//             ) : (
//               <>
//                 {isExpired ? (
//                   <Text style={[styles.statusText, { color: '#FF6B6B' }]}>
//                     Подписка истекла
//                   </Text>
//                 ) : (
//                   <Text style={styles.statusText}>
//                     Активна до {formatExpiryDate(subscription?.expiresAt || '')}
//                   </Text>
//                 )}
//
//                 {!isExpired && daysLeft <= 7 && (
//                   <View style={styles.warningContainer}>
//                     <Ionicons name="warning" size={16} color="#F59E0B" />
//                     <Text style={styles.warningText}>
//                       Осталось {daysLeft} дн.
//                     </Text>
//                   </View>
//                 )}
//               </>
//             )}
//           </View>
//
//           {/* Features */}
//           <View style={styles.featuresContainer}>
//             {levelConfig.features.map((feature, index) => (
//               <View key={index} style={styles.featureItem}>
//                 <View
//                   style={[
//                     styles.featureDot,
//                     { backgroundColor: levelConfig.color },
//                   ]}
//                 />
//                 <Text style={styles.featureText}>{feature}</Text>
//               </View>
//             ))}
//           </View>
//
//           {/* Progress Bar (for non-free users) */}
//           {subscription?.tier !== 'free' &&
//             subscription?.expiresAt &&
//             !isExpired && (
//               <View style={styles.progressContainer}>
//                 <View style={styles.progressBar}>
//                   <LinearGradient
//                     colors={levelConfig.gradient}
//                     style={[
//                       styles.progressFill,
//                       {
//                         width: `${Math.max(10, (daysLeft / 30) * 100)}%`,
//                       },
//                     ]}
//                   />
//                 </View>
//                 <Text style={styles.progressText}>
//                   {daysLeft} дней осталось
//                 </Text>
//               </View>
//             )}
//         </LinearGradient>
//       </View>
//     </Animated.View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     marginBottom: 20,
//   },
//   card: {
//     borderRadius: 20,
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//   },
//   backgroundGlow: {
//     position: 'absolute',
//     top: -10,
//     left: -10,
//     right: -10,
//     bottom: -10,
//     borderRadius: 25,
//   },
//   cardGradient: {
//     padding: 20,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   levelBadge: {
//     borderRadius: 20,
//     overflow: 'hidden',
//   },
//   badgeGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 15,
//     paddingVertical: 8,
//   },
//   badgeIcon: {
//     marginRight: 8,
//   },
//   levelName: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//     textShadowColor: 'rgba(0, 0, 0, 0.5)',
//     textShadowOffset: { width: 0, height: 0 },
//     textShadowRadius: 10,
//   },
//   upgradeButton: {
//     borderRadius: 15,
//     overflow: 'hidden',
//   },
//   upgradeGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//   },
//   upgradeText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//     marginLeft: 4,
//   },
//   statusContainer: {
//     marginBottom: 15,
//   },
//   statusText: {
//     color: '#B0B0B0',
//     fontSize: 14,
//     marginBottom: 5,
//   },
//   warningContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(245, 158, 11, 0.1)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 8,
//     alignSelf: 'flex-start',
//   },
//   warningText: {
//     color: '#F59E0B',
//     fontSize: 12,
//     fontWeight: '600',
//     marginLeft: 4,
//   },
//   featuresContainer: {
//     marginBottom: 15,
//   },
//   featureItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   featureDot: {
//     width: 6,
//     height: 6,
//     borderRadius: 3,
//     marginRight: 12,
//   },
//   featureText: {
//     color: '#E0E0E0',
//     fontSize: 14,
//     flex: 1,
//   },
//   progressContainer: {
//     marginTop: 10,
//   },
//   progressBar: {
//     height: 4,
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 2,
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   progressFill: {
//     height: '100%',
//     borderRadius: 2,
//   },
//   progressText: {
//     color: '#999',
//     fontSize: 12,
//     textAlign: 'center',
//   },
// });
//
// export default SubscriptionCard;

// frontend/src/components/SubscriptionCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Subscription } from '../../types/index';

const { width } = Dimensions.get('window');

interface SubscriptionCardProps {
  subscription: Subscription | null;
  onUpgrade: () => void;
  /** Показывать ли кнопку улучшения (по умолчанию true) */
  showUpgradeButton?: boolean;
}

const SUBSCRIPTION_LEVELS = {
  free: {
    name: 'Free',
    color: '#6B7280',
    gradient: ['#6B7280', '#4B5563'],
    icon: 'star-outline' as const,
    features: ['Базовые функции', 'Лимитированный доступ'],
  },
  premium: {
    name: 'Premium',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    icon: 'star' as const,
    features: ['Полные натальные карты', 'Транзиты', 'Совместимость'],
  },
  max: {
    name: 'MAX',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706', '#DC2626'],
    icon: 'diamond' as const,
    features: ['Все функции', 'Приоритетная поддержка', 'Эксклюзивный контент'],
  },
};

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onUpgrade,
  showUpgradeButton = true,
}) => {
  const glowAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  React.useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const handlePressIn = () => {
    scaleAnim.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scaleAnim.value = withTiming(1, { duration: 100 });
  };

  const currentLevel = subscription?.tier || 'free';
  const levelConfig =
    SUBSCRIPTION_LEVELS[currentLevel] || SUBSCRIPTION_LEVELS.free;

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowAnim.value,
    };
  });

  const animatedScaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }],
    };
  });

  const formatExpiryDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isExpired = subscription?.expiresAt
    ? new Date(subscription.expiresAt) < new Date()
    : false;

  const daysLeft = subscription?.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.expiresAt).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  // Показывать кнопку upgrade только если:
  // 1. showUpgradeButton === true
  // 2. Подписка не MAX
  const shouldShowUpgradeButton = showUpgradeButton && currentLevel !== 'max';

  return (
    <Animated.View style={[styles.container, animatedScaleStyle]}>
      <View style={styles.card}>
        {/* Background Glow */}
        <Animated.View style={[styles.backgroundGlow, animatedGlowStyle]}>
          <LinearGradient
            colors={[...levelConfig.gradient, 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {/* Card Content */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
          style={styles.cardGradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.levelBadge}>
              <LinearGradient
                colors={levelConfig.gradient}
                style={styles.badgeGradient}
              >
                <Ionicons
                  name={levelConfig.icon}
                  size={20}
                  color="#fff"
                  style={styles.badgeIcon}
                />
                <Text style={styles.levelName}>{levelConfig.name}</Text>
              </LinearGradient>
            </View>

            {shouldShowUpgradeButton && (
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={onUpgrade}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.upgradeGradient}
                >
                  <Ionicons name="arrow-up" size={16} color="#fff" />
                  <Text style={styles.upgradeText}>Улучшить</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Status */}
          <View style={styles.statusContainer}>
            {subscription?.tier === 'free' ? (
              <Text style={styles.statusText}>Бесплатный аккаунт</Text>
            ) : (
              <>
                {isExpired ? (
                  <View style={styles.warningContainer}>
                    <Ionicons name="warning" size={16} color="#F59E0B" />
                    <Text style={styles.warningText}>Подписка истекла</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.statusText}>
                      Активна до{' '}
                      {formatExpiryDate(subscription?.expiresAt || '')}
                    </Text>
                    {daysLeft <= 7 && (
                      <View style={styles.warningContainer}>
                        <Ionicons name="time" size={16} color="#F59E0B" />
                        <Text style={styles.warningText}>
                          Осталось {daysLeft} дней
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {levelConfig.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View
                  style={[
                    styles.featureDot,
                    { backgroundColor: levelConfig.color },
                  ]}
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Progress Bar (для премиум подписок) */}
          {subscription?.tier !== 'free' && !isExpired && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={levelConfig.gradient}
                  style={[
                    styles.progressFill,
                    { width: `${(daysLeft / 30) * 100}%` },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressText}>{daysLeft} дней осталось</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  backgroundGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 25,
  },
  cardGradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  levelBadge: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  badgeIcon: {
    marginRight: 8,
  },
  levelName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  upgradeButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusContainer: {
    marginBottom: 15,
  },
  statusText: {
    color: '#B0B0B0',
    fontSize: 14,
    marginBottom: 5,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  featureText: {
    color: '#E0E0E0',
    fontSize: 14,
    flex: 1,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default SubscriptionCard;
