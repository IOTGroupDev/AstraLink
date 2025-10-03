// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Alert,
//   Dimensions,
//   Switch,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
//   withRepeat,
//   withSequence,
//   interpolate,
//   runOnJS,
// } from 'react-native-reanimated';
// import {
//   userAPI,
//   subscriptionAPI,
//   chartAPI,
//   removeStoredToken,
// } from '../services/api';
// import { UserProfile, Subscription, Chart } from '../types';
// import ShimmerLoader from '../components/ShimmerLoader';
// import CosmicBackground from '../components/CosmicBackground';
// import ZodiacAvatar from '../components/ZodiacAvatar';
// import SubscriptionCard from '../components/SubscriptionCard';
// import PlanetIcon from '../components/PlanetIcon';
// import AstrologicalChart from '../components/AstrologicalChart';
// import NatalChartWidget from '../components/NatalChartWidget';
// import DeleteAccountModal from '../components/DeleteAccountModal';
//
// const { width, height } = Dimensions.get('window');
//
// interface ProfileScreenProps {
//   navigation: any;
// }
//
// // Темы по стихиям
// const ELEMENT_THEMES = {
//   fire: {
//     colors: ['#FF6B35', '#F7931E', '#FFD700'],
//     glow: '#FF6B35',
//     name: 'Огонь',
//   },
//   water: {
//     colors: ['#4ECDC4', '#44A08D', '#096B72'],
//     glow: '#4ECDC4',
//     name: 'Вода',
//   },
//   earth: {
//     colors: ['#8FBC8F', '#556B2F', '#2F4F2F'],
//     glow: '#8FBC8F',
//     name: 'Земля',
//   },
//   air: {
//     colors: ['#FFD700', '#8B5CF6', '#DDA0DD'],
//     glow: '#FFD700',
//     name: 'Воздух',
//   },
// };
//
// // Соответствие знаков зодиака стихиям
// const ZODIAC_ELEMENTS = {
//   Aries: 'fire',
//   Leo: 'fire',
//   Sagittarius: 'fire',
//   Cancer: 'water',
//   Scorpio: 'water',
//   Pisces: 'water',
//   Taurus: 'earth',
//   Virgo: 'earth',
//   Capricorn: 'earth',
//   Gemini: 'air',
//   Libra: 'air',
//   Aquarius: 'air',
// };
//
// const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
//   const [profile, setProfile] = useState<UserProfile | null>(null);
//   const [subscription, setSubscription] = useState<Subscription | null>(null);
//   const [chart, setChart] = useState<Chart | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [darkMode, setDarkMode] = useState(true);
//   const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//
//   // Animations
//   const fadeAnim = useSharedValue(0);
//   const glowAnim = useSharedValue(0);
//   const orbRotation = useSharedValue(0);
//
//   useEffect(() => {
//     loadProfileData();
//     startAnimations();
//   }, []);
//
//   const startAnimations = () => {
//     fadeAnim.value = withTiming(1, { duration: 1000 });
//     glowAnim.value = withRepeat(
//       withSequence(
//         withTiming(1, { duration: 2000 }),
//         withTiming(0.3, { duration: 2000 })
//       ),
//       -1,
//       true
//     );
//     orbRotation.value = withRepeat(
//       withTiming(360, { duration: 20000 }),
//       -1,
//       false
//     );
//   };
//
//   const loadProfileData = async () => {
//     try {
//       setLoading(true);
//       const [profileData, subscriptionData, chartData] = await Promise.all([
//         userAPI.getProfile(),
//         subscriptionAPI.getStatus(),
//         chartAPI.getNatalChart().catch(() => null), // Не прерываем загрузку если нет карты
//       ]);
//       setProfile(profileData);
//       setSubscription(subscriptionData);
//       setChart(chartData);
//     } catch (error) {
//       console.error('Error loading profile:', error);
//       Alert.alert('Ошибка', 'Не удалось загрузить данные профиля');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const handleLogout = () => {
//     Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
//       { text: 'Отмена', style: 'cancel' },
//       {
//         text: 'Выйти',
//         style: 'destructive',
//         onPress: () => {
//           removeStoredToken();
//           navigation.reset({
//             index: 0,
//             routes: [{ name: 'Login' }],
//           });
//         },
//       },
//     ]);
//   };
//
//   const getZodiacSign = (birthDate: string): string => {
//     // Упрощенная логика определения знака зодиака
//     const date = new Date(birthDate);
//     const month = date.getMonth() + 1;
//     const day = date.getDate();
//
//     if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
//       return 'Aries';
//     if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
//       return 'Taurus';
//     if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
//       return 'Gemini';
//     if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
//       return 'Cancer';
//     if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
//     if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
//       return 'Virgo';
//     if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
//       return 'Libra';
//     if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
//       return 'Scorpio';
//     if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
//       return 'Sagittarius';
//     if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
//       return 'Capricorn';
//     if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
//       return 'Aquarius';
//     return 'Pisces';
//   };
//
//   const getElementTheme = (zodiacSign: string) => {
//     const element = ZODIAC_ELEMENTS[zodiacSign] || 'air';
//     return ELEMENT_THEMES[element];
//   };
//
//   const formatRegistrationDate = (dateString: string): string => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('ru-RU', {
//       year: 'numeric',
//       month: 'long',
//     });
//   };
//
//   const animatedContainerStyle = useAnimatedStyle(() => {
//     return {
//       opacity: fadeAnim.value,
//       transform: [
//         {
//           translateY: interpolate(fadeAnim.value, [0, 1], [50, 0]),
//         },
//       ],
//     };
//   });
//
//   const animatedGlowStyle = useAnimatedStyle(() => {
//     return {
//       opacity: glowAnim.value,
//     };
//   });
//
//   const animatedOrbStyle = useAnimatedStyle(() => {
//     return {
//       transform: [{ rotate: `${orbRotation.value}deg` }],
//     };
//   });
//
//   const handleDeleteAccount = async () => {
//     try {
//       console.log('🗑️ Начинаем удаление аккаунта');
//       await userAPI.deleteAccount();
//
//       Alert.alert(
//         'Аккаунт удален',
//         'Ваш аккаунт и все данные были безвозвратно удалены.',
//         [
//           {
//             text: 'OK',
//             onPress: () => {
//               removeStoredToken();
//               navigation.reset({
//                 index: 0,
//                 routes: [{ name: 'Login' }],
//               });
//             },
//           },
//         ]
//       );
//     } catch (error: any) {
//       console.error('❌ Ошибка удаления аккаунта:', error);
//       Alert.alert(
//         'Ошибка',
//         error.message || 'Не удалось удалить аккаунт. Попробуйте позже.'
//       );
//     }
//   };
//
//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <CosmicBackground />
//         <ScrollView contentContainerStyle={styles.scrollContent}>
//           <ShimmerLoader
//             width={120}
//             height={120}
//             borderRadius={60}
//             style={styles.avatarShimmer}
//           />
//           <ShimmerLoader width={200} height={30} style={styles.nameShimmer} />
//           <ShimmerLoader width={150} height={20} style={styles.zodiacShimmer} />
//           <View style={styles.cardsContainer}>
//             <ShimmerLoader
//               width={width - 40}
//               height={150}
//               borderRadius={20}
//               style={styles.cardShimmer}
//             />
//             <ShimmerLoader
//               width={width - 40}
//               height={200}
//               borderRadius={20}
//               style={styles.cardShimmer}
//             />
//           </View>
//         </ScrollView>
//       </View>
//     );
//   }
//
//   if (!profile) {
//     return (
//       <View style={styles.container}>
//         <CosmicBackground />
//         <View style={styles.errorContainer}>
//           <Text style={styles.errorText}>Ошибка загрузки профиля</Text>
//           <TouchableOpacity
//             style={styles.retryButton}
//             onPress={loadProfileData}
//           >
//             <Text style={styles.retryButtonText}>Повторить</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   }
//
//   const zodiacSign = getZodiacSign(profile.birthDate);
//   const elementTheme = getElementTheme(zodiacSign);
//
//   return (
//     <View style={styles.container}>
//       <CosmicBackground />
//
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <Animated.View style={[styles.content, animatedContainerStyle]}>
//           {/* Header */}
//           <View style={styles.header}>
//             <Text style={styles.title}>Мой космический профиль</Text>
//             <View style={styles.headerActions}>
//               <TouchableOpacity
//                 style={styles.settingsButton}
//                 onPress={() => navigation.navigate('EditProfile')}
//               >
//                 <Ionicons name="settings-outline" size={24} color="#fff" />
//               </TouchableOpacity>
//             </View>
//           </View>
//
//           {/* Avatar Section */}
//           <View style={styles.avatarSection}>
//             <Animated.View style={[styles.orbContainer, animatedOrbStyle]}>
//               <Animated.View style={[styles.orbGlow, animatedGlowStyle]}>
//                 <LinearGradient
//                   colors={elementTheme.colors}
//                   style={styles.orbGradient}
//                 >
//                   <ZodiacAvatar zodiacSign={zodiacSign} size={80} />
//                 </LinearGradient>
//               </Animated.View>
//             </Animated.View>
//
//             <Text style={styles.userName}>{profile.name}</Text>
//             <View style={styles.zodiacContainer}>
//               <Text style={styles.zodiacSign}>{zodiacSign}</Text>
//               <Text style={styles.elementName}>{elementTheme.name}</Text>
//             </View>
//           </View>
//
//           {/* Subscription Card */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Моя подписка</Text>
//             <SubscriptionCard
//               subscription={subscription}
//               onUpgrade={() => setShowSubscriptionModal(true)}
//             />
//           </View>
//
//           {/* Natal Chart Widget */}
//           {chart && (
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Натальная карта</Text>
//               <View style={styles.chartCard}>
//                 <NatalChartWidget chart={chart} />
//                 <TouchableOpacity
//                   style={styles.viewFullChartButton}
//                   onPress={() => navigation.navigate('ChartStack')}
//                 >
//                   <Text style={styles.viewFullChartText}>
//                     Посмотреть полную карту
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}
//
//           {/* Settings Section */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Настройки</Text>
//
//             <View style={styles.settingsCard}>
//               <TouchableOpacity
//                 style={styles.settingItem}
//                 onPress={() => navigation.navigate('EditProfile')}
//               >
//                 <View style={styles.settingIcon}>
//                   <Ionicons name="person-outline" size={24} color="#8B5CF6" />
//                 </View>
//                 <Text style={styles.settingText}>Редактировать профиль</Text>
//                 <Ionicons name="chevron-forward" size={20} color="#666" />
//               </TouchableOpacity>
//
//               <View style={styles.settingItem}>
//                 <View style={styles.settingIcon}>
//                   <Ionicons name="moon-outline" size={24} color="#8B5CF6" />
//                 </View>
//                 <Text style={styles.settingText}>Тёмная тема</Text>
//                 <Switch
//                   value={darkMode}
//                   onValueChange={setDarkMode}
//                   trackColor={{ false: '#767577', true: '#8B5CF6' }}
//                   thumbColor={darkMode ? '#fff' : '#f4f3f4'}
//                 />
//               </View>
//
//               <TouchableOpacity
//                 style={styles.settingItem}
//                 onPress={handleLogout}
//               >
//                 <View style={styles.settingIcon}>
//                   <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
//                 </View>
//                 <Text style={[styles.settingText, { color: '#FF6B6B' }]}>
//                   Выйти
//                 </Text>
//                 <Ionicons name="chevron-forward" size={20} color="#666" />
//               </TouchableOpacity>
//               {/* Разделитель */}
//               <View style={styles.dangerZoneDivider}>
//                 <View style={styles.dividerLine} />
//                 <Text style={styles.dangerZoneLabel}>Опасная зона</Text>
//                 <View style={styles.dividerLine} />
//               </View>
//
//               {/* Кнопка удаления аккаунта */}
//               <TouchableOpacity
//                 style={[styles.settingItem, styles.deleteAccountItem]}
//                 onPress={() => setShowDeleteModal(true)}
//               >
//                 <View style={styles.settingIcon}>
//                   <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
//                 </View>
//                 <View style={{ flex: 1 }}>
//                   <Text style={[styles.settingText, { color: '#FF6B6B' }]}>
//                     Удалить аккаунт
//                   </Text>
//                   <Text style={styles.deleteAccountSubtext}>
//                     Удалит все ваши данные навсегда
//                   </Text>
//                 </View>
//                 <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
//               </TouchableOpacity>
//             </View>
//             {/* Delete Account Modal */}
//             <DeleteAccountModal
//               visible={showDeleteModal}
//               onClose={() => setShowDeleteModal(false)}
//               onConfirm={handleDeleteAccount}
//               userName={profile.name}
//             />
//           </View>
//
//           {/* Registration Info */}
//           <View style={styles.footer}>
//             <Text style={styles.registrationText}>
//               С нами с{' '}
//               {profile.createdAt
//                 ? formatRegistrationDate(profile.createdAt)
//                 : 'неизвестной даты'}{' '}
//               ✨
//             </Text>
//           </View>
//         </Animated.View>
//       </ScrollView>
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   scrollContent: {
//     flexGrow: 1,
//     paddingBottom: 100,
//   },
//   content: {
//     flex: 1,
//     paddingHorizontal: 20,
//     paddingTop: 60,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 40,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#fff',
//     textShadowColor: 'rgba(139, 92, 246, 0.8)',
//     textShadowOffset: { width: 0, height: 0 },
//     textShadowRadius: 20,
//   },
//   headerActions: {
//     flexDirection: 'row',
//   },
//   settingsButton: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: 'rgba(139, 92, 246, 0.2)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//   },
//   avatarSection: {
//     alignItems: 'center',
//     marginBottom: 40,
//   },
//   orbContainer: {
//     marginBottom: 20,
//   },
//   orbGlow: {
//     width: 140,
//     height: 140,
//     borderRadius: 70,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#8B5CF6',
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 1,
//     shadowRadius: 30,
//     elevation: 20,
//   },
//   orbGradient: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   userName: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 8,
//     textShadowColor: 'rgba(139, 92, 246, 0.5)',
//     textShadowOffset: { width: 0, height: 0 },
//     textShadowRadius: 10,
//   },
//   zodiacContainer: {
//     alignItems: 'center',
//   },
//   zodiacSign: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#8B5CF6',
//     marginBottom: 4,
//   },
//   elementName: {
//     fontSize: 14,
//     color: '#999',
//     fontStyle: 'italic',
//   },
//   section: {
//     marginBottom: 30,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 15,
//     textShadowColor: 'rgba(139, 92, 246, 0.3)',
//     textShadowOffset: { width: 0, height: 0 },
//     textShadowRadius: 10,
//   },
//   settingsCard: {
//     backgroundColor: 'rgba(255, 255, 255, 0.05)',
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.2)',
//     overflow: 'hidden',
//   },
//   settingItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(139, 92, 246, 0.1)',
//   },
//   settingIcon: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(139, 92, 246, 0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 15,
//   },
//   settingText: {
//     flex: 1,
//     fontSize: 16,
//     color: '#fff',
//     fontWeight: '500',
//   },
//   footer: {
//     alignItems: 'center',
//     marginTop: 20,
//   },
//   registrationText: {
//     fontSize: 14,
//     color: '#666',
//     fontStyle: 'italic',
//   },
//   // Shimmer styles
//   avatarShimmer: {
//     alignSelf: 'center',
//     marginTop: 100,
//     marginBottom: 20,
//   },
//   nameShimmer: {
//     alignSelf: 'center',
//     marginBottom: 10,
//   },
//   zodiacShimmer: {
//     alignSelf: 'center',
//     marginBottom: 40,
//   },
//   cardsContainer: {
//     paddingHorizontal: 20,
//   },
//   cardShimmer: {
//     marginBottom: 20,
//   },
//   // Error styles
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   errorText: {
//     fontSize: 18,
//     color: '#fff',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   retryButton: {
//     backgroundColor: '#8B5CF6',
//     paddingHorizontal: 30,
//     paddingVertical: 12,
//     borderRadius: 25,
//   },
//   retryButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   // Natal Chart Widget Styles
//   chartCard: {
//     backgroundColor: 'rgba(255, 255, 255, 0.05)',
//     borderRadius: 20,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.2)',
//   },
//   viewFullChartButton: {
//     backgroundColor: 'rgba(139, 92, 246, 0.2)',
//     borderRadius: 12,
//     padding: 12,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//     marginTop: 15,
//   },
//   viewFullChartText: {
//     color: '#8B5CF6',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   dangerZoneDivider: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 12,
//     paddingHorizontal: 16,
//   },
//   dividerLine: {
//     flex: 1,
//     height: 1,
//     backgroundColor: 'rgba(255, 107, 107, 0.3)',
//   },
//   dangerZoneLabel: {
//     fontSize: 12,
//     color: 'rgba(255, 107, 107, 0.7)',
//     fontWeight: '600',
//     marginHorizontal: 12,
//     textTransform: 'uppercase',
//     letterSpacing: 1,
//   },
//   deleteAccountItem: {
//     backgroundColor: 'rgba(255, 107, 107, 0.05)',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 107, 107, 0.2)',
//   },
//   deleteAccountSubtext: {
//     fontSize: 12,
//     color: 'rgba(255, 107, 107, 0.6)',
//     marginTop: 2,
//   },
// });
//
// export default ProfileScreen;

// frontend/src/screens/ProfileScreen.tsx
// Важные изменения: удалена переменная showSubscriptionModal,
// добавлена правильная навигация к экрану Subscription

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Switch,
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
import {
  userAPI,
  subscriptionAPI,
  chartAPI,
  removeStoredToken,
} from '../services/api';
import { UserProfile, Subscription, Chart, ZodiacSign } from '../types';
import ShimmerLoader from '../components/ShimmerLoader';
import CosmicBackground from '../components/CosmicBackground';
import ZodiacAvatar from '../components/ZodiacAvatar';
import SubscriptionCard from '../components/SubscriptionCard';
import NatalChartWidget from '../components/NatalChartWidget';
import { useAuth } from '../hooks/useAuth';
import DeleteAccountModal from '../components/DeleteAccountModal';

const { width, height } = Dimensions.get('window');

interface ProfileScreenProps {
  navigation: any;
}

// Темы по стихиям
const ELEMENT_THEMES = {
  fire: {
    colors: ['#FF6B35', '#F7931E', '#FFD700'] as const,
    glow: '#FF6B35',
    name: 'Огонь',
  },
  water: {
    colors: ['#4ECDC4', '#44A08D', '#096B72'] as const,
    glow: '#4ECDC4',
    name: 'Вода',
  },
  earth: {
    colors: ['#8FBC8F', '#556B2F', '#2F4F2F'] as const,
    glow: '#8FBC8F',
    name: 'Земля',
  },
  air: {
    colors: ['#FFD700', '#8B5CF6', '#DDA0DD'] as const,
    glow: '#FFD700',
    name: 'Воздух',
  },
};

// Соответствие знаков зодиака стихиям
const ZODIAC_ELEMENTS = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Animations
  const fadeAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const orbAnim = useSharedValue(0);

  useEffect(() => {
    fetchProfileData();

    // Animations
    fadeAnim.value = withTiming(1, { duration: 800 });
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1,
      true
    );
    orbAnim.value = withRepeat(withTiming(360, { duration: 20000 }), -1, false);
  }, []);

  const fetchProfileData = async () => {
    try {
      const [profileData, subscriptionData, chartData] = await Promise.all([
        userAPI.getProfile(),
        subscriptionAPI.getStatus(),
        chartAPI.getNatalChart(),
      ]);

      setProfile(profileData);
      setSubscription(subscriptionData);
      setChart(chartData);
    } catch (error) {
      console.error('Ошибка загрузки данных профиля:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => {
          removeStoredToken();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    try {
      console.log('🗑️ Начинаем удаление аккаунта');
      await userAPI.deleteAccount();

      Alert.alert(
        'Аккаунт удален',
        'Ваш аккаунт и все данные были безвозвратно удалены.',
        [
          {
            text: 'OK',
            onPress: () => {
              removeStoredToken();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Ошибка удаления аккаунта:', error);
      Alert.alert(
        'Ошибка',
        error.message || 'Не удалось удалить аккаунт. Попробуйте позже.'
      );
    }
  };

  // ========================================
  // ОБРАБОТЧИК ПЕРЕХОДА К ПОДПИСКАМ
  // ========================================
  const handleUpgradeSubscription = () => {
    // Навигация к экрану подписок через Stack Navigator
    navigation.navigate('Subscription');
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbAnim.value}deg` }],
  }));

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <ShimmerLoader />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <Text style={styles.errorText}>Профиль не найден</Text>
      </View>
    );
  }

  const zodiacSign = getZodiacSign(profile.birthDate);
  const elementTheme = getElementTheme(zodiacSign);

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, animatedContainerStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Мой космический профиль</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigation.navigate('EditProfileScreen')}
              >
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Animated.View style={[styles.orbContainer, animatedOrbStyle]}>
              <Animated.View style={[styles.orbGlow, animatedGlowStyle]}>
                <LinearGradient
                  colors={elementTheme.colors}
                  style={styles.orbGradient}
                >
                  <ZodiacAvatar zodiacSign={zodiacSign} size={80} />
                </LinearGradient>
              </Animated.View>
            </Animated.View>

            <Text style={styles.userName}>
              {profile.name || authUser?.user_metadata?.name || 'Пользователь'}
            </Text>
            <View style={styles.zodiacContainer}>
              <Text style={styles.zodiacSign}>{zodiacSign}</Text>
              <Text style={styles.elementName}>{elementTheme.name}</Text>
            </View>
          </View>

          {/* Subscription Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Моя подписка</Text>
            <SubscriptionCard
              subscription={subscription}
              onUpgrade={handleUpgradeSubscription}
            />
          </View>

          {/* Natal Chart Widget */}
          {chart && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Натальная карта</Text>
              <View style={styles.chartCard}>
                <NatalChartWidget chart={chart} />
                <TouchableOpacity
                  style={styles.viewFullChartButton}
                  onPress={() =>
                    navigation.navigate('ChartStack', { screen: 'NatalChart' })
                  }
                >
                  <Text style={styles.viewFullChartText}>
                    Посмотреть натальную карту с расшифровкой
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Настройки</Text>

            <View style={styles.settingsCard}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => navigation.navigate('EditProfileScreen')}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="person-outline" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.settingText}>Редактировать профиль</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Ionicons name="moon-outline" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.settingText}>Тёмная тема</Text>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#767577', true: '#8B5CF6' }}
                  thumbColor={darkMode ? '#fff' : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleLogout}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
                </View>
                <Text style={[styles.settingText, { color: '#FF6B6B' }]}>
                  Выйти
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              {/* Разделитель */}
              <View style={styles.dangerZoneDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dangerZoneLabel}>Опасная зона</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Кнопка удаления аккаунта */}
              <TouchableOpacity
                style={[styles.settingItem, styles.deleteAccountItem]}
                onPress={() => setShowDeleteModal(true)}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingText, { color: '#FF6B6B' }]}>
                    Удалить аккаунт
                  </Text>
                  <Text style={styles.deleteAccountSubtext}>
                    Удалит все ваши данные навсегда
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>

            {/* Delete Account Modal */}
            <DeleteAccountModal
              visible={showDeleteModal}
              onClose={() => setShowDeleteModal(false)}
              onConfirm={handleDeleteAccount}
              userName={
                profile.name || authUser?.user_metadata?.name || 'Пользователь'
              }
            />
          </View>

          {/* Registration Info */}
          <View style={styles.footer}>
            <Text style={styles.registrationText}>
              С нами с{' '}
              {profile.createdAt
                ? formatRegistrationDate(profile.createdAt)
                : 'начала времён'}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ========================================
// HELPER FUNCTIONS
// ========================================

const getZodiacSign = (birthDate: string): string => {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
    return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
    return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
    return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
    return 'Aquarius';
  return 'Pisces';
};

const getElementTheme = (zodiacSign: string) => {
  const element = (
    ZODIAC_ELEMENTS[zodiacSign as ZodiacSign] || 'Air'
  ).toLowerCase();
  return ELEMENT_THEMES[element as keyof typeof ELEMENT_THEMES];
};

const formatRegistrationDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
  });
};

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  orbContainer: {
    marginBottom: 20,
  },
  orbGlow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  orbGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  zodiacContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zodiacSign: {
    fontSize: 18,
    color: '#8B5CF6',
    fontWeight: '600',
    marginRight: 8,
  },
  elementName: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  viewFullChartButton: {
    marginTop: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
  },
  viewFullChartText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  registrationText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  dangerZoneDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
  },
  dangerZoneLabel: {
    fontSize: 12,
    color: 'rgba(255, 107, 107, 0.7)',
    fontWeight: '600',
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deleteAccountItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  deleteAccountSubtext: {
    fontSize: 12,
    color: 'rgba(255, 107, 107, 0.6)',
    marginTop: 2,
  },
});

export default ProfileScreen;
