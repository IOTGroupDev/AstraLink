// import React, { useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Dimensions,
//   TouchableOpacity,
// } from 'react-native';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withSpring,
//   withTiming,
//   withRepeat,
//   interpolate,
//   Easing,
//   runOnJS,
// } from 'react-native-reanimated';
// import { Gesture, GestureDetector } from 'react-native-gesture-handler';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import Svg, {
//   Circle,
//   Text as SvgText,
//   Defs,
//   LinearGradient as SvgGradient,
//   Stop,
// } from 'react-native-svg';
//
// const { width, height } = Dimensions.get('window');
// const CARD_WIDTH = width * 0.85;
// const CARD_HEIGHT = height * 0.7;
//
// interface DatingCardProps {
//   user: {
//     id: string;
//     name: string;
//     age: number;
//     zodiacSign: string;
//     compatibility: number;
//     elements: {
//       fire: number;
//       water: number;
//       earth: number;
//       air: number;
//     };
//     keyAspects: string[];
//     isMatched?: boolean;
//   };
//   onSwipe: (direction: 'left' | 'right') => void;
//   onChat: () => void;
//   isTop: boolean;
// }
//
// const DatingCard: React.FC<DatingCardProps> = ({
//   user,
//   onSwipe,
//   onChat,
//   isTop,
// }) => {
//   const translateX = useSharedValue(0);
//   const translateY = useSharedValue(0);
//   const scale = useSharedValue(1);
//   const rotation = useSharedValue(0);
//   const glow = useSharedValue(0);
//   const swipeOpacity = useSharedValue(0);
//
//   useEffect(() => {
//     glow.value = withRepeat(
//       withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
//       -1,
//       true
//     );
//   }, []);
//
//   const gestureHandler = Gesture.Pan()
//     .onStart(() => {
//       'worklet';
//     })
//     .onUpdate((event) => {
//       'worklet';
//       translateX.value = event.translationX;
//       translateY.value = event.translationY;
//       rotation.value = interpolate(
//         event.translationX,
//         [-width, width],
//         [-15, 15]
//       );
//
//       if (Math.abs(event.translationX) > 50) {
//         swipeOpacity.value = withTiming(1, { duration: 200 });
//       } else {
//         swipeOpacity.value = withTiming(0, { duration: 200 });
//       }
//     })
//     .onEnd((event) => {
//       'worklet';
//       const shouldSwipe = Math.abs(event.translationX) > width * 0.3;
//
//       if (shouldSwipe) {
//         const direction = event.translationX > 0 ? 'right' : 'left';
//
//         translateX.value = withTiming(
//           direction === 'right' ? width : -width,
//           { duration: 300, easing: Easing.out(Easing.quad) },
//           () => {
//             runOnJS(onSwipe)(direction);
//           }
//         );
//         translateY.value = withTiming(0, { duration: 300 });
//         rotation.value = withTiming(0, { duration: 300 });
//       } else {
//         translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
//         translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
//         rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
//       }
//
//       swipeOpacity.value = withTiming(0, { duration: 200 });
//     });
//
//   const animatedCardStyle = useAnimatedStyle(() => ({
//     transform: [
//       { translateX: translateX.value },
//       { translateY: translateY.value },
//       { scale: scale.value },
//       { rotate: `${rotation.value}deg` },
//     ],
//   }));
//
//   const animatedGlowStyle = useAnimatedStyle(() => ({
//     opacity: interpolate(glow.value, [0, 1], [0.3, 0.8]),
//   }));
//
//   const animatedSwipeStyle = useAnimatedStyle(() => ({
//     opacity: swipeOpacity.value,
//   }));
//
//   const getCompatibilityColor = (score: number) => {
//     if (score >= 80) return '#10B981';
//     if (score >= 60) return '#F59E0B';
//     if (score >= 40) return '#EF4444';
//     return '#6B7280';
//   };
//
//   const getZodiacSymbol = (sign: string) => {
//     const symbols: { [key: string]: string } = {
//       Aries: '♈',
//       Taurus: '♉',
//       Gemini: '♊',
//       Cancer: '♋',
//       Leo: '♌',
//       Virgo: '♍',
//       Libra: '♎',
//       Scorpio: '♏',
//       Sagittarius: '♐',
//       Capricorn: '♑',
//       Aquarius: '♒',
//       Pisces: '♓',
//     };
//     return symbols[sign] || '♈';
//   };
//
//   const getElementColor = (element: string) => {
//     const colors: { [key: string]: string } = {
//       fire: '#EF4444',
//       water: '#3B82F6',
//       earth: '#10B981',
//       air: '#F59E0B',
//     };
//     return colors[element] || '#6B7280';
//   };
//
//   return (
//     <Animated.View style={[styles.container, animatedCardStyle]}>
//       <GestureDetector gesture={gestureHandler}>
//         <Animated.View style={styles.card}>
//           <LinearGradient
//             colors={['rgba(139, 92, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
//             style={styles.cardGradient}
//           >
//             {/* Glow effect */}
//             <Animated.View
//               style={[
//                 styles.glow,
//                 {
//                   backgroundColor: getCompatibilityColor(user.compatibility),
//                   opacity: interpolate(glow.value, [0, 1], [0.1, 0.3]),
//                 },
//                 animatedGlowStyle,
//               ]}
//             />
//
//             {/* Swipe indicator */}
//             <Animated.View style={[styles.swipeIndicator, animatedSwipeStyle]}>
//               <Ionicons
//                 name={translateX.value > 0 ? 'heart' : 'close'}
//                 size={40}
//                 color={translateX.value > 0 ? '#10B981' : '#EF4444'}
//               />
//             </Animated.View>
//
//             {/* Header */}
//             <View style={styles.header}>
//               <Text style={styles.name}>{user.name}</Text>
//               <Text style={styles.age}>{user.age}</Text>
//             </View>
//
//             {/* Zodiac Sign */}
//             <View style={styles.zodiacContainer}>
//               <Svg width={80} height={80} style={styles.zodiacSvg}>
//                 <Defs>
//                   <SvgGradient
//                     id="zodiacGradient"
//                     x1="0%"
//                     y1="0%"
//                     x2="100%"
//                     y2="100%"
//                   >
//                     <Stop
//                       offset="0%"
//                       stopColor={getCompatibilityColor(user.compatibility)}
//                       stopOpacity="1"
//                     />
//                     <Stop
//                       offset="100%"
//                       stopColor={getCompatibilityColor(user.compatibility)}
//                       stopOpacity="0.3"
//                     />
//                   </SvgGradient>
//                 </Defs>
//                 <Circle
//                   cx="40"
//                   cy="40"
//                   r="35"
//                   fill="url(#zodiacGradient)"
//                   stroke="rgba(255, 255, 255, 0.3)"
//                   strokeWidth="2"
//                 />
//                 <SvgText
//                   x="40"
//                   y="48"
//                   fontSize="24"
//                   fill="#fff"
//                   textAnchor="middle"
//                   fontWeight="bold"
//                 >
//                   {getZodiacSymbol(user.zodiacSign)}
//                 </SvgText>
//               </Svg>
//               <Text style={styles.zodiacSign}>{user.zodiacSign}</Text>
//             </View>
//
//             {/* Compatibility */}
//             <View style={styles.compatibilityContainer}>
//               <Text style={styles.compatibilityLabel}>Совместимость</Text>
//               <View style={styles.compatibilityBar}>
//                 <View
//                   style={[
//                     styles.compatibilityFill,
//                     {
//                       width: `${user.compatibility}%`,
//                       backgroundColor: getCompatibilityColor(
//                         user.compatibility
//                       ),
//                     },
//                   ]}
//                 />
//               </View>
//               <Text style={styles.compatibilityScore}>
//                 {user.compatibility}%
//               </Text>
//             </View>
//
//             {/* Elements Chart */}
//             <View style={styles.elementsContainer}>
//               <Text style={styles.elementsTitle}>Стихии</Text>
//               <View style={styles.elementsChart}>
//                 {Object.entries(user.elements).map(([element, value]) => (
//                   <View key={element} style={styles.elementItem}>
//                     <View style={styles.elementBar}>
//                       <View
//                         style={[
//                           styles.elementFill,
//                           {
//                             width: `${value}%`,
//                             backgroundColor: getElementColor(element),
//                           },
//                         ]}
//                       />
//                     </View>
//                     <Text style={styles.elementLabel}>{element}</Text>
//                   </View>
//                 ))}
//               </View>
//             </View>
//
//             {/* Key Aspects */}
//             <View style={styles.aspectsContainer}>
//               <Text style={styles.aspectsTitle}>Ключевые аспекты</Text>
//               <View style={styles.aspectsList}>
//                 {user.keyAspects.map((aspect, index) => (
//                   <View key={index} style={styles.aspectItem}>
//                     <Ionicons name="star" size={16} color="#8B5CF6" />
//                     <Text style={styles.aspectText}>{aspect}</Text>
//                   </View>
//                 ))}
//               </View>
//             </View>
//
//             {/* Chat Button */}
//             <TouchableOpacity
//               style={styles.chatButton}
//               onPress={onChat}
//               activeOpacity={0.8}
//             >
//               <LinearGradient
//                 colors={['#8B5CF6', '#A855F7']}
//                 style={styles.chatGradient}
//               >
//                 <Ionicons name="chatbubbles" size={20} color="#fff" />
//                 <Text style={styles.chatText}>Написать</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//
//             {/* Match indicator */}
//             {user.isMatched && (
//               <View style={styles.matchIndicator}>
//                 <Ionicons name="heart" size={24} color="#10B981" />
//                 <Text style={styles.matchText}>Матч!</Text>
//               </View>
//             )}
//           </LinearGradient>
//         </Animated.View>
//       </GestureDetector>
//     </Animated.View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     position: 'absolute',
//     width: CARD_WIDTH,
//     height: CARD_HEIGHT,
//     alignSelf: 'center',
//   },
//   card: {
//     flex: 1,
//     borderRadius: 25,
//     overflow: 'hidden',
//   },
//   cardGradient: {
//     flex: 1,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.2)',
//     shadowColor: '#8B5CF6',
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.3,
//     shadowRadius: 20,
//     elevation: 10,
//   },
//   glow: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     borderRadius: 25,
//   },
//   swipeIndicator: {
//     position: 'absolute',
//     top: '50%',
//     right: 20,
//     transform: [{ translateY: -20 }],
//     zIndex: 10,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   name: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     textShadowColor: 'rgba(139, 92, 246, 0.8)',
//     textShadowOffset: { width: 0, height: 0 },
//     textShadowRadius: 10,
//   },
//   age: {
//     fontSize: 18,
//     color: '#fff',
//     opacity: 0.8,
//   },
//   zodiacContainer: {
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   zodiacSvg: {
//     shadowColor: '#8B5CF6',
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.5,
//     shadowRadius: 15,
//   },
//   zodiacSign: {
//     fontSize: 16,
//     color: '#fff',
//     marginTop: 10,
//     opacity: 0.8,
//   },
//   compatibilityContainer: {
//     marginBottom: 20,
//   },
//   compatibilityLabel: {
//     fontSize: 16,
//     color: '#fff',
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   compatibilityBar: {
//     height: 8,
//     backgroundColor: 'rgba(255, 255, 255, 0.2)',
//     borderRadius: 4,
//     overflow: 'hidden',
//     marginBottom: 5,
//   },
//   compatibilityFill: {
//     height: '100%',
//     borderRadius: 4,
//   },
//   compatibilityScore: {
//     fontSize: 14,
//     color: '#fff',
//     textAlign: 'center',
//     fontWeight: 'bold',
//   },
//   elementsContainer: {
//     marginBottom: 20,
//   },
//   elementsTitle: {
//     fontSize: 16,
//     color: '#fff',
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   elementsChart: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   elementItem: {
//     flex: 1,
//     alignItems: 'center',
//     marginHorizontal: 2,
//   },
//   elementBar: {
//     width: '100%',
//     height: 4,
//     backgroundColor: 'rgba(255, 255, 255, 0.2)',
//     borderRadius: 2,
//     overflow: 'hidden',
//     marginBottom: 5,
//   },
//   elementFill: {
//     height: '100%',
//     borderRadius: 2,
//   },
//   elementLabel: {
//     fontSize: 10,
//     color: '#fff',
//     opacity: 0.7,
//     textTransform: 'capitalize',
//   },
//   aspectsContainer: {
//     marginBottom: 60,
//   },
//   aspectsTitle: {
//     fontSize: 16,
//     color: '#fff',
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   aspectsList: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'center',
//   },
//   aspectItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(139, 92, 246, 0.2)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     margin: 2,
//   },
//   aspectText: {
//     fontSize: 12,
//     color: '#fff',
//     marginLeft: 4,
//   },
//   chatButton: {
//     position: 'absolute',
//     bottom: 20,
//     left: 20,
//     right: 20,
//     borderRadius: 25,
//     overflow: 'hidden',
//     shadowColor: '#8B5CF6',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.4,
//     shadowRadius: 12,
//     elevation: 8,
//   },
//   chatGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     gap: 8,
//   },
//   chatText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#fff',
//   },
//   matchIndicator: {
//     position: 'absolute',
//     top: 20,
//     right: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(16, 185, 129, 0.2)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//   },
//   matchText: {
//     fontSize: 14,
//     color: '#10B981',
//     fontWeight: 'bold',
//     marginLeft: 4,
//   },
// });
//
// export default DatingCard;

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.7;

interface DatingCardProps {
  user: {
    id: string;
    name: string;
    age: number;
    zodiacSign: string;
    compatibility: number;
    elements: {
      fire: number;
      water: number;
      earth: number;
      air: number;
    };
    keyAspects: string[];
    isMatched?: boolean;
    photoUrl?: string;
    photos?: string[];
  };
  onSwipe: (direction: 'left' | 'right') => void;
  onChat: () => void;
  isTop: boolean;
}

const DatingCard: React.FC<DatingCardProps> = ({
  user,
  onSwipe,
  onChat,
  isTop,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const swipeOpacity = useSharedValue(0);

  const gestureHandler = Gesture.Pan()
    .onStart(() => {
      'worklet';
    })
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = interpolate(
        event.translationX,
        [-width, width],
        [-15, 15]
      );

      if (Math.abs(event.translationX) > 50) {
        swipeOpacity.value = withTiming(1, { duration: 200 });
      } else {
        swipeOpacity.value = withTiming(0, { duration: 200 });
      }
    })
    .onEnd((event) => {
      'worklet';
      const shouldSwipe = Math.abs(event.translationX) > width * 0.3;

      if (shouldSwipe) {
        const direction = event.translationX > 0 ? 'right' : 'left';

        translateX.value = withTiming(
          direction === 'right' ? width : -width,
          { duration: 300 },
          () => {
            runOnJS(onSwipe)(direction);
          }
        );
        translateY.value = withTiming(0, { duration: 300 });
        rotation.value = withTiming(0, { duration: 300 });
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
      }

      swipeOpacity.value = withTiming(0, { duration: 200 });
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const animatedSwipeStyle = useAnimatedStyle(() => ({
    opacity: swipeOpacity.value,
  }));

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#EF4444';
    return '#6B7280';
  };

  const getZodiacSymbol = (sign: string) => {
    const symbols: { [key: string]: string } = {
      Aries: '♈',
      Taurus: '♉',
      Gemini: '♊',
      Cancer: '♋',
      Leo: '♌',
      Virgo: '♍',
      Libra: '♎',
      Scorpio: '♏',
      Sagittarius: '♐',
      Capricorn: '♑',
      Aquarius: '♒',
      Pisces: '♓',
    };
    return symbols[sign] || '♈';
  };

  const getElementColor = (element: string) => {
    const colors: { [key: string]: string } = {
      fire: '#EF4444',
      water: '#3B82F6',
      earth: '#10B981',
      air: '#F59E0B',
    };
    return colors[element] || '#6B7280';
  };

  const getElementNameRu = (element: string) => {
    const names: { [key: string]: string } = {
      fire: 'Огонь',
      water: 'Вода',
      earth: 'Земля',
      air: 'Воздух',
    };
    return names[element] || element;
  };

  return (
    <Animated.View style={[styles.container, animatedCardStyle]}>
      <GestureDetector gesture={gestureHandler}>
        <Animated.View style={styles.card}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
            style={styles.cardGradient}
          >
            {/* Background photo */}
            {!!(user.photoUrl || user.photos?.[0]) && (
              <Image
                source={{ uri: (user.photoUrl || user.photos?.[0]) as string }}
                style={StyleSheet.absoluteFillObject as any}
                resizeMode="cover"
              />
            )}

            {/* Dim overlay for text readability */}
            <View style={styles.dimOverlay} />

            {/* Swipe indicator */}
            <Animated.View style={[styles.swipeIndicator, animatedSwipeStyle]}>
              <Ionicons
                name={translateX.value > 0 ? 'heart' : 'close'}
                size={40}
                color={translateX.value > 0 ? '#10B981' : '#EF4444'}
              />
            </Animated.View>

            {/* Top-right actions: Like + Write */}
            <View style={styles.topActions}>
              <TouchableOpacity
                style={[styles.actionCircle, styles.likeCircle]}
                onPress={() => onSwipe('right')}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={20} color="#10B981" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCircle, styles.chatCircle]}
                onPress={onChat}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubbles" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.age}>{user.age}</Text>
            </View>

            {/* Zodiac Sign */}
            <View style={styles.zodiacContainer}>
              <Svg width={80} height={80} style={styles.zodiacSvg}>
                <Defs>
                  <SvgGradient
                    id="zodiacGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop
                      offset="0%"
                      stopColor={getCompatibilityColor(user.compatibility)}
                      stopOpacity="1"
                    />
                    <Stop
                      offset="100%"
                      stopColor={getCompatibilityColor(user.compatibility)}
                      stopOpacity="0.3"
                    />
                  </SvgGradient>
                </Defs>
                <Circle
                  cx="40"
                  cy="40"
                  r="35"
                  fill="url(#zodiacGradient)"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="2"
                />
                <SvgText
                  x="40"
                  y="48"
                  fontSize="24"
                  fill="#fff"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {getZodiacSymbol(user.zodiacSign)}
                </SvgText>
              </Svg>
              <Text style={styles.zodiacSign}>{user.zodiacSign}</Text>
            </View>

            {/* Compatibility */}
            <View style={styles.compatibilityContainer}>
              <Text style={styles.compatibilityLabel}>Совместимость</Text>
              <View style={styles.compatibilityBar}>
                <View
                  style={[
                    styles.compatibilityFill,
                    {
                      width: `${user.compatibility}%`,
                      backgroundColor: getCompatibilityColor(
                        user.compatibility
                      ),
                    },
                  ]}
                />
              </View>
              <Text style={styles.compatibilityScore}>
                {user.compatibility}%
              </Text>
            </View>

            {/* Elements Chart */}
            <View style={styles.elementsContainer}>
              <Text style={styles.elementsTitle}>Стихии</Text>
              <View style={styles.elementsChart}>
                {Object.entries(user.elements).map(([element, value]) => (
                  <View key={element} style={styles.elementItem}>
                    <View style={styles.elementBar}>
                      <View
                        style={[
                          styles.elementFill,
                          {
                            width: `${value}%`,
                            backgroundColor: getElementColor(element),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.elementLabel}>
                      {getElementNameRu(element)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Key Aspects */}
            <View style={styles.aspectsContainer}>
              <Text style={styles.aspectsTitle}>Ключевые аспекты</Text>
              <View style={styles.aspectsList}>
                {user.keyAspects.map((aspect, index) => (
                  <View key={index} style={styles.aspectItem}>
                    <Ionicons name="star" size={16} color="#8B5CF6" />
                    <Text style={styles.aspectText}>{aspect}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Chat Button */}
            <TouchableOpacity
              style={styles.chatButton}
              onPress={onChat}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.chatGradient}
              >
                <Ionicons name="chatbubbles" size={20} color="#fff" />
                <Text style={styles.chatText}>Написать</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Match indicator */}
            {user.isMatched && (
              <View style={styles.matchIndicator}>
                <Ionicons name="heart" size={24} color="#10B981" />
                <Text style={styles.matchText}>Матч!</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
  },
  card: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dimOverlay: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  },
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    right: 20,
    transform: [{ translateY: -20 }],
    zIndex: 10,
  },
  topActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 10,
    zIndex: 20,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  likeCircle: {
    borderWidth: 2,
    borderColor: 'rgba(16,185,129,0.7)',
  },
  chatCircle: {
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.7)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  age: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
  },
  zodiacContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  zodiacSvg: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  zodiacSign: {
    fontSize: 16,
    color: '#fff',
    marginTop: 10,
    opacity: 0.8,
  },
  compatibilityContainer: {
    marginBottom: 20,
  },
  compatibilityLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  compatibilityBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  compatibilityFill: {
    height: '100%',
    borderRadius: 4,
  },
  compatibilityScore: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  elementsContainer: {
    marginBottom: 20,
  },
  elementsTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  elementsChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  elementItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  elementBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },
  elementFill: {
    height: '100%',
    borderRadius: 2,
  },
  elementLabel: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '500',
    marginTop: 2,
  },
  aspectsContainer: {
    marginBottom: 60,
  },
  aspectsTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  aspectsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  aspectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    margin: 2,
  },
  aspectText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  chatButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  chatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  chatText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  matchIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  matchText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default DatingCard;
