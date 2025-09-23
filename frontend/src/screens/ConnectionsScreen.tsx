import React, { useState, useEffect, useCallback } from 'react';
// Force cache refresh
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  FadeIn,
  SlideInUp,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import AnimatedStars from '../components/AnimatedStars';
import CosmicBackground from '../components/CosmicBackground';
import ZodiacWheel from '../components/ZodiacWheel';
import ConnectionCard from '../components/ConnectionCard';
import CosmicSnapshot from '../components/CosmicSnapshot';
import AddConnectionModal from '../components/AddConnectionModal';
import ShimmerLoader from '../components/ShimmerLoader';
import { connectionsAPI, getStoredToken } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function ConnectionsScreen() {
  const [connections, setConnections] = useState<{id: string|number, name: string, zodiacSign: string, compatibility: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);

  // Анимации для карточек
  const cardAnimations = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    fetchConnections();
    
    // Анимация появления карточек
    cardAnimations.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
    
    // Анимация свечения
    glow.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = getStoredToken();
      if (!token) {
        console.log('❌ Пользователь не авторизован, отображаем сообщение');
        setLoading(false);
        setRefreshing(false);
        return;
        // Моковые данные для неавторизованных пользователей
        const mockConnections = [
          { id: 1, name: 'Анна', zodiacSign: 'Leo', compatibility: 85 },
          { id: 2, name: 'Михаил', zodiacSign: 'Scorpio', compatibility: 72 },
          { id: 3, name: 'Елена', zodiacSign: 'Gemini', compatibility: 68 },
          { id: 4, name: 'Дмитрий', zodiacSign: 'Capricorn', compatibility: 91 },
        ];
        setConnections(mockConnections);
        return;
      }

      // Для авторизованных пользователей - реальные API вызовы
      try {
        const connectionsData = await connectionsAPI.getConnections();
        
        // Преобразуем данные в нужный формат
        const formattedConnections = connectionsData.map(conn => ({
          id: conn.id,
          name: conn.targetName,
          zodiacSign: conn.targetData?.zodiacSign || 'Unknown',
          compatibility: Math.floor(Math.random() * 40) + 60, // Временно рандомная совместимость
        }));
        
        setConnections(formattedConnections);
      } catch (error) {
        console.error('Error loading real connections data:', error);
        // В случае ошибки показываем моковые данные
        const mockConnections = [
          { id: 1, name: 'Анна', zodiacSign: 'Leo', compatibility: 85 },
          { id: 2, name: 'Михаил', zodiacSign: 'Scorpio', compatibility: 72 },
        ];
        setConnections(mockConnections);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConnections();
  }, [fetchConnections]);

  const handleAddConnection = (connectionData: any) => {
    const newConnection = {
      id: connections.length + 1,
      name: connectionData.name,
      zodiacSign: 'Aries', // Здесь будет расчёт знака зодиака
      compatibility: Math.floor(Math.random() * 40) + 60, // Случайная совместимость
    };
    setConnections(prev => [newConnection, ...prev]);
  };

  const handleConnectionPress = (connection: any) => {
    setSelectedConnection(connection);
  };

  const handleCloseSnapshot = () => {
    setSelectedConnection(null);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.container}
      >
        <AnimatedStars />
        <CosmicBackground />
        <ZodiacWheel />
        
        <View style={styles.loaderContainer}>
          <ShimmerLoader width={width * 0.8} height={30} borderRadius={15} />
          <View style={{ height: 20 }} />
          <ShimmerLoader width={width * 0.6} height={20} borderRadius={10} />
          <View style={{ height: 40 }} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ marginBottom: 15 }}>
              <ShimmerLoader width={width * 0.9} height={100} borderRadius={15} />
            </View>
          ))}
        </View>
      </LinearGradient>
    );
  }

  // Проверка авторизации
  const token = getStoredToken();
  if (!token) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.container}
      >
        <AnimatedStars />
        <CosmicBackground />
        <ZodiacWheel />
        
        <View style={styles.authRequiredContainer}>
          <Text style={styles.authRequiredTitle}>Требуется авторизация</Text>
          <Text style={styles.authRequiredSubtitle}>
            Войдите в аккаунт, чтобы управлять своими связями
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <AnimatedStars />
      <CosmicBackground />
      <ZodiacWheel />
      
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
          <Text style={styles.title}>Связи</Text>
          <Text style={styles.subtitle}>Ваши астрологические связи</Text>
        </Animated.View>

        {/* Add Button */}
        <Animated.View entering={SlideInUp.delay(400)} style={styles.addButtonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6', '#1E40AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Добавить связь</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Connections List */}
        <View style={styles.connectionsList}>
          {connections.map((connection, index) => (
            <ConnectionCard
              key={connection.id}
              name={connection.name}
              zodiacSign={connection.zodiacSign}
              compatibility={connection.compatibility}
              onPress={() => handleConnectionPress(connection)}
              animationValue={cardAnimations}
            />
          ))}
        </View>

        {/* Empty State */}
        {connections.length === 0 && (
          <Animated.View entering={FadeIn.delay(600)} style={styles.emptyState}>
            <Ionicons name="people-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyTitle}>Нет связей</Text>
            <Text style={styles.emptySubtitle}>
              Добавьте первую астрологическую связь для анализа совместимости
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Modals */}
      {showAddModal && (
        <AddConnectionModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddConnection}
        />
      )}

      {selectedConnection && (
        <CosmicSnapshot
          connection={selectedConnection}
          onClose={handleCloseSnapshot}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 22,
  },
  addButtonContainer: {
    marginBottom: 30,
  },
  addButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  connectionsList: {
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  authRequiredTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  authRequiredSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
