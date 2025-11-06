import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect, G, Defs, ClipPath } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Иконка телескопа
const TelescopeIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21C12 21 8 17 8 13C8 9 12 3 12 3C12 3 16 9 16 13C16 17 12 21 12 21Z"
      stroke="#8B5CF6"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Circle cx="12" cy="13" r="2" fill="#8B5CF6" />
  </Svg>
);

// Иконка галочки в круге
const CheckmarkIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Circle
      cx="10"
      cy="10"
      r="9"
      stroke="#4CAF50"
      strokeWidth="1.5"
      fill="none"
    />
    <Path
      d="M6 10L8.5 12.5L14 7"
      stroke="#4CAF50"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Иконка закрыть в круге
const CloseIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Circle
      cx="10"
      cy="10"
      r="9"
      stroke="#F44336"
      strokeWidth="1.5"
      fill="none"
    />
    <Path
      d="M7 7L13 13M13 7L7 13"
      stroke="#F44336"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

// Компонент звездного фона
const StarsBackground = () => (
  <Svg
    width="100%"
    height="100%"
    viewBox="0 0 430 1531"
    style={StyleSheet.absoluteFill}
    opacity={0.3}
  >
    <Circle cx="375" cy="270" r="2" fill="#D9D9D9" />
    <Circle cx="259" cy="253" r="2" fill="#D9D9D9" />
    <Circle cx="130" cy="76" r="2" fill="#D9D9D9" />
    <Circle cx="349" cy="51" r="2" fill="#D9D9D9" />
    <Circle cx="97" cy="22" r="2" fill="#D9D9D9" />
    <Circle cx="261" cy="126" r="2" fill="#D9D9D9" />
    <Circle cx="309" cy="375" r="2" fill="#D9D9D9" />
    <Circle cx="325" cy="385" r="2" fill="#D9D9D9" />
    <Circle cx="384" cy="394" r="2" fill="#D9D9D9" />
    <Circle cx="391" cy="468" r="2" fill="#D9D9D9" />
    <Circle cx="134" cy="401" r="2" fill="#D9D9D9" />
    <Circle cx="86" cy="430" r="2" fill="#D9D9D9" />
    <Circle cx="110" cy="298" r="2" fill="#D9D9D9" />
    <Circle cx="217" cy="315" r="2" fill="#D9D9D9" />
    <Circle cx="47" cy="572" r="2" fill="#D9D9D9" />
    <Circle cx="140" cy="564" r="2" fill="#D9D9D9" />
    <Circle cx="240" cy="526" r="2" fill="#D9D9D9" />
    <Circle cx="279" cy="564" r="2" fill="#D9D9D9" />
    <Circle cx="362" cy="598" r="2" fill="#D9D9D9" />
  </Svg>
);

// Компонент карточки прогноза
interface PredictionCardProps {
  title: string;
  content: string;
  icon: 'heart' | 'briefcase' | 'fitness' | 'cash' | 'sunny';
  color: string;
}

const PredictionCard: React.FC<PredictionCardProps> = ({
  title,
  content,
  icon,
  color,
}) => (
  <View style={styles.predictionCard}>
    <View style={[styles.predictionIconContainer, { backgroundColor: color }]}>
      <Ionicons name={icon} size={24} color="#FFFFFF" />
    </View>
    <View style={styles.predictionContent}>
      <Text style={styles.predictionTitle}>{title}</Text>
      <Text style={styles.predictionText}>{content}</Text>
    </View>
  </View>
);

// Компонент виджета гороскопа
interface HoroscopeWidgetProps {
  sign: string;
  period: 'day' | 'tomorrow' | 'week';
  predictions?: {
    general?: string;
    love?: string;
    career?: string;
    health?: string;
    finance?: string;
    energy?: number;
    mood?: string;
    luckyNumbers?: number[];
    luckyColors?: string[];
  };
}

const FigmaWidget: React.FC<HoroscopeWidgetProps> = ({
  sign = 'Овен',
  period = 'day',
  predictions,
}) => {
  const periodLabels = {
    day: 'Сегодня',
    tomorrow: 'Завтра',
    week: 'Неделя',
  };

  const energyLevel = predictions?.energy || 75;
  const energyColor =
    energyLevel >= 70 ? '#4CAF50' : energyLevel >= 40 ? '#FF9800' : '#F44336';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A0B2E', '#2D1B4E', '#1A0B2E']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <StarsBackground />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Заголовок */}
          <View style={styles.header}>
            <TelescopeIcon />
            <Text style={styles.headerTitle}>Астрологический прогноз</Text>
            <Text style={styles.headerSubtitle}>
              {sign} • {periodLabels[period]}
            </Text>
          </View>

          {/* Карточка энергии */}
          <View style={styles.energyCard}>
            <View style={styles.energyHeader}>
              <Text style={styles.energyLabel}>Энергия дня</Text>
              <Text style={[styles.energyValue, { color: energyColor }]}>
                {energyLevel}%
              </Text>
            </View>
            <View style={styles.energyBarContainer}>
              <View style={styles.energyBarBackground}>
                <View
                  style={[
                    styles.energyBarFill,
                    { width: `${energyLevel}%`, backgroundColor: energyColor },
                  ]}
                />
              </View>
            </View>
            {predictions?.mood && (
              <Text style={styles.moodText}>
                Настроение: {predictions.mood}
              </Text>
            )}
          </View>

          {/* Общий прогноз */}
          {predictions?.general && (
            <View style={styles.generalCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="bulb" size={24} color="#8B5CF6" />
                <Text style={styles.cardTitle}>Общий прогноз</Text>
              </View>
              <Text style={styles.generalText}>{predictions.general}</Text>
            </View>
          )}

          {/* Детальные прогнозы */}
          <View style={styles.predictionsSection}>
            {predictions?.love && (
              <PredictionCard
                title="Любовь"
                content={predictions.love}
                icon="heart"
                color="#E91E63"
              />
            )}

            {predictions?.career && (
              <PredictionCard
                title="Карьера"
                content={predictions.career}
                icon="briefcase"
                color="#2196F3"
              />
            )}

            {predictions?.health && (
              <PredictionCard
                title="Здоровье"
                content={predictions.health}
                icon="fitness"
                color="#4CAF50"
              />
            )}

            {predictions?.finance && (
              <PredictionCard
                title="Финансы"
                content={predictions.finance}
                icon="cash"
                color="#FF9800"
              />
            )}
          </View>

          {/* Счастливые числа и цвета */}
          {(predictions?.luckyNumbers?.length ||
            predictions?.luckyColors?.length) && (
            <View style={styles.luckySection}>
              {predictions?.luckyNumbers?.length > 0 && (
                <View style={styles.luckyCard}>
                  <Text style={styles.luckyTitle}>Счастливые числа</Text>
                  <View style={styles.luckyNumbersContainer}>
                    {predictions.luckyNumbers.map((num, index) => (
                      <View key={index} style={styles.luckyNumber}>
                        <Text style={styles.luckyNumberText}>{num}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {predictions?.luckyColors?.length > 0 && (
                <View style={styles.luckyCard}>
                  <Text style={styles.luckyTitle}>Счастливые цвета</Text>
                  <View style={styles.luckyColorsContainer}>
                    {predictions.luckyColors.map((color, index) => (
                      <View
                        key={index}
                        style={[styles.luckyColor, { backgroundColor: color }]}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Совет дня */}
          {predictions?.advice && (
            <View style={styles.adviceCard}>
              <View style={styles.adviceHeader}>
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={styles.adviceTitle}>Совет дня</Text>
              </View>
              <Text style={styles.adviceText}>{predictions.advice}</Text>
            </View>
          )}

          {/* Возможности и вызовы */}
          {(predictions?.opportunities?.length ||
            predictions?.challenges?.length) && (
            <View style={styles.listsSection}>
              {predictions?.opportunities?.length > 0 && (
                <View style={styles.listCard}>
                  <Text style={styles.listTitle}>Возможности</Text>
                  {predictions.opportunities.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                      <CheckmarkIcon />
                      <Text style={styles.listItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {predictions?.challenges?.length > 0 && (
                <View style={styles.listCard}>
                  <Text style={styles.listTitle}>Вызовы</Text>
                  {predictions.challenges.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                      <CloseIcon />
                      <Text style={styles.listItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A0B2E',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  energyCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  energyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  energyValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  energyBarContainer: {
    marginBottom: 8,
  },
  energyBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  energyBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  moodText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  generalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  generalText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  predictionsSection: {
    marginBottom: 16,
  },
  predictionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  predictionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  predictionContent: {
    flex: 1,
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  predictionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  luckySection: {
    marginBottom: 16,
  },
  luckyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  luckyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  luckyNumbersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  luckyNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  luckyNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  luckyColorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  luckyColor: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  adviceCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 8,
  },
  adviceText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  listsSection: {
    marginBottom: 16,
  },
  listCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listItemText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});

export default FigmaWidget;
