import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { chartAPI } from '../services/api/chart.client';
import CosmicBackground from '../components/CosmicBackground';
import LoadingLogo from '../components/LoadingLogo';
import NatalChartWidget from '../components/NatalChartWidget';
import Card from '../components/ui/Card';
import PlanetIcon from '../components/PlanetIcon';
import { colors } from '../theme/tokens';
import PlanetCard from '../components/PlanetCard';

interface NatalChartScreenProps {
  navigation: any;
}

const getPlanetColors = (planet: string): string[] => {
  const colors: { [key: string]: string[] } = {
    Солнце: ['#FFD700', '#FFA500', '#FF8C00'],
    Луна: ['#E6E6FA', '#B0C4DE', '#778899'],
    Меркурий: ['#C0C0C0', '#A9A9A9', '#808080'],
    Венера: ['#FFB6C1', '#FF69B4', '#FF1493'],
    Марс: ['#FF6347', '#FF4500', '#DC143C'],
    Юпитер: ['#DDA0DD', '#BA55D3', '#9932CC'],
    Сатурн: ['#708090', '#2F4F4F', '#000000'],
    Уран: ['#00FFFF', '#00CED1', '#20B2AA'],
    Нептун: ['#4169E1', '#0000FF', '#000080'],
    Плутон: ['#8B0000', '#B22222', '#FF0000'],
    Асцендент: ['#8B5CF6', '#7C3AED', '#5B21B6'],
  };
  return colors[planet] || ['#8B5CF6', '#7C3AED', '#5B21B6'];
};

const getPlanetImage = (planet: string): string => {
  // Fixed planet photos (Wikimedia/NASA) to avoid random non-planet images
  const images: { [key: string]: string } = {
    Солнце:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Visible_Sun_-_November_16%2C_2012.jpg/640px-Visible_Sun_-_November_16%2C_2012.jpg',
    Луна: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/640px-FullMoon2010.jpg',
    Меркурий:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercury_in_true_color.jpg/640px-Mercury_in_true_color.jpg',
    Венера:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/640px-Venus-real_color.jpg',
    Марс: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/640px-OSIRIS_Mars_true_color.jpg',
    Юпитер:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Jupiter_by_Cassini-Huygens.jpg/640px-Jupiter_by_Cassini-Huygens.jpg',
    Сатурн:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/640px-Saturn_during_Equinox.jpg',
    Уран: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/640px-Uranus2.jpg',
    Нептун:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neptune_Full.jpg/640px-Neptune_Full.jpg',
    Плутон:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Nh-pluto-in-true-color_2x_JPEG-edit-frame.jpg/640px-Nh-pluto-in-true-color_2x_JPEG-edit-frame.jpg',
    Асцендент:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/ESO_-_Milky_Way.jpg/640px-ESO_-_Milky_Way.jpg',
  };
  return (
    images[planet] ||
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Visible_Sun_-_November_16%2C_2012.jpg/640px-Visible_Sun_-_November_16%2C_2012.jpg'
  );
};

const NatalChartScreen: React.FC<NatalChartScreenProps> = ({ navigation }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    loadChartData();
    fadeAnim.value = withTiming(1, { duration: 800 });
  }, []);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const data = await chartAPI.getNatalChartWithInterpretation();
      setChartData(data);
    } catch (error: any) {
      console.error('Error loading natal chart:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить натальную карту');
    } finally {
      setLoading(false);
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      {
        translateY: withTiming(fadeAnim.value * 0, { duration: 800 }),
      },
    ],
  }));

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <LoadingLogo />
      </View>
    );
  }

  if (!chartData) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Натальная карта не найдена</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadChartData}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { data } = chartData;
  const interpretation = data?.interpretation;

  // Map localized planet names to PlanetIcon keys
  const planetKeyFromName = (n: string) => {
    const map: Record<string, string> = {
      Солнце: 'sun',
      Луна: 'moon',
      Меркурий: 'mercury',
      Венера: 'venus',
      Марс: 'mars',
      Юпитер: 'jupiter',
      Сатурн: 'saturn',
      Уран: 'uranus',
      Нептун: 'neptune',
      Плутон: 'pluto',
    };
    return map[n] || n;
  };

  if (!interpretation) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Интерпретация недоступна</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, animatedContainerStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Натальная карта</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Natal Chart Widget */}
          <View style={styles.chartSection}>
            <NatalChartWidget chart={chartData} />
          </View>

          {/* Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Общий обзор</Text>
            <LinearGradient
              colors={['#8B5CF6', '#06B6D4', '#10B981']}
              style={styles.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name="planet"
                size={40}
                color="rgba(255, 255, 255, 0.2)"
                style={styles.planetIcon}
              />
              <View style={styles.cardContent}>
                <Text style={styles.overviewText}>
                  {interpretation.overview}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Sun Sign */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Солнце</Text>
            <PlanetCard
              title={`${interpretation.sunSign.planet} в ${interpretation.sunSign.sign}`}
              imageUri={getPlanetImage('Солнце')}
              interpretation={interpretation.sunSign.interpretation}
              strengths={interpretation.sunSign.strengths}
              challenges={interpretation.sunSign.challenges}
              planetKey={planetKeyFromName(interpretation.sunSign.planet)}
            />
            <View style={styles.keywordsContainer}>
              <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
              <Text style={styles.keywordsText}>
                {interpretation.sunSign.keywords.join(', ')}
              </Text>
            </View>
          </View>

          {/* Moon Sign */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Луна</Text>
            <PlanetCard
              title={`${interpretation.moonSign.planet} в ${interpretation.moonSign.sign}`}
              imageUri={getPlanetImage('Луна')}
              interpretation={interpretation.moonSign.interpretation}
              strengths={interpretation.moonSign.strengths}
              challenges={interpretation.moonSign.challenges}
              planetKey={planetKeyFromName(interpretation.moonSign.planet)}
            />
            <View style={styles.keywordsContainer}>
              <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
              <Text style={styles.keywordsText}>
                {interpretation.moonSign.keywords.join(', ')}
              </Text>
            </View>
          </View>

          {/* Ascendant */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Асцендент</Text>
            <PlanetCard
              title={`${interpretation.ascendant.planet} в ${interpretation.ascendant.sign}`}
              imageUri={getPlanetImage('Асцендент')}
              interpretation={interpretation.ascendant.interpretation}
              strengths={interpretation.ascendant.strengths}
              challenges={interpretation.ascendant.challenges}
            />
            <View style={styles.keywordsContainer}>
              <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
              <Text style={styles.keywordsText}>
                {interpretation.ascendant.keywords.join(', ')}
              </Text>
            </View>
          </View>

          {/* Planets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Планеты</Text>
            {interpretation.planets.map((p: any, index: number) => (
              <PlanetCard
                key={index}
                title={`${p.planet} в ${p.sign}`}
                imageUri={getPlanetImage(p.planet)}
                interpretation={p.interpretation}
                strengths={p.strengths}
                challenges={p.challenges}
                planetKey={planetKeyFromName(p.planet)}
                house={p.house}
              />
            ))}
          </View>

          {/* Aspects */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Аспекты</Text>
            {interpretation.aspects.map((aspect: any, index: number) => (
              <LinearGradient
                key={index}
                colors={['#FF6B35', '#FF4500', '#DC143C']}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name="planet"
                  size={30}
                  color="rgba(255, 255, 255, 0.2)"
                  style={styles.planetIcon}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.aspectTitle}>{aspect.aspect}</Text>
                  <Text style={styles.aspectText}>{aspect.interpretation}</Text>
                  <Text style={styles.significanceText}>
                    {aspect.significance}
                  </Text>
                </View>
              </LinearGradient>
            ))}
          </View>

          {/* Houses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Дома</Text>
            {interpretation.houses.map((house: any, index: number) => (
              <LinearGradient
                key={index}
                colors={['#32CD32', '#228B22', '#006400']}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name="home"
                  size={30}
                  color="rgba(255, 255, 255, 0.2)"
                  style={styles.planetIcon}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.houseTitle}>
                    {house.house} дом в {house.sign}
                  </Text>
                  <Text style={styles.houseArea}>{house.lifeArea}</Text>
                  <Text style={styles.houseText}>{house.interpretation}</Text>
                </View>
              </LinearGradient>
            ))}
          </View>

          {/* Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Резюме</Text>
            <LinearGradient
              colors={['#FFD700', '#FF69B4', '#8B5CF6']}
              style={styles.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name="star"
                size={30}
                color="rgba(255, 255, 255, 0.2)"
                style={styles.planetIcon}
              />
              <View style={styles.cardContent}>
                <Text style={styles.summaryTitle}>Черты личности:</Text>
                <Text style={styles.summaryText}>
                  {interpretation.summary.personalityTraits.join(', ')}
                </Text>

                <Text style={styles.summaryTitle}>Жизненные темы:</Text>
                <Text style={styles.summaryText}>
                  {interpretation.summary.lifeThemes.join(', ')}
                </Text>

                <Text style={styles.summaryTitle}>Кармические уроки:</Text>
                <Text style={styles.summaryText}>
                  {interpretation.summary.karmaLessons.join(', ')}
                </Text>

                <Text style={styles.summaryTitle}>Таланты:</Text>
                <Text style={styles.summaryText}>
                  {interpretation.summary.talents.join(', ')}
                </Text>

                <Text style={styles.summaryTitle}>Рекомендации:</Text>
                {interpretation.summary.recommendations.map(
                  (rec: string, index: number) => (
                    <Text key={index} style={styles.recommendationText}>
                      • {rec}
                    </Text>
                  )
                )}
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  placeholder: {
    width: 44,
  },
  chartSection: {
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 12,
    padding: 8,
  },
  planetIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.3,
  },
  cardImage: {
    borderRadius: 16,
  },
  overlay: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  planetPhoto: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    width: '38%',
    opacity: 0.25,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  overviewText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  planetTitle: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  planetText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  keywordsContainer: {
    marginBottom: 10,
  },
  keywordsTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  keywordsText: {
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 20,
  },
  aspectTitle: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aspectText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  significanceText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontStyle: 'italic',
  },
  houseTitle: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  houseArea: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  houseText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
  },
  summaryTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  summaryText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
  },
  recommendationText: {
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  planetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  houseBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipDanger: {
    backgroundColor: 'rgba(255, 107, 107, 0.10)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
});

export default NatalChartScreen;
