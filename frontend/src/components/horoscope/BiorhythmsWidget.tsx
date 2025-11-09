import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Path,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';

interface BiorhythmsWidgetProps {
  physical: number; // 0-100
  emotional: number; // 0-100
  intellectual: number; // 0-100
}

interface CircularProgressProps {
  value: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor: string;
  glowColor: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size,
  strokeWidth,
  color,
  backgroundColor,
  glowColor,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Прогресс от -90 градусов (верх) по часовой стрелке
  const progress = (value / 100) * circumference;
  const startAngle = -90; // Начинаем сверху
  const angle = (value / 100) * 360;

  // Вычисляем путь для заполненной дуги
  const startX = center + radius * Math.cos((startAngle * Math.PI) / 180);
  const startY = center + radius * Math.sin((startAngle * Math.PI) / 180);

  const endAngle = startAngle + angle;
  const endX = center + radius * Math.cos((endAngle * Math.PI) / 180);
  const endY = center + radius * Math.sin((endAngle * Math.PI) / 180);

  const largeArcFlag = angle > 180 ? 1 : 0;

  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Defs>
        <RadialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
          <Stop offset="11.0577%" stopColor={glowColor} stopOpacity="0" />
          <Stop offset="100%" stopColor={glowColor} stopOpacity="1" />
        </RadialGradient>
      </Defs>

      {/* Светящийся фон (blur effect) */}
      <Circle
        cx={center}
        cy={center}
        r={radius + 18}
        fill="url(#glowGradient)"
        opacity={0.3}
      />

      {/* Фоновый круг */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeOpacity={0.7}
        strokeLinecap="round"
      />

      {/* Прогресс */}
      {value > 0 && (
        <Path
          d={`
            M ${startX} ${startY}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
          `}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
};

interface BiorhythmItemProps {
  title: string;
  description: string;
  value: number;
  color: string;
  backgroundColor: string;
  glowColor: string;
}

const BiorhythmItem: React.FC<BiorhythmItemProps> = ({
  title,
  description,
  value,
  color,
  backgroundColor,
  glowColor,
}) => {
  return (
    <View style={styles.itemContainer}>
      {/* Круговая диаграмма */}
      <View style={styles.circleContainer}>
        <CircularProgress
          value={value}
          size={72}
          strokeWidth={9.216}
          color={color}
          backgroundColor={backgroundColor}
          glowColor={glowColor}
        />
        {/* Процент в центре */}
        <View style={styles.percentContainer}>
          <Text style={styles.percentText}>{Math.round(value)}%</Text>
        </View>
      </View>

      {/* Текстовая информация */}
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.descriptionText}>{description}</Text>
      </View>
    </View>
  );
};

const BiorhythmsWidget: React.FC<BiorhythmsWidgetProps> = ({
  physical,
  emotional,
  intellectual,
}) => {
  return (
    <LinearGradient
      colors={['rgba(35, 0, 45, 0.4)', 'rgba(89, 2, 114, 0.4)']}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      style={styles.container}
    >
      {/* Обводка с градиентом */}
      <LinearGradient
        colors={['rgba(237, 164, 255, 0.1)', 'rgba(241, 197, 255, 0.1)']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={styles.borderGradient}
      />

      {/* Контент */}
      <View style={styles.content}>
        {/* Заголовок */}
        <Text style={styles.headerText}>⏳️ Биоритмы</Text>

        {/* Список биоритмов */}
        <View style={styles.listContainer}>
          <BiorhythmItem
            title="Физический"
            description="Сегодня отличный день для новых начинаний! Ваша энергия на пике!"
            value={physical}
            color="#E33931"
            backgroundColor="#FFC8C9"
            glowColor="#FF8B8D"
          />

          <BiorhythmItem
            title="Эмоциональный"
            description="Сегодня отличный день для новых начинаний! Ваша энергия на пике!"
            value={emotional}
            color="#0E9B45"
            backgroundColor="#C9FFD5"
            glowColor="#72FF9A"
          />

          <BiorhythmItem
            title="Интеллектуальный"
            description="Сегодня отличный день для новых начинаний! Ваша энергия на пике!"
            value={intellectual}
            color="#12A6DF"
            backgroundColor="#C8E0FF"
            glowColor="#6AC4FF"
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  borderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    gap: 20,
  },
  headerText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 19.504,
  },
  listContainer: {
    gap: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    height: 72,
  },
  circleContainer: {
    width: 72,
    height: 72,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 15.847,
    textAlign: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  titleText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 19.504,
  },
  descriptionText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0,
    lineHeight: 15.847,
  },
});

export default BiorhythmsWidget;
