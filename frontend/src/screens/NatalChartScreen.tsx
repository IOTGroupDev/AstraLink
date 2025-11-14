// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Alert,
//   ImageBackground,
//   Modal,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
// } from 'react-native-reanimated';
// import { chartAPI } from '../services/api';
// import CosmicBackground from '../components/shared/CosmicBackground';
// import LoadingLogo from '../components/swap/LoadingLogo';
// import NatalChartWidget from '../components/profile/NatalChartWidget';
//
// interface NatalChartScreenProps {
//   navigation: any;
// }
//
// const getPlanetColors = (planet: string): string[] => {
//   const colors: { [key: string]: string[] } = {
//     Солнце: ['#FFD700', '#FFA500', '#FF8C00'],
//     Луна: ['#E6E6FA', '#B0C4DE', '#778899'],
//     Меркурий: ['#C0C0C0', '#A9A9A9', '#808080'],
//     Венера: ['#FFB6C1', '#FF69B4', '#FF1493'],
//     Марс: ['#FF6347', '#FF4500', '#DC143C'],
//     Юпитер: ['#DDA0DD', '#BA55D3', '#9932CC'],
//     Сатурн: ['#708090', '#2F4F4F', '#000000'],
//     Уран: ['#00FFFF', '#00CED1', '#20B2AA'],
//     Нептун: ['#4169E1', '#0000FF', '#000080'],
//     Плутон: ['#8B0000', '#B22222', '#FF0000'],
//     Асцендент: ['#8B5CF6', '#7C3AED', '#5B21B6'],
//   };
//   return colors[planet] || ['#8B5CF6', '#7C3AED', '#5B21B6'];
// };
//
// const getPlanetImage = (planet: string): string => {
//   // Fixed planet photos (Wikimedia/NASA) to avoid random non-planet images
//   const images: { [key: string]: string } = {
//     Солнце:
//       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Visible_Sun_-_November_16%2C_2012.jpg/640px-Visible_Sun_-_November_16%2C_2012.jpg',
//     Луна: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/640px-FullMoon2010.jpg',
//     Меркурий:
//       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercury_in_true_color.jpg/640px-Mercury_in_true_color.jpg',
//     Венера:
//       'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/640px-Venus-real_color.jpg',
//     Марс: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/640px-OSIRIS_Mars_true_color.jpg',
//     Юпитер:
//       'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Jupiter_by_Cassini-Huygens.jpg/640px-Jupiter_by_Cassini-Huygens.jpg',
//     Сатурн:
//       'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/640px-Saturn_during_Equinox.jpg',
//     Уран: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/640px-Uranus2.jpg',
//     Нептун:
//       'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neptune_Full.jpg/640px-Neptune_Full.jpg',
//     Плутон:
//       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Nh-pluto-in-true-color_2x_JPEG-edit-frame.jpg/640px-Nh-pluto-in-true-color_2x_JPEG-edit-frame.jpg',
//     Асцендент:
//       'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/ESO_-_Milky_Way.jpg/640px-ESO_-_Milky_Way.jpg',
//   };
//   return (
//     images[planet] ||
//     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Visible_Sun_-_November_16%2C_2012.jpg/640px-Visible_Sun_-_November_16%2C_2012.jpg'
//   );
// };
//
// const NatalChartScreen: React.FC<NatalChartScreenProps> = ({ navigation }) => {
//   const [chartData, setChartData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState(0);
//
//   // "Подробнее" modal state
//   const [detailsVisible, setDetailsVisible] = useState(false);
//   const [detailsLoading, setDetailsLoading] = useState(false);
//   const [detailsTitle, setDetailsTitle] = useState<string>('');
//   const [detailsLines, setDetailsLines] = useState<string[]>([]);
//
//   // Simple in-memory cache for details to avoid repeat network calls
//   const [detailsCache, setDetailsCache] = useState<Record<string, string[]>>(
//     {}
//   );
//
//   const fadeAnim = useSharedValue(0);
//
//   useEffect(() => {
//     loadChartData();
//     fadeAnim.value = withTiming(1, { duration: 800 });
//   }, []);
//
//   const loadChartData = async () => {
//     try {
//       setLoading(true);
//       const data = await chartAPI.getNatalChartWithInterpretation();
//       setChartData(data);
//     } catch (error: any) {
//       console.error('Error loading natal chart:', error);
//       Alert.alert('Ошибка', 'Не удалось загрузить натальную карту');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const animatedContainerStyle = useAnimatedStyle(() => ({
//     opacity: fadeAnim.value,
//     transform: [
//       {
//         translateY: withTiming(fadeAnim.value * 0, { duration: 800 }),
//       },
//     ],
//   }));
//
//   /**
//    * Helpers for enrichment
//    * RU planet and aspect maps used across screen and for reverse lookup
//    */
//   const planetRu: Record<string, string> = {
//     sun: 'Солнце',
//     moon: 'Луна',
//     mercury: 'Меркурий',
//     venus: 'Венера',
//     mars: 'Марс',
//     jupiter: 'Юпитер',
//     saturn: 'Сатурн',
//     uranus: 'Уран',
//     neptune: 'Нептун',
//     pluto: 'Плутон',
//   };
//
//   const aspectRu: Record<string, string> = {
//     conjunction: 'Соединение',
//     opposition: 'Оппозиция',
//     trine: 'Тригон',
//     square: 'Квадрат',
//     sextile: 'Секстиль',
//   };
//
//   // Reverse map RU planet name -> key (sun, moon, ...)
//   const planetKeyByRu = React.useMemo(() => {
//     const entries = Object.entries(planetRu).map(([k, v]) => [v, k]);
//     return Object.fromEntries(entries as [string, string][]);
//   }, []);
//
//   const resolvePlanetKey = (ruName: string): string => {
//     return planetKeyByRu[ruName] || ruName;
//   };
//
//   // -------- Details helpers (fallback when backend returns no lines) --------
//
//   const formatDegree = (deg?: number): string => {
//     if (typeof deg !== 'number' || !isFinite(deg)) return '-';
//     const d = Math.floor(deg);
//     const m = Math.round((deg - d) * 60);
//     return `${d}° ${m}'`;
//   };
//
//   const findInterpretationPlanet = (ruName: string): any | null => {
//     try {
//       return (
//         interpretation?.planets?.find((p: any) => p.planet === ruName) ?? null
//       );
//     } catch {
//       return null;
//     }
//   };
//
//   const generatePlanetDetails = (
//     planetRuName: string,
//     sign: string
//   ): string[] => {
//     const key = resolvePlanetKey(planetRuName);
//     const p = (data as any)?.planets?.[key];
//     const houses = (data as any)?.houses || {};
//     const house =
//       p?.longitude != null ? getHouseForLongitude(p.longitude, houses) : null;
//     const deg = (p?.degree ??
//       (typeof p?.longitude === 'number' ? p.longitude % 30 : undefined)) as
//       | number
//       | undefined;
//
//     const lines: string[] = [];
//     lines.push(
//       `${planetRuName} в ${sign}${
//         typeof deg === 'number' ? ` — ${formatDegree(deg)}` : ''
//       }${house ? `, дом ${house}` : ''}`
//     );
//
//     const planetAspects = (((data as any)?.aspects as any[]) || []).filter(
//       (a: any) => a.planetA === key || a.planetB === key
//     );
//     if (planetAspects.length) {
//       const byType: Record<string, number> = {};
//       planetAspects.forEach((a) => {
//         byType[a.aspect] = (byType[a.aspect] || 0) + 1;
//       });
//       const summary = Object.entries(byType)
//         .map(([t, c]) => `${aspectRu[t] || t}: ${c}`)
//         .join(', ');
//       lines.push(`Аспекты: ${planetAspects.length} (${summary})`);
//     }
//
//     const interp = findInterpretationPlanet(planetRuName);
//     if (interp) {
//       if (interp.strengths?.length)
//         lines.push(`Сильные стороны: ${interp.strengths.join(', ')}`);
//       if (interp.challenges?.length)
//         lines.push(`Вызовы: ${interp.challenges.join(', ')}`);
//       if (interp.keywords?.length)
//         lines.push(`Ключевые слова: ${interp.keywords.join(', ')}`);
//     }
//
//     return lines;
//   };
//
//   const generateAscendantDetails = (sign: string): string[] => {
//     const houses = (data as any)?.houses || {};
//     const cusp = houses?.[1]?.cusp;
//     const lines: string[] = [];
//     lines.push(
//       `Асцендент в ${sign}${
//         typeof cusp === 'number'
//           ? ` — ${formatDegree((cusp as number) % 30)}`
//           : ''
//       }`
//     );
//
//     const inFirst = (() => {
//       const planets = (data as any)?.planets || {};
//       const res: string[] = [];
//       Object.entries(planets).forEach(([key, p]: any) => {
//         if (typeof p?.longitude === 'number') {
//           const h = getHouseForLongitude(p.longitude, houses);
//           if (h === 1) {
//             const ru = planetRu[key] || key;
//             res.push(ru);
//           }
//         }
//       });
//       return res;
//     })();
//     if (inFirst.length) lines.push(`Планеты в 1 доме: ${inFirst.join(', ')}`);
//
//     if (interpretation?.ascendant?.keywords?.length)
//       lines.push(
//         `Ключевые слова: ${interpretation.ascendant.keywords.join(', ')}`
//       );
//     if (interpretation?.ascendant?.interpretation)
//       lines.push(interpretation.ascendant.interpretation);
//
//     return lines;
//   };
//
//   const generateHouseDetails = (houseNum: number, sign: string): string[] => {
//     const houses = (data as any)?.houses || {};
//     const cusp = houses?.[houseNum]?.cusp;
//     const lines: string[] = [];
//     lines.push(
//       `${houseNum} дом в ${sign}${
//         typeof cusp === 'number'
//           ? ` — ${formatDegree((cusp as number) % 30)}`
//           : ''
//       }`
//     );
//
//     const inHouse = (() => {
//       const planets = (data as any)?.planets || {};
//       const res: string[] = [];
//       Object.entries(planets).forEach(([key, p]: any) => {
//         if (typeof p?.longitude === 'number') {
//           const h = getHouseForLongitude(p.longitude, houses);
//           if (h === houseNum) {
//             const ru = planetRu[key] || key;
//             res.push(ru);
//           }
//         }
//       });
//       return res;
//     })();
//     if (inHouse.length) lines.push(`Планеты в доме: ${inHouse.join(', ')}`);
//
//     const houseInterp = interpretation?.houses?.find(
//       (h: any) => h.house === houseNum
//     );
//     if (houseInterp?.lifeArea) lines.push(`Сфера: ${houseInterp.lifeArea}`);
//     if (houseInterp?.interpretation) lines.push(houseInterp.interpretation);
//
//     return lines;
//   };
//
//   const generateAspectDetails = (
//     aspect: string,
//     planetAru: string,
//     planetBru: string
//   ): string[] => {
//     const aKey = resolvePlanetKey(planetAru);
//     const bKey = resolvePlanetKey(planetBru);
//     const match = (((data as any)?.aspects as any[]) || []).find(
//       (x: any) =>
//         ((x.planetA === aKey && x.planetB === bKey) ||
//           (x.planetA === bKey && x.planetB === aKey)) &&
//         x.aspect === aspect
//     );
//     const lines: string[] = [];
//     const title = `${planetAru} — ${aspectRu[aspect] || aspect} — ${planetBru}`;
//     if (match) {
//       lines.push(title);
//       if (typeof match.orb === 'number')
//         lines.push(`Орб: ${match.orb.toFixed(1)}°`);
//       if (typeof match.strength === 'number')
//         lines.push(`Сила: ${Math.round(match.strength * 100)}%`);
//     } else {
//       lines.push(title);
//     }
//     return lines;
//   };
//
//   const closeDetails = () => {
//     setDetailsVisible(false);
//     setDetailsTitle('');
//     setDetailsLines([]);
//     setDetailsLoading(false);
//   };
//
//   const openDetails = async (
//     params:
//       | {
//           type: 'planet';
//           planet: string;
//           sign: string;
//           locale?: 'ru' | 'en' | 'es';
//         }
//       | { type: 'ascendant'; sign: string; locale?: 'ru' | 'en' | 'es' }
//       | {
//           type: 'house';
//           houseNum: number | string;
//           sign: string;
//           locale?: 'ru' | 'en' | 'es';
//         }
//       | {
//           type: 'aspect';
//           aspect: string;
//           planetA: string;
//           planetB: string;
//           locale?: 'ru' | 'en' | 'es';
//         },
//     title: string
//   ) => {
//     try {
//       setDetailsTitle(title);
//       setDetailsVisible(true);
//
//       // cache key
//       const cacheKey = JSON.stringify(params);
//       const cached = detailsCache[cacheKey];
//       if (cached && cached.length) {
//         setDetailsLines(cached);
//         setDetailsLoading(false);
//         return;
//       }
//
//       setDetailsLoading(true);
//
//       let lines: string[] = [];
//       try {
//         const res = await chartAPI.getInterpretationDetails(params as any);
//         if (Array.isArray(res?.lines) && res.lines.length) {
//           lines = res.lines;
//         }
//       } catch (apiErr) {
//         console.error('Ошибка загрузки деталей:', apiErr);
//       }
//
//       // Fallback generation if backend returned nothing
//       if (!lines.length) {
//         if (params.type === 'planet') {
//           lines = generatePlanetDetails(params.planet, params.sign);
//         } else if (params.type === 'ascendant') {
//           lines = generateAscendantDetails(params.sign);
//         } else if (params.type === 'house') {
//           const n =
//             typeof params.houseNum === 'string'
//               ? parseInt(params.houseNum, 10)
//               : params.houseNum;
//           lines = generateHouseDetails(n, params.sign);
//         } else if (params.type === 'aspect') {
//           lines = generateAspectDetails(
//             params.aspect,
//             params.planetA,
//             params.planetB
//           );
//         }
//       }
//
//       setDetailsLines(lines);
//       setDetailsCache((prev) => ({ ...prev, [cacheKey]: lines }));
//     } catch (e) {
//       console.error('Ошибка построения деталей:', e);
//       Alert.alert('Ошибка', 'Не удалось загрузить детали');
//       setDetailsLines([]);
//     } finally {
//       setDetailsLoading(false);
//     }
//   };
//
//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <CosmicBackground />
//         <LoadingLogo />
//       </View>
//     );
//   }
//
//   if (!chartData) {
//     return (
//       <View style={styles.container}>
//         <CosmicBackground />
//         <View style={styles.errorContainer}>
//           <Text style={styles.errorText}>Натальная карта не найдена</Text>
//           <TouchableOpacity style={styles.retryButton} onPress={loadChartData}>
//             <Text style={styles.retryButtonText}>Повторить</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   }
//
//   const { data } = chartData;
//   const interpretation = data?.interpretation;
//
//   if (!interpretation) {
//     return (
//       <View style={styles.container}>
//         <CosmicBackground />
//         <View style={styles.errorContainer}>
//           <Text style={styles.errorText}>Интерпретация недоступна</Text>
//         </View>
//       </View>
//     );
//   }
//
//   // Helpers defined above (planetRu, aspectRu)
//
//   const getHouseForLongitude = (longitude: number, houses: any): number => {
//     for (let i = 1; i <= 12; i++) {
//       const current = houses?.[i]?.cusp ?? 0;
//       const next = houses?.[i === 12 ? 1 : i + 1]?.cusp ?? 0;
//
//       if (current <= next) {
//         if (longitude >= current && longitude < next) return i;
//       } else {
//         if (longitude >= current || longitude < next) return i;
//       }
//     }
//     return 1;
//   };
//
//   const computePlanetsByHouse = (): Record<number, string[]> => {
//     const houses = (data as any)?.houses || {};
//     const planets = (data as any)?.planets || {};
//     const res: Record<number, string[]> = {};
//     Object.entries(planets).forEach(([key, value]: any) => {
//       const lon = value?.longitude;
//       if (typeof lon !== 'number') return;
//       const h = getHouseForLongitude(lon, houses);
//       if (!res[h]) res[h] = [];
//       res[h].push(planetRu[key] || key);
//     });
//     return res;
//   };
//
//   const aspectsRaw = ((data as any)?.aspects || []).map((a: any) => ({
//     planetA: planetRu[a.planetA] || a.planetA,
//     planetB: planetRu[a.planetB] || a.planetB,
//     type: aspectRu[a.aspect] || a.aspect,
//     orb: a.orb,
//     strength: Math.round(((a.strength ?? 0) as number) * 100),
//   }));
//
//   const planetsInHouse = computePlanetsByHouse();
//
//   const tabs = [
//     { key: 'overview', title: 'Обзор', icon: 'eye-outline' },
//     { key: 'planets', title: 'Планеты', icon: 'planet-outline' },
//     { key: 'aspects', title: 'Аспекты', icon: 'git-network-outline' },
//     { key: 'houses', title: 'Дома', icon: 'home-outline' },
//     { key: 'summary', title: 'Резюме', icon: 'star-outline' },
//   ];
//
//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 0: // Обзор
//         return (
//           <ScrollView contentContainerStyle={styles.scrollContent}>
//             {/* Natal Chart Widget */}
//             <View style={styles.chartSection}>
//               <NatalChartWidget chart={chartData} />
//             </View>
//
//             {/* Overview */}
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Общий обзор</Text>
//               <LinearGradient
//                 colors={['#8B5CF6', '#06B6D4', '#10B981']}
//                 style={styles.card}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//               >
//                 <Ionicons
//                   name="planet"
//                   size={40}
//                   color="rgba(255, 255, 255, 0.2)"
//                   style={styles.planetIcon}
//                 />
//                 <View style={styles.cardContent}>
//                   <Text style={styles.overviewText}>
//                     {interpretation.overview}
//                   </Text>
//                 </View>
//               </LinearGradient>
//             </View>
//
//             {/* Sun Sign */}
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Солнце</Text>
//               <ImageBackground
//                 source={{ uri: getPlanetImage('Солнце') }}
//                 style={styles.card}
//                 imageStyle={styles.cardImage}
//               >
//                 <View style={styles.overlay} />
//                 <View style={styles.cardContent}>
//                   <Text style={styles.planetTitle}>
//                     {interpretation.sunSign.planet} в{' '}
//                     {interpretation.sunSign.sign}
//                   </Text>
//                   <Text style={styles.planetText}>
//                     {interpretation.sunSign.interpretation}
//                   </Text>
//                   <View style={styles.keywordsContainer}>
//                     <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
//                     <Text style={styles.keywordsText}>
//                       {interpretation.sunSign.keywords.join(', ')}
//                     </Text>
//                   </View>
//                   <TouchableOpacity
//                     style={styles.detailsButton}
//                     onPress={() =>
//                       openDetails(
//                         {
//                           type: 'planet',
//                           planet: resolvePlanetKey(
//                             interpretation.sunSign.planet
//                           ),
//                           sign: interpretation.sunSign.sign,
//                           locale: 'ru',
//                         },
//                         `${interpretation.sunSign.planet} в ${interpretation.sunSign.sign} — Подробнее`
//                       )
//                     }
//                   >
//                     <Text style={styles.detailsButtonText}>Подробнее</Text>
//                   </TouchableOpacity>
//                 </View>
//               </ImageBackground>
//             </View>
//
//             {/* Moon Sign */}
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Луна</Text>
//               <ImageBackground
//                 source={{ uri: getPlanetImage('Луна') }}
//                 style={styles.card}
//                 imageStyle={styles.cardImage}
//               >
//                 <View style={styles.overlay} />
//                 <View style={styles.cardContent}>
//                   <Text style={styles.planetTitle}>
//                     {interpretation.moonSign.planet} в{' '}
//                     {interpretation.moonSign.sign}
//                   </Text>
//                   <Text style={styles.planetText}>
//                     {interpretation.moonSign.interpretation}
//                   </Text>
//                   <View style={styles.keywordsContainer}>
//                     <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
//                     <Text style={styles.keywordsText}>
//                       {interpretation.moonSign.keywords.join(', ')}
//                     </Text>
//                   </View>
//                   <TouchableOpacity
//                     style={styles.detailsButton}
//                     onPress={() =>
//                       openDetails(
//                         {
//                           type: 'planet',
//                           planet: resolvePlanetKey(
//                             interpretation.moonSign.planet
//                           ),
//                           sign: interpretation.moonSign.sign,
//                           locale: 'ru',
//                         },
//                         `${interpretation.moonSign.planet} в ${interpretation.moonSign.sign} — Подробнее`
//                       )
//                     }
//                   >
//                     <Text style={styles.detailsButtonText}>Подробнее</Text>
//                   </TouchableOpacity>
//                 </View>
//               </ImageBackground>
//             </View>
//
//             {/* Ascendant */}
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Асцендент</Text>
//               <ImageBackground
//                 source={{ uri: getPlanetImage('Асцендент') }}
//                 style={styles.card}
//                 imageStyle={styles.cardImage}
//               >
//                 <View style={styles.overlay} />
//                 <View style={styles.cardContent}>
//                   <Text style={styles.planetTitle}>
//                     {interpretation.ascendant.planet} в{' '}
//                     {interpretation.ascendant.sign}
//                   </Text>
//                   <Text style={styles.planetText}>
//                     {interpretation.ascendant.interpretation}
//                   </Text>
//                   <View style={styles.keywordsContainer}>
//                     <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
//                     <Text style={styles.keywordsText}>
//                       {interpretation.ascendant.keywords.join(', ')}
//                     </Text>
//                   </View>
//                   <TouchableOpacity
//                     style={styles.detailsButton}
//                     onPress={() =>
//                       openDetails(
//                         {
//                           type: 'ascendant',
//                           sign: interpretation.ascendant.sign,
//                           locale: 'ru',
//                         },
//                         `Асцендент в ${interpretation.ascendant.sign} — Подробнее`
//                       )
//                     }
//                   >
//                     <Text style={styles.detailsButtonText}>Подробнее</Text>
//                   </TouchableOpacity>
//                 </View>
//               </ImageBackground>
//             </View>
//           </ScrollView>
//         );
//
//       case 1: // Планеты
//         return (
//           <ScrollView contentContainerStyle={styles.scrollContent}>
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Планеты</Text>
//               {interpretation.planets.map((planet: any, index: number) => {
//                 return (
//                   <ImageBackground
//                     key={index}
//                     source={{ uri: getPlanetImage(planet.planet) }}
//                     style={styles.card}
//                     imageStyle={styles.cardImage}
//                   >
//                     <View style={styles.overlay} />
//                     <View style={styles.cardContent}>
//                       <Text style={styles.planetTitle}>
//                         {planet.planet} в {planet.sign} (
//                         {planet.degree.toFixed(1)}°) ({planet.house} дом)
//                       </Text>
//                       <Text style={styles.planetText}>
//                         {planet.interpretation}
//                       </Text>
//                       {planet.keywords && planet.keywords.length > 0 && (
//                         <View style={styles.keywordsContainer}>
//                           <Text style={styles.keywordsTitle}>
//                             Ключевые слова:
//                           </Text>
//                           <Text style={styles.keywordsText}>
//                             {planet.keywords.join(', ')}
//                           </Text>
//                         </View>
//                       )}
//                       <View style={styles.keywordsContainer}>
//                         <Text style={styles.keywordsTitle}>
//                           Сильные стороны:
//                         </Text>
//                         <Text style={styles.keywordsText}>
//                           {planet.strengths.join(', ')}
//                         </Text>
//                       </View>
//                       <View style={styles.keywordsContainer}>
//                         <Text style={styles.keywordsTitle}>Вызовы:</Text>
//                         <Text style={styles.keywordsText}>
//                           {planet.challenges.join(', ')}
//                         </Text>
//                       </View>
//
//                       <TouchableOpacity
//                         style={styles.detailsButton}
//                         onPress={() =>
//                           openDetails(
//                             {
//                               type: 'planet',
//                               planet: resolvePlanetKey(planet.planet),
//                               sign: planet.sign,
//                               locale: 'ru',
//                             },
//                             `${planet.planet} в ${planet.sign} — Подробнее`
//                           )
//                         }
//                       >
//                         <Text style={styles.detailsButtonText}>Подробнее</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </ImageBackground>
//                 );
//               })}
//             </View>
//           </ScrollView>
//         );
//
//       case 2: // Аспекты
//         return (
//           <ScrollView contentContainerStyle={styles.scrollContent}>
//             {/* Precise aspects with orb/strength */}
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Точные аспекты</Text>
//               {aspectsRaw.map((asp: any, index: number) => (
//                 <View key={index} style={styles.card}>
//                   <View style={styles.cardContent}>
//                     <Text style={styles.aspectTitle}>
//                       {asp.planetA} — {asp.type} — {asp.planetB}
//                     </Text>
//
//                     <View style={styles.chipRow}>
//                       <View style={styles.chip}>
//                         <Text style={styles.chipText}>
//                           Орб:{' '}
//                           {typeof asp.orb === 'number'
//                             ? asp.orb.toFixed(1)
//                             : asp.orb}
//                           °
//                         </Text>
//                       </View>
//                       <View style={styles.chip}>
//                         <Text style={styles.chipText}>
//                           Сила: {asp.strength}%
//                         </Text>
//                       </View>
//                     </View>
//
//                     <View style={styles.meter}>
//                       <View
//                         style={[
//                           styles.meterFill,
//                           {
//                             width: `${Math.min(100, Math.max(0, asp.strength))}%`,
//                           },
//                         ]}
//                       />
//                     </View>
//                   </View>
//                 </View>
//               ))}
//             </View>
//
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Аспекты</Text>
//               {interpretation.aspects.map((aspect: any, index: number) => (
//                 <LinearGradient
//                   key={index}
//                   colors={['#FF6B35', '#FF4500', '#DC143C']}
//                   style={styles.card}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                 >
//                   <Ionicons
//                     name="planet"
//                     size={30}
//                     color="rgba(255, 255, 255, 0.2)"
//                     style={styles.planetIcon}
//                   />
//                   <View style={styles.cardContent}>
//                     <Text style={styles.aspectTitle}>{aspect.aspect}</Text>
//                     <Text style={styles.aspectText}>
//                       {aspect.interpretation}
//                     </Text>
//                     <Text style={styles.significanceText}>
//                       {aspect.significance}
//                     </Text>
//                   </View>
//                 </LinearGradient>
//               ))}
//             </View>
//           </ScrollView>
//         );
//
//       case 3: // Дома
//         return (
//           <ScrollView contentContainerStyle={styles.scrollContent}>
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Дома</Text>
//               {interpretation.houses.map((house: any, index: number) => (
//                 <LinearGradient
//                   key={index}
//                   colors={['#32CD32', '#228B22', '#006400']}
//                   style={styles.card}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                 >
//                   <Ionicons
//                     name="home"
//                     size={30}
//                     color="rgba(255, 255, 255, 0.2)"
//                     style={styles.planetIcon}
//                   />
//                   <View style={styles.cardContent}>
//                     <Text style={styles.houseTitle}>
//                       {house.house} дом в {house.sign}
//                     </Text>
//                     <Text style={styles.houseArea}>{house.lifeArea}</Text>
//
//                     {planetsInHouse[house.house] &&
//                       planetsInHouse[house.house].length > 0 && (
//                         <View style={styles.chipRow}>
//                           {planetsInHouse[house.house].map(
//                             (p: string, i: number) => (
//                               <View key={i} style={styles.chip}>
//                                 <Text style={styles.chipText}>{p}</Text>
//                               </View>
//                             )
//                           )}
//                         </View>
//                       )}
//
//                     <Text style={styles.houseText}>{house.interpretation}</Text>
//
//                     <TouchableOpacity
//                       style={styles.detailsButton}
//                       onPress={() =>
//                         openDetails(
//                           {
//                             type: 'house',
//                             houseNum: house.house,
//                             sign: house.sign,
//                             locale: 'ru',
//                           },
//                           `${house.house} дом в ${house.sign} — Подробнее`
//                         )
//                       }
//                     >
//                       <Text style={styles.detailsButtonText}>Подробнее</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </LinearGradient>
//               ))}
//             </View>
//           </ScrollView>
//         );
//
//       case 4: // Резюме
//         return (
//           <ScrollView contentContainerStyle={styles.scrollContent}>
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Резюме</Text>
//               <LinearGradient
//                 colors={['#FFD700', '#FF69B4', '#8B5CF6']}
//                 style={styles.card}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//               >
//                 <Ionicons
//                   name="star"
//                   size={30}
//                   color="rgba(255, 255, 255, 0.2)"
//                   style={styles.planetIcon}
//                 />
//                 <View style={styles.cardContent}>
//                   <Text style={styles.summaryTitle}>Черты личности:</Text>
//                   <Text style={styles.summaryText}>
//                     {interpretation.summary.personalityTraits.join(', ')}
//                   </Text>
//
//                   <Text style={styles.summaryTitle}>Жизненные темы:</Text>
//                   <Text style={styles.summaryText}>
//                     {interpretation.summary.lifeThemes.join(', ')}
//                   </Text>
//
//                   <Text style={styles.summaryTitle}>Кармические уроки:</Text>
//                   <Text style={styles.summaryText}>
//                     {interpretation.summary.karmaLessons.join(', ')}
//                   </Text>
//
//                   <Text style={styles.summaryTitle}>Таланты:</Text>
//                   <Text style={styles.summaryText}>
//                     {interpretation.summary.talents.join(', ')}
//                   </Text>
//
//                   <Text style={styles.summaryTitle}>Рекомендации:</Text>
//                   {interpretation.summary.recommendations.map(
//                     (rec: string, index: number) => (
//                       <Text key={index} style={styles.recommendationText}>
//                         • {rec}
//                       </Text>
//                     )
//                   )}
//                 </View>
//               </LinearGradient>
//             </View>
//           </ScrollView>
//         );
//
//       default:
//         return null;
//     }
//   };
//
//   return (
//     <View style={styles.container}>
//       <CosmicBackground />
//
//       {/* Header - outside animation */}
//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//         >
//           <Ionicons name="arrow-back" size={24} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.title}>Натальная карта</Text>
//         <View style={styles.placeholder} />
//       </View>
//
//       {/* Tabs - outside animation */}
//       <View style={styles.tabsContainer}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.tabsScrollContent}
//         >
//           {tabs.map((tab, index) => (
//             <TouchableOpacity
//               key={tab.key}
//               style={[styles.tab, activeTab === index && styles.activeTab]}
//               onPress={() => setActiveTab(index)}
//             >
//               <Ionicons
//                 name={tab.icon as any}
//                 size={20}
//                 color={activeTab === index ? '#8B5CF6' : '#B0B0B0'}
//               />
//               <Text
//                 style={[
//                   styles.tabText,
//                   activeTab === index && styles.activeTabText,
//                 ]}
//               >
//                 {tab.title}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>
//
//       {/* Tab Content - with animation */}
//       <Animated.View style={[styles.tabContent, animatedContainerStyle]}>
//         {renderTabContent()}
//       </Animated.View>
//
//       {/* Подробнее Modal */}
//       <Modal
//         visible={detailsVisible}
//         animationType="fade"
//         transparent
//         onRequestClose={closeDetails}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContainer}>
//             <Text style={styles.modalTitle}>{detailsTitle}</Text>
//             {detailsLoading ? (
//               <Text style={styles.modalLine}>Загрузка...</Text>
//             ) : (
//               <ScrollView>
//                 {detailsLines && detailsLines.length > 0 ? (
//                   detailsLines.map((line, idx) => (
//                     <Text key={idx} style={styles.modalLine}>
//                       {line}
//                     </Text>
//                   ))
//                 ) : (
//                   <Text style={styles.modalLine}>Детали отсутствуют</Text>
//                 )}
//               </ScrollView>
//             )}
//             <TouchableOpacity
//               style={styles.modalCloseButton}
//               onPress={closeDetails}
//             >
//               <Text style={styles.modalCloseText}>Закрыть</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
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
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingTop: 60,
//     paddingBottom: 20,
//   },
//   backButton: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: 'rgba(139, 92, 246, 0.2)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     textShadowColor: 'rgba(139, 92, 246, 0.8)',
//     textShadowOffset: { width: 0, height: 0 },
//     textShadowRadius: 20,
//   },
//   placeholder: {
//     width: 44,
//   },
//   chartSection: {
//     marginBottom: 30,
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
//   card: {
//     borderRadius: 16,
//     padding: 16,
//     borderWidth: 0.5,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//     marginBottom: 12,
//     overflow: 'hidden',
//   },
//   cardContent: {
//     backgroundColor: 'rgba(0, 0, 0, 0.55)',
//     borderRadius: 12,
//     padding: 8,
//   },
//   planetIcon: {
//     position: 'absolute',
//     top: 10,
//     right: 10,
//     opacity: 0.3,
//   },
//   cardImage: {
//     borderRadius: 16,
//   },
//   overlay: {
//     ...(StyleSheet.absoluteFillObject as any),
//     backgroundColor: 'rgba(0,0,0,0.5)',
//   },
//   planetPhoto: {
//     position: 'absolute',
//     top: 0,
//     right: 0,
//     height: '100%',
//     width: '38%',
//     opacity: 0.25,
//     borderTopRightRadius: 20,
//     borderBottomRightRadius: 20,
//   },
//   overviewText: {
//     color: '#fff',
//     fontSize: 16,
//     lineHeight: 24,
//   },
//   planetTitle: {
//     color: '#8B5CF6',
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 10,
//   },
//   planetText: {
//     color: '#fff',
//     fontSize: 16,
//     lineHeight: 24,
//     marginBottom: 15,
//   },
//   keywordsContainer: {
//     marginBottom: 10,
//   },
//   keywordsTitle: {
//     color: '#FFD700',
//     fontSize: 14,
//     fontWeight: '600',
//     marginBottom: 5,
//   },
//   keywordsText: {
//     color: '#B0B0B0',
//     fontSize: 14,
//     lineHeight: 20,
//   },
//   aspectTitle: {
//     color: '#FF6B35',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 8,
//   },
//   aspectText: {
//     color: '#fff',
//     fontSize: 14,
//     lineHeight: 22,
//     marginBottom: 8,
//   },
//   significanceText: {
//     color: '#4ECDC4',
//     fontSize: 12,
//     fontStyle: 'italic',
//   },
//   houseTitle: {
//     color: '#8B5CF6',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 5,
//   },
//   houseArea: {
//     color: '#FFD700',
//     fontSize: 14,
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   houseTheme: {
//     color: '#B0B0B0',
//     fontSize: 13,
//     fontStyle: 'italic',
//     marginBottom: 4,
//   },
//   houseRuling: {
//     color: '#8B5CF6',
//     fontSize: 13,
//     fontWeight: '500',
//     marginBottom: 8,
//   },
//   houseText: {
//     color: '#fff',
//     fontSize: 14,
//     lineHeight: 22,
//     marginBottom: 10,
//   },
//   summaryTitle: {
//     color: '#FFD700',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginTop: 15,
//     marginBottom: 8,
//   },
//   summaryText: {
//     color: '#fff',
//     fontSize: 14,
//     lineHeight: 22,
//   },
//   recommendationText: {
//     color: '#B0B0B0',
//     fontSize: 14,
//     lineHeight: 22,
//     marginBottom: 5,
//   },
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
//   // Tab styles
//   tabsContainer: {
//     marginBottom: 20,
//     marginHorizontal: -20, // Compensate for content padding
//   },
//   tabsScrollContent: {
//     paddingHorizontal: 20,
//   },
//   tab: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     marginRight: 8,
//     borderRadius: 20,
//     backgroundColor: 'rgba(139, 92, 246, 0.1)',
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//   },
//   activeTab: {
//     backgroundColor: 'rgba(139, 92, 246, 0.2)',
//     borderColor: '#8B5CF6',
//   },
//   tabText: {
//     fontSize: 14,
//     color: '#B0B0B0',
//     fontWeight: '500',
//     marginLeft: 8,
//   },
//   activeTabText: {
//     color: '#8B5CF6',
//     fontWeight: '600',
//   },
//   tabContent: {
//     flex: 1,
//   },
//   chipRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     marginTop: 8,
//   },
//   chip: {
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 12,
//     backgroundColor: 'rgba(139, 92, 246, 0.15)',
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.3)',
//     marginRight: 8,
//     marginBottom: 8,
//   },
//   chipText: {
//     color: '#8B5CF6',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   meter: {
//     height: 8,
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 4,
//     overflow: 'hidden',
//     marginTop: 8,
//   },
//   meterFill: {
//     height: '100%',
//     backgroundColor: '#8B5CF6',
//     borderRadius: 4,
//   },
//
//   // "Подробнее" button
//   detailsButton: {
//     marginTop: 8,
//     alignSelf: 'flex-start',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 12,
//     backgroundColor: 'rgba(139, 92, 246, 0.2)',
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.4)',
//   },
//   detailsButtonText: {
//     color: '#8B5CF6',
//     fontWeight: '700',
//     fontSize: 14,
//   },
//
//   // Modal styles
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContainer: {
//     width: '100%',
//     maxHeight: '70%',
//     backgroundColor: '#111',
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.4)',
//     padding: 16,
//   },
//   modalTitle: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 12,
//   },
//   modalLine: {
//     color: '#B0B0B0',
//     fontSize: 14,
//     lineHeight: 20,
//     marginBottom: 6,
//   },
//   modalCloseButton: {
//     marginTop: 12,
//     alignSelf: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 12,
//     backgroundColor: '#8B5CF6',
//   },
//   modalCloseText: {
//     color: '#fff',
//     fontWeight: '700',
//   },
// });
//
// export default NatalChartScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { chartAPI } from '../services/api';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import LoadingIndicator from '../components/shared/LoadingIndicator';

interface NatalChartScreenProps {
  navigation: any;
}

interface PlanetData {
  longitude: number;
  latitude: number;
  speed: number;
  sign: string;
  degree: number;
  retrograde: boolean;
  house?: number;
}

interface HouseData {
  cusp: number;
  sign: string;
}

interface AspectData {
  planetA: string;
  planetB: string;
  aspect: string;
  angle: number;
  orb: number;
  applying: boolean;
}

interface ChartData {
  data: {
    planets: Record<string, PlanetData>;
    houses: Record<number, HouseData>;
    aspects: AspectData[];
    ascendant?: {
      sign: string;
      degree: number;
    };
    midheaven?: {
      sign: string;
      degree: number;
    };
  };
  interpretation?: any;
}

const PLANET_NAMES: Record<string, string> = {
  sun: 'Солнце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
};

const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
};

const ASPECT_NAMES: Record<string, string> = {
  conjunction: 'Соединение',
  opposition: 'Оппозиция',
  trine: 'Тригон',
  square: 'Квадрат',
  sextile: 'Секстиль',
};

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '☌',
  opposition: '☍',
  trine: '△',
  square: '□',
  sextile: '⚹',
};

const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#FFD700',
  opposition: '#FF6347',
  trine: '#4ECDC4',
  square: '#FF6B35',
  sextile: '#9B59B6',
};

const formatDegree = (deg?: number): string => {
  if (typeof deg !== 'number' || !isFinite(deg)) return "0°0'";
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${d}°${m}'`;
};

const getHouseForLongitude = (
  longitude: number,
  houses: Record<number, HouseData>
): number => {
  const normLon = ((longitude % 360) + 360) % 360;
  for (let i = 1; i <= 12; i++) {
    const current = houses[i]?.cusp ?? 0;
    const next = houses[i === 12 ? 1 : i + 1]?.cusp ?? 0;
    const normCurrent = ((current % 360) + 360) % 360;
    const normNext = ((next % 360) + 360) % 360;

    if (normCurrent < normNext) {
      if (normLon >= normCurrent && normLon < normNext) return i;
    } else {
      if (normLon >= normCurrent || normLon < normNext) return i;
    }
  }
  return 1;
};

const NatalChartScreen: React.FC<NatalChartScreenProps> = ({ navigation }) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'planets' | 'houses' | 'aspects' | 'summary'
  >('overview');

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const data = await chartAPI.getNatalChartWithInterpretation();
      console.log('📊 Загружены данные натальной карты:', {
        hasData: !!data?.data,
        hasInterpretation: !!data?.data?.interpretation,
        hasSummary: !!data?.data?.interpretation?.summary,
        dataKeys: data?.data ? Object.keys(data.data) : [],
        interpretationKeys: data?.data?.interpretation
          ? Object.keys(data.data.interpretation)
          : [],
        summaryKeys: data?.data?.interpretation?.summary
          ? Object.keys(data.data.interpretation.summary)
          : [],
      });
      setChartData(data);
    } catch (error: any) {
      console.error('❌ Ошибка загрузки натальной карты:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить натальную карту');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChartData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <TabScreenLayout>
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      </TabScreenLayout>
    );
  }

  if (!chartData?.data) {
    return (
      <TabScreenLayout>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#8B5CF6" />
          <Text style={styles.errorText}>Натальная карта не найдена</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadChartData}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </TabScreenLayout>
    );
  }

  const { planets, houses, aspects, ascendant, midheaven } = chartData.data;
  const interpretation = chartData.data?.interpretation;

  // Вкладки
  const tabs = [
    { id: 'overview', label: 'Обзор', icon: 'star-outline' },
    { id: 'planets', label: 'Планеты', icon: 'planet-outline' },
    { id: 'houses', label: 'Дома', icon: 'home-outline' },
    { id: 'aspects', label: 'Аспекты', icon: 'git-network-outline' },
    { id: 'summary', label: 'Резюме', icon: 'document-text-outline' },
  ];

  // Основная информация
  const renderOverview = () => {
    const sunSign = planets?.sun?.sign || 'N/A';
    const moonSign = planets?.moon?.sign || 'N/A';
    const ascSign = ascendant?.sign || 'N/A';

    // Подсчет элементов и качеств
    const elements = { fire: 0, earth: 0, air: 0, water: 0 };
    const qualities = { cardinal: 0, fixed: 0, mutable: 0 };

    const elementMap: Record<string, keyof typeof elements> = {
      aries: 'fire',
      leo: 'fire',
      sagittarius: 'fire',
      taurus: 'earth',
      virgo: 'earth',
      capricorn: 'earth',
      gemini: 'air',
      libra: 'air',
      aquarius: 'air',
      cancer: 'water',
      scorpio: 'water',
      pisces: 'water',
    };

    const qualityMap: Record<string, keyof typeof qualities> = {
      aries: 'cardinal',
      cancer: 'cardinal',
      libra: 'cardinal',
      capricorn: 'cardinal',
      taurus: 'fixed',
      leo: 'fixed',
      scorpio: 'fixed',
      aquarius: 'fixed',
      gemini: 'mutable',
      virgo: 'mutable',
      sagittarius: 'mutable',
      pisces: 'mutable',
    };

    if (planets) {
      Object.values(planets).forEach((planet) => {
        if (planet?.sign) {
          const sign = planet.sign.toLowerCase();
          if (elementMap[sign]) elements[elementMap[sign]]++;
          if (qualityMap[sign]) qualities[qualityMap[sign]]++;
        }
      });
    }

    const dominantElement = Object.entries(elements).sort(
      ([, a], [, b]) => b - a
    )[0];
    const dominantQuality = Object.entries(qualities).sort(
      ([, a], [, b]) => b - a
    )[0];

    const retrogradeCount = planets
      ? Object.values(planets).filter((p) => p?.retrograde).length
      : 0;

    return (
      <View style={styles.content}>
        {/* Основная тройка */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Большая Тройка</Text>

            <View style={styles.bigThreeRow}>
              <View style={styles.bigThreeItem}>
                <Text style={styles.bigThreeSymbol}>☉</Text>
                <Text style={styles.bigThreeLabel}>Солнце</Text>
                <Text style={styles.bigThreeValue}>{sunSign}</Text>
                <Text style={styles.bigThreeDegree}>
                  {formatDegree(planets.sun?.degree || 0)}
                </Text>
              </View>

              <View style={styles.bigThreeItem}>
                <Text style={styles.bigThreeSymbol}>☽</Text>
                <Text style={styles.bigThreeLabel}>Луна</Text>
                <Text style={styles.bigThreeValue}>{moonSign}</Text>
                <Text style={styles.bigThreeDegree}>
                  {formatDegree(planets.moon?.degree || 0)}
                </Text>
              </View>

              <View style={styles.bigThreeItem}>
                <Text style={styles.bigThreeSymbol}>ASC</Text>
                <Text style={styles.bigThreeLabel}>Асцендент</Text>
                <Text style={styles.bigThreeValue}>{ascSign}</Text>
                <Text style={styles.bigThreeDegree}>
                  {formatDegree(ascendant?.degree || 0)}
                </Text>
              </View>
            </View>
          </View>
        </BlurView>

        {/* Статистика карты */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Статистика карты</Text>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Планеты</Text>
                <Text style={styles.statValue}>
                  {planets ? Object.keys(planets).length : 0}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Аспекты</Text>
                <Text style={styles.statValue}>{aspects?.length || 0}</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Ретроградных</Text>
                <Text style={styles.statValue}>{retrogradeCount}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={styles.statItemFull}>
                <Text style={styles.statLabel}>Доминирующий элемент</Text>
                <Text style={styles.statValueLarge}>
                  {dominantElement?.[0]?.toUpperCase() || 'N/A'} (
                  {dominantElement?.[1] || 0})
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItemFull}>
                <Text style={styles.statLabel}>Доминирующее качество</Text>
                <Text style={styles.statValueLarge}>
                  {dominantQuality?.[0]?.toUpperCase() || 'N/A'} (
                  {dominantQuality?.[1] || 0})
                </Text>
              </View>
            </View>
          </View>
        </BlurView>

        {/* Углы карты */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Углы карты</Text>

            <View style={styles.angleItem}>
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>ASC</Text>
                <Text style={styles.angleLabel}>Асцендент (1 дом)</Text>
              </View>
              <Text style={styles.angleValue}>
                {ascendant?.sign} {formatDegree(ascendant?.degree || 0)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.angleItem}>
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>MC</Text>
                <Text style={styles.angleLabel}>Середина неба (10 дом)</Text>
              </View>
              <Text style={styles.angleValue}>
                {midheaven?.sign} {formatDegree(midheaven?.degree || 0)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.angleItem}>
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>DSC</Text>
                <Text style={styles.angleLabel}>Десцендент (7 дом)</Text>
              </View>
              <Text style={styles.angleValue}>
                {houses?.[7]?.sign || 'N/A'}{' '}
                {houses?.[7]?.cusp ? formatDegree(houses[7].cusp) : ''}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.angleItem}>
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>IC</Text>
                <Text style={styles.angleLabel}>Нижнее небо (4 дом)</Text>
              </View>
              <Text style={styles.angleValue}>
                {houses?.[4]?.sign || 'N/A'}{' '}
                {houses?.[4]?.cusp ? formatDegree(houses[4].cusp) : ''}
              </Text>
            </View>
          </View>
        </BlurView>
      </View>
    );
  };

  // Планеты
  const renderPlanets = () => {
    if (!planets) return null;

    return (
      <View style={styles.content}>
        {Object.entries(planets).map(([key, planet]) => {
          if (!planet) return null;

          const name = PLANET_NAMES[key] || key;
          const symbol = PLANET_SYMBOLS[key] || '●';
          const house = getHouseForLongitude(
            planet.longitude || 0,
            houses || {}
          );

          return (
            <BlurView key={key} intensity={20} tint="dark" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.planetHeader}>
                  <View style={styles.planetTitleRow}>
                    <Text style={styles.planetSymbol}>{symbol}</Text>
                    <View>
                      <Text style={styles.planetName}>{name}</Text>
                      <Text style={styles.planetSign}>
                        в {planet.sign || 'N/A'} {formatDegree(planet.degree)}
                      </Text>
                    </View>
                  </View>
                  {planet.retrograde && (
                    <View style={styles.retrogradeBadge}>
                      <Text style={styles.retrogradeBadgeText}>℞</Text>
                    </View>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.planetDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Долгота:</Text>
                    <Text style={styles.detailValue}>
                      {(planet.longitude || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Широта:</Text>
                    <Text style={styles.detailValue}>
                      {(planet.latitude || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Скорость:</Text>
                    <Text style={styles.detailValue}>
                      {(planet.speed || 0).toFixed(4)}°/день
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Дом:</Text>
                    <Text style={styles.detailValue}>{house}</Text>
                  </View>
                </View>

                {interpretation?.planets?.find(
                  (p: any) => p.planet === name
                ) && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.interpretationSection}>
                      <Text style={styles.interpretationText}>
                        {
                          interpretation.planets.find(
                            (p: any) => p.planet === name
                          ).interpretation
                        }
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </BlurView>
          );
        })}
      </View>
    );
  };

  // Дома
  const renderHouses = () => {
    if (!houses) return null;

    const houseThemes = [
      'Личность, внешность, начало',
      'Деньги, ресурсы, ценности',
      'Общение, обучение, близкое окружение',
      'Дом, семья, корни',
      'Творчество, дети, романтика',
      'Здоровье, работа, служение',
      'Партнерство, брак, контракты',
      'Трансформация, общие ресурсы',
      'Философия, путешествия, высшее образование',
      'Карьера, статус, призвание',
      'Дружба, сообщества, мечты',
      'Подсознание, изоляция, духовность',
    ];

    return (
      <View style={styles.content}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => {
          const house = houses[num];
          if (!house) return null;

          const planetsInHouse = planets
            ? Object.entries(planets).filter(
                ([, planet]) =>
                  planet &&
                  getHouseForLongitude(planet.longitude || 0, houses) === num
              )
            : [];

          return (
            <BlurView key={num} intensity={20} tint="dark" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.houseHeader}>
                  <Text style={styles.houseNumber}>{num}</Text>
                  <View style={styles.houseInfo}>
                    <Text style={styles.houseName}>Дом {num}</Text>
                    <Text style={styles.houseSign}>
                      {house.sign || 'N/A'}{' '}
                      {house.cusp ? formatDegree(house.cusp % 30) : ''}
                    </Text>
                  </View>
                </View>

                <Text style={styles.houseTheme}>{houseThemes[num - 1]}</Text>

                {planetsInHouse.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.housePlanets}>
                      <Text style={styles.housePlanetsLabel}>
                        Планеты в доме:
                      </Text>
                      <View style={styles.planetChips}>
                        {planetsInHouse.map(([key, planet]) => (
                          <View key={key} style={styles.planetChip}>
                            <Text style={styles.planetChipSymbol}>
                              {PLANET_SYMBOLS[key] || '●'}
                            </Text>
                            <Text style={styles.planetChipText}>
                              {PLANET_NAMES[key] || key}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {interpretation?.houses?.find((h: any) => h.house === num) && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.interpretationSection}>
                      <Text style={styles.interpretationText}>
                        {
                          interpretation.houses.find(
                            (h: any) => h.house === num
                          ).interpretation
                        }
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </BlurView>
          );
        })}
      </View>
    );
  };

  // Аспекты
  const renderAspects = () => {
    if (!aspects || aspects.length === 0) {
      return (
        <View style={styles.content}>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>Нет аспектов</Text>
            </View>
          </BlurView>
        </View>
      );
    }

    // Группируем аспекты по типу
    const groupedAspects: Record<string, AspectData[]> = {};
    aspects.forEach((aspect) => {
      if (!groupedAspects[aspect.aspect]) {
        groupedAspects[aspect.aspect] = [];
      }
      groupedAspects[aspect.aspect].push(aspect);
    });

    return (
      <View style={styles.content}>
        {/* Статистика аспектов */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Статистика аспектов</Text>
            <View style={styles.aspectStats}>
              {Object.entries(groupedAspects).map(([type, list]) => (
                <View key={type} style={styles.aspectStatItem}>
                  <Text
                    style={[
                      styles.aspectStatSymbol,
                      { color: ASPECT_COLORS[type] || '#8B5CF6' },
                    ]}
                  >
                    {ASPECT_SYMBOLS[type] || '●'}
                  </Text>
                  <Text style={styles.aspectStatLabel}>
                    {ASPECT_NAMES[type] || type}
                  </Text>
                  <Text style={styles.aspectStatValue}>{list.length}</Text>
                </View>
              ))}
            </View>
          </View>
        </BlurView>

        {/* Список аспектов */}
        {aspects.map((aspect, idx) => {
          if (!aspect) return null;

          const planetA = PLANET_NAMES[aspect.planetA] || aspect.planetA;
          const planetB = PLANET_NAMES[aspect.planetB] || aspect.planetB;
          const aspectName = ASPECT_NAMES[aspect.aspect] || aspect.aspect;
          const symbolA = PLANET_SYMBOLS[aspect.planetA] || '●';
          const symbolB = PLANET_SYMBOLS[aspect.planetB] || '●';
          const aspectSymbol = ASPECT_SYMBOLS[aspect.aspect] || '●';
          const color = ASPECT_COLORS[aspect.aspect] || '#8B5CF6';

          return (
            <BlurView key={idx} intensity={20} tint="dark" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.aspectHeader}>
                  <View style={styles.aspectPlanets}>
                    <Text style={styles.aspectPlanetSymbol}>{symbolA}</Text>
                    <Text style={styles.aspectPlanetName}>{planetA}</Text>
                  </View>

                  <View
                    style={[
                      styles.aspectSymbolContainer,
                      { borderColor: color },
                    ]}
                  >
                    <Text style={[styles.aspectSymbolLarge, { color }]}>
                      {aspectSymbol}
                    </Text>
                  </View>

                  <View style={styles.aspectPlanets}>
                    <Text style={styles.aspectPlanetSymbol}>{symbolB}</Text>
                    <Text style={styles.aspectPlanetName}>{planetB}</Text>
                  </View>
                </View>

                <Text style={[styles.aspectName, { color }]}>{aspectName}</Text>

                <View style={styles.divider} />

                <View style={styles.aspectDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Угол:</Text>
                    <Text style={styles.detailValue}>
                      {(aspect.angle || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Орб:</Text>
                    <Text style={styles.detailValue}>
                      {Math.abs(aspect.orb || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Тип:</Text>
                    <Text style={styles.detailValue}>
                      {aspect.applying ? 'Сходящийся' : 'Расходящийся'}
                    </Text>
                  </View>
                </View>

                {interpretation?.aspects?.find(
                  (a: any) =>
                    a.planetA === planetA &&
                    a.planetB === planetB &&
                    a.aspect === aspectName
                ) && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.interpretationSection}>
                      <Text style={styles.interpretationText}>
                        {
                          interpretation.aspects.find(
                            (a: any) =>
                              a.planetA === planetA &&
                              a.planetB === planetB &&
                              a.aspect === aspectName
                          ).interpretation
                        }
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </BlurView>
          );
        })}
      </View>
    );
  };

  // Резюме личности
  const renderSummary = () => {
    const summary = interpretation?.summary;

    console.log('📊 Interpretation данные:', {
      hasInterpretation: !!interpretation,
      hasSummary: !!summary,
      interpretationKeys: interpretation ? Object.keys(interpretation) : [],
      summaryKeys: summary ? Object.keys(summary) : [],
    });

    if (!interpretation) {
      return (
        <View style={styles.content}>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color="#FF6B35"
                />
                <Text style={styles.summaryTitle}>
                  Интерпретация недоступна
                </Text>
              </View>
              <Text style={styles.summarySubtext}>
                Данные интерпретации натальной карты не загружены.{'\n\n'}
                Попробуйте обновить страницу.
              </Text>
            </View>
          </BlurView>
        </View>
      );
    }

    if (!summary) {
      return (
        <View style={styles.content}>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color="#8B5CF6"
                />
                <Text style={styles.summaryTitle}>Резюме формируется</Text>
              </View>
              <Text style={styles.summarySubtext}>
                Полное резюме личности пока не сформировано.{'\n\n'}
                Данные доступны в других вкладках: Обзор, Планеты, Дома,
                Аспекты.
              </Text>
            </View>
          </BlurView>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {/* Жизненная цель */}
        {summary.lifePurpose && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="compass-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Жизненная цель</Text>
              </View>
              <Text style={styles.summaryText}>{summary.lifePurpose}</Text>
            </View>
          </BlurView>
        )}

        {/* Личностные качества */}
        {summary.personalityTraits && summary.personalityTraits.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="person-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Личностные качества</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.personalityTraits.map((trait: string, idx: number) => (
                  <View key={idx} style={styles.traitItem}>
                    <View style={styles.traitBullet} />
                    <Text style={styles.traitText}>{trait}</Text>
                  </View>
                ))}
              </View>
            </View>
          </BlurView>
        )}

        {/* Таланты */}
        {summary.talents && summary.talents.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>Таланты и дары</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.talents.map((talent: string, idx: number) => (
                  <View key={idx} style={styles.traitItem}>
                    <View style={[styles.traitBullet, styles.talentBullet]} />
                    <Text style={styles.traitText}>{talent}</Text>
                  </View>
                ))}
              </View>
            </View>
          </BlurView>
        )}

        {/* Жизненные темы */}
        {summary.lifeThemes && summary.lifeThemes.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="book-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Жизненные темы</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.lifeThemes.map((theme: string, idx: number) => (
                  <View key={idx} style={styles.traitItem}>
                    <View style={styles.traitBullet} />
                    <Text style={styles.traitText}>{theme}</Text>
                  </View>
                ))}
              </View>
            </View>
          </BlurView>
        )}

        {/* Кармические уроки */}
        {summary.karmaLessons && summary.karmaLessons.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="school-outline" size={24} color="#FF6B35" />
                <Text style={styles.summaryTitle}>Кармические уроки</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.karmaLessons.map((lesson: string, idx: number) => (
                  <View key={idx} style={styles.traitItem}>
                    <View
                      style={[styles.traitBullet, styles.karmaLessonBullet]}
                    />
                    <Text style={styles.traitText}>{lesson}</Text>
                  </View>
                ))}
              </View>
            </View>
          </BlurView>
        )}

        {/* Отношения */}
        {summary.relationships && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="heart-outline" size={24} color="#FF6B6B" />
                <Text style={styles.summaryTitle}>Отношения</Text>
              </View>
              <Text style={styles.summaryText}>{summary.relationships}</Text>
            </View>
          </BlurView>
        )}

        {/* Карьера */}
        {summary.careerPath && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="briefcase-outline" size={24} color="#4ECDC4" />
                <Text style={styles.summaryTitle}>Карьерный путь</Text>
              </View>
              <Text style={styles.summaryText}>{summary.careerPath}</Text>
            </View>
          </BlurView>
        )}

        {/* Духовный путь */}
        {summary.spiritualPath && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="flame-outline" size={24} color="#9B59B6" />
                <Text style={styles.summaryTitle}>Духовный путь</Text>
              </View>
              <Text style={styles.summaryText}>{summary.spiritualPath}</Text>
            </View>
          </BlurView>
        )}

        {/* Здоровье */}
        {summary.healthFocus && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="fitness-outline" size={24} color="#4ECDC4" />
                <Text style={styles.summaryTitle}>Здоровье</Text>
              </View>
              <Text style={styles.summaryText}>{summary.healthFocus}</Text>
            </View>
          </BlurView>
        )}

        {/* Финансы */}
        {summary.financialApproach && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="cash-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>Финансовый подход</Text>
              </View>
              <Text style={styles.summaryText}>
                {summary.financialApproach}
              </Text>
            </View>
          </BlurView>
        )}

        {/* Доминирующие элементы */}
        {summary.dominantElements && summary.dominantElements.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="water-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Доминирующие элементы</Text>
              </View>
              <View style={styles.chipContainer}>
                {summary.dominantElements.map(
                  (element: string, idx: number) => (
                    <View key={idx} style={styles.elementChip}>
                      <Text style={styles.elementChipText}>{element}</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          </BlurView>
        )}

        {/* Доминирующие качества */}
        {summary.dominantQualities && summary.dominantQualities.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="settings-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Доминирующие качества</Text>
              </View>
              <View style={styles.chipContainer}>
                {summary.dominantQualities.map(
                  (quality: string, idx: number) => (
                    <View key={idx} style={styles.elementChip}>
                      <Text style={styles.elementChipText}>{quality}</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          </BlurView>
        )}

        {/* Рекомендации */}
        {summary.recommendations && summary.recommendations.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="bulb-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>Рекомендации</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.recommendations.map(
                  (recommendation: string, idx: number) => (
                    <View key={idx} style={styles.traitItem}>
                      <View
                        style={[
                          styles.traitBullet,
                          styles.recommendationBullet,
                        ]}
                      />
                      <Text style={styles.traitText}>{recommendation}</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          </BlurView>
        )}
      </View>
    );
  };

  return (
    <TabScreenLayout>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="rgba(191, 158, 207, 1)"
            colors={['rgba(191, 158, 207, 1)']}
          />
        }
      >
        {/* Заголовок */}
        <BlurView intensity={20} tint="dark" style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerIconContainer}>
            <Ionicons name="planet" size={60} color="#8B5CF6" />
          </View>
          <Text style={styles.headerTitle}>Натальная карта</Text>
          <Text style={styles.headerSubtitle}>
            Полный астрологический анализ
          </Text>
        </BlurView>

        {/* Вкладки */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? '#8B5CF6' : '#B0B0B0'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Контент вкладки */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'planets' && renderPlanets()}
        {activeTab === 'houses' && renderHouses()}
        {activeTab === 'aspects' && renderAspects()}
        {activeTab === 'summary' && renderSummary()}
      </ScrollView>
    </TabScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Заголовок
  header: {
    marginHorizontal: 8,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    zIndex: 10,
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },

  // Вкладки
  tabsContainer: {
    marginBottom: 20,
  },
  tabsContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  activeTab: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '500',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // Контент
  content: {
    paddingHorizontal: 8,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardInner: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },

  // Большая тройка
  bigThreeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bigThreeItem: {
    alignItems: 'center',
  },
  bigThreeSymbol: {
    fontSize: 40,
    color: '#8B5CF6',
    marginBottom: 8,
  },
  bigThreeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  bigThreeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bigThreeDegree: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Статистика
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemFull: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  statValueLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // Углы карты
  angleItem: {
    marginVertical: 8,
  },
  angleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  angleSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
    marginRight: 12,
    width: 50,
  },
  angleLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  angleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 62,
  },

  // Планеты
  planetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planetSymbol: {
    fontSize: 32,
    color: '#8B5CF6',
    marginRight: 12,
  },
  planetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planetSign: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  retrogradeBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  retrogradeBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  planetDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Дома
  houseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  houseNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8B5CF6',
    marginRight: 16,
    width: 50,
    textAlign: 'center',
  },
  houseInfo: {
    flex: 1,
  },
  houseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  houseSign: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  houseTheme: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  housePlanets: {
    marginTop: 8,
  },
  housePlanetsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  planetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  planetChipSymbol: {
    fontSize: 14,
    color: '#8B5CF6',
    marginRight: 6,
  },
  planetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // Аспекты
  aspectStats: {
    gap: 12,
  },
  aspectStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aspectStatSymbol: {
    fontSize: 24,
    fontWeight: '700',
    width: 30,
    textAlign: 'center',
  },
  aspectStatLabel: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  aspectStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  aspectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aspectPlanets: {
    alignItems: 'center',
    flex: 1,
  },
  aspectPlanetSymbol: {
    fontSize: 28,
    color: '#8B5CF6',
    marginBottom: 4,
  },
  aspectPlanetName: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  aspectSymbolContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectSymbolLarge: {
    fontSize: 28,
    fontWeight: '700',
  },
  aspectName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  aspectDetails: {
    gap: 8,
  },

  // Интерпретация
  interpretationSection: {
    marginTop: 8,
  },
  interpretationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },

  // Разделитель
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },

  // Резюме
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  summaryText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  summarySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 20,
  },
  traitsList: {
    gap: 8,
  },
  traitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  traitBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    marginTop: 8,
    marginRight: 12,
  },
  talentBullet: {
    backgroundColor: '#FFD700',
  },
  karmaLessonBullet: {
    backgroundColor: '#FF6B35',
  },
  recommendationBullet: {
    backgroundColor: '#FFD700',
  },
  traitText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  elementChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  elementChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});

export default NatalChartScreen;
