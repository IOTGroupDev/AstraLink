import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Easing,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface CosmicSnapshotProps {
  connection: {
    name: string;
    zodiacSign: string;
    compatibility: number;
  };
  onClose: () => void;
}

const CosmicSnapshot: React.FC<CosmicSnapshotProps> = ({
  connection,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'strengths' | 'growth' | 'composite'
  >('strengths');
  const [aspects, setAspects] = useState([
    { name: 'Солнце в трине к Венере', strength: 85, type: 'harmony' },
    { name: 'Луна в квадрате к Марсу', strength: 45, type: 'challenge' },
    {
      name: 'Меркурий в соединении с Меркурием',
      strength: 90,
      type: 'connection',
    },
  ]);

  const orb1Scale = useSharedValue(0);
  const orb2Scale = useSharedValue(0);
  const connectionLine = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    orb1Scale.value = withDelay(
      200,
      withSpring(1, { damping: 8, stiffness: 100 })
    );
    orb2Scale.value = withDelay(
      400,
      withSpring(1, { damping: 8, stiffness: 100 })
    );
    connectionLine.value = withDelay(
      600,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) })
    );

    glow.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb1Scale.value }],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb2Scale.value }],
  }));

  const connectionLineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(connectionLine.value, [0, 1], [0, 1]),
    strokeDashoffset: interpolate(connectionLine.value, [0, 1], [100, 0]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.3, 0.6]),
  }));

  const getAspectColor = (type: string) => {
    switch (type) {
      case 'harmony':
        return '#10B981';
      case 'challenge':
        return '#EF4444';
      case 'connection':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getAspectIcon = (type: string) => {
    switch (type) {
      case 'harmony':
        return 'heart';
      case 'challenge':
        return 'flash';
      case 'connection':
        return 'link';
      default:
        return 'star';
    }
  };

  const categories = [
    { name: 'Страсть', value: 75, color: '#EF4444' },
    { name: 'Эмоциональная безопасность', value: 60, color: '#3B82F6' },
    { name: 'Интеллект', value: 85, color: '#10B981' },
    { name: 'Долгосрочный потенциал', value: 70, color: '#F59E0B' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.background}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Космический снимок</Text>
          <Text style={styles.subtitle}>{connection.name}</Text>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* 3D Orbs */}
          <Animated.View
            entering={SlideInUp.delay(400)}
            style={styles.orbsContainer}
          >
            <Svg width={width * 0.9} height={200} style={styles.orbsSvg}>
              <Defs>
                <SvgGradient
                  id="orb1Gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.7" />
                </SvgGradient>
                <SvgGradient
                  id="orb2Gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#EF4444" stopOpacity="0.7" />
                </SvgGradient>
              </Defs>

              {/* Connection line */}
              <Animated.Path
                d={`M ${width * 0.2} 100 Q ${width * 0.45} 50 ${width * 0.7} 100`}
                stroke="url(#orb1Gradient)"
                strokeWidth="3"
                fill="none"
                strokeDasharray="10,5"
                style={connectionLineStyle}
              />

              {/* Orb 1 */}
              <Animated.Circle
                cx={width * 0.2}
                cy={100}
                r="30"
                fill="url(#orb1Gradient)"
                style={orb1Style}
              />
              <Text
                x={width * 0.2}
                y={110}
                fontSize="16"
                fill="#fff"
                textAnchor="middle"
                fontWeight="bold"
              >
                Вы
              </Text>

              {/* Orb 2 */}
              <Animated.Circle
                cx={width * 0.7}
                cy={100}
                r="30"
                fill="url(#orb2Gradient)"
                style={orb2Style}
              />
              <Text
                x={width * 0.7}
                y={110}
                fontSize="16"
                fill="#fff"
                textAnchor="middle"
                fontWeight="bold"
              >
                {connection.name}
              </Text>
            </Svg>
          </Animated.View>

          {/* Categories */}
          <Animated.View
            entering={SlideInUp.delay(600)}
            style={styles.categoriesContainer}
          >
            <Text style={styles.sectionTitle}>Анализ совместимости</Text>
            {categories.map((category, index) => (
              <View key={category.name} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <View style={styles.categoryBar}>
                  <View
                    style={[
                      styles.categoryFill,
                      {
                        width: `${category.value}%`,
                        backgroundColor: category.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.categoryValue}>{category.value}%</Text>
              </View>
            ))}
          </Animated.View>

          {/* Tabs */}
          <Animated.View
            entering={SlideInUp.delay(800)}
            style={styles.tabsContainer}
          >
            <View style={styles.tabs}>
              {[
                { key: 'strengths', label: 'Сильные стороны', icon: 'star' },
                { key: 'growth', label: 'Зоны роста', icon: 'trending-up' },
                { key: 'composite', label: 'Композит', icon: 'layers' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    activeTab === tab.key && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab(tab.key as any)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={activeTab === tab.key ? '#8B5CF6' : '#fff'}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.key && styles.activeTabText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'strengths' && (
                <View>
                  <Text style={styles.tabTitle}>Гармоничные аспекты</Text>
                  {aspects
                    .filter((a) => a.type === 'harmony')
                    .map((aspect, index) => (
                      <View key={index} style={styles.aspectItem}>
                        <Ionicons name="heart" size={20} color="#10B981" />
                        <View style={styles.aspectInfo}>
                          <Text style={styles.aspectName}>{aspect.name}</Text>
                          <Text style={styles.aspectDescription}>
                            Этот аспект создаёт естественную гармонию между вами
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}

              {activeTab === 'growth' && (
                <View>
                  <Text style={styles.tabTitle}>Зоны для развития</Text>
                  {aspects
                    .filter((a) => a.type === 'challenge')
                    .map((aspect, index) => (
                      <View key={index} style={styles.aspectItem}>
                        <Ionicons name="flash" size={20} color="#EF4444" />
                        <View style={styles.aspectInfo}>
                          <Text style={styles.aspectName}>{aspect.name}</Text>
                          <Text style={styles.aspectDescription}>
                            Этот аспект предлагает возможности для роста и
                            понимания
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}

              {activeTab === 'composite' && (
                <View>
                  <Text style={styles.tabTitle}>Композитная карта</Text>
                  <View style={styles.compositeChart}>
                    <Svg width={200} height={200} style={styles.compositeSvg}>
                      <Defs>
                        <SvgGradient
                          id="compositeGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <Stop
                            offset="0%"
                            stopColor="#8B5CF6"
                            stopOpacity="1"
                          />
                          <Stop
                            offset="50%"
                            stopColor="#3B82F6"
                            stopOpacity="0.8"
                          />
                          <Stop
                            offset="100%"
                            stopColor="#1E40AF"
                            stopOpacity="0.6"
                          />
                        </SvgGradient>
                      </Defs>
                      <Circle
                        cx="100"
                        cy="100"
                        r="80"
                        stroke="url(#compositeGradient)"
                        strokeWidth="3"
                        fill="none"
                      />
                      <Circle
                        cx="100"
                        cy="100"
                        r="60"
                        stroke="url(#compositeGradient)"
                        strokeWidth="2"
                        fill="none"
                      />
                      <Circle
                        cx="100"
                        cy="100"
                        r="40"
                        stroke="url(#compositeGradient)"
                        strokeWidth="1"
                        fill="none"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.compositeDescription}>
                    Ваша композитная карта показывает общую энергию отношений и
                    потенциал для совместного роста.
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 10,
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  orbsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  orbsSvg: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  categoriesContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryName: {
    fontSize: 14,
    color: '#fff',
    width: 120,
    marginRight: 10,
  },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  categoryFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  tabsContainer: {
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  tabText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 5,
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  tabContent: {
    minHeight: 200,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  aspectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  aspectInfo: {
    flex: 1,
    marginLeft: 10,
  },
  aspectName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  aspectDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    lineHeight: 20,
  },
  compositeChart: {
    alignItems: 'center',
    marginBottom: 20,
  },
  compositeSvg: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  compositeDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default CosmicSnapshot;
