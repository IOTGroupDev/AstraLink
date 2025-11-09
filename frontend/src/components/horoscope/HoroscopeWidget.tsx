import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { chartAPI } from '../../services/api';

const { width } = Dimensions.get('window');

const svgIcons = {
  star: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#8B5CF6"/>
</svg>`,

  heart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20.84 4.61C20.3292 4.099 19.7228 3.69365 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69365 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99872 7.05 2.99872C5.59096 2.99872 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39469C21.7563 5.72728 21.351 5.12084 20.84 4.61Z" fill="#F75B93"/>
</svg>`,

  briefcase: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" fill="#207EDB"/>
<path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" fill="#207EDB"/>
</svg>`,

  accessibility: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="5" r="3" fill="#ED9C3A"/>
<path d="M9 10H15M12 10V20M10 13L8 20M14 13L16 20" stroke="#ED9C3A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  wallet: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z" fill="#07A482"/>
<path d="M1 10H23" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  checkmark: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="10" fill="none" stroke="#8B5CF6" stroke-width="2"/>
<path d="M8 12L11 15L16 9" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
};

interface HoroscopeWidgetProps {
  predictions: any;
  currentPlanets?: any;
  isLoading?: boolean;
}

type TabType = 'day' | 'tomorrow' | 'week';

interface Category {
  id: string;
  title: string;
  icon: keyof typeof svgIcons;
  dataKey: string;
}

const categories: Category[] = [
  { id: 'general', title: 'Общее', icon: 'star', dataKey: 'general' },
  { id: 'love', title: 'Любовь', icon: 'heart', dataKey: 'love' },
  { id: 'career', title: 'Карьера', icon: 'briefcase', dataKey: 'career' },
  { id: 'health', title: 'Здоровье', icon: 'accessibility', dataKey: 'health' },
  { id: 'finance', title: 'Финансы', icon: 'wallet', dataKey: 'finance' },
  { id: 'advice', title: 'Совет дня', icon: 'checkmark', dataKey: 'advice' },
];

const tabs = [
  { id: 'day' as TabType, label: 'Сегодня' },
  { id: 'tomorrow' as TabType, label: 'Завтра' },
  { id: 'week' as TabType, label: 'Эта неделя' },
];

const HoroscopeWidget: React.FC<HoroscopeWidgetProps> = ({
  predictions: initialPredictions,
  isLoading: initialLoading,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('day');
  const [allHoroscopes, setAllHoroscopes] = useState<any>(null);
  const [loading, setLoading] = useState(initialLoading || false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedContent, setSelectedContent] = useState('');

  useEffect(() => {
    if (initialPredictions) {
      const normalized = {
        day: initialPredictions.day || initialPredictions.today,
        tomorrow: initialPredictions.tomorrow,
        week: initialPredictions.week,
      };
      setAllHoroscopes(normalized);
    } else {
      loadAllHoroscopes();
    }
  }, [initialPredictions]);

  const loadAllHoroscopes = async () => {
    try {
      setLoading(true);
      const [dayResponse, tomorrowResponse, weekResponse] = await Promise.all([
        chartAPI.getHoroscope('day'),
        chartAPI.getHoroscope('tomorrow'),
        chartAPI.getHoroscope('week'),
      ]);

      const extractPredictions = (response: any) => {
        if (response.predictions && typeof response.predictions === 'object') {
          return response.predictions;
        }
        return response;
      };

      setAllHoroscopes({
        day: extractPredictions(dayResponse),
        tomorrow: extractPredictions(tomorrowResponse),
        week: extractPredictions(weekResponse),
      });
    } catch (error) {
      console.error('Ошибка загрузки гороскопов:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentHoroscope = allHoroscopes?.[activeTab];

  const getCategoryContent = (dataKey: string) => {
    if (!currentHoroscope) return '';
    return currentHoroscope[dataKey] || '';
  };

  const truncateText = (text: string, lines: number = 3) => {
    if (!text) return '';
    const words = text.split(' ');
    const maxChars = lines * 40;
    let result = '';
    for (const word of words) {
      if ((result + word).length > maxChars) {
        return result.trim() + '...';
      }
      result += word + ' ';
    }
    return result.trim();
  };

  const handleCategoryPress = (category: Category) => {
    const content = getCategoryContent(category.dataKey);
    if (content) {
      setSelectedCategory(category);
      setSelectedContent(content);
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => {
      setSelectedCategory(null);
      setSelectedContent('');
    }, 300);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
          style={styles.loadingCard}
        >
          <Text style={styles.loadingText}>Загрузка гороскопа...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(35, 0, 45, 0.4)', 'rgba(56, 8, 72, 0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <Text style={styles.title}>✨ Гороскоп</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.contentContainer}>
          {categories.map((category) => {
            const content = getCategoryContent(category.dataKey);
            if (!content) return null;

            return (
              <Pressable
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
              >
                <View style={styles.categoryHeader}>
                  <SvgXml
                    xml={svgIcons[category.icon]}
                    width={24}
                    height={24}
                  />
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                </View>

                <Text style={styles.categoryContent} numberOfLines={4}>
                  {truncateText(content, 3)}
                </Text>
              </Pressable>
            );
          })}

          {currentHoroscope?.luckyNumbers &&
            currentHoroscope.luckyNumbers.length > 0 && (
              <View style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>Счастливые числа</Text>
                </View>

                <View style={styles.luckyNumbersContainer}>
                  {currentHoroscope.luckyNumbers.map(
                    (num: number, idx: number) => (
                      <View key={idx} style={styles.luckyNumber}>
                        <Text style={styles.luckyNumberText}>{num}</Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}

          {currentHoroscope?.luckyColors &&
            currentHoroscope.luckyColors.length > 0 && (
              <View style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>Счастливые цвета</Text>
                </View>

                <View style={styles.luckyColorsContainer}>
                  {currentHoroscope.luckyColors.map(
                    (color: string, idx: number) => (
                      <View
                        key={idx}
                        style={[
                          styles.luckyColorCircle,
                          { backgroundColor: color.toLowerCase() },
                        ]}
                      />
                    )
                  )}
                </View>
              </View>
            )}

          <TouchableOpacity style={styles.aiButton}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiButtonGradient}
            >
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.aiButtonText}>Получить AI прогноз</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <LinearGradient
              colors={['rgba(35, 0, 45, 0.98)', 'rgba(56, 8, 72, 0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                {selectedCategory && (
                  <View style={styles.modalTitleContainer}>
                    <SvgXml
                      xml={svgIcons[selectedCategory.icon]}
                      width={28}
                      height={28}
                    />
                    <Text style={styles.modalTitle}>
                      {selectedCategory.title}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={closeModal}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalText}>{selectedContent}</Text>
              </ScrollView>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(237, 164, 255, 0.1)',
    overflow: 'hidden',
  },
  loadingCard: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    marginBottom: 20,
  },
  tabsContent: {
    gap: 10,
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 59,
    backgroundColor: 'rgba(243, 200, 255, 1)',
  },
  tabActive: {
    backgroundColor: '#8D26A9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8D26A9',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contentContainer: {
    gap: 10,
  },
  categoryCard: {
    backgroundColor: 'rgba(10, 10, 10, 0.35)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(237, 164, 255, 0.2)',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  categoryContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  luckyNumbersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  luckyNumber: {
    width: 36,
    height: 36,
    borderRadius: 36,
    backgroundColor: 'rgba(243, 200, 255, 1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  luckyNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8D26A9',
  },
  luckyColorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  luckyColorCircle: {
    width: 36,
    height: 36,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  aiButton: {
    marginTop: 10,
  },
  aiButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(237, 164, 255, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(237, 164, 255, 0.2)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 500,
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    fontWeight: '400',
  },
});

export default HoroscopeWidget;
