# Swiss Ephemeris Birth Chart - React Native Components

Полный набор компонентов для визуального отображения натальных карт в React Native приложении AstraLink.

## 📦 Файлы

### Основные компоненты

1. **NatalChartWheel.tsx** - Визуальное колесо натальной карты
   - Отображение зодиакальных знаков
   - Планеты с символами
   - Дома (Placidus)
   - Аспекты между планетами
   - Углы (AC, DC, MC, IC)

2. **PlanetList.tsx** - Список планет с позициями
   - Детальная информация по каждой планете
   - Положение в знаке и доме
   - Скорость и ретроградность
   - Углы карты
   - Куспиды домов

3. **ChartDisplay.tsx** - Полный экран карты
   - Комбинирует колесо и список
   - Переключение режимов отображения
   - Отображение аспектов
   - Основная информация (Sun/Moon/Rising)

4. **NatalChartScreenImplementation.tsx** - Полная имплементация
   - Интеграция с API
   - Обработка ошибок
   - Загрузка и кеширование данных

### Утилиты и типы

5. **astrology.types.ts** - TypeScript типы
   - BirthData
   - ChartData
   - PlanetPosition
   - HousePosition
   - Aspect
   - Константы (планеты, знаки, аспекты)

6. **ephemeris.utils.ts** - Утилиты для расчетов
   - Конвертация Julian Day
   - Нормализация углов
   - Расчет аспектов
   - Форматирование позиций
   - Определение домов для планет

7. **SwissEphemerisChart.tsx** - Базовый компонент расчетов
8. **ChartScreenExample.tsx** - Пример использования

## 🚀 Установка

### 1. Установите зависимости

```bash
npm install react-native-svg
# или
yarn add react-native-svg
```

### 2. Скопируйте файлы в ваш проект

```
src/
  components/
    astrology/
      NatalChartWheel.tsx
      PlanetList.tsx
      ChartDisplay.tsx
      NatalChartScreen.tsx
  types/
    astrology.types.ts
  utils/
    ephemeris.utils.ts
```

## 📖 Использование

### Базовое использование

```typescript
import NatalChartScreen from './components/NatalChartScreen';

function App() {
  const birthData = {
    name: 'John Doe',
    date: '1990-05-15',
    time: '14:30',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
  };

  return (
    <NatalChartScreen
      birthData={birthData}
      userId={user.id}
    />
  );
}
```

### Только колесо карты

```typescript
import NatalChartWheel from './components/NatalChartWheel';

<NatalChartWheel
  chartData={chartData}
  size={350}
  showAspects={true}
  showHouseNumbers={true}
/>
```

### Только список планет

```typescript
import PlanetList from './components/PlanetList';

<PlanetList
  chartData={chartData}
  compact={false}
/>
```

## 🔧 Backend API (NestJS + Swiss Ephemeris)

### Установка Swiss Ephemeris в NestJS

```bash
npm install swisseph
```

### Структура эндпоинтов

```typescript
POST / astrology / natal - chart;
Body: {
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  latitude: number;
  longitude: number;
  timezone: string;
}
Response: ChartData;
```

### Пример сервиса

```typescript
import * as swisseph from 'swisseph';

@Injectable()
export class AstrologyService {
  constructor() {
    // Путь к ephemeris файлам
    swisseph.swe_set_ephe_path(__dirname + '/../../ephemeris');
  }

  calculateNatalChart(birthData: BirthDataDto): ChartData {
    const julianDay = this.dateToJulianDay(
      new Date(`${birthData.date}T${birthData.time}`)
    );

    const planets = this.calculatePlanets(julianDay);
    const houses = this.calculateHouses(
      julianDay,
      birthData.latitude,
      birthData.longitude
    );

    return {
      // ... полная структура ChartData
    };
  }
}
```

## 🎨 Кастомизация

### Изменение цветов планет

```typescript
const PLANET_COLORS: Record<string, string> = {
  Sun: '#FFD700',
  Moon: '#C0C0C0',
  Mars: '#FF0000',
  // ... добавьте свои цвета
};
```

### Изменение цветов знаков

```typescript
const SIGN_COLORS = [
  '#FF4757', // Aries
  '#4ECDC4', // Taurus
  // ... 12 цветов для знаков
];
```

### Настройка размеров колеса

```typescript
const outerRadius = size / 2 - 10;
const signRadius = outerRadius - 30;
const planetRadius = signRadius - 60;
const houseRadius = planetRadius - 40;
const innerRadius = houseRadius - 60;
```

## 📊 Формат данных

### ChartData структура

```typescript
{
  name: "John Doe",
  dateTime: Date,
  julianDay: 2448000.5,
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: "America/New_York"
  },
  planets: [
    {
      name: "Sun",
      symbol: "☉",
      longitude: 54.25,  // Gemini 24°15'
      sign: "Gemini",
      degree: 24,
      minute: 15,
      house: 10,
      isRetrograde: false
    }
    // ... остальные планеты
  ],
  houses: [
    { number: 1, cusp: 120.5, sign: "Leo" },
    // ... 12 домов
  ],
  ascendant: 120.5,
  mc: 45.2,
  aspects: [
    {
      planet1: "Sun",
      planet2: "Moon",
      type: "Trine",
      angle: 120,
      orb: 2.5,
      isApplying: true
    }
    // ... остальные аспекты
  ]
}
```

## 🌟 Возможности

- ✅ Визуальное колесо натальной карты
- ✅ 10 основных планет
- ✅ 12 знаков зодиака
- ✅ 12 домов (Placidus, Koch, Equal, и др.)
- ✅ Главные углы (AC, DC, MC, IC)
- ✅ Мажорные аспекты (Conjunction, Opposition, Trine, Square, Sextile)
- ✅ Минорные аспекты (Quincunx, Semi-Sextile, и др.)
- ✅ Ретроградность планет
- ✅ Определение домов для планет
- ✅ Responsive дизайн
- ✅ Темная/светлая тема (легко настраивается)

## 🔮 Расширенные функции

### Транзиты

```typescript
POST /astrology/transits
Body: {
  natalPlanets: Planet[],
  transitDate: string
}
```

### Прогрессии

```typescript
POST /astrology/progressions
Body: {
  birthData: BirthData,
  progressionDate: string
}
```

### Синастрия (совместимость)

```typescript
POST /astrology/synastry
Body: {
  chart1: BirthData,
  chart2: BirthData
}
```

## 📝 Примечания

1. **Swiss Ephemeris файлы**: Скачайте ephemeris файлы с официального сайта
2. **Часовые пояса**: Используйте правильные timezone строки (IANA)
3. **Точность времени**: Для точных расчетов важно правильное время рождения
4. **Производительность**: Кешируйте рассчитанные карты в базе данных
5. **Offline режим**: Можно интегрировать Swiss Ephemeris напрямую в React Native

## 🐛 Отладка

### Проверка Julian Day

```typescript
console.log('Julian Day:', dateToJulianDay(new Date()));
```

### Проверка планет

```typescript
planets.forEach((p) => {
  console.log(`${p.name}: ${p.sign} ${p.degree}°${p.minute}'`);
});
```

### Проверка домов

```typescript
houses.forEach((h, i) => {
  console.log(`House ${i + 1}: ${h.cusp.toFixed(2)}°`);
});
```

## 📚 Ресурсы

- [Swiss Ephemeris Documentation](https://www.astro.com/swisseph/)
- [Astro-Seek Chart Calculator](https://horoscopes.astro-seek.com/)
- [React Native SVG](https://github.com/software-mansion/react-native-svg)

## 📄 Лицензия

Swiss Ephemeris имеет собственную лицензию. Ознакомьтесь с условиями использования на официальном сайте.

## 💡 Советы

1. Используйте `useMemo` для оптимизации рендеринга колеса
2. Кешируйте результаты расчетов в AsyncStorage
3. Используйте React Query для управления API запросами
4. Добавьте анимации при смене режимов отображения
5. Реализуйте жесты для зума и вращения колеса

## 🎯 TODO

- [ ] Добавить поддержку asteroid
- [ ] Анимация аспектов
- [ ] Экспорт карты в PNG/PDF
- [ ] Интерактивное колесо (тап на планету для деталей)
- [ ] Сравнение двух карт (синастрия)
- [ ] Анимация транзитов в реальном времени
