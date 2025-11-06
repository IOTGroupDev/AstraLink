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
//   runOnJS,
// } from 'react-native-reanimated';
// import {
//   PanGestureHandler,
//   GestureHandlerRootView,
// } from 'react-native-gesture-handler';
// import { Ionicons } from '@expo/vector-icons';
// import { BlurView } from 'expo-blur';
// import { useNavigation } from '@react-navigation/native';
// import { useAuth } from '../hooks/useAuth';
// import { datingAPI } from '../services/api';
// import { supabase } from '../services/supabase';
// import CosmicChat from '../components/dating/CosmicChat';
//
// const { width, height } = Dimensions.get('window');
//
// // Декоративные точки из Figma
// const DECORATIVE_DOTS = [
//   { x: 35, y: 103 },
//   { x: 395, y: 83 },
//   { x: 68, y: 240 },
//   { x: 362, y: 320 },
//   { x: 38, y: 470 },
//   { x: 392, y: 450 },
//   { x: 70, y: 625 },
//   { x: 360, y: 705 },
//   { x: 42, y: 830 },
//   { x: 388, y: 880 },
// ];
//
// export default function DatingScreen() {
//   // Тип данных из API
//   type ApiCandidate = {
//     userId: string;
//     badge: 'high' | 'medium' | 'low';
//     photoUrl: string | null;
//   };
//
//   // Расширенный тип с дополнительными полями (если нужны)
//   type Candidate = ApiCandidate & {
//     name?: string;
//     age?: number;
//     zodiacSign?: string;
//     bio?: string;
//     interests?: string[];
//     distance?: number;
//   };
//
//   const [candidates, setCandidates] = useState<Candidate[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [chatVisible, setChatVisible] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<{
//     name: string;
//     zodiacSign: string;
//     compatibility: number;
//   } | null>(null);
//
//   const current = candidates[currentIndex] || null;
//   const translateX = useSharedValue(0);
//   const translateY = useSharedValue(0);
//   const rotate = useSharedValue(0);
//   const { user } = useAuth();
//   const navigation = useNavigation<any>();
//
//   // Загрузка кандидатов при монтировании
//   useEffect(() => {
//     (async () => {
//       try {
//         const data = await datingAPI.getCandidates(20);
//
//         // Если данных нет, используем моковые
//         if (!data || data.length === 0) {
//           console.log('⚠️ API вернул пустой массив, используем моковые данные');
//           const mockData = [
//             {
//               userId: 'mock-1',
//               badge: 'high' as const,
//               photoUrl: null,
//               name: 'Елена',
//               age: 28,
//               zodiacSign: 'Рыбы',
//               bio: 'Люблю астрологию и медитации',
//               interests: ['Астрология', 'Йога', 'Путешествия'],
//               distance: 5,
//             },
//             {
//               userId: 'mock-2',
//               badge: 'medium' as const,
//               photoUrl: null,
//               name: 'София',
//               age: 25,
//               zodiacSign: 'Лев',
//               bio: 'Творческая натура',
//               interests: ['Искусство', 'Музыка'],
//               distance: 8,
//             },
//           ];
//           setCandidates(mockData);
//           setCurrentIndex(0);
//           return;
//         }
//
//         // API возвращает минимальный набор полей
//         const enrichedData = data.map((candidate: ApiCandidate) => ({
//           ...candidate,
//           name: 'Пользователь',
//           age: 25,
//           zodiacSign: 'Лев',
//           bio: 'Интересная личность',
//           interests: ['Астрология', 'Путешествия'],
//           distance: Math.floor(Math.random() * 20) + 1,
//         }));
//         setCandidates(enrichedData);
//         setCurrentIndex(0);
//       } catch (e) {
//         console.log('❌ Ошибка загрузки кандидатов:', e);
//         // Используем моковые данные при ошибке
//         const mockData = [
//           {
//             userId: 'mock-1',
//             badge: 'high' as const,
//             photoUrl: null,
//             name: 'Елена',
//             age: 28,
//             zodiacSign: 'Рыбы',
//             bio: 'Люблю астрологию и медитации',
//             interests: ['Астрология', 'Йога', 'Путешествия'],
//             distance: 5,
//           },
//         ];
//         setCandidates(mockData);
//         setCurrentIndex(0);
//       }
//     })();
//   }, []);
//
//   // Realtime: уведомление о взаимной симпатии (match)
//   useEffect(() => {
//     if (!user?.id) return;
//
//     const channel = supabase
//       .channel(`matches-${user.id}`)
//       .on(
//         'postgres_changes',
//         { event: 'INSERT', schema: 'public', table: 'matches' },
//         (payload) => {
//           try {
//             const m: any = (payload as any).new;
//             if (!m) return;
//             if (m.user_a_id === user.id || m.user_b_id === user.id) {
//               const otherId =
//                 m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
//               Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
//                 { text: 'Закрыть', style: 'cancel' },
//                 {
//                   text: 'Открыть чат',
//                   onPress: () =>
//                     navigation.navigate('ChatDialog', { otherUserId: otherId }),
//                 },
//               ]);
//             }
//           } catch {}
//         }
//       )
//       .subscribe();
//
//     return () => {
//       try {
//         supabase.removeChannel(channel);
//       } catch {}
//     };
//   }, [user?.id]);
//
//   // Helpers
//   const getBadgeLabel = (b?: 'high' | 'medium' | 'low'): string =>
//     b === 'high' ? 'Высокая' : b === 'medium' ? 'Средняя' : 'Низкая';
//
//   const getBadgeBg = (b?: 'high' | 'medium' | 'low'): string =>
//     b === 'high'
//       ? 'rgba(16,185,129,0.25)'
//       : b === 'medium'
//         ? 'rgba(245,158,11,0.25)'
//         : 'rgba(239,68,68,0.25)';
//
//   const getCompatibilityFromBadge = (b?: 'high' | 'medium' | 'low'): number =>
//     b === 'high' ? 85 : b === 'medium' ? 65 : 45;
//
//   const goNext = () => {
//     setCurrentIndex((idx) => (idx + 1 < candidates.length ? idx + 1 : idx));
//     translateX.value = 0;
//     translateY.value = 0;
//     rotate.value = 0;
//   };
//
//   const handleLike = async () => {
//     if (!current) return;
//     try {
//       const res = await datingAPI.like(current.userId, 'like');
//       console.log('💜 Лайк:', current.userId, res);
//       if (res?.matchId) {
//         Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
//           { text: 'Закрыть', style: 'cancel' },
//           {
//             text: 'Открыть чат',
//             onPress: () =>
//               navigation.navigate('ChatDialog', {
//                 otherUserId: current.userId,
//               }),
//           },
//         ]);
//       }
//     } catch (e) {
//       console.log('❌ Ошибка лайка:', e);
//     } finally {
//       goNext();
//     }
//   };
//
//   const handlePass = async () => {
//     if (!current) return;
//     try {
//       await datingAPI.like(current.userId, 'pass');
//     } catch (e) {
//       console.log('❌ Ошибка pass:', e);
//     } finally {
//       goNext();
//     }
//   };
//
//   const handleMessage = () => {
//     console.log('🔵 handleMessage вызвана');
//     console.log('🔵 candidates:', candidates);
//     console.log('🔵 currentIndex:', currentIndex);
//     console.log('🔵 current:', current);
//
//     if (!current) {
//       console.log('❌ current is null');
//       Alert.alert('Ошибка', 'Нет данных о пользователе');
//       return;
//     }
//
//     // Открываем CosmicChat как модальное окно
//     const userData = {
//       name: current.name || 'Пользователь',
//       zodiacSign: current.zodiacSign || 'Неизвестно',
//       compatibility: getCompatibilityFromBadge(current.badge),
//     };
//
//     console.log('✅ Открываем чат с:', userData);
//     setSelectedUser(userData);
//     setChatVisible(true);
//   };
//
//   const handleCloseChat = () => {
//     setChatVisible(false);
//     setSelectedUser(null);
//   };
//
//   const onGestureEvent = (event: any) => {
//     translateX.value = event.nativeEvent.translationX;
//     translateY.value = event.nativeEvent.translationY;
//     rotate.value = event.nativeEvent.translationX / 10;
//   };
//
//   const onHandlerStateChange = (event: any) => {
//     if (event.nativeEvent.state === 5) {
//       const { translationX, velocityX } = event.nativeEvent;
//
//       if (translationX < -width * 0.3 || velocityX < -500) {
//         translateX.value = withTiming(-width * 1.5, { duration: 300 }, () => {
//           runOnJS(handlePass)();
//         });
//       } else if (translationX > width * 0.3 || velocityX > 500) {
//         translateX.value = withTiming(width * 1.5, { duration: 300 }, () => {
//           runOnJS(handleLike)();
//         });
//       } else {
//         translateX.value = withSpring(0);
//         translateY.value = withSpring(0);
//         rotate.value = withSpring(0);
//       }
//     }
//   };
//
//   const animatedCardStyle = useAnimatedStyle(() => ({
//     transform: [
//       { translateX: translateX.value },
//       { translateY: translateY.value },
//       { rotate: `${rotate.value}deg` },
//     ],
//   }));
//
//   useEffect(() => {
//     translateX.value = 0;
//     translateY.value = 0;
//     rotate.value = 0;
//   }, [currentIndex]);
//
//   return (
//     <GestureHandlerRootView style={styles.container}>
//       <View style={styles.container}>
//         {/* Фоновый градиент из Figma */}
//         <LinearGradient
//           colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
//           start={{ x: 0.5, y: 0 }}
//           end={{ x: 0.5, y: 1 }}
//           style={StyleSheet.absoluteFillObject}
//         />
//
//         {/* Декоративные точки */}
//         <View style={[StyleSheet.absoluteFillObject, styles.dotsContainer]}>
//           {DECORATIVE_DOTS.map((dot, i) => (
//             <View
//               key={i}
//               style={[
//                 styles.dot,
//                 {
//                   left: (dot.x / 430) * width,
//                   top: (dot.y / 932) * height,
//                 },
//               ]}
//             />
//           ))}
//         </View>
//
//         {/* Размытый градиент снизу */}
//         <LinearGradient
//           colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
//           start={{ x: 0.5, y: 0 }}
//           end={{ x: 0.5, y: 1 }}
//           style={styles.bottomBlur}
//         />
//
//         {/* Контент */}
//         <View style={styles.content}>
//           {/* Заголовок с backdrop-blur */}
//           <BlurView intensity={10} tint="dark" style={styles.header}>
//             {/* Иконка Dating */}
//             <View style={styles.iconContainer}>
//               <LinearGradient
//                 colors={['#6F1F87', '#2F0A37']}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.iconCircle}
//               >
//                 <Ionicons name="heart" size={28} color="#fff" />
//               </LinearGradient>
//             </View>
//
//             <Text style={styles.title}>Dating</Text>
//             <Text style={styles.subtitle}>Найди свою звезду</Text>
//           </BlurView>
//
//           {/* Карточка */}
//           <View style={{ alignItems: 'center', marginTop: 20 }}>
//             <PanGestureHandler
//               onGestureEvent={onGestureEvent}
//               onHandlerStateChange={onHandlerStateChange}
//             >
//               <Animated.View style={[styles.card, animatedCardStyle]}>
//                 <LinearGradient
//                   colors={['rgba(111, 31, 135, 0.4)', 'rgba(47, 10, 55, 0.4)']}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                   style={styles.cardInner}
//                 >
//                   {/* Фото (заглушка) */}
//                   <View style={styles.photo} />
//
//                   {/* Градиент снизу */}
//                   <LinearGradient
//                     colors={[
//                       'transparent',
//                       'rgba(0,0,0,0.3)',
//                       'rgba(0,0,0,0.8)',
//                     ]}
//                     style={styles.gradientOverlay}
//                   />
//
//                   {/* Информационный блок снизу */}
//                   <ScrollView
//                     style={styles.infoContainer}
//                     showsVerticalScrollIndicator={false}
//                     bounces={false}
//                   >
//                     {/* Детальный блок с темным фоном */}
//                     <BlurView
//                       intensity={20}
//                       tint="dark"
//                       style={styles.detailsBlock}
//                     >
//                       {/* Имя и возраст */}
//                       <View style={styles.basicInfo}>
//                         <Text style={styles.userName}>
//                           {current?.name || 'Пользователь'}, {current?.age || '—'}
//                         </Text>
//                         <Text style={styles.zodiacSign}>
//                           {current?.zodiacSign || '—'}
//                         </Text>
//                       </View>
//
//                       {/* Расстояние */}
//                       {current?.distance != null && (
//                         <View style={styles.locationRow}>
//                           <Ionicons
//                             name="location"
//                             size={14}
//                             color="rgba(255,255,255,0.7)"
//                           />
//                           <Text style={styles.locationText}>
//                             {current.distance} км от вас
//                           </Text>
//                         </View>
//                       )}
//
//                       {/* Био */}
//                       <Text style={styles.bioText}>
//                         {current?.bio || 'Нет описания'}
//                       </Text>
//
//                       {/* Совместимость — бейдж без чисел */}
//                       <View style={styles.compatibilitySection}>
//                         <Text style={styles.compatibilityLabel}>
//                           Совместимость
//                         </Text>
//                         <View style={styles.badgeRow}>
//                           <View
//                             style={[
//                               styles.badgePill,
//                               {
//                                 backgroundColor: getBadgeBg(
//                                   current?.badge || 'low'
//                                 ),
//                               },
//                             ]}
//                           >
//                             <Text style={styles.badgeText}>
//                               {getBadgeLabel(current?.badge || 'low')}
//                             </Text>
//                           </View>
//                         </View>
//                       </View>
//
//                       {/* Интересы */}
//                       {current && current.interests && current.interests.length > 0 && (
//                         <View style={styles.interestsContainer}>
//                           {current.interests.map((int, idx) => (
//                             <View key={idx} style={styles.interestTag}>
//                               <Text style={styles.interestText}>{int}</Text>
//                             </View>
//                           ))}
//                         </View>
//                       )}
//                     </BlurView>
//                   </ScrollView>
//                 </LinearGradient>
//               </Animated.View>
//             </PanGestureHandler>
//
//             {/* Боковые кнопки - ВЫНЕСЕНЫ ЗА ПРЕДЕЛЫ PanGestureHandler */}
//             <View style={{
//               position: 'absolute',
//               top: 16,
//               right: 16,
//               gap: 10,
//               zIndex: 1000,
//               elevation: 1000,
//             }}>
//               <TouchableOpacity
//                 style={styles.sideButton}
//                 onPress={() => {
//                   console.log('❤️ Лайк нажат');
//                   handleLike();
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Ionicons name="heart" size={18} color="#6F1F87" />
//               </TouchableOpacity>
//
//               <TouchableOpacity
//                 style={styles.sideButton}
//                 onPress={() => {
//                   console.log('💬 Сообщение нажато');
//                   handleMessage();
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Ionicons
//                   name="chatbubble-ellipses"
//                   size={18}
//                   color="#6F1F87"
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//
//         {/* Модальное окно чата */}
//         {chatVisible && selectedUser && (
//           <CosmicChat
//             visible={chatVisible}
//             user={selectedUser}
//             onClose={handleCloseChat}
//           />
//         )}
//       </View>
//     </GestureHandlerRootView>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#101010',
//   },
//   dotsContainer: {
//     opacity: 0.3,
//   },
//   dot: {
//     position: 'absolute',
//     width: 4,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: '#D9D9D9',
//   },
//   bottomBlur: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 100,
//     borderTopLeftRadius: 16,
//     borderTopRightRadius: 16,
//   },
//   content: {
//     flex: 1,
//     paddingHorizontal: 24,
//     paddingTop: 60,
//     paddingBottom: 120,
//     justifyContent: 'center',
//   },
//   header: {
//     alignItems: 'center',
//     paddingVertical: 24,
//     borderRadius: 16,
//     marginBottom: 32,
//     overflow: 'hidden',
//   },
//   iconContainer: {
//     marginBottom: 16,
//   },
//   iconCircle: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     borderWidth: 3,
//     borderColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: '600',
//     color: '#fff',
//     lineHeight: 39,
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 20,
//     color: 'rgba(255,255,255,0.7)',
//     lineHeight: 24,
//   },
//   card: {
//     height: 566,
//     borderRadius: 20,
//     overflow: 'hidden',
//     width: width - 48,
//   },
//   cardInner: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     borderRadius: 20,
//     overflow: 'hidden',
//   },
//   photo: {
//     position: 'absolute',
//     width: '100%',
//     height: '100%',
//     backgroundColor: 'rgba(111, 31, 135, 0.3)',
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 379,
//   },
//   sideButtons: {
//     position: 'absolute',
//     top: 16,
//     right: 16,
//     gap: 10,
//   },
//   sideButton: {
//     width: 45,
//     height: 45,
//     borderRadius: 22.5,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   infoContainer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     maxHeight: 400,
//     padding: 16,
//   },
//   basicInfo: {
//     marginBottom: 12,
//   },
//   userName: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#fff',
//     lineHeight: 29,
//     marginBottom: 4,
//   },
//   zodiacSign: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: 'rgba(255,255,255,0.7)',
//     lineHeight: 24,
//   },
//   locationRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     marginBottom: 12,
//   },
//   locationText: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.7)',
//     lineHeight: 20,
//   },
//   bioText: {
//     fontSize: 15,
//     color: '#fff',
//     lineHeight: 18,
//     marginBottom: 12,
//   },
//   detailsBlock: {
//     borderRadius: 12,
//     padding: 16,
//     backgroundColor: 'rgba(0, 0, 0, 0.4)',
//     overflow: 'hidden',
//   },
//   compatibilitySection: {
//     marginBottom: 12,
//   },
//   compatibilityLabel: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#fff',
//   },
//   badgeRow: {
//     alignItems: 'center',
//     marginTop: 4,
//     marginBottom: 4,
//   },
//   badgePill: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12,
//   },
//   badgeText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   interestsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   interestTag: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 51,
//     backgroundColor: 'rgba(111, 31, 135, 0.8)',
//     borderWidth: 1,
//     borderColor: 'rgba(111, 31, 135, 1)',
//   },
//   interestText: {
//     fontSize: 10,
//     color: '#fff',
//     fontWeight: '400',
//   },
// });

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
//   runOnJS,
// } from 'react-native-reanimated';
// import {
//   PanGestureHandler,
//   GestureHandlerRootView,
// } from 'react-native-gesture-handler';
// import { Ionicons } from '@expo/vector-icons';
// import { BlurView } from 'expo-blur';
// import { useNavigation } from '@react-navigation/native';
// import { useAuth } from '../hooks/useAuth';
// import { datingAPI } from '../services/api';
// import { supabase } from '../services/supabase';
// import CosmicChat from '../components/dating/CosmicChat';
//
// const { width, height } = Dimensions.get('window');
//
// // Декоративные точки из Figma
// const DECORATIVE_DOTS = [
//   { x: 35, y: 103 },
//   { x: 395, y: 83 },
//   { x: 68, y: 240 },
//   { x: 362, y: 320 },
//   { x: 38, y: 470 },
//   { x: 392, y: 450 },
//   { x: 70, y: 625 },
//   { x: 360, y: 705 },
//   { x: 42, y: 830 },
//   { x: 388, y: 880 },
// ];
//
// export default function DatingScreen() {
//   // Тип данных из API
//   type ApiCandidate = {
//     userId: string;
//     badge: 'high' | 'medium' | 'low';
//     photoUrl: string | null;
//   };
//
//   // Расширенный тип с дополнительными полями (если нужны)
//   type Candidate = ApiCandidate & {
//     name?: string;
//     age?: number;
//     zodiacSign?: string;
//     bio?: string;
//     interests?: string[];
//     distance?: number;
//   };
//
//   const [candidates, setCandidates] = useState<Candidate[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [chatVisible, setChatVisible] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<{
//     name: string;
//     zodiacSign: string;
//     compatibility: number;
//   } | null>(null);
//
//   const current = candidates[currentIndex] || null;
//   const translateX = useSharedValue(0);
//   const translateY = useSharedValue(0);
//   const rotate = useSharedValue(0);
//   const { user } = useAuth();
//   const navigation = useNavigation<any>();
//
//   // Загрузка кандидатов при монтировании
//   useEffect(() => {
//     (async () => {
//       try {
//         const data = await datingAPI.getCandidates(20);
//
//         // Если данных нет, используем моковые
//         if (!data || data.length === 0) {
//           console.log('⚠️ API вернул пустой массив, используем моковые данные');
//           const mockData = [
//             {
//               userId: 'mock-1',
//               badge: 'high' as const,
//               photoUrl: null,
//               name: 'Елена',
//               age: 28,
//               zodiacSign: 'Рыбы',
//               bio: 'Люблю астрологию и медитации',
//               interests: ['Астрология', 'Йога', 'Путешествия'],
//               distance: 5,
//             },
//             {
//               userId: 'mock-2',
//               badge: 'medium' as const,
//               photoUrl: null,
//               name: 'София',
//               age: 25,
//               zodiacSign: 'Лев',
//               bio: 'Творческая натура',
//               interests: ['Искусство', 'Музыка'],
//               distance: 8,
//             },
//           ];
//           setCandidates(mockData);
//           setCurrentIndex(0);
//           return;
//         }
//
//         // API возвращает минимальный набор полей
//         const enrichedData = data.map((candidate: ApiCandidate) => ({
//           ...candidate,
//           name: 'Пользователь',
//           age: 25,
//           zodiacSign: 'Лев',
//           bio: 'Интересная личность',
//           interests: ['Астрология', 'Путешествия'],
//           distance: Math.floor(Math.random() * 20) + 1,
//         }));
//         setCandidates(enrichedData);
//         setCurrentIndex(0);
//       } catch (e) {
//         console.log('❌ Ошибка загрузки кандидатов:', e);
//         // Используем моковые данные при ошибке
//         const mockData = [
//           {
//             userId: 'mock-1',
//             badge: 'high' as const,
//             photoUrl: null,
//             name: 'Елена',
//             age: 28,
//             zodiacSign: 'Рыбы',
//             bio: 'Люблю астрологию и медитации',
//             interests: ['Астрология', 'Йога', 'Путешествия'],
//             distance: 5,
//           },
//         ];
//         setCandidates(mockData);
//         setCurrentIndex(0);
//       }
//     })();
//   }, []);
//
//   // Realtime: уведомление о взаимной симпатии (match)
//   useEffect(() => {
//     if (!user?.id) return;
//
//     const channel = supabase
//       .channel(`matches-${user.id}`)
//       .on(
//         'postgres_changes',
//         { event: 'INSERT', schema: 'public', table: 'matches' },
//         (payload) => {
//           try {
//             const m: any = (payload as any).new;
//             if (!m) return;
//             if (m.user_a_id === user.id || m.user_b_id === user.id) {
//               const otherId =
//                 m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
//               Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
//                 { text: 'Закрыть', style: 'cancel' },
//                 {
//                   text: 'Открыть чат',
//                   onPress: () =>
//                     navigation.navigate('ChatDialog', { otherUserId: otherId }),
//                 },
//               ]);
//             }
//           } catch {}
//         }
//       )
//       .subscribe();
//
//     return () => {
//       try {
//         supabase.removeChannel(channel);
//       } catch {}
//     };
//   }, [user?.id]);
//
//   // Helpers
//   const getBadgeLabel = (b?: 'high' | 'medium' | 'low'): string =>
//     b === 'high' ? 'Высокая' : b === 'medium' ? 'Средняя' : 'Низкая';
//
//   const getBadgeBg = (b?: 'high' | 'medium' | 'low'): string =>
//     b === 'high'
//       ? 'rgba(16,185,129,0.25)'
//       : b === 'medium'
//         ? 'rgba(245,158,11,0.25)'
//         : 'rgba(239,68,68,0.25)';
//
//   const getCompatibilityFromBadge = (b?: 'high' | 'medium' | 'low'): number =>
//     b === 'high' ? 85 : b === 'medium' ? 65 : 45;
//
//   const goNext = () => {
//     setCurrentIndex((idx) => (idx + 1 < candidates.length ? idx + 1 : idx));
//     translateX.value = 0;
//     translateY.value = 0;
//     rotate.value = 0;
//   };
//
//   const handleLike = async () => {
//     if (!current) return;
//     try {
//       const res = await datingAPI.like(current.userId, 'like');
//       console.log('💜 Лайк:', current.userId, res);
//       if (res?.matchId) {
//         Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
//           { text: 'Закрыть', style: 'cancel' },
//           {
//             text: 'Открыть чат',
//             onPress: () =>
//               navigation.navigate('ChatDialog', {
//                 otherUserId: current.userId,
//               }),
//           },
//         ]);
//       }
//     } catch (e) {
//       console.log('❌ Ошибка лайка:', e);
//     } finally {
//       goNext();
//     }
//   };
//
//   const handlePass = async () => {
//     if (!current) return;
//     try {
//       await datingAPI.like(current.userId, 'pass');
//     } catch (e) {
//       console.log('❌ Ошибка pass:', e);
//     } finally {
//       goNext();
//     }
//   };
//
//   const handleMessage = () => {
//     console.log('🔵 handleMessage вызвана');
//     console.log('🔵 candidates:', candidates);
//     console.log('🔵 currentIndex:', currentIndex);
//     console.log('🔵 current:', current);
//
//     if (!current) {
//       console.log('❌ current is null');
//       Alert.alert('Ошибка', 'Нет данных о пользователе');
//       return;
//     }
//
//     // Открываем CosmicChat как модальное окно
//     const userData = {
//       name: current.name || 'Пользователь',
//       zodiacSign: current.zodiacSign || 'Неизвестно',
//       compatibility: getCompatibilityFromBadge(current.badge),
//     };
//
//     console.log('✅ Открываем чат с:', userData);
//     setSelectedUser(userData);
//     setChatVisible(true);
//   };
//
//   const handleCloseChat = () => {
//     setChatVisible(false);
//     setSelectedUser(null);
//   };
//
//   const onGestureEvent = (event: any) => {
//     translateX.value = event.nativeEvent.translationX;
//     translateY.value = event.nativeEvent.translationY;
//     rotate.value = event.nativeEvent.translationX / 10;
//   };
//
//   const onHandlerStateChange = (event: any) => {
//     if (event.nativeEvent.state === 5) {
//       const { translationX, velocityX } = event.nativeEvent;
//
//       if (translationX < -width * 0.3 || velocityX < -500) {
//         translateX.value = withTiming(-width * 1.5, { duration: 300 }, () => {
//           runOnJS(handlePass)();
//         });
//       } else if (translationX > width * 0.3 || velocityX > 500) {
//         translateX.value = withTiming(width * 1.5, { duration: 300 }, () => {
//           runOnJS(handleLike)();
//         });
//       } else {
//         translateX.value = withSpring(0);
//         translateY.value = withSpring(0);
//         rotate.value = withSpring(0);
//       }
//     }
//   };
//
//   const animatedCardStyle = useAnimatedStyle(() => ({
//     transform: [
//       { translateX: translateX.value },
//       { translateY: translateY.value },
//       { rotate: `${rotate.value}deg` },
//     ],
//   }));
//
//   useEffect(() => {
//     translateX.value = 0;
//     translateY.value = 0;
//     rotate.value = 0;
//   }, [currentIndex]);
//
//   return (
//     <GestureHandlerRootView style={styles.container}>
//       <View style={styles.container}>
//         {/* Фоновый градиент из Figma */}
//         <LinearGradient
//           colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
//           start={{ x: 0.5, y: 0 }}
//           end={{ x: 0.5, y: 1 }}
//           style={StyleSheet.absoluteFillObject}
//         />
//
//         {/* Декоративные точки */}
//         <View style={[StyleSheet.absoluteFillObject, styles.dotsContainer]}>
//           {DECORATIVE_DOTS.map((dot, i) => (
//             <View
//               key={i}
//               style={[
//                 styles.dot,
//                 {
//                   left: (dot.x / 430) * width,
//                   top: (dot.y / 932) * height,
//                 },
//               ]}
//             />
//           ))}
//         </View>
//
//         {/* Размытый градиент снизу */}
//         <LinearGradient
//           colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
//           start={{ x: 0.5, y: 0 }}
//           end={{ x: 0.5, y: 1 }}
//           style={styles.bottomBlur}
//         />
//
//         {/* Контент */}
//         <View style={styles.content}>
//           {/* Заголовок с backdrop-blur */}
//           <BlurView intensity={10} tint="dark" style={styles.header}>
//             {/* Иконка Dating */}
//             <View style={styles.iconContainer}>
//               <LinearGradient
//                 colors={['#6F1F87', '#2F0A37']}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.iconCircle}
//               >
//                 <Ionicons name="heart" size={28} color="#fff" />
//               </LinearGradient>
//             </View>
//
//             <Text style={styles.title}>Dating</Text>
//             <Text style={styles.subtitle}>Найди свою звезду</Text>
//           </BlurView>
//
//           {/* Карточка */}
//           <View style={{ alignItems: 'center', marginTop: 20 }}>
//             <PanGestureHandler
//               onGestureEvent={onGestureEvent}
//               onHandlerStateChange={onHandlerStateChange}
//             >
//               <Animated.View style={[styles.card, animatedCardStyle]}>
//                 <LinearGradient
//                   colors={['rgba(111, 31, 135, 0.4)', 'rgba(47, 10, 55, 0.4)']}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                   style={styles.cardInner}
//                 >
//                   {/* Фото (заглушка) */}
//                   <View style={styles.photo} />
//
//                   {/* Градиент снизу */}
//                   <LinearGradient
//                     colors={[
//                       'transparent',
//                       'rgba(0,0,0,0.3)',
//                       'rgba(0,0,0,0.8)',
//                     ]}
//                     style={styles.gradientOverlay}
//                   />
//
//                   {/* Информационный блок снизу */}
//                   <ScrollView
//                     style={styles.infoContainer}
//                     showsVerticalScrollIndicator={false}
//                     bounces={false}
//                   >
//                     {/* Детальный блок с темным фоном */}
//                     <BlurView
//                       intensity={20}
//                       tint="dark"
//                       style={styles.detailsBlock}
//                     >
//                       {/* Имя и возраст */}
//                       <View style={styles.basicInfo}>
//                         <Text style={styles.userName}>
//                           {current?.name || 'Пользователь'}, {current?.age || '—'}
//                         </Text>
//                         <Text style={styles.zodiacSign}>
//                           {current?.zodiacSign || '—'}
//                         </Text>
//                       </View>
//
//                       {/* Расстояние */}
//                       {current?.distance != null && (
//                         <View style={styles.locationRow}>
//                           <Ionicons
//                             name="location"
//                             size={14}
//                             color="rgba(255,255,255,0.7)"
//                           />
//                           <Text style={styles.locationText}>
//                             {current.distance} км от вас
//                           </Text>
//                         </View>
//                       )}
//
//                       {/* Био */}
//                       <Text style={styles.bioText}>
//                         {current?.bio || 'Нет описания'}
//                       </Text>
//
//                       {/* Совместимость — бейдж без чисел */}
//                       <View style={styles.compatibilitySection}>
//                         <Text style={styles.compatibilityLabel}>
//                           Совместимость
//                         </Text>
//                         <View style={styles.badgeRow}>
//                           <View
//                             style={[
//                               styles.badgePill,
//                               {
//                                 backgroundColor: getBadgeBg(
//                                   current?.badge || 'low'
//                                 ),
//                               },
//                             ]}
//                           >
//                             <Text style={styles.badgeText}>
//                               {getBadgeLabel(current?.badge || 'low')}
//                             </Text>
//                           </View>
//                         </View>
//                       </View>
//
//                       {/* Интересы */}
//                       {current && current.interests && current.interests.length > 0 && (
//                         <View style={styles.interestsContainer}>
//                           {current.interests.map((int, idx) => (
//                             <View key={idx} style={styles.interestTag}>
//                               <Text style={styles.interestText}>{int}</Text>
//                             </View>
//                           ))}
//                         </View>
//                       )}
//                     </BlurView>
//                   </ScrollView>
//                 </LinearGradient>
//               </Animated.View>
//             </PanGestureHandler>
//
//             {/* Боковые кнопки - ВЫНЕСЕНЫ ЗА ПРЕДЕЛЫ PanGestureHandler */}
//             <View style={{
//               position: 'absolute',
//               top: 16,
//               right: 16,
//               gap: 10,
//               zIndex: 1000,
//               elevation: 1000,
//             }}>
//               <TouchableOpacity
//                 style={styles.sideButton}
//                 onPress={() => {
//                   console.log('❤️ Лайк нажат');
//                   handleLike();
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Ionicons name="heart" size={18} color="#6F1F87" />
//               </TouchableOpacity>
//
//               <TouchableOpacity
//                 style={styles.sideButton}
//                 onPress={() => {
//                   console.log('💬 Сообщение нажато');
//                   handleMessage();
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Ionicons
//                   name="chatbubble-ellipses"
//                   size={18}
//                   color="#6F1F87"
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//
//         {/* Модальное окно чата */}
//         {chatVisible && selectedUser && (
//           <CosmicChat
//             visible={chatVisible}
//             user={selectedUser}
//             onClose={handleCloseChat}
//           />
//         )}
//       </View>
//     </GestureHandlerRootView>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#101010',
//   },
//   dotsContainer: {
//     opacity: 0.3,
//   },
//   dot: {
//     position: 'absolute',
//     width: 4,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: '#D9D9D9',
//   },
//   bottomBlur: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 100,
//     borderTopLeftRadius: 16,
//     borderTopRightRadius: 16,
//   },
//   content: {
//     flex: 1,
//     paddingHorizontal: 24,
//     paddingTop: 60,
//     paddingBottom: 120,
//     justifyContent: 'center',
//   },
//   header: {
//     alignItems: 'center',
//     paddingVertical: 24,
//     borderRadius: 16,
//     marginBottom: 32,
//     overflow: 'hidden',
//   },
//   iconContainer: {
//     marginBottom: 16,
//   },
//   iconCircle: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     borderWidth: 3,
//     borderColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: '600',
//     color: '#fff',
//     lineHeight: 39,
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 20,
//     color: 'rgba(255,255,255,0.7)',
//     lineHeight: 24,
//   },
//   card: {
//     height: 566,
//     borderRadius: 20,
//     overflow: 'hidden',
//     width: width - 48,
//   },
//   cardInner: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     borderRadius: 20,
//     overflow: 'hidden',
//   },
//   photo: {
//     position: 'absolute',
//     width: '100%',
//     height: '100%',
//     backgroundColor: 'rgba(111, 31, 135, 0.3)',
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 379,
//   },
//   sideButtons: {
//     position: 'absolute',
//     top: 16,
//     right: 16,
//     gap: 10,
//   },
//   sideButton: {
//     width: 45,
//     height: 45,
//     borderRadius: 22.5,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   infoContainer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     maxHeight: 400,
//     padding: 16,
//   },
//   basicInfo: {
//     marginBottom: 12,
//   },
//   userName: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#fff',
//     lineHeight: 29,
//     marginBottom: 4,
//   },
//   zodiacSign: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: 'rgba(255,255,255,0.7)',
//     lineHeight: 24,
//   },
//   locationRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     marginBottom: 12,
//   },
//   locationText: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.7)',
//     lineHeight: 20,
//   },
//   bioText: {
//     fontSize: 15,
//     color: '#fff',
//     lineHeight: 18,
//     marginBottom: 12,
//   },
//   detailsBlock: {
//     borderRadius: 12,
//     padding: 16,
//     backgroundColor: 'rgba(0, 0, 0, 0.4)',
//     overflow: 'hidden',
//   },
//   compatibilitySection: {
//     marginBottom: 12,
//   },
//   compatibilityLabel: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#fff',
//   },
//   badgeRow: {
//     alignItems: 'center',
//     marginTop: 4,
//     marginBottom: 4,
//   },
//   badgePill: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12,
//   },
//   badgeText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   interestsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   interestTag: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 51,
//     backgroundColor: 'rgba(111, 31, 135, 0.8)',
//     borderWidth: 1,
//     borderColor: 'rgba(111, 31, 135, 1)',
//   },
//   interestText: {
//     fontSize: 10,
//     color: '#fff',
//     fontWeight: '400',
//   },
// });

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
//   runOnJS,
// } from 'react-native-reanimated';
// import {
//   PanGestureHandler,
//   GestureHandlerRootView,
// } from 'react-native-gesture-handler';
// import { Ionicons } from '@expo/vector-icons';
// import { BlurView } from 'expo-blur';
// import { useNavigation } from '@react-navigation/native';
// import { useAuth } from '../hooks/useAuth';
// import { datingAPI } from '../services/api';
// import { supabase } from '../services/supabase';
// import CosmicChat from '../components/dating/CosmicChat';
//
// const { width, height } = Dimensions.get('window');
//
// // Декоративные точки из Figma
// const DECORATIVE_DOTS = [
//   { x: 35, y: 103 },
//   { x: 395, y: 83 },
//   { x: 68, y: 240 },
//   { x: 362, y: 320 },
//   { x: 38, y: 470 },
//   { x: 392, y: 450 },
//   { x: 70, y: 625 },
//   { x: 360, y: 705 },
//   { x: 42, y: 830 },
//   { x: 388, y: 880 },
// ];
//
// export default function DatingScreen() {
//   // Тип данных из API
//   type ApiCandidate = {
//     userId: string;
//     badge: 'high' | 'medium' | 'low';
//     photoUrl: string | null;
//   };
//
//   // Расширенный тип с дополнительными полями (если нужны)
//   type Candidate = ApiCandidate & {
//     name?: string;
//     age?: number;
//     zodiacSign?: string;
//     bio?: string;
//     interests?: string[];
//     distance?: number;
//   };
//
//   const [candidates, setCandidates] = useState<Candidate[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [chatVisible, setChatVisible] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<{
//     name: string;
//     zodiacSign: string;
//     compatibility: number;
//   } | null>(null);
//
//   const current = candidates[currentIndex] || null;
//   const translateX = useSharedValue(0);
//   const translateY = useSharedValue(0);
//   const rotate = useSharedValue(0);
//   const { user } = useAuth();
//   const navigation = useNavigation<any>();
//
//   // Загрузка кандидатов при монтировании
//   useEffect(() => {
//     (async () => {
//       try {
//         const data = await datingAPI.getCandidates(20);
//
//         // Если данных нет, используем моковые
//         if (!data || data.length === 0) {
//           console.log('⚠️ API вернул пустой массив, используем моковые данные');
//           const mockData = [
//             {
//               userId: 'mock-1',
//               badge: 'high' as const,
//               photoUrl: null,
//               name: 'Елена',
//               age: 28,
//               zodiacSign: 'Рыбы',
//               bio: 'Люблю астрологию и медитации',
//               interests: ['Астрология', 'Йога', 'Путешествия'],
//               distance: 5,
//             },
//             {
//               userId: 'mock-2',
//               badge: 'medium' as const,
//               photoUrl: null,
//               name: 'София',
//               age: 25,
//               zodiacSign: 'Лев',
//               bio: 'Творческая натура',
//               interests: ['Искусство', 'Музыка'],
//               distance: 8,
//             },
//           ];
//           setCandidates(mockData);
//           setCurrentIndex(0);
//           return;
//         }
//
//         // API возвращает минимальный набор полей
//         const enrichedData = data.map((candidate: ApiCandidate) => ({
//           ...candidate,
//           name: 'Пользователь',
//           age: 25,
//           zodiacSign: 'Лев',
//           bio: 'Интересная личность',
//           interests: ['Астрология', 'Путешествия'],
//           distance: Math.floor(Math.random() * 20) + 1,
//         }));
//         setCandidates(enrichedData);
//         setCurrentIndex(0);
//       } catch (e) {
//         console.log('❌ Ошибка загрузки кандидатов:', e);
//         // Используем моковые данные при ошибке
//         const mockData = [
//           {
//             userId: 'mock-1',
//             badge: 'high' as const,
//             photoUrl: null,
//             name: 'Елена',
//             age: 28,
//             zodiacSign: 'Рыбы',
//             bio: 'Люблю астрологию и медитации',
//             interests: ['Астрология', 'Йога', 'Путешествия'],
//             distance: 5,
//           },
//         ];
//         setCandidates(mockData);
//         setCurrentIndex(0);
//       }
//     })();
//   }, []);
//
//   // Realtime: уведомление о взаимной симпатии (match)
//   useEffect(() => {
//     if (!user?.id) return;
//
//     const channel = supabase
//       .channel(`matches-${user.id}`)
//       .on(
//         'postgres_changes',
//         { event: 'INSERT', schema: 'public', table: 'matches' },
//         (payload) => {
//           try {
//             const m: any = (payload as any).new;
//             if (!m) return;
//             if (m.user_a_id === user.id || m.user_b_id === user.id) {
//               const otherId =
//                 m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
//               Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
//                 { text: 'Закрыть', style: 'cancel' },
//                 {
//                   text: 'Открыть чат',
//                   onPress: () =>
//                     navigation.navigate('ChatDialog', { otherUserId: otherId }),
//                 },
//               ]);
//             }
//           } catch {}
//         }
//       )
//       .subscribe();
//
//     return () => {
//       try {
//         supabase.removeChannel(channel);
//       } catch {}
//     };
//   }, [user?.id]);
//
//   // Helpers
//   const getBadgeLabel = (b?: 'high' | 'medium' | 'low'): string =>
//     b === 'high' ? 'Высокая' : b === 'medium' ? 'Средняя' : 'Низкая';
//
//   const getBadgeBg = (b?: 'high' | 'medium' | 'low'): string =>
//     b === 'high'
//       ? 'rgba(16,185,129,0.25)'
//       : b === 'medium'
//         ? 'rgba(245,158,11,0.25)'
//         : 'rgba(239,68,68,0.25)';
//
//   const getCompatibilityFromBadge = (b?: 'high' | 'medium' | 'low'): number =>
//     b === 'high' ? 85 : b === 'medium' ? 65 : 45;
//
//   const goNext = () => {
//     setCurrentIndex((idx) => (idx + 1 < candidates.length ? idx + 1 : idx));
//     translateX.value = 0;
//     translateY.value = 0;
//     rotate.value = 0;
//   };
//
//   const handleLike = async () => {
//     if (!current) return;
//     try {
//       const res = await datingAPI.like(current.userId, 'like');
//       console.log('💜 Лайк:', current.userId, res);
//       if (res?.matchId) {
//         Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
//           { text: 'Закрыть', style: 'cancel' },
//           {
//             text: 'Открыть чат',
//             onPress: () =>
//               navigation.navigate('ChatDialog', {
//                 otherUserId: current.userId,
//               }),
//           },
//         ]);
//       }
//     } catch (e) {
//       console.log('❌ Ошибка лайка:', e);
//     } finally {
//       goNext();
//     }
//   };
//
//   const handlePass = async () => {
//     if (!current) return;
//     try {
//       await datingAPI.like(current.userId, 'pass');
//     } catch (e) {
//       console.log('❌ Ошибка pass:', e);
//     } finally {
//       goNext();
//     }
//   };
//
//   const handleMessage = () => {
//     console.log('🔵 handleMessage вызвана');
//     console.log('🔵 candidates:', candidates);
//     console.log('🔵 currentIndex:', currentIndex);
//     console.log('🔵 current:', current);
//
//     if (!current) {
//       console.log('❌ current is null');
//       Alert.alert('Ошибка', 'Нет данных о пользователе');
//       return;
//     }
//
//     // Открываем CosmicChat как модальное окно
//     const userData = {
//       name: current.name || 'Пользователь',
//       zodiacSign: current.zodiacSign || 'Неизвестно',
//       compatibility: getCompatibilityFromBadge(current.badge),
//     };
//
//     console.log('✅ Открываем чат с:', userData);
//     setSelectedUser(userData);
//     setChatVisible(true);
//   };
//
//   const handleCloseChat = () => {
//     setChatVisible(false);
//     setSelectedUser(null);
//   };
//
//   const onGestureEvent = (event: any) => {
//     translateX.value = event.nativeEvent.translationX;
//     translateY.value = event.nativeEvent.translationY;
//     rotate.value = event.nativeEvent.translationX / 10;
//   };
//
//   const onHandlerStateChange = (event: any) => {
//     if (event.nativeEvent.state === 5) {
//       const { translationX, velocityX } = event.nativeEvent;
//
//       if (translationX < -width * 0.3 || velocityX < -500) {
//         translateX.value = withTiming(-width * 1.5, { duration: 300 }, () => {
//           runOnJS(handlePass)();
//         });
//       } else if (translationX > width * 0.3 || velocityX > 500) {
//         translateX.value = withTiming(width * 1.5, { duration: 300 }, () => {
//           runOnJS(handleLike)();
//         });
//       } else {
//         translateX.value = withSpring(0);
//         translateY.value = withSpring(0);
//         rotate.value = withSpring(0);
//       }
//     }
//   };
//
//   const animatedCardStyle = useAnimatedStyle(() => ({
//     transform: [
//       { translateX: translateX.value },
//       { translateY: translateY.value },
//       { rotate: `${rotate.value}deg` },
//     ],
//   }));
//
//   useEffect(() => {
//     translateX.value = 0;
//     translateY.value = 0;
//     rotate.value = 0;
//   }, [currentIndex]);
//
//   return (
//     <GestureHandlerRootView style={styles.container}>
//       <View style={styles.container}>
//         {/* Фоновый градиент из Figma */}
//         <LinearGradient
//           colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
//           start={{ x: 0.5, y: 0 }}
//           end={{ x: 0.5, y: 1 }}
//           style={StyleSheet.absoluteFillObject}
//         />
//
//         {/* Декоративные точки */}
//         <View style={[StyleSheet.absoluteFillObject, styles.dotsContainer]}>
//           {DECORATIVE_DOTS.map((dot, i) => (
//             <View
//               key={i}
//               style={[
//                 styles.dot,
//                 {
//                   left: (dot.x / 430) * width,
//                   top: (dot.y / 932) * height,
//                 },
//               ]}
//             />
//           ))}
//         </View>
//
//         {/* Размытый градиент снизу */}
//         <LinearGradient
//           colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
//           start={{ x: 0.5, y: 0 }}
//           end={{ x: 0.5, y: 1 }}
//           style={styles.bottomBlur}
//         />
//
//         {/* Контент */}
//         <View style={styles.content}>
//           {/* Заголовок с backdrop-blur */}
//           <BlurView intensity={10} tint="dark" style={styles.header}>
//             {/* Иконка Dating */}
//             <View style={styles.iconContainer}>
//               <LinearGradient
//                 colors={['#6F1F87', '#2F0A37']}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.iconCircle}
//               >
//                 <Ionicons name="heart" size={28} color="#fff" />
//               </LinearGradient>
//             </View>
//
//             <Text style={styles.title}>Dating</Text>
//             <Text style={styles.subtitle}>Найди свою звезду</Text>
//           </BlurView>
//
//           {/* Карточка */}
//           <View style={{ alignItems: 'center', marginTop: 20 }}>
//             <PanGestureHandler
//               onGestureEvent={onGestureEvent}
//               onHandlerStateChange={onHandlerStateChange}
//             >
//               <Animated.View style={[styles.card, animatedCardStyle]}>
//                 <LinearGradient
//                   colors={['rgba(111, 31, 135, 0.4)', 'rgba(47, 10, 55, 0.4)']}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                   style={styles.cardInner}
//                 >
//                   {/* Фото (заглушка) */}
//                   <View style={styles.photo} />
//
//                   {/* Градиент снизу */}
//                   <LinearGradient
//                     colors={[
//                       'transparent',
//                       'rgba(0,0,0,0.3)',
//                       'rgba(0,0,0,0.8)',
//                     ]}
//                     style={styles.gradientOverlay}
//                   />
//
//                   {/* Информационный блок снизу */}
//                   <ScrollView
//                     style={styles.infoContainer}
//                     showsVerticalScrollIndicator={false}
//                     bounces={false}
//                   >
//                     {/* Детальный блок с темным фоном */}
//                     <BlurView
//                       intensity={20}
//                       tint="dark"
//                       style={styles.detailsBlock}
//                     >
//                       {/* Имя и возраст */}
//                       <View style={styles.basicInfo}>
//                         <Text style={styles.userName}>
//                           {current?.name || 'Пользователь'}, {current?.age || '—'}
//                         </Text>
//                         <Text style={styles.zodiacSign}>
//                           {current?.zodiacSign || '—'}
//                         </Text>
//                       </View>
//
//                       {/* Расстояние */}
//                       {current?.distance != null && (
//                         <View style={styles.locationRow}>
//                           <Ionicons
//                             name="location"
//                             size={14}
//                             color="rgba(255,255,255,0.7)"
//                           />
//                           <Text style={styles.locationText}>
//                             {current.distance} км от вас
//                           </Text>
//                         </View>
//                       )}
//
//                       {/* Био */}
//                       <Text style={styles.bioText}>
//                         {current?.bio || 'Нет описания'}
//                       </Text>
//
//                       {/* Совместимость — бейдж без чисел */}
//                       <View style={styles.compatibilitySection}>
//                         <Text style={styles.compatibilityLabel}>
//                           Совместимость
//                         </Text>
//                         <View style={styles.badgeRow}>
//                           <View
//                             style={[
//                               styles.badgePill,
//                               {
//                                 backgroundColor: getBadgeBg(
//                                   current?.badge || 'low'
//                                 ),
//                               },
//                             ]}
//                           >
//                             <Text style={styles.badgeText}>
//                               {getBadgeLabel(current?.badge || 'low')}
//                             </Text>
//                           </View>
//                         </View>
//                       </View>
//
//                       {/* Интересы */}
//                       {current && current.interests && current.interests.length > 0 && (
//                         <View style={styles.interestsContainer}>
//                           {current.interests.map((int, idx) => (
//                             <View key={idx} style={styles.interestTag}>
//                               <Text style={styles.interestText}>{int}</Text>
//                             </View>
//                           ))}
//                         </View>
//                       )}
//                     </BlurView>
//                   </ScrollView>
//                 </LinearGradient>
//               </Animated.View>
//             </PanGestureHandler>
//
//             {/* Боковые кнопки - ВЫНЕСЕНЫ ЗА ПРЕДЕЛЫ PanGestureHandler */}
//             <View style={{
//               position: 'absolute',
//               top: 16,
//               right: 16,
//               gap: 10,
//               zIndex: 1000,
//               elevation: 1000,
//             }}>
//               <TouchableOpacity
//                 style={styles.sideButton}
//                 onPress={() => {
//                   console.log('❤️ Лайк нажат');
//                   handleLike();
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Ionicons name="heart" size={18} color="#6F1F87" />
//               </TouchableOpacity>
//
//               <TouchableOpacity
//                 style={styles.sideButton}
//                 onPress={() => {
//                   console.log('💬 Сообщение нажато');
//                   handleMessage();
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <Ionicons
//                   name="chatbubble-ellipses"
//                   size={18}
//                   color="#6F1F87"
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//
//         {/* Модальное окно чата */}
//         {chatVisible && selectedUser && (
//           <CosmicChat
//             visible={chatVisible}
//             user={selectedUser}
//             onClose={handleCloseChat}
//           />
//         )}
//       </View>
//     </GestureHandlerRootView>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#101010',
//   },
//   dotsContainer: {
//     opacity: 0.3,
//   },
//   dot: {
//     position: 'absolute',
//     width: 4,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: '#D9D9D9',
//   },
//   bottomBlur: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 100,
//     borderTopLeftRadius: 16,
//     borderTopRightRadius: 16,
//   },
//   content: {
//     flex: 1,
//     paddingHorizontal: 24,
//     paddingTop: 60,
//     paddingBottom: 120,
//     justifyContent: 'center',
//   },
//   header: {
//     alignItems: 'center',
//     paddingVertical: 24,
//     borderRadius: 16,
//     marginBottom: 32,
//     overflow: 'hidden',
//   },
//   iconContainer: {
//     marginBottom: 16,
//   },
//   iconCircle: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     borderWidth: 3,
//     borderColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: '600',
//     color: '#fff',
//     lineHeight: 39,
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 20,
//     color: 'rgba(255,255,255,0.7)',
//     lineHeight: 24,
//   },
//   card: {
//     height: 566,
//     borderRadius: 20,
//     overflow: 'hidden',
//     width: width - 48,
//   },
//   cardInner: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     borderRadius: 20,
//     overflow: 'hidden',
//   },
//   photo: {
//     position: 'absolute',
//     width: '100%',
//     height: '100%',
//     backgroundColor: 'rgba(111, 31, 135, 0.3)',
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 379,
//   },
//   sideButtons: {
//     position: 'absolute',
//     top: 16,
//     right: 16,
//     gap: 10,
//   },
//   sideButton: {
//     width: 45,
//     height: 45,
//     borderRadius: 22.5,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   infoContainer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     maxHeight: 400,
//     padding: 16,
//   },
//   basicInfo: {
//     marginBottom: 12,
//   },
//   userName: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#fff',
//     lineHeight: 29,
//     marginBottom: 4,
//   },
//   zodiacSign: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: 'rgba(255,255,255,0.7)',
//     lineHeight: 24,
//   },
//   locationRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     marginBottom: 12,
//   },
//   locationText: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.7)',
//     lineHeight: 20,
//   },
//   bioText: {
//     fontSize: 15,
//     color: '#fff',
//     lineHeight: 18,
//     marginBottom: 12,
//   },
//   detailsBlock: {
//     borderRadius: 12,
//     padding: 16,
//     backgroundColor: 'rgba(0, 0, 0, 0.4)',
//     overflow: 'hidden',
//   },
//   compatibilitySection: {
//     marginBottom: 12,
//   },
//   compatibilityLabel: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#fff',
//   },
//   badgeRow: {
//     alignItems: 'center',
//     marginTop: 4,
//     marginBottom: 4,
//   },
//   badgePill: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12,
//   },
//   badgeText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   interestsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   interestTag: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 51,
//     backgroundColor: 'rgba(111, 31, 135, 0.8)',
//     borderWidth: 1,
//     borderColor: 'rgba(111, 31, 135, 1)',
//   },
//   interestText: {
//     fontSize: 10,
//     color: '#fff',
//     fontWeight: '400',
//   },
// });

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { datingAPI } from '../services/api';
import { supabase } from '../services/supabase';
import CosmicChat from '../components/dating/CosmicChat';

const { width, height } = Dimensions.get('window');

// Точки для фона
const DECORATIVE_DOTS = [
  { x: 35, y: 103 },
  { x: 395, y: 83 },
  { x: 68, y: 240 },
  { x: 362, y: 320 },
  { x: 38, y: 470 },
  { x: 392, y: 450 },
  { x: 70, y: 625 },
  { x: 360, y: 705 },
  { x: 42, y: 830 },
  { x: 388, y: 880 },
];

// Тип из API (минимальный)
type ApiCandidate = {
  userId: string;
  badge: 'high' | 'medium' | 'low';
  photoUrl?: string | null;
  avatarUrl?: string | null;
};

// Наш расширенный тип
type Candidate = ApiCandidate & {
  name: string;
  age: number;
  zodiacSign: string;
  bio: string;
  interests: string[];
  distance: number;
  city?: string;
  photos?: string[];
};

export default function DatingScreen() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [chatVisible, setChatVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    name: string;
    zodiacSign: string;
    compatibility: number;
  } | null>(null);

  const current = candidates[currentIndex] || null;

  // жесты
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const { user } = useAuth();
  const navigation = useNavigation<any>();

  // ===============================
  // Helpers
  // ===============================
  const getBadgeLabel = (b?: 'high' | 'medium' | 'low') =>
    b === 'high' ? 'Высокая' : b === 'medium' ? 'Средняя' : 'Низкая';

  const getBadgeBg = (b?: 'high' | 'medium' | 'low') =>
    b === 'high'
      ? 'rgba(16,185,129,0.25)'
      : b === 'medium'
        ? 'rgba(245,158,11,0.25)'
        : 'rgba(239,68,68,0.25)';

  const getCompatibilityFromBadge = (b?: 'high' | 'medium' | 'low') =>
    b === 'high' ? 85 : b === 'medium' ? 65 : 45;

  const nextCard = () => {
    setCurrentIndex((idx) => (idx + 1 < candidates.length ? idx + 1 : idx));
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
  };

  const handleLike = async () => {
    if (!current) return;
    try {
      const res = await datingAPI.like?.(current.userId, 'like');
      if (res?.matchId) {
        Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
          { text: 'Закрыть', style: 'cancel' },
          {
            text: 'Открыть чат',
            onPress: () =>
              navigation.navigate('ChatDialog', {
                otherUserId: current.userId,
              }),
          },
        ]);
      }
    } catch (e) {
      console.log('❌ Ошибка лайка:', e);
    } finally {
      nextCard();
    }
  };

  const handlePass = async () => {
    if (!current) return;
    try {
      await datingAPI.like?.(current.userId, 'pass');
    } catch (e) {
      console.log('❌ Ошибка pass:', e);
    } finally {
      nextCard();
    }
  };

  const handleMessage = () => {
    if (!current) return Alert.alert('Ошибка', 'Нет данных о пользователе');
    const userData = {
      name: current.name,
      zodiacSign: current.zodiacSign,
      compatibility: getCompatibilityFromBadge(current.badge),
    };
    setSelectedUser(userData);
    setChatVisible(true);
  };

  // ===============================
  // Жесты
  // ===============================
  const onGestureEvent = (event: any) => {
    translateX.value = event.nativeEvent.translationX;
    translateY.value = event.nativeEvent.translationY;
    rotate.value = event.nativeEvent.translationX / 10;
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) {
      const { translationX, velocityX } = event.nativeEvent;
      const left = translationX < -width * 0.3 || velocityX < -500;
      const right = translationX > width * 0.3 || velocityX > 500;

      if (left) {
        translateX.value = withTiming(-width * 1.5, { duration: 300 }, () => {
          runOnJS(handlePass)();
        });
      } else if (right) {
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
  }, [currentIndex]);

  // ===============================
  // Загрузка/моки
  // ===============================
  useEffect(() => {
    (async () => {
      try {
        const data: ApiCandidate[] =
          (await datingAPI.getCandidates?.(20)) || [];

        // Если API пуст — используем моки с реальными фото
        if (!data || data.length === 0) {
          const mockData: Candidate[] = [
            {
              userId: 'mock-1',
              badge: 'high',
              photoUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
              name: 'Елизавета',
              age: 26,
              zodiacSign: 'Весы',
              bio: 'UX-дизайнер. Люблю галереи и кофе без сахара.',
              interests: ['Искусство', 'Йога', 'Пешие прогулки'],
              distance: 3,
              city: 'Минск',
            },
            {
              userId: 'mock-2',
              badge: 'medium',
              photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
              name: 'София',
              age: 24,
              zodiacSign: 'Лев',
              bio: 'Маркетолог. Закаты, хайкинг и фильмы Нолана.',
              interests: ['Маркетинг', 'Кино', 'Путешествия'],
              distance: 7,
              city: 'Тбилиси',
            },
            {
              userId: 'mock-3',
              badge: 'low',
              photoUrl: 'https://randomuser.me/api/portraits/women/12.jpg',
              name: 'Анастасия',
              age: 27,
              zodiacSign: 'Рыбы',
              bio: 'Музыкант. Лофай и джаз по вечерам.',
              interests: ['Музыка', 'Книги', 'Кофе'],
              distance: 12,
              city: 'Ереван',
            },
            {
              userId: 'mock-4',
              badge: 'high',
              photoUrl: 'https://randomuser.me/api/portraits/women/81.jpg',
              name: 'Полина',
              age: 25,
              zodiacSign: 'Телец',
              bio: 'Фронтенд. React, походы и астрология.',
              interests: ['Кодинг', 'Походы', 'Астрология'],
              distance: 4,
              city: 'Минск',
            },
            {
              userId: 'mock-5',
              badge: 'medium',
              photoUrl: 'https://randomuser.me/api/portraits/women/30.jpg',
              name: 'Дарья',
              age: 29,
              zodiacSign: 'Козерог',
              bio: 'Фотограф. Охочусь за мягким светом.',
              interests: ['Фото', 'Кофейни', 'Путешествия'],
              distance: 9,
              city: 'Вильнюс',
            },
            {
              userId: 'mock-6',
              badge: 'low',
              photoUrl: 'https://randomuser.me/api/portraits/women/3.jpg',
              name: 'Мария',
              age: 22,
              zodiacSign: 'Близнецы',
              bio: 'Психология, сновидения и MBTI.',
              interests: ['Психология', 'Книги', 'Фильмы'],
              distance: 2,
              city: 'Минск',
            },
            {
              userId: 'mock-7',
              badge: 'high',
              photoUrl: 'https://randomuser.me/api/portraits/women/71.jpg',
              name: 'Ксения',
              age: 31,
              zodiacSign: 'Скорпион',
              bio: 'ПМ в IT. Бегаю по утрам.',
              interests: ['Бег', 'Антиквариат', 'Self-care'],
              distance: 6,
              city: 'Тбилиси',
            },
            {
              userId: 'mock-8',
              badge: 'medium',
              photoUrl: 'https://randomuser.me/api/portraits/women/18.jpg',
              name: 'Алёна',
              age: 23,
              zodiacSign: 'Дева',
              bio: 'Бариста. Сварю идеальный пуровер.',
              interests: ['Кофе', 'Фото', 'Скейт'],
              distance: 1,
              city: 'Минск',
            },
            {
              userId: 'mock-9',
              badge: 'low',
              photoUrl: 'https://randomuser.me/api/portraits/women/49.jpg',
              name: 'Наталья',
              age: 28,
              zodiacSign: 'Рак',
              bio: 'SMM и lifestyle-блоги.',
              interests: ['Йога', 'Блоги', 'Путешествия'],
              distance: 11,
              city: 'Ереван',
            },
            {
              userId: 'mock-10',
              badge: 'high',
              photoUrl: 'https://randomuser.me/api/portraits/women/5.jpg',
              name: 'Татьяна',
              age: 27,
              zodiacSign: 'Водолей',
              bio: 'Инди-разработчик игр.',
              interests: ['Игры', 'Иллюстрации', 'Техно'],
              distance: 8,
              city: 'Каунас',
            },
            {
              userId: 'mock-11',
              badge: 'medium',
              photoUrl: 'https://randomuser.me/api/portraits/women/57.jpg',
              name: 'Виктория',
              age: 30,
              zodiacSign: 'Стрелец',
              bio: 'HR, люблю экотропы.',
              interests: ['Эко-тропы', 'Книги', 'Путешествия'],
              distance: 10,
              city: 'Минск',
            },
            {
              userId: 'mock-12',
              badge: 'low',
              photoUrl: 'https://randomuser.me/api/portraits/women/8.jpg',
              name: 'Ольга',
              age: 25,
              zodiacSign: 'Овен',
              bio: 'Фитнес-тренер, ЗОЖ.',
              interests: ['Спорт', 'Хайкинг', 'Готовка'],
              distance: 5,
              city: 'Тбилиси',
            },
          ];
          setCandidates(mockData);
          setCurrentIndex(0);
          return;
        }

        // API вернул кандидатов — обогатим и проставим фото
        const enrichedData: Candidate[] = data.map(
          (candidate: ApiCandidate) => {
            const photo =
              candidate.photoUrl ||
              candidate.avatarUrl ||
              `https://randomuser.me/api/portraits/women/${Math.floor(Math.random() * 90)}.jpg`;

            return {
              ...candidate,
              photoUrl: photo,
              name: 'Пользователь',
              age: 25,
              zodiacSign: 'Лев',
              bio: 'Интересная личность',
              interests: ['Астрология', 'Путешествия'],
              distance: Math.floor(Math.random() * 20) + 1,
            };
          }
        );

        setCandidates(enrichedData);
        setCurrentIndex(0);
      } catch (e) {
        console.log('❌ Ошибка загрузки кандидатов:', e);
        // Фолбэк: короткий мок, но с фото
        setCandidates([
          {
            userId: 'mock-fallback',
            badge: 'medium',
            photoUrl: 'https://randomuser.me/api/portraits/women/40.jpg',
            name: 'Ева',
            age: 25,
            zodiacSign: 'Дева',
            bio: 'Фолбэк-кандидат с фото.',
            interests: ['Чтение', 'Прогулки'],
            distance: 4,
          },
        ]);
        setCurrentIndex(0);
      }
    })();
  }, []);

  // ===============================
  // Realtime match (опционально)
  // ===============================
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`matches-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          try {
            const m: any = (payload as any).new;
            if (!m) return;
            if (m.user_a_id === user.id || m.user_b_id === user.id) {
              const otherId =
                m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
              Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
                { text: 'Закрыть', style: 'cancel' },
                {
                  text: 'Открыть чат',
                  onPress: () =>
                    navigation.navigate('ChatDialog', { otherUserId: otherId }),
                },
              ]);
            }
          } catch {}
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [user?.id]);

  // ===============================
  // UI
  // ===============================
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* Фон */}
        <LinearGradient
          colors={['rgba(167,114,181,0.3)', 'rgba(26,7,31,0.3)']}
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
                { left: (dot.x / 430) * width, top: (dot.y / 932) * height },
              ]}
            />
          ))}
        </View>

        <LinearGradient
          colors={['rgba(167,114,181,0.3)', 'rgba(26,7,31,0.3)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomBlur}
        />

        {/* Контент */}
        <View style={styles.content}>
          <BlurView intensity={10} tint="dark" style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#6F1F87', '#2F0A37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Ionicons name="heart" size={28} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Dating</Text>
            <Text style={styles.subtitle}>Найди свою звезду</Text>
          </BlurView>

          {/* Карточка */}
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
            >
              <Animated.View style={[styles.card, animatedCardStyle]}>
                <LinearGradient
                  colors={['rgba(111,31,135,0.4)', 'rgba(47,10,55,0.4)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardInner}
                >
                  {/* ФОТО */}
                  {current?.photoUrl || current?.photos?.[0] ? (
                    <Image
                      source={{
                        uri: (current?.photoUrl ||
                          current?.photos?.[0]) as string,
                      }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.photo,
                        { backgroundColor: 'rgba(111,31,135,0.3)' },
                      ]}
                    />
                  )}

                  {/* Градиент снизу */}
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(0,0,0,0.3)',
                      'rgba(0,0,0,0.8)',
                    ]}
                    style={styles.gradientOverlay}
                  />

                  {/* Информация */}
                  <ScrollView
                    style={styles.infoContainer}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <BlurView
                      intensity={20}
                      tint="dark"
                      style={styles.detailsBlock}
                    >
                      {/* Имя/возраст/знак */}
                      <View style={styles.basicInfo}>
                        <Text style={styles.userName}>
                          {current?.name || 'Пользователь'},{' '}
                          {current?.age ?? '—'}
                        </Text>
                        <Text style={styles.zodiacSign}>
                          {current?.zodiacSign || '—'}
                        </Text>
                      </View>

                      {/* Расстояние */}
                      {current?.distance != null && (
                        <View style={styles.locationRow}>
                          <Ionicons
                            name="location"
                            size={14}
                            color="rgba(255,255,255,0.7)"
                          />
                          <Text style={styles.locationText}>
                            {current.distance} км от вас
                          </Text>
                        </View>
                      )}

                      {/* Био */}
                      <Text style={styles.bioText}>
                        {current?.bio || 'Нет описания'}
                      </Text>

                      {/* Совместимость */}
                      <View style={styles.compatibilitySection}>
                        <Text style={styles.compatibilityLabel}>
                          Совместимость
                        </Text>
                        <View style={styles.badgeRow}>
                          <View
                            style={[
                              styles.badgePill,
                              {
                                backgroundColor: getBadgeBg(
                                  current?.badge || 'low'
                                ),
                              },
                            ]}
                          >
                            <Text style={styles.badgeText}>
                              {getBadgeLabel(current?.badge || 'low')}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Интересы */}
                      {!!current?.interests?.length && (
                        <View style={styles.interestsContainer}>
                          {current!.interests!.map((int, idx) => (
                            <View key={idx} style={styles.interestTag}>
                              <Text style={styles.interestText}>{int}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </BlurView>
                  </ScrollView>
                </LinearGradient>
              </Animated.View>
            </PanGestureHandler>

            {/* Кнопки сверху справа */}
            <View style={styles.sideButtons}>
              <TouchableOpacity
                style={styles.sideButton}
                onPress={handleLike}
                activeOpacity={0.7}
              >
                <Ionicons name="heart" size={18} color="#6F1F87" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sideButton}
                onPress={handleMessage}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={18}
                  color="#6F1F87"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Модалка чата */}
        {chatVisible && selectedUser && (
          <CosmicChat
            visible={chatVisible}
            user={selectedUser}
            onClose={() => {
              setChatVisible(false);
              setSelectedUser(null);
            }}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101010' },

  dotsContainer: { opacity: 0.3 },
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

  iconContainer: { marginBottom: 16 },
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
  subtitle: { fontSize: 20, color: 'rgba(255,255,255,0.7)', lineHeight: 24 },

  card: {
    height: 566,
    borderRadius: 20,
    overflow: 'hidden',
    width: width - 48,
  },
  cardInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    overflow: 'hidden',
  },

  photo: { position: 'absolute', width: '100%', height: '100%' },

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
    zIndex: 1000,
    elevation: 1000,
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

  basicInfo: { marginBottom: 12 },
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

  bioText: { fontSize: 15, color: '#fff', lineHeight: 18, marginBottom: 12 },

  detailsBlock: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },

  compatibilitySection: { marginBottom: 12 },
  compatibilityLabel: { fontSize: 16, fontWeight: '500', color: '#fff' },
  badgeRow: { alignItems: 'center', marginTop: 4, marginBottom: 4 },
  badgePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 51,
    backgroundColor: 'rgba(111,31,135,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(111,31,135,1)',
  },
  interestText: { fontSize: 10, color: '#fff', fontWeight: '400' },
});
