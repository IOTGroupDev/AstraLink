// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Dimensions,
//   Alert,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withSpring,
//   withTiming,
//   withDelay,
//   FadeIn,
//   SlideInUp,
//   Easing,
//   interpolate,
//   runOnJS,
// } from 'react-native-reanimated';
// import {
//   PanGestureHandler,
//   GestureHandlerRootView,
// } from 'react-native-gesture-handler';
// import { Ionicons } from '@expo/vector-icons';
//
// import AnimatedStars from '../components/AnimatedStars';
// import ShimmerLoader from '../components/ShimmerLoader';
// import { connectionsAPI, getStoredToken } from '../services/api';
//
// const { width, height } = Dimensions.get('window');
//
// interface DatingMatch {
//   id: string;
//   name: string;
//   age: number;
//   zodiacSign: string;
//   compatibility: number;
//   distance: number;
//   bio: string;
//   interests: string[];
//   photos?: string[];
//   occupation?: string;
//   education?: string;
//   height?: string;
//   relationshipGoals?: string;
//   lifestyle?: string[];
//   astrologySign?: string;
//   moonSign?: string;
//   risingSign?: string;
// }
//
// export default function DatingScreen() {
//   const [matches, setMatches] = useState<DatingMatch[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [connections, setConnections] = useState<any[]>([]);
//   const [connectionsLoading, setConnectionsLoading] = useState(true);
//
//   const cardScale = useSharedValue(1);
//   const cardOpacity = useSharedValue(1);
//   const translateX = useSharedValue(0);
//   const translateY = useSharedValue(0);
//   const rotate = useSharedValue(0);
//
//   const loadMatches = async () => {
//     setLoading(true);
//
//     // Симулируем загрузку данных
//     await new Promise((resolve) => setTimeout(resolve, 1500));
//
//     // Расширенные моковые данные для демонстрации
//     const mockMatches: DatingMatch[] = [
//       {
//         id: '1',
//         name: 'Елена',
//         age: 28,
//         zodiacSign: 'Рыбы',
//         compatibility: 87,
//         distance: 5,
//         bio: 'Люблю астрологию и медитации под звездным небом. Ищу духовную связь и гармонию в отношениях.',
//         interests: ['Астрология', 'Йога', 'Путешествия', 'Медитация'],
//         occupation: 'Астролог',
//         education: 'Психология',
//         height: '165 см',
//         relationshipGoals: 'Серьезные отношения',
//         lifestyle: ['Вегетарианство', 'ЗОЖ', 'Спорт'],
//         astrologySign: 'Рыбы',
//         moonSign: 'Рак',
//         risingSign: 'Скорпион',
//       },
//       {
//         id: '2',
//         name: 'София',
//         age: 25,
//         zodiacSign: 'Лев',
//         compatibility: 93,
//         distance: 8,
//         bio: 'Творческая натура, ищу гармонию и вдохновение. Люблю искусство и глубокие разговоры.',
//         interests: ['Искусство', 'Музыка', 'Психология', 'Танцы'],
//         occupation: 'Художник',
//         education: 'Искусство',
//         height: '170 см',
//         relationshipGoals: 'Творческое партнерство',
//         lifestyle: ['Творчество', 'Концерты', 'Выставки'],
//         astrologySign: 'Лев',
//         moonSign: 'Весы',
//         risingSign: 'Близнецы',
//       },
//       {
//         id: '3',
//         name: 'Анна',
//         age: 30,
//         zodiacSign: 'Скорпион',
//         compatibility: 76,
//         distance: 12,
//         bio: 'Глубокие разговоры о смысле жизни и космосе. Интересуюсь эзотерикой и философией.',
//         interests: ['Философия', 'Книги', 'Эзотерика', 'Астрология'],
//         occupation: 'Психолог',
//         education: 'Философия',
//         height: '168 см',
//         relationshipGoals: 'Духовная связь',
//         lifestyle: ['Чтение', 'Медитация', 'Природа'],
//         astrologySign: 'Скорпион',
//         moonSign: 'Скорпион',
//         risingSign: 'Рыбы',
//       },
//       {
//         id: '4',
//         name: 'Мария',
//         age: 26,
//         zodiacSign: 'Весы',
//         compatibility: 82,
//         distance: 3,
//         bio: 'Ищу баланс во всем. Люблю красоту, гармонию и интеллектуальные беседы.',
//         interests: ['Дизайн', 'Мода', 'Литература', 'Путешествия'],
//         occupation: 'Дизайнер',
//         education: 'Дизайн',
//         height: '172 см',
//         relationshipGoals: 'Гармоничные отношения',
//         lifestyle: ['Красота', 'Искусство', 'Социальная жизнь'],
//         astrologySign: 'Весы',
//         moonSign: 'Лев',
//         risingSign: 'Весы',
//       },
//       {
//         id: '5',
//         name: 'Виктория',
//         age: 29,
//         zodiacSign: 'Стрелец',
//         compatibility: 89,
//         distance: 15,
//         bio: 'Авантюристка по духу. Люблю путешествия, приключения и новые впечатления.',
//         interests: ['Путешествия', 'Спорт', 'Приключения', 'Фотография'],
//         occupation: 'Фотограф',
//         education: 'Журналистика',
//         height: '175 см',
//         relationshipGoals: 'Приключения вдвоем',
//         lifestyle: ['Активный отдых', 'Путешествия', 'Спорт'],
//         astrologySign: 'Стрелец',
//         moonSign: 'Овен',
//         risingSign: 'Стрелец',
//       },
//       {
//         id: '6',
//         name: 'Дарья',
//         age: 27,
//         zodiacSign: 'Дева',
//         compatibility: 71,
//         distance: 7,
//         bio: 'Практичная и организованная. Ценю порядок, качество и интеллектуальное общение.',
//         interests: ['Саморазвитие', 'Кулинария', 'Чтение', 'Планирование'],
//         occupation: 'Менеджер',
//         education: 'Экономика',
//         height: '163 см',
//         relationshipGoals: 'Стабильные отношения',
//         lifestyle: ['Планирование', 'ЗОЖ', 'Обучение'],
//         astrologySign: 'Дева',
//         moonSign: 'Дева',
//         risingSign: 'Козерог',
//       },
//       {
//         id: '7',
//         name: 'Алиса',
//         age: 24,
//         zodiacSign: 'Близнецы',
//         compatibility: 85,
//         distance: 10,
//         bio: 'Энергичная и общительная. Люблю новые знакомства, общение и разнообразие.',
//         interests: ['Общение', 'Технологии', 'Спорт', 'Развлечения'],
//         occupation: 'IT-специалист',
//         education: 'Информатика',
//         height: '167 см',
//         relationshipGoals: 'Легкие отношения',
//         lifestyle: ['Социальная жизнь', 'Технологии', 'Спорт'],
//         astrologySign: 'Близнецы',
//         moonSign: 'Близнецы',
//         risingSign: 'Лев',
//       },
//       {
//         id: '8',
//         name: 'Ксения',
//         age: 31,
//         zodiacSign: 'Козерог',
//         compatibility: 68,
//         distance: 20,
//         bio: 'Амбициозная и целеустремленная. Ценю стабильность, успех и серьезные отношения.',
//         interests: ['Карьера', 'Саморазвитие', 'Инвестиции', 'Спорт'],
//         occupation: 'Бизнес-аналитик',
//         education: 'Экономика',
//         height: '169 см',
//         relationshipGoals: 'Серьезные отношения',
//         lifestyle: ['Карьера', 'Спорт', 'Обучение'],
//         astrologySign: 'Козерог',
//         moonSign: 'Козерог',
//         risingSign: 'Дева',
//       },
//     ];
//
//     setMatches(mockMatches);
//     setLoading(false);
//   };
//
//   useEffect(() => {
//     loadMatches();
//     fetchConnections();
//   }, []);
//
//   const fetchConnections = async () => {
//     setConnectionsLoading(true);
//     try {
//       const token = getStoredToken();
//       if (token) {
//         const connectionsData = await connectionsAPI.getConnections();
//         setConnections(connectionsData.slice(0, 3)); // Показываем только первые 3 связи
//       }
//     } catch (error) {
//       console.error('Ошибка загрузки связей:', error);
//       // Используем моковые данные для связей
//       setConnections([
//         { id: 1, name: 'Анна', zodiacSign: 'Рыбы', compatibility: 85 },
//         { id: 2, name: 'Михаил', zodiacSign: 'Скорпион', compatibility: 92 },
//         { id: 3, name: 'Елена', zodiacSign: 'Весы', compatibility: 78 },
//       ]);
//     } finally {
//       setConnectionsLoading(false);
//     }
//   };
//
//   // Сброс анимации при смене карточки
//   useEffect(() => {
//     translateX.value = 0;
//     translateY.value = 0;
//     rotate.value = 0;
//     cardScale.value = 1;
//     cardOpacity.value = 1;
//   }, [currentIndex]);
//
//   const nextCard = () => {
//     if (currentIndex < matches.length - 1) {
//       setCurrentIndex(currentIndex + 1);
//     } else {
//       Alert.alert(
//         '🌟',
//         'Это все совпадения на сегодня!\nЗавтра будут новые звездные встречи ✨'
//       );
//     }
//   };
//
//   const onGestureEvent = (event: any) => {
//     translateX.value = event.nativeEvent.translationX;
//     translateY.value = event.nativeEvent.translationY;
//
//     // Поворот карточки при свайпе
//     const rotation = interpolate(
//       event.nativeEvent.translationX,
//       [-width, 0, width],
//       [-15, 0, 15]
//     );
//     rotate.value = rotation;
//   };
//
//   const onHandlerStateChange = (event: any) => {
//     if (event.nativeEvent.state === 5) {
//       // END
//       const { translationX, velocityX } = event.nativeEvent;
//
//       // Определяем направление свайпа
//       const shouldSwipeLeft = translationX < -width * 0.3 || velocityX < -500;
//       const shouldSwipeRight = translationX > width * 0.3 || velocityX > 500;
//
//       if (shouldSwipeLeft) {
//         // Свайп влево - пропустить
//         translateX.value = withTiming(-width * 1.5, { duration: 300 }, () => {
//           runOnJS(handlePass)();
//         });
//         rotate.value = withTiming(-30, { duration: 300 });
//       } else if (shouldSwipeRight) {
//         // Свайп вправо - лайк
//         translateX.value = withTiming(width * 1.5, { duration: 300 }, () => {
//           runOnJS(handleLike)();
//         });
//         rotate.value = withTiming(30, { duration: 300 });
//       } else {
//         // Возврат в исходное положение
//         translateX.value = withSpring(0);
//         translateY.value = withSpring(0);
//         rotate.value = withSpring(0);
//       }
//     }
//   };
//
//   const handleLike = () => {
//     Alert.alert('💜', `Вы лайкнули ${matches[currentIndex]?.name}!`);
//     nextCard();
//   };
//
//   const handlePass = () => {
//     nextCard();
//   };
//
//   const animatedCardStyle = useAnimatedStyle(() => ({
//     transform: [
//       { translateX: translateX.value },
//       { translateY: translateY.value },
//       { rotate: `${rotate.value}deg` },
//       { scale: cardScale.value },
//     ],
//     opacity: cardOpacity.value,
//   }));
//
//   const currentMatch = matches[currentIndex];
//
//   if (loading) {
//     return (
//       <LinearGradient
//         colors={['#1a0a2a', '#3a1a5a', '#000000']}
//         style={styles.container}
//       >
//         <AnimatedStars count={50} />
//         <View style={styles.loadingContainer}>
//           <Text style={styles.title}>Cosmic Matches</Text>
//           <Text style={styles.subtitle}>Ищем ваши звездные совпадения...</Text>
//           <View style={styles.shimmerContainer}>
//             <ShimmerLoader
//               width={width * 0.8}
//               height={height * 0.5}
//               borderRadius={25}
//             />
//             <View style={{ height: 20 }} />
//             <ShimmerLoader width={width * 0.6} height={50} borderRadius={25} />
//           </View>
//         </View>
//       </LinearGradient>
//     );
//   }
//
//   if (!currentMatch) {
//     return (
//       <LinearGradient
//         colors={['#1a0a2a', '#3a1a5a', '#000000']}
//         style={styles.container}
//       >
//         <AnimatedStars count={50} />
//         <View style={styles.emptyContainer}>
//           <Ionicons
//             name="heart-outline"
//             size={80}
//             color="rgba(255, 255, 255, 0.3)"
//           />
//           <Text style={styles.emptyTitle}>Нет новых совпадений</Text>
//           <Text style={styles.emptySubtitle}>
//             Звезды готовят для вас новые встречи.{'\n'}Загляните завтра! ✨
//           </Text>
//           <TouchableOpacity onPress={loadMatches} style={styles.refreshButton}>
//             <LinearGradient
//               colors={['#8B5CF6', '#A855F7']}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 0 }}
//               style={styles.refreshGradient}
//             >
//               <Ionicons name="refresh" size={20} color="#fff" />
//               <Text style={styles.refreshText}>Обновить</Text>
//             </LinearGradient>
//           </TouchableOpacity>
//         </View>
//       </LinearGradient>
//     );
//   }
//
//   return (
//     <GestureHandlerRootView style={styles.container}>
//       <LinearGradient
//         colors={['#1a0a2a', '#3a1a5a', '#000000']}
//         style={styles.container}
//       >
//         <AnimatedStars count={50} />
//
//         <ScrollView contentContainerStyle={styles.scrollContent}>
//           {/* Заголовок */}
//           <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
//             <Text style={styles.title}>Cosmic Matches</Text>
//             <Text style={styles.subtitle}>Астрологические совпадения</Text>
//           </Animated.View>
//
//           {/* Виджет связей */}
//           <Animated.View
//             entering={FadeIn.delay(300)}
//             style={styles.connectionsWidget}
//           >
//             <View style={styles.connectionsHeader}>
//               <Ionicons name="people" size={20} color="#8B5CF6" />
//               <Text style={styles.connectionsTitle}>Ваши связи</Text>
//             </View>
//
//             {connectionsLoading ? (
//               <View style={styles.connectionsLoading}>
//                 <ShimmerLoader width={60} height={60} borderRadius={30} />
//                 <ShimmerLoader width={60} height={60} borderRadius={30} />
//                 <ShimmerLoader width={60} height={60} borderRadius={30} />
//               </View>
//             ) : connections.length > 0 ? (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={styles.connectionsList}
//               >
//                 {connections.map((connection, index) => (
//                   <View key={connection.id} style={styles.connectionItem}>
//                     <LinearGradient
//                       colors={['#8B5CF6', '#A855F7']}
//                       style={styles.connectionAvatar}
//                     >
//                       <Text style={styles.connectionInitial}>
//                         {connection.name?.charAt(0) || 'A'}
//                       </Text>
//                     </LinearGradient>
//                     <Text style={styles.connectionName}>{connection.name}</Text>
//                     <Text style={styles.connectionSign}>
//                       {connection.zodiacSign}
//                     </Text>
//                     <Text style={styles.connectionCompatibility}>
//                       {connection.compatibility}%
//                     </Text>
//                   </View>
//                 ))}
//               </ScrollView>
//             ) : (
//               <View style={styles.connectionsEmpty}>
//                 <Text style={styles.connectionsEmptyText}>Нет связей</Text>
//               </View>
//             )}
//           </Animated.View>
//
//           {/* Карточка пользователя */}
//           <Animated.View
//             entering={SlideInUp.delay(400)}
//             style={styles.cardContainer}
//           >
//             <PanGestureHandler
//               onGestureEvent={onGestureEvent}
//               onHandlerStateChange={onHandlerStateChange}
//             >
//               <Animated.View style={animatedCardStyle}>
//                 <LinearGradient
//                   colors={[
//                     'rgba(255, 255, 255, 0.15)',
//                     'rgba(255, 255, 255, 0.05)',
//                   ]}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                   style={styles.matchCard}
//                 >
//                   {/* Аватар заглушка */}
//                   <LinearGradient
//                     colors={['#8B5CF6', '#A855F7']}
//                     style={styles.avatar}
//                   >
//                     <Text style={styles.avatarText}>
//                       {currentMatch.name.charAt(0)}
//                     </Text>
//                   </LinearGradient>
//
//                   {/* Информация о пользователе */}
//                   <Text style={styles.userName}>
//                     {currentMatch.name}, {currentMatch.age}
//                   </Text>
//                   <Text style={styles.zodiacSign}>
//                     {currentMatch.zodiacSign}
//                   </Text>
//
//                   {/* Совместимость */}
//                   <View style={styles.compatibilityContainer}>
//                     <Text style={styles.compatibilityLabel}>Совместимость</Text>
//                     <View style={styles.compatibilityBar}>
//                       <LinearGradient
//                         colors={['#10B981', '#34D399']}
//                         style={[
//                           styles.compatibilityFill,
//                           { width: `${currentMatch.compatibility}%` },
//                         ]}
//                       />
//                     </View>
//                     <Text style={styles.compatibilityText}>
//                       {currentMatch.compatibility}%
//                     </Text>
//                   </View>
//
//                   {/* Расстояние */}
//                   <View style={styles.distanceContainer}>
//                     <Ionicons
//                       name="location-outline"
//                       size={16}
//                       color="rgba(255, 255, 255, 0.7)"
//                     />
//                     <Text style={styles.distanceText}>
//                       {currentMatch.distance} км от вас
//                     </Text>
//                   </View>
//
//                   {/* Биография */}
//                   <Text style={styles.bioText}>{currentMatch.bio}</Text>
//
//                   {/* Дополнительная информация */}
//                   <View style={styles.additionalInfo}>
//                     {currentMatch.occupation && (
//                       <View style={styles.infoRow}>
//                         <Ionicons
//                           name="briefcase-outline"
//                           size={16}
//                           color="rgba(255, 255, 255, 0.7)"
//                         />
//                         <Text style={styles.infoText}>
//                           {currentMatch.occupation}
//                         </Text>
//                       </View>
//                     )}
//                     {currentMatch.height && (
//                       <View style={styles.infoRow}>
//                         <Ionicons
//                           name="resize-outline"
//                           size={16}
//                           color="rgba(255, 255, 255, 0.7)"
//                         />
//                         <Text style={styles.infoText}>
//                           {currentMatch.height}
//                         </Text>
//                       </View>
//                     )}
//                     {currentMatch.relationshipGoals && (
//                       <View style={styles.infoRow}>
//                         <Ionicons
//                           name="heart-outline"
//                           size={16}
//                           color="rgba(255, 255, 255, 0.7)"
//                         />
//                         <Text style={styles.infoText}>
//                           {currentMatch.relationshipGoals}
//                         </Text>
//                       </View>
//                     )}
//                   </View>
//
//                   {/* Астрологическая информация */}
//                   <View style={styles.astroInfo}>
//                     <Text style={styles.astroTitle}>Астрологическая карта</Text>
//                     <View style={styles.astroSigns}>
//                       {currentMatch.moonSign && (
//                         <View style={styles.astroSign}>
//                           <Text style={styles.astroLabel}>Луна</Text>
//                           <Text style={styles.astroValue}>
//                             {currentMatch.moonSign}
//                           </Text>
//                         </View>
//                       )}
//                       {currentMatch.risingSign && (
//                         <View style={styles.astroSign}>
//                           <Text style={styles.astroLabel}>Восход</Text>
//                           <Text style={styles.astroValue}>
//                             {currentMatch.risingSign}
//                           </Text>
//                         </View>
//                       )}
//                     </View>
//                   </View>
//
//                   {/* Интересы */}
//                   <View style={styles.interestsContainer}>
//                     {currentMatch.interests.map((interest, index) => (
//                       <View key={index} style={styles.interestTag}>
//                         <Text style={styles.interestText}>{interest}</Text>
//                       </View>
//                     ))}
//                   </View>
//                 </LinearGradient>
//               </Animated.View>
//             </PanGestureHandler>
//           </Animated.View>
//
//           {/* Кнопки действий */}
//           <Animated.View
//             entering={SlideInUp.delay(600)}
//             style={styles.actionButtons}
//           >
//             <TouchableOpacity onPress={handlePass} style={styles.actionButton}>
//               <LinearGradient
//                 colors={['#EF4444', '#DC2626']}
//                 style={styles.buttonGradient}
//               >
//                 <Ionicons name="close" size={30} color="#fff" />
//               </LinearGradient>
//             </TouchableOpacity>
//
//             <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
//               <LinearGradient
//                 colors={['#EC4899', '#BE185D']}
//                 style={styles.buttonGradient}
//               >
//                 <Ionicons name="heart" size={30} color="#fff" />
//               </LinearGradient>
//             </TouchableOpacity>
//           </Animated.View>
//
//           {/* Счетчик карточек */}
//           <Animated.View entering={FadeIn.delay(800)} style={styles.counter}>
//             <Text style={styles.counterText}>
//               {currentIndex + 1} из {matches.length}
//             </Text>
//           </Animated.View>
//         </ScrollView>
//       </LinearGradient>
//     </GestureHandlerRootView>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   shimmerContainer: {
//     marginTop: 40,
//     alignItems: 'center',
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   emptyTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginTop: 20,
//     textAlign: 'center',
//   },
//   emptySubtitle: {
//     fontSize: 16,
//     color: 'rgba(255, 255, 255, 0.7)',
//     marginTop: 10,
//     textAlign: 'center',
//     lineHeight: 24,
//   },
//   refreshButton: {
//     marginTop: 30,
//   },
//   refreshGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 24,
//     borderRadius: 25,
//   },
//   refreshText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginLeft: 8,
//   },
//   scrollContent: {
//     paddingVertical: 20,
//     paddingHorizontal: 20,
//   },
//   header: {
//     alignItems: 'center',
//     marginBottom: 30,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     color: '#fff',
//     textAlign: 'center',
//     textShadowColor: '#8B5CF6',
//     textShadowOffset: { width: 0, height: 0 },
//     textShadowRadius: 10,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: 'rgba(255, 255, 255, 0.7)',
//     marginTop: 5,
//     textAlign: 'center',
//   },
//   cardContainer: {
//     alignItems: 'center',
//     marginBottom: 30,
//   },
//   matchCard: {
//     width: width * 0.85,
//     borderRadius: 25,
//     padding: 25,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//     shadowColor: '#8B5CF6',
//     shadowOffset: { width: 0, height: 5 },
//     shadowOpacity: 0.3,
//     shadowRadius: 10,
//     elevation: 10,
//   },
//   avatar: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   avatarText: {
//     color: '#fff',
//     fontSize: 32,
//     fontWeight: 'bold',
//   },
//   userName: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 5,
//   },
//   zodiacSign: {
//     fontSize: 18,
//     color: '#8B5CF6',
//     marginBottom: 20,
//   },
//   compatibilityContainer: {
//     width: '100%',
//     marginBottom: 15,
//   },
//   compatibilityLabel: {
//     color: '#fff',
//     fontSize: 16,
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   compatibilityBar: {
//     width: '100%',
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
//   compatibilityText: {
//     color: '#10B981',
//     fontSize: 16,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   distanceContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   distanceText: {
//     color: 'rgba(255, 255, 255, 0.7)',
//     fontSize: 14,
//     marginLeft: 5,
//   },
//   bioText: {
//     color: '#fff',
//     fontSize: 16,
//     textAlign: 'center',
//     lineHeight: 24,
//     marginBottom: 20,
//   },
//   interestsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   interestTag: {
//     backgroundColor: 'rgba(139, 92, 246, 0.3)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 15,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.5)',
//   },
//   interestText: {
//     color: '#fff',
//     fontSize: 14,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     gap: 40,
//     marginBottom: 20,
//   },
//   actionButton: {
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 5 },
//     shadowOpacity: 0.3,
//     shadowRadius: 10,
//     elevation: 10,
//   },
//   buttonGradient: {
//     width: 70,
//     height: 70,
//     borderRadius: 35,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   counter: {
//     alignItems: 'center',
//   },
//   counterText: {
//     color: 'rgba(255, 255, 255, 0.6)',
//     fontSize: 14,
//   },
//   additionalInfo: {
//     width: '100%',
//     marginBottom: 15,
//   },
//   infoRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   infoText: {
//     color: 'rgba(255, 255, 255, 0.8)',
//     fontSize: 14,
//     marginLeft: 8,
//   },
//   astroInfo: {
//     width: '100%',
//     marginBottom: 15,
//     padding: 15,
//     backgroundColor: 'rgba(139, 92, 246, 0.1)',
//     borderRadius: 15,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//   },
//   astroTitle: {
//     color: '#8B5CF6',
//     fontSize: 16,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   astroSigns: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//   },
//   astroSign: {
//     alignItems: 'center',
//   },
//   astroLabel: {
//     color: 'rgba(255, 255, 255, 0.6)',
//     fontSize: 12,
//     marginBottom: 4,
//   },
//   astroValue: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
//   // Стили для виджета связей
//   connectionsWidget: {
//     width: '90%',
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 20,
//     padding: 15,
//     marginBottom: 20,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.2)',
//   },
//   connectionsHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   connectionsTitle: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginLeft: 8,
//   },
//   connectionsLoading: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     paddingVertical: 10,
//   },
//   connectionsList: {
//     paddingHorizontal: 5,
//   },
//   connectionItem: {
//     alignItems: 'center',
//     marginRight: 15,
//     width: 70,
//   },
//   connectionAvatar: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   connectionInitial: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   connectionName: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '600',
//     textAlign: 'center',
//     marginBottom: 2,
//   },
//   connectionSign: {
//     color: 'rgba(255, 255, 255, 0.7)',
//     fontSize: 10,
//     textAlign: 'center',
//     marginBottom: 2,
//   },
//   connectionCompatibility: {
//     color: '#8B5CF6',
//     fontSize: 10,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   connectionsEmpty: {
//     paddingVertical: 20,
//     alignItems: 'center',
//   },
//   connectionsEmptyText: {
//     color: 'rgba(255, 255, 255, 0.5)',
//     fontSize: 14,
//   },
// });

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Мокированные данные по макету Figma
const mockUser = {
  name: 'Елена',
  age: 28,
  zodiacSign: 'Рыбы',
  distance: 5,
  bio: 'Люблю астрологию и медитации под звездным небом. Ищу духовную связь и гармонию в отношениях.',
  compatibility: 87,
  occupation: 'Астролог',
  height: '165 см',
  relationshipGoals: 'Серьезные отношения',
  interests: ['Философия', 'Книги', 'Эзотерика', 'Астрология'],
  photo:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1200&fit=crop',
};

// Координаты декоративных точек из Figma
const DECORATIVE_DOTS = [
  { x: 370, y: 273 },
  { x: 254, y: 256 },
  { x: 125, y: 79 },
  { x: 344, y: 54 },
  { x: 92, y: 25 },
  { x: 256, y: 129 },
  { x: 304, y: 378 },
  { x: 320, y: 388 },
  { x: 379, y: 397 },
  { x: 386, y: 471 },
  { x: 129, y: 404 },
  { x: 81, y: 433 },
  { x: 105, y: 301 },
  { x: 212, y: 318 },
  { x: 42, y: 575 },
  { x: 135, y: 567 },
  { x: 235, y: 529 },
  { x: 274, y: 567 },
  { x: 357, y: 601 },
  { x: 70, y: 697 },
  { x: 161, y: 614 },
  { x: 300, y: 701 },
  { x: 176, y: 748 },
  { x: 414, y: 804 },
  { x: 11, y: 180 },
  { x: 22, y: 362 },
  { x: 26, y: 800 },
  { x: 194, y: 682 },
];

export default function DatingScreen() {
  const [currentUser] = useState(mockUser);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const handleLike = () => {
    console.log('💜 Лайк:', currentUser.name);
  };

  const handlePass = () => {
    console.log('❌ Пропустить:', currentUser.name);
  };

  const handleMessage = () => {
    console.log('💬 Сообщение:', currentUser.name);
  };

  const onGestureEvent = (event: any) => {
    translateX.value = event.nativeEvent.translationX;
    translateY.value = event.nativeEvent.translationY;
    rotate.value = event.nativeEvent.translationX / 10;
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) {
      const { translationX, velocityX } = event.nativeEvent;

      if (translationX < -width * 0.3 || velocityX < -500) {
        translateX.value = withTiming(-width * 1.5, { duration: 300 }, () => {
          runOnJS(handlePass)();
        });
      } else if (translationX > width * 0.3 || velocityX > 500) {
        translateX.value = withTiming(width * 1.5, { duration: 300 }, () => {
          runOnJS(handleLike)();
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    }
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
  }, [currentUser]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* Фоновый градиент из Figma */}
        <LinearGradient
          colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Декоративные точки */}
        <View style={[StyleSheet.absoluteFillObject, styles.dotsContainer]}>
          {DECORATIVE_DOTS.map((dot, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  left: (dot.x / 430) * width,
                  top: (dot.y / 932) * height,
                },
              ]}
            />
          ))}
        </View>

        {/* Размытый градиент снизу */}
        <LinearGradient
          colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomBlur}
        />

        {/* Контент */}
        <View style={styles.content}>
          {/* Заголовок с backdrop-blur */}
          <BlurView intensity={10} tint="dark" style={styles.header}>
            {/* Иконка Dating */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="heart" size={30} color="#fff" />
              </View>
            </View>

            <Text style={styles.title}>Знакомства</Text>
            <Text style={styles.subtitle}>Астрологические совпадения</Text>
          </BlurView>

          {/* Основная карточка */}
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View style={[styles.card, animatedCardStyle]}>
              <View style={styles.cardInner}>
                {/* Фото пользователя */}
                <Image
                  source={{ uri: currentUser.photo }}
                  style={styles.photo}
                  resizeMode="cover"
                />

                {/* Градиент оверлей снизу */}
                <LinearGradient
                  colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.9)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.gradientOverlay}
                />

                {/* Боковые кнопки */}
                <View style={styles.sideButtons}>
                  <TouchableOpacity
                    style={styles.sideButton}
                    onPress={handlePass}
                  >
                    <Ionicons name="close" size={20} color="#6F1F87" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sideButton}
                    onPress={handleLike}
                  >
                    <Ionicons name="heart" size={18} color="#6F1F87" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sideButton}
                    onPress={handleMessage}
                  >
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={18}
                      color="#6F1F87"
                    />
                  </TouchableOpacity>
                </View>

                {/* Информационный блок снизу */}
                <ScrollView
                  style={styles.infoContainer}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {/* Основная инфа */}
                  <View style={styles.basicInfo}>
                    <Text style={styles.userName}>
                      {currentUser.name}, {currentUser.age}
                    </Text>
                    <Text style={styles.zodiacSign}>
                      {currentUser.zodiacSign}
                    </Text>
                  </View>

                  {/* Локация */}
                  <View style={styles.locationRow}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={styles.locationText}>
                      {currentUser.distance} км от вас
                    </Text>
                  </View>

                  {/* Био */}
                  <Text style={styles.bioText}>{currentUser.bio}</Text>

                  {/* Детальный блок с темным фоном */}
                  <BlurView
                    intensity={20}
                    tint="dark"
                    style={styles.detailsBlock}
                  >
                    {/* Совместимость */}
                    <View style={styles.compatibilitySection}>
                      <View style={styles.compatibilityHeader}>
                        <Text style={styles.compatibilityLabel}>
                          Совместимость
                        </Text>
                        <Text style={styles.compatibilityValue}>
                          {currentUser.compatibility}%
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <LinearGradient
                          colors={['#10B981', '#34D399']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.progressFill,
                            { width: `${currentUser.compatibility}%` },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Детали профиля */}
                    <View style={styles.profileDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons
                          name="briefcase-outline"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.detailText}>
                          {currentUser.occupation}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons
                          name="resize-outline"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.detailText}>
                          {currentUser.height}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="heart-outline" size={16} color="#fff" />
                        <Text style={styles.detailText}>
                          {currentUser.relationshipGoals}
                        </Text>
                      </View>
                    </View>

                    {/* Интересы - теги */}
                    <View style={styles.interestsContainer}>
                      {currentUser.interests.map((interest, idx) => (
                        <View key={idx} style={styles.interestTag}>
                          <Text style={styles.interestText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </BlurView>
                </ScrollView>
              </View>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  dotsContainer: {
    opacity: 0.3,
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9D9D9',
  },
  bottomBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 120,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    marginBottom: 32,
    overflow: 'hidden',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 39,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
  card: {
    height: 566,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 379,
  },
  sideButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 10,
  },
  sideButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 400,
    padding: 16,
  },
  basicInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 29,
    marginBottom: 4,
  },
  zodiacSign: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  bioText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsBlock: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  compatibilitySection: {
    marginBottom: 12,
  },
  compatibilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compatibilityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  compatibilityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  profileDetails: {
    marginBottom: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 51,
    backgroundColor: 'rgba(111, 31, 135, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(111, 31, 135, 1)',
  },
  interestText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '400',
  },
});
