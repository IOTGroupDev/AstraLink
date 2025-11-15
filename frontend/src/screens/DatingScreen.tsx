// import React, { useEffect, useState, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
//   Alert,
//   ActivityIndicator,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { Ionicons } from '@expo/vector-icons';
// import { useNavigation } from '@react-navigation/native';
// import { useAuth } from '../hooks/useAuth';
// import { datingAPI, chatAPI } from '../services/api';
// import CosmicChat from '../components/dating/CosmicChat';
// import DatingCard from '../components/dating/DatingCard';
// import { TabScreenLayout } from '../components/layout/TabScreenLayout';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import {
//   getAllZodiacSigns,
//   type ZodiacSign,
//   type ElementType,
// } from '../services/zodiac.service';
// import CosmicBackground from '../components/shared/CosmicBackground';
//
// const { width, height } = Dimensions.get('window');
//
// // API типы
// type ApiCandidate = {
//   userId: string;
//   badge: 'high' | 'medium' | 'low';
//   photoUrl?: string | null;
//   avatarUrl?: string | null;
//   name?: string | null;
//   age?: number | null;
//   zodiacSign?: string | null;
//   bio?: string | null;
//   interests?: string[] | null;
//   city?: string | null;
// };
//
// // Расширенный тип для UI
// type Candidate = ApiCandidate & {
//   name: string;
//   age: number;
//   zodiacSign: string;
//   bio: string;
//   interests: string[];
//   distance: number;
//   city?: string;
//   photos?: string[];
// };
//
// export default function DatingScreen() {
//   const [candidates, setCandidates] = useState<Candidate[]>([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [chatVisible, setChatVisible] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<{
//     id: string;
//     name: string;
//     zodiacSign: string;
//     compatibility: number;
//   } | null>(null);
//   const [loadingCards, setLoadingCards] = useState<boolean>(true);
//
//   const current = candidates[currentIndex] || null;
//
//   const { user, isLoading: authLoading } = useAuth();
//   const navigation = useNavigation<any>();
//   const insets = useSafeAreaInsets();
//
//   // ===============================
//   // Helpers
//   // ===============================
//   const getBadgeLabel = (b?: 'high' | 'medium' | 'low') =>
//     b === 'high' ? 'Высокая' : b === 'medium' ? 'Средняя' : 'Низкая';
//
//   const getBadgeBg = (b?: 'high' | 'medium' | 'low') =>
//     b === 'high'
//       ? 'rgba(16,185,129,0.25)'
//       : b === 'medium'
//         ? 'rgba(245,158,11,0.25)'
//         : 'rgba(239,68,68,0.25)';
//
//   const getCompatibilityFromBadge = (b?: 'high' | 'medium' | 'low') =>
//     b === 'high' ? 85 : b === 'medium' ? 65 : 45;
//
//   const getElementsFromZodiac = (zodiacName: string) => {
//     const allSigns = getAllZodiacSigns();
//     const zodiacSign = allSigns.find(
//       (sign) =>
//         sign.nameRu.toLowerCase() === zodiacName.toLowerCase() ||
//         sign.nameEn.toLowerCase() === zodiacName.toLowerCase()
//     );
//
//     if (!zodiacSign) {
//       // Дефолтные значения если знак не найден
//       return { fire: 50, water: 50, earth: 50, air: 50 };
//     }
//
//     // Определяем базовые значения стихий на основе элемента знака
//     const elements = { fire: 0, water: 0, earth: 0, air: 0 };
//     const primaryElement = zodiacSign.element;
//
//     // Основная стихия - 80%
//     elements[primaryElement] = 80;
//
//     // Распределяем остальные стихии в зависимости от основной
//     switch (primaryElement) {
//       case 'fire':
//         elements.air = 60; // Воздух питает огонь
//         elements.earth = 40; // Земля стабилизирует
//         elements.water = 20; // Вода гасит огонь
//         break;
//       case 'earth':
//         elements.water = 60; // Вода питает землю
//         elements.fire = 40; // Огонь согревает
//         elements.air = 20; // Воздух разрушает
//         break;
//       case 'air':
//         elements.fire = 60; // Огонь согревает воздух
//         elements.water = 40; // Вода увлажняет
//         elements.earth = 20; // Земля ограничивает
//         break;
//       case 'water':
//         elements.earth = 60; // Земля содержит воду
//         elements.air = 40; // Воздух движет воду
//         elements.fire = 20; // Огонь испаряет воду
//         break;
//     }
//
//     return elements;
//   };
//
//   const getKeyAspectsFromInterests = (
//     interests: string[],
//     zodiacName: string
//   ) => {
//     const allSigns = getAllZodiacSigns();
//     const zodiacSign = allSigns.find(
//       (sign) =>
//         sign.nameRu.toLowerCase() === zodiacName.toLowerCase() ||
//         sign.nameEn.toLowerCase() === zodiacName.toLowerCase()
//     );
//
//     const aspects: string[] = [];
//
//     // Добавляем черты знака зодиака
//     if (zodiacSign && zodiacSign.traits.length > 0) {
//       aspects.push(...zodiacSign.traits.slice(0, 2));
//     }
//
//     // Добавляем интересы
//     if (interests.length > 0) {
//       aspects.push(...interests.slice(0, Math.min(2, 4 - aspects.length)));
//     }
//
//     // Если все еще мало аспектов, добавляем дефолтные
//     if (aspects.length === 0) {
//       aspects.push(
//         'Творческая личность',
//         'Открыт к новому',
//         'Интересный собеседник'
//       );
//     }
//
//     return aspects.slice(0, 4); // Максимум 4 аспекта
//   };
//
//   const nextCard = useCallback(() => {
//     setCurrentIndex((idx) => (idx + 1 < candidates.length ? idx + 1 : idx));
//   }, [candidates.length]);
//
//   // ===============================
//   // Handlers
//   // ===============================
//   const handleSwipe = useCallback(
//     async (direction: 'left' | 'right') => {
//       if (!current) return;
//
//       try {
//         if (direction === 'right') {
//           const res = await datingAPI.like?.(current.userId, 'like');
//           if (res?.matchId) {
//             Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
//               { text: 'Закрыть', style: 'cancel' },
//               {
//                 text: 'Открыть чат',
//                 onPress: () =>
//                   navigation.navigate('ChatDialog', {
//                     otherUserId: current.userId,
//                     displayName: current.name,
//                   }),
//               },
//             ]);
//           }
//         } else {
//           await datingAPI.like?.(current.userId, 'pass');
//         }
//       } catch (e) {
//         console.log('❌ Ошибка свайпа:', e);
//       } finally {
//         nextCard();
//       }
//     },
//     [current, navigation, nextCard]
//   );
//
//   const handleChat = useCallback(() => {
//     if (!current) {
//       Alert.alert('Ошибка', 'Нет данных о пользователе');
//       return;
//     }
//
//     const userData = {
//       id: current.userId,
//       name: current.name,
//       zodiacSign: current.zodiacSign,
//       compatibility: getCompatibilityFromBadge(current.badge),
//     };
//
//     setSelectedUser(userData);
//     setChatVisible(true);
//   }, [current]);
//
//   const handleSendMessage = useCallback(
//     async (text: string) => {
//       if (!selectedUser?.id) {
//         Alert.alert('Ошибка', 'Пользователь не выбран');
//         return;
//       }
//
//       try {
//         await chatAPI.sendMessage(selectedUser.id, text);
//         setChatVisible(false);
//         navigation.navigate('ChatDialog', {
//           otherUserId: selectedUser.id,
//           displayName: selectedUser.name,
//         });
//         setSelectedUser(null);
//       } catch (error) {
//         console.error('Ошибка отправки сообщения:', error);
//         Alert.alert('Ошибка', 'Не удалось отправить сообщение');
//       }
//     },
//     [selectedUser, navigation]
//   );
//
//   const handleCloseChat = useCallback(() => {
//     setChatVisible(false);
//     setSelectedUser(null);
//   }, []);
//
//   // ===============================
//   // Загрузка кандидатов
//   // ===============================
//   useEffect(() => {
//     if (authLoading || !user) return;
//
//     (async () => {
//       setLoadingCards(true);
//       try {
//         const data: ApiCandidate[] =
//           (await datingAPI.getCandidates?.(20)) || [];
//         console.log('[Dating] candidates raw count =', data.length);
//
//         const allZodiacSigns = getAllZodiacSigns();
//         const randomInterests = [
//           'Музыка',
//           'Спорт',
//           'Путешествия',
//           'Книги',
//           'Кино',
//           'Искусство',
//           'Кулинария',
//           'Йога',
//           'Медитация',
//           'Природа',
//         ];
//
//         const enriched: Candidate[] = data.map((c) => {
//           // Используем знак из API или выбираем случайный
//           let zodiacName = c.zodiacSign;
//           if (!zodiacName) {
//             const randomSign =
//               allZodiacSigns[Math.floor(Math.random() * allZodiacSigns.length)];
//             zodiacName = randomSign.nameRu;
//           }
//
//           return {
//             ...c,
//             name: c.name || 'Пользователь',
//             age: c.age || Math.floor(Math.random() * 15) + 25,
//             zodiacSign: zodiacName,
//             bio: c.bio || 'Ищу свою половинку среди звезд ✨',
//             interests:
//               c.interests ||
//               randomInterests.slice(0, Math.floor(Math.random() * 3) + 2),
//             distance: Math.floor(Math.random() * 50) + 1,
//             photos: c.photoUrl ? [c.photoUrl] : [],
//           };
//         });
//
//         setCandidates(enriched);
//         setCurrentIndex(0);
//       } catch (err) {
//         console.error('[Dating] Ошибка загрузки:', err);
//         Alert.alert('Ошибка', 'Не удалось загрузить кандидатов');
//       } finally {
//         setLoadingCards(false);
//       }
//     })();
//   }, [authLoading, user]);
//
//   // ===============================
//   // Render
//   // ===============================
//   return (
//     <TabScreenLayout>
//       <GestureHandlerRootView style={styles.container}>
//         {/* Космический фон */}
//         <CosmicBackground />
//
//         <LinearGradient
//           colors={[
//             'rgba(26, 11, 46, 0.7)',
//             'rgba(45, 27, 78, 0.8)',
//             'rgba(26, 11, 46, 0.7)',
//           ]}
//           style={styles.gradient}
//         >
//           {/* Header */}
//           <View style={styles.header}>
//             <View style={styles.iconContainer}>
//               <LinearGradient
//                 colors={['#8B5CF6', '#A855F7']}
//                 style={styles.iconCircle}
//               >
//                 <Ionicons name="heart" size={28} color="#fff" />
//               </LinearGradient>
//             </View>
//             <Text style={styles.title}>Космические связи</Text>
//             <Text style={styles.subtitle}>Найдите свою родственную душу</Text>
//           </View>
//
//           {/* Content */}
//           <View style={styles.content}>
//             {loadingCards ? (
//               <View style={styles.loadingContainer}>
//                 <ActivityIndicator size="large" color="#8B5CF6" />
//                 <Text style={styles.loadingText}>Ищем совпадения...</Text>
//               </View>
//             ) : !current ? (
//               <View style={styles.emptyContainer}>
//                 <Ionicons name="planet-outline" size={64} color="#8B5CF6" />
//                 <Text style={styles.emptyTitle}>Больше нет анкет</Text>
//                 <Text style={styles.emptyText}>
//                   Зайдите позже, чтобы увидеть новых людей
//                 </Text>
//               </View>
//             ) : (
//               <View style={styles.cardContainer}>
//                 <DatingCard
//                   user={{
//                     id: current.userId,
//                     name: current.name,
//                     age: current.age,
//                     zodiacSign: current.zodiacSign,
//                     compatibility: getCompatibilityFromBadge(current.badge),
//                     elements: getElementsFromZodiac(current.zodiacSign),
//                     keyAspects: getKeyAspectsFromInterests(
//                       current.interests,
//                       current.zodiacSign
//                     ),
//                     isMatched: false,
//                     photoUrl:
//                       current.photoUrl ||
//                       (current.photos && current.photos[0]) ||
//                       undefined,
//                     photos: current.photos,
//                   }}
//                   onSwipe={handleSwipe}
//                   onChat={handleChat}
//                   isTop={true}
//                 />
//               </View>
//             )}
//           </View>
//
//           {/* Action buttons */}
//           {!loadingCards && current && (
//             <View style={styles.actionButtons}>
//               <TouchableOpacity
//                 style={[styles.actionButton, styles.passButton]}
//                 onPress={() => handleSwipe('left')}
//                 activeOpacity={0.8}
//               >
//                 <Ionicons name="close" size={32} color="#EF4444" />
//               </TouchableOpacity>
//
//               <TouchableOpacity
//                 style={[styles.actionButton, styles.likeButton]}
//                 onPress={() => handleSwipe('right')}
//                 activeOpacity={0.8}
//               >
//                 <Ionicons name="heart" size={32} color="#10B981" />
//               </TouchableOpacity>
//             </View>
//           )}
//
//           {/* Модалка чата */}
//           {chatVisible && selectedUser && (
//             <CosmicChat
//               visible={chatVisible}
//               user={selectedUser}
//               onClose={handleCloseChat}
//               onSendMessage={handleSendMessage}
//             />
//           )}
//         </LinearGradient>
//       </GestureHandlerRootView>
//     </TabScreenLayout>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#101010',
//   },
//   gradient: {
//     flex: 1,
//   },
//   header: {
//     alignItems: 'center',
//     paddingVertical: 20,
//     paddingTop: 40,
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
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 20,
//     color: 'rgba(255,255,255,0.7)',
//   },
//   content: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 24,
//   },
//   loadingContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   loadingText: {
//     fontSize: 16,
//     color: '#fff',
//     marginTop: 16,
//   },
//   emptyContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 40,
//   },
//   emptyTitle: {
//     fontSize: 24,
//     fontWeight: '600',
//     color: '#fff',
//     marginTop: 16,
//     marginBottom: 8,
//   },
//   emptyText: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.7)',
//     textAlign: 'center',
//   },
//   cardContainer: {
//     width: width,
//     height: height * 0.7,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingVertical: 20,
//     paddingBottom: 40,
//     gap: 40,
//   },
//   actionButton: {
//     width: 70,
//     height: 70,
//     borderRadius: 35,
//     backgroundColor: '#fff',
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   passButton: {
//     borderWidth: 2,
//     borderColor: '#EF4444',
//   },
//   likeButton: {
//     borderWidth: 2,
//     borderColor: '#10B981',
//   },
// });

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { datingAPI, chatAPI } from '../services/api';
import CosmicChat from '../components/dating/CosmicChat';
import DatingCard from '../components/dating/DatingCard';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAllZodiacSigns,
  type ZodiacSign,
  type ElementType,
} from '../services/zodiac.service';
import CosmicBackground from '../components/shared/CosmicBackground';
import { logger } from '../services/logger';

const { width, height } = Dimensions.get('window');

// API типы
type ApiCandidate = {
  userId: string;
  badge: 'high' | 'medium' | 'low';
  photoUrl?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  age?: number | null;
  zodiacSign?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  city?: string | null;
};

// Расширенный тип для UI
type Candidate = ApiCandidate & {
  name: string;
  age: number;
  zodiacSign: string;
  bio: string;
  interests: string[];
  distance: number;
  city?: string;
  photos?: string[];
  photoUrl?: string;
  height?: number;
  lookingFor?: string;
};

export default function DatingScreen() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    zodiacSign: string;
    compatibility: number;
  } | null>(null);
  const [loadingCards, setLoadingCards] = useState<boolean>(true);

  const current = candidates[currentIndex] || null;

  const { user, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

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

  const nextCard = useCallback(() => {
    setCurrentIndex((idx) => (idx + 1 < candidates.length ? idx + 1 : idx));
  }, [candidates.length]);

  // ===============================
  // Handlers
  // ===============================
  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (!current) return;

      try {
        if (direction === 'right') {
          const res = await datingAPI.like?.(current.userId, 'like');
          if (res?.matchId) {
            Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
              { text: 'Закрыть', style: 'cancel' },
              {
                text: 'Открыть чат',
                onPress: () =>
                  navigation.navigate('ChatDialog', {
                    otherUserId: current.userId,
                    displayName: current.name,
                  }),
              },
            ]);
          }
        } else {
          await datingAPI.like?.(current.userId, 'pass');
        }
      } catch (e) {
        logger.error('Ошибка свайпа', e);
      } finally {
        nextCard();
      }
    },
    [current, navigation, nextCard]
  );

  const handleChat = useCallback(() => {
    if (!current) {
      Alert.alert('Ошибка', 'Нет данных о пользователе');
      return;
    }

    const userData = {
      id: current.userId,
      name: current.name,
      zodiacSign: current.zodiacSign,
      compatibility: getCompatibilityFromBadge(current.badge),
    };

    setSelectedUser(userData);
    setChatVisible(true);
  }, [current]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!selectedUser?.id) {
        Alert.alert('Ошибка', 'Пользователь не выбран');
        return;
      }

      try {
        await chatAPI.sendMessage(selectedUser.id, text);
        setChatVisible(false);
        navigation.navigate('ChatDialog', {
          otherUserId: selectedUser.id,
          displayName: selectedUser.name,
        });
        setSelectedUser(null);
      } catch (error) {
        logger.error('Ошибка отправки сообщения', error);
        Alert.alert('Ошибка', 'Не удалось отправить сообщение');
      }
    },
    [selectedUser, navigation]
  );

  const handleCloseChat = useCallback(() => {
    setChatVisible(false);
    setSelectedUser(null);
  }, []);

  // ===============================
  // Загрузка кандидатов
  // ===============================
  useEffect(() => {
    if (authLoading || !user) return;

    (async () => {
      setLoadingCards(true);
      try {
        let data: ApiCandidate[] = (await datingAPI.getCandidates?.(20)) || [];
        logger.info('[Dating] candidates raw count', data.length);

        // ВРЕМЕННО: Если нет данных, создаем моковые для тестирования
        if (data.length === 0) {
          logger.info('[Dating] Нет данных от API, используем моковые данные');
          data = [
            {
              userId: 'mock-1',
              badge: 'high',
              name: 'Анна',
              age: 28,
              zodiacSign: 'Лев',
              bio: 'Люблю путешествия и астрологию ✨',
              interests: ['Путешествия', 'Йога', 'Музыка'],
              city: 'Москва',
              photoUrl: null,
            },
            {
              userId: 'mock-2',
              badge: 'medium',
              name: 'Мария',
              age: 25,
              zodiacSign: 'Весы',
              bio: 'Ищу гармонию и баланс в отношениях 💫',
              interests: ['Искусство', 'Медитация', 'Кино'],
              city: 'Санкт-Петербург',
              photoUrl: null,
            },
            {
              userId: 'mock-3',
              badge: 'high',
              name: 'Елена',
              age: 30,
              zodiacSign: 'Скорпион',
              bio: 'Страстная натура с глубоким внутренним миром 🌙',
              interests: ['Психология', 'Книги', 'Спорт'],
              city: 'Казань',
              photoUrl: null,
            },
            {
              userId: 'mock-4',
              badge: 'medium',
              name: 'Дарья',
              age: 26,
              zodiacSign: 'Близнецы',
              bio: 'Общительная и любознательная ⭐',
              interests: ['Творчество', 'Путешествия', 'Фотография'],
              city: 'Новосибирск',
              photoUrl: null,
            },
            {
              userId: 'mock-5',
              badge: 'low',
              name: 'Ольга',
              age: 29,
              zodiacSign: 'Телец',
              bio: 'Ценю стабильность и красоту 🌸',
              interests: ['Кулинария', 'Природа', 'Музыка'],
              city: 'Екатеринбург',
              photoUrl: null,
            },
          ] as ApiCandidate[];
        }

        const allZodiacSigns = getAllZodiacSigns();
        const randomInterests = [
          'Музыка',
          'Спорт',
          'Путешествия',
          'Книги',
          'Кино',
          'Искусство',
          'Кулинария',
          'Йога',
          'Медитация',
          'Природа',
        ];
        const lookingForOptions = [
          'Серьезные отношения',
          'Дружба',
          'Общение',
          'Что-то новое',
        ];

        const enriched: Candidate[] = data.map((c) => {
          // Используем знак из API или выбираем случайный
          let zodiacName = c.zodiacSign;
          if (!zodiacName) {
            const randomSign =
              allZodiacSigns[Math.floor(Math.random() * allZodiacSigns.length)];
            zodiacName = randomSign.nameRu;
          }

          return {
            ...c,
            name: c.name || 'Пользователь',
            age: c.age || Math.floor(Math.random() * 15) + 25,
            zodiacSign: zodiacName,
            bio: c.bio || 'Ищу свою половинку среди звезд ✨',
            interests:
              c.interests ||
              randomInterests.slice(0, Math.floor(Math.random() * 3) + 2),
            distance: Math.floor(Math.random() * 50) + 1,
            photos: c.photoUrl ? [c.photoUrl] : [],
            photoUrl: c.photoUrl || c.avatarUrl || null,
            height: Math.floor(Math.random() * 25) + 160, // 160-185 см
            lookingFor:
              lookingForOptions[
                Math.floor(Math.random() * lookingForOptions.length)
              ],
          };
        });

        logger.info('[Dating] enriched candidates count', enriched.length);
        setCandidates(enriched);
        setCurrentIndex(0);
      } catch (err) {
        logger.error('[Dating] Ошибка загрузки', err);
        Alert.alert('Ошибка', 'Не удалось загрузить кандидатов');
      } finally {
        setLoadingCards(false);
      }
    })();
  }, [authLoading, user]);

  // ===============================
  // Render
  // ===============================
  return (
    <TabScreenLayout>
      <GestureHandlerRootView style={styles.container}>
        {/* Космический фон */}
        <CosmicBackground />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.iconCircle}
              >
                <Ionicons name="heart" size={24} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Знакомства</Text>
            <Text style={styles.subtitle}>Астрологические совпадения</Text>
          </View>

          {/* Content */}
          {loadingCards ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Ищем совпадения...</Text>
            </View>
          ) : !current ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="planet-outline" size={64} color="#8B5CF6" />
              <Text style={styles.emptyTitle}>Больше нет анкет</Text>
              <Text style={styles.emptyText}>
                Зайдите позже, чтобы увидеть новых людей
              </Text>
            </View>
          ) : (
            <View style={styles.cardContainer}>
              <DatingCard
                user={{
                  id: current.userId,
                  name: current.name,
                  age: current.age,
                  zodiacSign: current.zodiacSign,
                  compatibility: getCompatibilityFromBadge(current.badge),
                  bio: current.bio,
                  interests: current.interests,
                  distance: current.distance,
                  photoUrl: current.photoUrl,
                  height: current.height,
                  lookingFor: current.lookingFor,
                }}
                onSwipe={handleSwipe}
                onChat={handleChat}
                isTop={true}
              />
            </View>
          )}

          {/* Модалка чата */}
          {chatVisible && selectedUser && (
            <CosmicChat
              visible={chatVisible}
              user={selectedUser}
              onClose={handleCloseChat}
              onSendMessage={handleSendMessage}
            />
          )}
        </View>
      </GestureHandlerRootView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0618',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingTop: 60,
  },
  iconContainer: {
    marginBottom: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
});
