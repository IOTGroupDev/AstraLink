// // frontend/src/screens/ProfileScreen.tsx
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
//   SafeAreaView,
//   Image,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import * as ImagePicker from 'expo-image-picker';
// import { useFocusEffect } from '@react-navigation/native';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
//   withRepeat,
//   withSequence,
//   withSpring,
// } from 'react-native-reanimated';
// import { UserProfile, Subscription, Chart, ZodiacSign } from '../types';
// import ShimmerLoader from '../components/ShimmerLoader';
// import CosmicBackground from '../components/CosmicBackground';
// import ZodiacAvatar from '../components/ZodiacAvatar';
// import SubscriptionCard from '../components/SubscriptionCard';
// import NatalChartWidget from '../components/NatalChartWidget';
// import { useAuth } from '../hooks/useAuth';
// import DeleteAccountModal from '../components/DeleteAccountModal';
// import { useAuthStore } from '../stores/auth.store';
// import { userAPI, chartAPI, userPhotosAPI } from '../services/api';
// import type { UserPhotoItem } from '../services/api';
// import { tokenService } from '../services/tokenService';
//
// const { width, height } = Dimensions.get('window');
// const THUMB_SIZE = Math.max(
//   90,
//   Math.floor((width - 20 * 2 - 12 * 2) / 3)
// );
//
// interface ProfileScreenProps {
//   navigation: any;
// }
//
// // Темы по стихиям
// const ELEMENT_THEMES = {
//   fire: {
//     colors: ['#FF6B35', '#F7931E', '#FFD700'] as const,
//     glow: '#FF6B35',
//     name: 'Огонь',
//   },
//   water: {
//     colors: ['#4ECDC4', '#44A08D', '#096B72'] as const,
//     glow: '#4ECDC4',
//     name: 'Вода',
//   },
//   earth: {
//     colors: ['#8FBC8F', '#556B2F', '#2F4F2F'] as const,
//     glow: '#8FBC8F',
//     name: 'Земля',
//   },
//   air: {
//     colors: ['#FFD700', '#8B5CF6', '#DDA0DD'] as const,
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
//   const { user: authUser } = useAuth();
//   const [profile, setProfile] = useState<UserProfile | null>(null);
//   const [subscription, setSubscription] = useState<Subscription | null>(null);
//   const [chart, setChart] = useState<Chart | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [darkMode, setDarkMode] = useState<boolean>(true); // ✅ Явно указан тип boolean
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//
//   // Photos
//   const [photos, setPhotos] = useState<UserPhotoItem[]>([]);
//   const [photosLoading, setPhotosLoading] = useState<boolean>(false);
//   const [uploading, setUploading] = useState<boolean>(false);
//
//   // Animations
//   const fadeAnim = useSharedValue(0);
//   const glowAnim = useSharedValue(0);
//   const orbAnim = useSharedValue(0);
//   const buttonGlowAnim = useSharedValue(0);
//   const buttonScaleAnim = useSharedValue(1);
//
//   const {
//     biometricAvailable,
//     biometricEnabled,
//     biometricType,
//     setBiometricEnabled,
//     logout,
//   } = useAuthStore();
//
//   useEffect(() => {
//     // Animations
//     fadeAnim.value = withTiming(1, { duration: 800 });
//     glowAnim.value = withRepeat(
//       withSequence(
//         withTiming(1, { duration: 2000 }),
//         withTiming(0.4, { duration: 2000 })
//       ),
//       -1,
//       true
//     );
//     orbAnim.value = withRepeat(withTiming(360, { duration: 20000 }), -1, false);
//     buttonGlowAnim.value = withRepeat(
//       withSequence(
//         withTiming(0.8, { duration: 1500 }),
//         withTiming(0.3, { duration: 1500 })
//       ),
//       -1,
//       true
//     );
//   }, []);
//
//   useFocusEffect(
//     React.useCallback(() => {
//       fetchProfileData();
//       loadPhotos();
//     }, [])
//   );
//
//   const fetchProfileData = async () => {
//     try {
//       const [profileData, subscriptionData, chartData] = await Promise.all([
//         userAPI.getProfile(),
//         userAPI.getSubscription(),
//         chartAPI.getNatalChart().catch(() => null),
//       ]);
//
//       setProfile(profileData);
//       setSubscription(subscriptionData);
//       setChart(chartData);
//     } catch (error) {
//       console.error('Ошибка загрузки данных профиля:', error);
//       Alert.alert('Ошибка', 'Не удалось загрузить данные профиля');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const refreshProfileData = async () => {
//     try {
//       const chartData = await chartAPI.getNatalChart();
//       setChart(chartData);
//     } catch (error) {
//       console.error('Ошибка обновления натальной карты:', error);
//     }
//   };
//
//   // ===================== Photos Logic =====================
//   const loadPhotos = async () => {
//     try {
//       setPhotosLoading(true);
//       const list = await userPhotosAPI.listPhotos();
//       setPhotos(list);
//     } catch (e) {
//       console.error('Ошибка загрузки фото:', e);
//     } finally {
//       setPhotosLoading(false);
//     }
//   };
//
//   const detectExtByMime = (mime?: string | null, uri?: string): 'jpg' | 'jpeg' | 'png' | 'webp' => {
//     if (mime) {
//       if (mime.includes('png')) return 'png';
//       if (mime.includes('webp')) return 'webp';
//       if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
//     }
//     if (uri) {
//       const lower = uri.toLowerCase();
//       if (lower.endsWith('.png')) return 'png';
//       if (lower.endsWith('.webp')) return 'webp';
//       if (lower.endsWith('.jpeg') || lower.endsWith('.jpg')) return 'jpg';
//     }
//     return 'jpg';
//   };
//
//   const detectContentType = (ext: 'jpg' | 'jpeg' | 'png' | 'webp'): 'image/jpeg' | 'image/png' | 'image/webp' => {
//     if (ext === 'png') return 'image/png';
//     if (ext === 'webp') return 'image/webp';
//     return 'image/jpeg';
//   };
//
//   const pickAndUploadPhoto = async () => {
//     try {
//       setUploading(true);
//       // Permission
//       const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (status !== 'granted') {
//         Alert.alert('Доступ к фото', 'Разрешите доступ к медиатеке для загрузки фото');
//         return;
//       }
//
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         quality: 0.9,
//       });
//
//       // @ts-ignore Expo SDK typing differences
//       if (result.canceled || !result.assets || result.assets.length === 0) {
//         return;
//       }
//
//       const asset = result.assets[0];
//       const ext = detectExtByMime(asset.mimeType as string | undefined, asset.uri);
//       const contentType = detectContentType(ext);
//
//       // Get signed upload URL
//       const { path, signedUrl } = await userPhotosAPI.getUploadUrl({ ext });
//
//       // Convert file to Blob and upload
//       const resp = await fetch(asset.uri);
//       const blob = await resp.blob();
//
//       await userPhotosAPI.uploadToSignedUrl(signedUrl, blob, contentType);
//
//       // Confirm photo in DB
//       await userPhotosAPI.confirmPhoto(path);
//
//       // Reload
//       await loadPhotos();
//     } catch (e: any) {
//       console.error('Ошибка загрузки фото:', e);
//       Alert.alert('Ошибка', e?.message || 'Не удалось загрузить фото');
//     } finally {
//       setUploading(false);
//     }
//   };
//
//   const setPrimaryPhoto = async (photoId: string) => {
//     try {
//       await userPhotosAPI.setPrimary(photoId);
//       await loadPhotos();
//     } catch (e: any) {
//       console.error('Ошибка установки основного фото:', e);
//       Alert.alert('Ошибка', e?.message || 'Не удалось установить основное фото');
//     }
//   };
//
//   const deletePhoto = async (photoId: string) => {
//     try {
//       await userPhotosAPI.deletePhoto(photoId);
//       await loadPhotos();
//     } catch (e: any) {
//       console.error('Ошибка удаления фото:', e);
//       Alert.alert('Ошибка', e?.message || 'Не удалось удалить фото');
//     }
//   };
//
//   const handleLogout = () => {
//     Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
//       {
//         text: 'Отмена',
//         style: 'cancel',
//       },
//       {
//         text: 'Выйти',
//         style: 'destructive',
//         onPress: () => {
//           logout();
//           // Навигация произойдет автоматически
//         },
//       },
//     ]);
//   };
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
//               tokenService.clearToken();
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
//   const handleUpgradeSubscription = () => {
//     navigation.navigate('Subscription');
//   };
//
//   // ✅ Обработчик для Switch - гарантирует boolean
//   const handleDarkModeChange = (value: boolean) => {
//     setDarkMode(value);
//   };
//
//   const animatedContainerStyle = useAnimatedStyle(() => ({
//     opacity: fadeAnim.value,
//   }));
//
//   const animatedGlowStyle = useAnimatedStyle(() => ({
//     opacity: glowAnim.value,
//   }));
//
//   const animatedOrbStyle = useAnimatedStyle(() => ({
//     transform: [{ rotate: `${orbAnim.value}deg` }],
//   }));
//
//   const animatedButtonGlowStyle = useAnimatedStyle(() => ({
//     opacity: buttonGlowAnim.value,
//   }));
//
//   const animatedButtonScaleStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: buttonScaleAnim.value }],
//   }));
//
//   const handleButtonPress = () => {
//     buttonScaleAnim.value = withSpring(0.95, { damping: 10, stiffness: 300 });
//     setTimeout(() => {
//       buttonScaleAnim.value = withSpring(1, { damping: 10, stiffness: 300 });
//       navigation.navigate('ChartStack', { screen: 'NatalChart' });
//     }, 100);
//   };
//
//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <CosmicBackground />
//         <ShimmerLoader />
//       </View>
//     );
//   }
//
//   if (!profile) {
//     return (
//       <View style={styles.container}>
//         <CosmicBackground />
//         <Text style={styles.errorText}>Профиль не найден</Text>
//       </View>
//     );
//   }
//
//   // ✅ Безопасное определение знака зодиака с fallback
//   const zodiacSignRaw =
//     chart?.data?.planets?.sun?.sign || getZodiacSign(profile.birthDate);
//   const zodiacSign = zodiacSignRaw || 'Aquarius'; // ✅ Fallback если undefined
//   const elementTheme = getElementTheme(zodiacSign);
//   const themePrimary = elementTheme.colors[0];
//
//   return (
//     <SafeAreaView style={styles.container}>
//       <CosmicBackground />
//
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <Animated.View style={[styles.content, animatedContainerStyle]}>
//           {/* Header */}
//           <View style={styles.header}>
//             <Text style={styles.title}>Мой космический профиль</Text>
//             <View style={styles.headerActions}>
//               <TouchableOpacity
//                 style={[
//                   styles.settingsButton,
//                   { backgroundColor: hexToRgba(themePrimary, 0.2) },
//                 ]}
//                 onPress={() => navigation.navigate('EditProfileScreen')}
//               >
//                 <Ionicons name="settings-outline" size={24} color="#fff" />
//               </TouchableOpacity>
//             </View>
//           </View>
//
//           {/* Avatar Section */}
//           <View style={styles.avatarSection}>
//             <Animated.View style={[styles.orbContainer, animatedOrbStyle]}>
//               <Animated.View
//                 style={[
//                   styles.orbGlow,
//                   { shadowColor: elementTheme.glow },
//                   animatedGlowStyle,
//                 ]}
//               >
//                 <LinearGradient
//                   colors={elementTheme.colors}
//                   style={styles.orbGradient}
//                 >
//                   <ZodiacAvatar zodiacSign={zodiacSign} size={80} />
//                 </LinearGradient>
//               </Animated.View>
//             </Animated.View>
//
//             <Text style={styles.userName}>
//               {profile.name || authUser?.name || 'Пользователь'}
//             </Text>
//             <View style={styles.zodiacContainer}>
//               <Text style={[styles.zodiacSign, { color: themePrimary }]}>
//                 {zodiacSign}
//               </Text>
//               <Text style={styles.elementName}>{elementTheme.name}</Text>
//             </View>
//           </View>
//
//           {/* Photos Gallery */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Фото профиля</Text>
//
//             <View style={styles.galleryActionsRow}>
//               <TouchableOpacity
//                 style={[styles.addPhotoButton, uploading && { opacity: 0.7 }]}
//                 onPress={pickAndUploadPhoto}
//                 disabled={uploading}
//               >
//                 <Ionicons name="add" size={20} color="#fff" />
//                 <Text style={styles.addPhotoText}>
//                   {uploading ? 'Загрузка...' : 'Добавить фото'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//
//             {photosLoading ? (
//               <Text style={{ color: '#aaa', paddingVertical: 6 }}>Загрузка фото...</Text>
//             ) : photos.length === 0 ? (
//               <Text style={{ color: '#aaa', paddingVertical: 6 }}>
//                 Пока нет фото. Добавьте первое.
//               </Text>
//             ) : null}
//
//             <View style={styles.galleryGrid}>
//               {photos.map((p) => (
//                 <View
//                   key={p.id}
//                   style={[styles.photoItem, p.isPrimary ? styles.photoItemPrimary : null]}
//                 >
//                   {!!p.url && (
//                     <Image source={{ uri: p.url }} style={styles.photoImage} />
//                   )}
//                   {p.isPrimary && (
//                     <View style={styles.primaryBadge}>
//                       <Ionicons name="star" size={12} color="#000" />
//                       <Text style={styles.primaryBadgeText}>Основное</Text>
//                     </View>
//                   )}
//                   <View style={styles.photoActionsRow}>
//                     {!p.isPrimary && (
//                       <TouchableOpacity
//                         style={[styles.photoActionBtn, { backgroundColor: 'rgba(34,197,94,0.25)' }]}
//                         onPress={() => setPrimaryPhoto(p.id)}
//                       >
//                         <Ionicons name="star-outline" size={16} color="#fff" />
//                         <Text style={styles.photoActionText}>Сделать осн.</Text>
//                       </TouchableOpacity>
//                     )}
//                     <TouchableOpacity
//                       style={[styles.photoActionBtn, { backgroundColor: 'rgba(239,68,68,0.25)' }]}
//                       onPress={() => deletePhoto(p.id)}
//                     >
//                       <Ionicons name="trash-outline" size={16} color="#fff" />
//                       <Text style={styles.photoActionText}>Удалить</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               ))}
//             </View>
//           </View>
//
//           {/* Subscription Card */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Моя подписка</Text>
//             <SubscriptionCard
//               subscription={subscription}
//               onUpgrade={handleUpgradeSubscription}
//             />
//           </View>
//
//           {/* Natal Chart Widget */}
//           {chart && (
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Натальная карта</Text>
//               <View
//                 style={[
//                   styles.chartCard,
//                   { borderColor: hexToRgba(themePrimary, 0.3) },
//                 ]}
//               >
//                 <NatalChartWidget chart={chart} />
//                 <Animated.View
//                   style={[
//                     styles.viewFullChartButtonContainer,
//                     animatedButtonScaleStyle,
//                   ]}
//                 >
//                   <TouchableOpacity
//                     style={styles.viewFullChartButton}
//                     onPress={handleButtonPress}
//                     activeOpacity={0.8}
//                   >
//                     <Animated.View
//                       style={[
//                         styles.buttonGlow,
//                         { backgroundColor: themePrimary },
//                         animatedButtonGlowStyle,
//                       ]}
//                     />
//                     <LinearGradient
//                       colors={elementTheme.colors as any}
//                       style={styles.buttonGradient}
//                       start={{ x: 0, y: 0 }}
//                       end={{ x: 1, y: 1 }}
//                     >
//                       <View style={styles.buttonContent}>
//                         <Ionicons name="planet" size={24} color="#fff" />
//                         <Text style={styles.viewFullChartText}>
//                           Посмотреть натальную карту с расшифровкой
//                         </Text>
//                         <Ionicons
//                           name="chevron-forward"
//                           size={20}
//                           color="#fff"
//                         />
//                       </View>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </Animated.View>
//               </View>
//             </View>
//           )}
//
//           {/* Settings Section */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Настройки</Text>
//
//             <View
//               style={[
//                 styles.settingsCard,
//                 { borderColor: hexToRgba(themePrimary, 0.3) },
//               ]}
//             >
//               <TouchableOpacity
//                 style={styles.settingItem}
//                 onPress={() => navigation.navigate('EditProfileScreen')}
//               >
//                 <View
//                   style={[
//                     styles.settingIcon,
//                     { backgroundColor: hexToRgba(themePrimary, 0.1) },
//                   ]}
//                 >
//                   <Ionicons
//                     name="person-outline"
//                     size={24}
//                     color={themePrimary}
//                   />
//                 </View>
//                 <Text style={styles.settingText}>Редактировать профиль</Text>
//                 <Ionicons name="chevron-forward" size={20} color="#666" />
//               </TouchableOpacity>
//
//               <View style={styles.settingItem}>
//                 <View
//                   style={[
//                     styles.settingIcon,
//                     { backgroundColor: hexToRgba(themePrimary, 0.1) },
//                   ]}
//                 >
//                   <Ionicons
//                     name="moon-outline"
//                     size={24}
//                     color={themePrimary}
//                   />
//                 </View>
//                 <Text style={styles.settingText}>Тёмная тема</Text>
//                 {/* ✅ Исправлен Switch */}
//                 <Switch
//                   value={darkMode === true}
//                   onValueChange={handleDarkModeChange}
//                   trackColor={{ false: '#767577', true: themePrimary }}
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
//
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
//
//             {/* Delete Account Modal */}
//             <DeleteAccountModal
//               visible={showDeleteModal}
//               onClose={() => setShowDeleteModal(false)}
//               onConfirm={handleDeleteAccount}
//               userName={profile.name || authUser?.name || 'Пользователь'}
//             />
//           </View>
//
//           {/* Registration Info */}
//           <View style={styles.footer}>
//             <Text style={styles.registrationText}>
//               С нами с{' '}
//               {profile.createdAt
//                 ? formatRegistrationDate(profile.createdAt)
//                 : 'начала времён'}
//             </Text>
//           </View>
//         </Animated.View>
//       </ScrollView>
//       {/* ДОБАВИТЬ: Секция безопасности */}
//       {biometricAvailable && (
//         <View style={styles.securitySection}>
//           <Text style={styles.sectionTitle}>Безопасность</Text>
//
//           <View style={styles.settingRow}>
//             <View style={styles.settingLeft}>
//               <Ionicons
//                 name="finger-print"
//                 size={24}
//                 color="rgba(255,255,255,0.7)"
//               />
//               <View style={styles.settingText}>
//                 <Text style={styles.settingTitle}>Вход с {biometricType}</Text>
//                 <Text style={styles.settingDescription}>
//                   Быстрый вход с биометрией
//                 </Text>
//               </View>
//             </View>
//             <Switch
//               value={biometricEnabled}
//               onValueChange={setBiometricEnabled}
//               trackColor={{ false: '#3A3A3C', true: 'rgba(139, 92, 246, 0.5)' }}
//               thumbColor={biometricEnabled ? '#8B5CF6' : '#f4f3f4'}
//               ios_backgroundColor="#3A3A3C"
//             />
//           </View>
//         </View>
//       )}
//
//       {/* Кнопка выхода (обновите существующую или добавьте) */}
//       <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
//         <Ionicons name="log-out-outline" size={20} color="#fff" />
//         <Text style={styles.logoutText}>Выйти из аккаунта</Text>
//       </TouchableOpacity>
//     </SafeAreaView>
//   );
// };
//
// // ========================================
// // HELPER FUNCTIONS
// // ========================================
//
// const getZodiacSign = (birthDate: string): string => {
//   const date = new Date(birthDate);
//   const month = date.getMonth() + 1;
//   const day = date.getDate();
//
//   if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
//   if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
//   if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
//   if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
//   if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
//   if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
//   if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
//   if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
//     return 'Scorpio';
//   if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
//     return 'Sagittarius';
//   if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
//     return 'Capricorn';
//   if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
//     return 'Aquarius';
//   return 'Pisces';
// };
//
// const getElementTheme = (zodiacSign: string) => {
//   const element = (
//     ZODIAC_ELEMENTS[zodiacSign as ZodiacSign] || 'air'
//   ).toLowerCase();
//   return (
//     ELEMENT_THEMES[element as keyof typeof ELEMENT_THEMES] || ELEMENT_THEMES.air
//   );
// };
//
// const hexToRgba = (hex: string, alpha: number) => {
//   const clean = hex.replace('#', '');
//   const bigint = parseInt(
//     clean.length === 3
//       ? clean
//           .split('')
//           .map((c) => c + c)
//           .join('')
//       : clean,
//     16
//   );
//   const r = (bigint >> 16) & 255;
//   const g = (bigint >> 8) & 255;
//   const b = bigint & 255;
//   return `rgba(${r}, ${g}, ${b}, ${alpha})`;
// };
//
// const formatRegistrationDate = (dateString: string): string => {
//   const date = new Date(dateString);
//   return date.toLocaleDateString('ru-RU', {
//     year: 'numeric',
//     month: 'long',
//   });
// };
//
// // ========================================
// // STYLES
// // ========================================
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
//     marginBottom: 30,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   headerActions: {
//     flexDirection: 'row',
//   },
//   settingsButton: {
//     width: 44,
//     height: 44,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderRadius: 22,
//     backgroundColor: 'rgba(139, 92, 246, 0.2)',
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
//     shadowOpacity: 0.6,
//     shadowRadius: 20,
//     elevation: 10,
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
//   },
//   zodiacContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   zodiacSign: {
//     fontSize: 18,
//     color: '#8B5CF6',
//     fontWeight: '600',
//     marginRight: 8,
//   },
//   elementName: {
//     fontSize: 16,
//     color: '#B0B0B0',
//   },
//   section: {
//     marginBottom: 30,
//   },
//
//   chartCard: {
//     backgroundColor: 'rgba(255, 255, 255, 0.05)',
//     borderRadius: 20,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//   },
//   viewFullChartButtonContainer: {
//     marginTop: 20,
//     borderRadius: 16,
//     overflow: 'hidden',
//     shadowColor: '#8B5CF6',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   viewFullChartButton: {
//     position: 'relative',
//     borderRadius: 16,
//     overflow: 'hidden',
//   },
//   buttonGlow: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: '#8B5CF6',
//     borderRadius: 16,
//   },
//   buttonGradient: {
//     paddingVertical: 16,
//     paddingHorizontal: 24,
//     borderRadius: 16,
//   },
//   buttonContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 12,
//   },
//   viewFullChartText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '700',
//     textShadowColor: 'rgba(0, 0, 0, 0.3)',
//     textShadowOffset: { width: 0, height: 1 },
//     textShadowRadius: 2,
//   },
//   settingsCard: {
//     backgroundColor: 'rgba(255, 255, 255, 0.05)',
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//     overflow: 'hidden',
//   },
//   settingItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 16,
//     paddingHorizontal: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
//   },
//   footer: {
//     alignItems: 'center',
//     marginTop: 20,
//     paddingBottom: 20,
//   },
//   registrationText: {
//     fontSize: 14,
//     color: '#666',
//   },
//   errorText: {
//     color: '#fff',
//     fontSize: 18,
//     textAlign: 'center',
//     marginTop: 100,
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
//   securitySection: {
//     marginTop: 24,
//     paddingHorizontal: 16,
//   },
//   sectionTitle: {
//     flex: 1,
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#fff',
//     marginBottom: 16,
//   },
//   settingRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: 'rgba(255,255,255,0.05)',
//     borderRadius: 16,
//     padding: 16,
//     marginBottom: 12,
//   },
//   settingLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//     gap: 16,
//   },
//   settingTitle: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#fff',
//     marginBottom: 4,
//   },
//   settingDescription: {
//     fontSize: 13,
//     color: 'rgba(255,255,255,0.6)',
//   },
//   logoutButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 12,
//     backgroundColor: 'rgba(239, 68, 68, 0.9)',
//     borderRadius: 16,
//     height: 56,
//     marginHorizontal: 16,
//     marginTop: 24,
//   },
//   logoutText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#fff',
//   },
//
//   // ======== Photos styles ========
//   galleryActionsRow: {
//     flexDirection: 'row',
//     justifyContent: 'flex-start',
//     marginBottom: 12,
//     gap: 12,
//   },
//   addPhotoButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     paddingVertical: 10,
//     paddingHorizontal: 14,
//     backgroundColor: 'rgba(139, 92, 246, 0.4)',
//     borderRadius: 12,
//   },
//   addPhotoText: {
//     color: '#fff',
//     fontWeight: '600',
//   },
//   galleryGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   photoItem: {
//     width: THUMB_SIZE,
//     height: THUMB_SIZE + 38,
//     borderRadius: 12,
//     backgroundColor: 'rgba(255,255,255,0.04)',
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.08)',
//   },
//   photoItemPrimary: {
//     borderColor: 'rgba(250, 204, 21, 0.5)',
//   },
//   photoImage: {
//     width: '100%',
//     height: THUMB_SIZE,
//     resizeMode: 'cover',
//   },
//   photoActionsRow: {
//     flexDirection: 'row',
//     gap: 8,
//     padding: 6,
//     justifyContent: 'space-between',
//   },
//   photoActionBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     paddingVertical: 6,
//     paddingHorizontal: 8,
//     borderRadius: 8,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     flex: 1,
//   },
//   photoActionText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   primaryBadge: {
//     position: 'absolute',
//     left: 6,
//     top: 6,
//     backgroundColor: '#FACC15',
//     paddingHorizontal: 6,
//     paddingVertical: 3,
//     borderRadius: 8,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   primaryBadgeText: {
//     color: '#000',
//     fontSize: 10,
//     fontWeight: '800',
//     textTransform: 'uppercase',
//   },
// });
//
// export default ProfileScreen;

// frontend/src/screens/ProfileScreen.tsx
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
  SafeAreaView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { UserProfile, Subscription, Chart, ZodiacSign } from '../types';
import ShimmerLoader from '../components/swap/old/ShimmerLoader';
import CosmicBackground from '../components/shared/CosmicBackground';
import ZodiacAvatar from '../components/profile/ZodiacAvatar';
import SubscriptionCard from '../components/profile/SubscriptionCard';
import NatalChartWidget from '../components/profile/NatalChartWidget';
import { useAuth } from '../hooks/useAuth';
import DeleteAccountModal from '../components/modals/DeleteAccountModal';
import { useAuthStore } from '../stores/auth.store';
import { userAPI, chartAPI } from '../services/api';
import { tokenService } from '../services/tokenService';

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
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Animations
  const fadeAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const orbAnim = useSharedValue(0);

  const {
    biometricAvailable,
    biometricEnabled,
    biometricType,
    setBiometricEnabled,
    logout,
  } = useAuthStore();

  useEffect(() => {
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

  useFocusEffect(
    React.useCallback(() => {
      fetchProfileData();
    }, [])
  );

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, cRes] = await Promise.allSettled([
        userAPI.getProfile(),
        userAPI.getSubscription(), // может вернуть 401/404
        chartAPI.getNatalChart(), // может вернуть 404, если нет карты
      ]);

      // PROFILE (обязательно)
      if (pRes.status === 'fulfilled') {
        setProfile(pRes.value);
      } else {
        const st = pRes.reason?.response?.status;
        const data = pRes.reason?.response?.data;
        console.log('⚠️ getProfile failed:', st, data);

        if (st === 401) {
          // нет/протух токен — выходим в логин
          Alert.alert('Сессия истекла', 'Пожалуйста, войдите снова.');
          logout?.(); // если есть из стора
          return;
        }

        // Любая другая ошибка профиля — это критично
        throw pRes.reason;
      }

      // SUBSCRIPTION (не критично для показа профиля)
      if (sRes.status === 'fulfilled') {
        setSubscription(sRes.value);
      } else {
        const st = sRes.reason?.response?.status;
        const data = sRes.reason?.response?.data;
        console.log('ℹ️ getSubscription failed (игнорируем):', st, data);

        // Игнорируем 404 и прочее — поставим дефолт
        setSubscription({
          tier: 'free',
          isActive: false,
          isTrial: false,
          isTrialActive: false,
          features: [],
        } as any);
      }

      // CHART (опционально)
      if (cRes.status === 'fulfilled') {
        setChart(cRes.value);
      } else {
        const st = cRes.reason?.response?.status;
        const data = cRes.reason?.response?.data;
        console.log('ℹ️ getNatalChart failed (опционально):', st, data);
        setChart(null);
      }
    } catch (error: any) {
      // сюда попадём только если упал getProfile (критично)
      const st = error?.response?.status;
      const data = error?.response?.data;
      console.error(
        'Ошибка загрузки данных профиля:',
        st,
        data,
        error?.message
      );
      Alert.alert(
        'Ошибка',
        data?.message || 'Не удалось загрузить данные профиля'
      );
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
        onPress: () => logout(),
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteAccount();
      Alert.alert(
        'Аккаунт удален',
        'Ваш аккаунт и все данные были безвозвратно удалены.',
        [
          {
            text: 'OK',
            onPress: () => {
              tokenService.clearToken();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Ошибка удаления аккаунта:', error);
      Alert.alert(
        'Ошибка',
        error.message || 'Не удалось удалить аккаунт. Попробуйте позже.'
      );
    }
  };

  const handleUpgradeSubscription = () => {
    navigation.navigate('Subscription');
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
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

  const zodiacSignRaw =
    chart?.data?.planets?.sun?.sign || getZodiacSign(profile.birthDate);
  const zodiacSign = zodiacSignRaw || 'Aquarius';
  const elementTheme = getElementTheme(zodiacSign);
  const themePrimary = elementTheme.colors[0];

  return (
    <SafeAreaView style={styles.container}>
      <CosmicBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, animatedContainerStyle]}>
          {/* Header with Blur */}
          <View style={styles.headerCard}>
            <Text style={styles.title}>Мой космический{'\n'}профиль</Text>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Animated.View style={[styles.avatarGlow, animatedGlowStyle]}>
                <View style={styles.avatarWrapper}>
                  <ZodiacAvatar zodiacSign={zodiacSign} size={120} />
                </View>
              </Animated.View>

              {/* Premium Badge */}
              {subscription?.tier !== 'free' && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="diamond" size={16} color="#fff" />
                </View>
              )}
            </View>

            <Text style={styles.userName}>
              {profile.name || authUser?.name || 'Пользователь'}
            </Text>

            <View style={styles.zodiacInfo}>
              <Text style={[styles.zodiacSign, { color: themePrimary }]}>
                {zodiacSign}
              </Text>
              <Text style={styles.elementName}>{elementTheme.name}</Text>
            </View>
          </View>

          {/* Subscription Cards */}
          <View style={styles.section}>
            {/* Premium Card */}
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <View style={styles.subscriptionBadge}>
                  <Ionicons name="star-half" size={18} color="#701F86" />
                  <Text style={styles.subscriptionBadgeText}>Premium</Text>
                </View>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={handleUpgradeSubscription}
                >
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                  <Text style={styles.upgradeButtonText}>Улучшить</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.subscriptionDate}>
                До 9 ноября 2025 • 29 дней осталось
              </Text>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '27%' }]} />
              </View>
            </View>

            {/* Cosmic MAX Card */}
            <View style={[styles.subscriptionCard, { marginTop: 16 }]}>
              <View style={styles.subscriptionHeader}>
                <View style={styles.maxBadge}>
                  <Ionicons name="star" size={16} color="#701F86" />
                  <Text style={styles.maxBadgeText}>Cosmic MAX</Text>
                </View>
              </View>

              <Text style={styles.subscriptionDate}>
                До 9 ноября 2025 • 29 дней осталось
              </Text>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '27%' }]} />
              </View>
            </View>
          </View>

          {/* Natal Chart Section */}
          {chart && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Натальная карта</Text>
              <View style={styles.chartCard}>
                <NatalChartWidget chart={chart} />

                <TouchableOpacity
                  style={styles.viewChartButton}
                  onPress={() =>
                    navigation.navigate('ChartStack', { screen: 'NatalChart' })
                  }
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#701F86', '#701F86']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="telescope" size={32} color="#fff" />
                    <Text style={styles.viewChartText}>
                      Посмотреть натальную{'\n'}карту с расшифровкой
                    </Text>
                    <Ionicons name="chevron-forward" size={32} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Настройки</Text>

            <View style={styles.settingsCard}>
              {/* Edit Profile */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => navigation.navigate('EditProfileScreen')}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="person" size={32} color="#fff" />
                </View>
                <Text style={styles.settingText}>Редактировать профиль</Text>
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Logout */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleLogout}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="log-out-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.settingText}>Выйти</Text>
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Delete Account */}
              <TouchableOpacity
                style={[styles.settingItem, styles.deleteItem]}
                onPress={() => setShowDeleteModal(true)}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="trash-outline" size={32} color="#E25140" />
                </View>
                <View style={styles.deleteTextContainer}>
                  <Text style={styles.deleteText}>Удалить аккаунт</Text>
                  <Text style={styles.deleteSubtext}>
                    Удалить все ваши данные на всегда
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={32} color="#E25140" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        userName={profile.name || authUser?.name || 'Пользователь'}
      />
    </SafeAreaView>
  );
};

// Helper Functions
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
    ZODIAC_ELEMENTS[zodiacSign as ZodiacSign] || 'air'
  ).toLowerCase();
  return (
    ELEMENT_THEMES[element as keyof typeof ELEMENT_THEMES] || ELEMENT_THEMES.air
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    backdropFilter: 'blur(10px)',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 39,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGlow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#701F86',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  zodiacInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zodiacSign: {
    fontSize: 16,
    fontWeight: '500',
  },
  elementName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
  },
  subscriptionCard: {
    backgroundColor: '#701F86',
    borderRadius: 12,
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 47,
    gap: 6,
  },
  subscriptionBadgeText: {
    color: '#701F86',
    fontSize: 16,
    fontWeight: '500',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 47,
    gap: 6,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  maxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 47,
    gap: 6,
  },
  maxBadgeText: {
    color: '#701F86',
    fontSize: 16,
    fontWeight: '500',
  },
  subscriptionDate: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '300',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 40,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 40,
  },
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(112, 31, 134, 0.3)',
  },
  viewChartButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 18,
  },
  viewChartText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 19.5,
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    gap: 10,
  },
  settingIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteItem: {
    backgroundColor: 'rgba(176, 66, 53, 0.15)',
    borderBottomWidth: 0,
  },
  deleteTextContainer: {
    flex: 1,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E25140',
  },
  deleteSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#E25140',
    marginTop: 2,
    letterSpacing: -0.24,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default ProfileScreen;
