# AstraLink - Руководство по Рефакторингу Архитектуры

> **Версия:** 1.0
> **Дата:** 2025-12-15
> **Цель:** Комплексный рефакторинг с фокусом на единообразие, переиспользование и производительность

---

## 📋 ОГЛАВЛЕНИЕ

1. [Текущее Состояние](#текущее-состояние)
2. [Принципы Рефакторинга](#принципы-рефакторинга)
3. [Архитектурные Паттерны](#архитектурные-паттерны)
4. [Стандарты Страниц](#стандарты-страниц)
5. [Система Компонентов](#система-компонентов)
6. [Стили и Тематизация](#стили-и-тематизация)
7. [Оптимизация Производительности](#оптимизация-производительности)
8. [Чек-лист для Каждой Страницы](#чек-лист-для-каждой-страницы)
9. [План Поэтапной Миграции](#план-поэтапной-миграции)

---

## 🎯 ТЕКУЩЕЕ СОСТОЯНИЕ

### ✅ Что уже хорошо реализовано

1. **Централизованная система стилей**
   - `theme.ts` - цвета, spacing, typography, shadows
   - `commonStyles.ts` - готовые стили для карточек, кнопок, текста
   - Градиенты для разных элементов (cosmic, fire, earth, air, water)

2. **Модульная организация**
   - Feature-based структура компонентов (`components/horoscope/`, `components/dating/`)
   - API сервисы разделены по доменам (`services/api/auth.api.ts`, etc.)
   - Zustand stores с селекторами

3. **State Management**
   - Zustand с persistence
   - React Query для серверных данных (5 min stale time, 30 min cache)
   - Оптимизированные селекторы

4. **Типизация**
   - Full TypeScript на frontend и backend
   - Typed API contracts

5. **Layout Wrapper**
   - `TabScreenLayout` - единая обертка для tab screens с SafeArea

6. **AI Service**
   - Strategy pattern с fallback (Claude → OpenAI → DeepSeek)
   - Retry logic, cost tracking

7. **Caching**
   - Redis для тяжелых вычислений (charts, horoscopes)
   - React Query client-side cache

8. **i18n**
   - 3 языка (en, ru, es)
   - Namespace-based структура

---

## ⚠️ Что нужно улучшить

### 1. **Единообразие Layout**
**Проблема:** Не все страницы используют `TabScreenLayout`

**Решение:**
- Создать дополнительные layout wrapper'ы для разных типов экранов
- Стандартизировать edges для SafeArea
- Унифицировать padding/spacing

### 2. **Дублирование стилей**
**Проблема:** В некоторых компонентах есть inline StyleSheet вместо использования `commonStyles`

**Решение:**
- Аудит всех компонентов
- Миграция на `commonStyles` + `theme`
- Создание дополнительных общих стилей

### 3. **Переиспользование компонентов**
**Проблема:** Возможные дублирования UI элементов (кнопки, карточки, инпуты)

**Решение:**
- Создать библиотеку базовых UI компонентов
- Извлечь общие паттерны в shared components

### 4. **Performance**
**Проблема:** AI запросы долгие, нужна оптимизация

**Решение:**
- Aggressive caching в Redis (TTL стратегии)
- Prefetching для предсказуемых запросов
- Loading states с skeleton screens
- Debouncing для input-based AI requests

### 5. **Error Boundaries**
**Проблема:** Не обнаружено Error Boundary компонентов

**Решение:**
- Создать Error Boundary wrapper
- Добавить fallback UI для ошибок

### 6. **Code Splitting**
**Проблема:** Нет lazy loading для маршрутов

**Решение:**
- React.lazy() для экранов
- Dynamic imports для тяжелых компонентов

### 7. **Testing**
**Проблема:** Минимальное покрытие тестами

**Решение:**
- Unit тесты для utils/helpers
- Component tests для shared components
- Integration tests для critical flows

---

## 🏛 ПРИНЦИПЫ РЕФАКТОРИНГА

### **1. DRY (Don't Repeat Yourself)**
- Каждый стиль определяется один раз в `theme.ts` или `commonStyles.ts`
- Повторяющиеся UI паттерны → shared components
- Повторяющаяся логика → utils/helpers/services

### **2. Single Responsibility**
- Компонент делает одну вещь
- Service выполняет одну роль
- Hook инкапсулирует одну логику

### **3. Composition over Inheritance**
- Используем композицию компонентов
- Layout wrappers оборачивают content
- HOC для cross-cutting concerns (auth, subscription)

### **4. Performance First**
- Все AI запросы кэшируются
- Селекторы для предотвращения re-renders
- Мемоизация тяжелых вычислений
- Lazy loading для больших компонентов

### **5. Type Safety**
- Все Props типизированы
- API responses типизированы
- Store state типизирован

### **6. Consistency**
- Единый code style (Prettier, ESLint)
- Одинаковые naming conventions
- Стандартизированная структура файлов

---

## 🎨 АРХИТЕКТУРНЫЕ ПАТТЕРНЫ

### **Компоненты**

#### **Структура Компонента**
```typescript
// 1. Imports (React, libraries, types, components, styles)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';

// 2. Types/Interfaces
interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

// 3. Component
export const MyComponent: React.FC<MyComponentProps> = ({ title, onPress }) => {
  const { t } = useTranslation();

  return (
    <View style={[commonStyles.card, styles.container]}>
      <Text style={[commonStyles.heading, styles.title]}>{title}</Text>
    </View>
  );
};

// 4. Styles (using theme constants)
const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  title: {
    color: theme.colors.primary,
  },
});
```

#### **Naming Conventions**
- **Screens**: `[Feature]Screen.tsx` (HoroscopeScreen, DatingScreen)
- **Components**: `[Name]Component.tsx` или `[Name]Widget.tsx`
- **Layouts**: `[Name]Layout.tsx`
- **Hooks**: `use[Name].ts`
- **Services**: `[name].service.ts`
- **Stores**: `[name].store.ts`

---

## 📱 СТАНДАРТЫ СТРАНИЦ

### **Layout Hierarchy**

```
SafeAreaProvider (App root - ONCE)
  └── Screen Component
      └── Layout Wrapper (TabScreenLayout, ModalLayout, AuthLayout)
          └── ScrollView/View
              └── Animated.View (fade-in)
                  └── Content Components
```

### **Layout Wrappers**

#### **1. TabScreenLayout** (для tab screens)
```typescript
<TabScreenLayout
  scrollable={true}
  edges={['top', 'left', 'right']}
  contentContainerStyle={{ paddingBottom: 20 }}
>
  {/* Content */}
</TabScreenLayout>
```

**Используется для:**
- HoroscopeScreen
- DatingScreen
- ChatListScreen
- ProfileScreen
- AdvisorScreen

**Включает:**
- SafeAreaView (edges control)
- CosmicBackground
- ScrollView (optional)
- Fade-in animation
- Bottom padding для tab bar (120px)

#### **2. AuthLayout** (для auth screens)
```typescript
<AuthLayout>
  <AuthHeader />
  {/* Auth form content */}
</AuthLayout>
```

**Используется для:**
- AuthEmailScreen
- SignUpScreen
- OptCodeScreen

**Включает:**
- SafeAreaView (все edges)
- KeyboardAvoidingView
- Центрирование контента
- Cosmic background

#### **3. ModalLayout** (для модальных окон)
```typescript
<ModalLayout visible={isVisible} onClose={handleClose}>
  {/* Modal content */}
</ModalLayout>
```

**Включает:**
- SafeAreaView
- Backdrop
- Close button
- Slide-up animation

#### **4. FullScreenLayout** (для standalone screens)
```typescript
<FullScreenLayout edges={['top', 'bottom', 'left', 'right']}>
  {/* Full screen content */}
</FullScreenLayout>
```

**Используется для:**
- WelcomeScreen
- CosmicSimulatorScreen
- Onboarding screens

---

## 🧩 СИСТЕМА КОМПОНЕНТОВ

### **Уровни Компонентов**

```
├── 1. Primitives (Атомы)
│   ├── Button
│   ├── Input
│   ├── Card
│   ├── Badge
│   ├── Avatar
│   └── Icon
│
├── 2. Composites (Молекулы)
│   ├── FormField (Input + Label + Error)
│   ├── ListItem
│   ├── ActionSheet
│   └── TabBar
│
├── 3. Widgets (Организмы)
│   ├── HoroscopeWidget
│   ├── LunarCalendarWidget
│   ├── DatingCard
│   └── ChatMessage
│
└── 4. Layouts (Шаблоны)
    ├── TabScreenLayout
    ├── AuthLayout
    ├── ModalLayout
    └── FullScreenLayout
```

### **Создание Shared Components**

#### **Структура директории**
```
components/shared/
├── Button/
│   ├── Button.tsx
│   ├── Button.types.ts
│   └── Button.styles.ts
├── Card/
│   ├── Card.tsx
│   ├── Card.types.ts
│   └── Card.styles.ts
└── Input/
    ├── Input.tsx
    ├── Input.types.ts
    └── Input.styles.ts
```

#### **Пример: Button Component**
```typescript
// Button.types.ts
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Button.tsx
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  title,
  onPress,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.white} />
      ) : (
        <>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text style={styles.text}>{title}</Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};

// Button.styles.ts
export const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.medium,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  // ... другие варианты
});
```

### **Приоритетные Shared Components**

1. **Button** - primary, secondary, outline, ghost variants
2. **Card** - с variants (default, elevated, outlined)
3. **Input** - текст, email, password с validation states
4. **Badge** - для статусов, уведомлений
5. **Avatar** - с placeholder, loading state
6. **LoadingSpinner** - единый loading indicator
7. **EmptyState** - для пустых списков
8. **ErrorBoundary** - для обработки ошибок
9. **SkeletonLoader** - для loading states

---

## 🎨 СТИЛИ И ТЕМАТИЗАЦИЯ

### **Расширение theme.ts**

```typescript
// Добавить в theme.ts

export const theme = {
  // ... существующие

  // Animation durations
  animation: {
    fast: 200,
    normal: 300,
    slow: 500,
  },

  // Opacity levels
  opacity: {
    disabled: 0.5,
    hover: 0.8,
    pressed: 0.6,
  },

  // Icon sizes
  iconSizes: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
  },

  // Layout constants
  layout: {
    tabBarHeight: 60,
    headerHeight: 56,
    bottomPadding: 120, // для tab screens
    screenPadding: 16,
  },

  // Breakpoints (для адаптивности)
  breakpoints: {
    small: 375,
    medium: 768,
    large: 1024,
  },
};
```

### **Расширение commonStyles.ts**

```typescript
// Добавить в commonStyles.ts

export const commonStyles = StyleSheet.create({
  // ... существующие

  // Flexbox utilities
  flexCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexStart: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },

  // Text utilities
  textCenter: {
    textAlign: 'center',
  },
  textBold: {
    fontWeight: 'bold',
  },
  textUppercase: {
    textTransform: 'uppercase',
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },

  // Safe area utilities
  safeTop: {
    paddingTop: theme.spacing.lg,
  },
  safeBottom: {
    paddingBottom: theme.layout.bottomPadding,
  },

  // Loading container
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },

  // Error container
  errorContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.error + '20', // 20% opacity
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
});
```

### **Правило использования стилей**

1. **Используй theme constants**
```typescript
// ✅ Правильно
const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.medium,
  },
});

// ❌ Неправильно
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
  },
});
```

2. **Используй commonStyles для базовых паттернов**
```typescript
// ✅ Правильно
<View style={[commonStyles.card, commonStyles.rowSpaceBetween]}>

// ❌ Неправильно
<View style={styles.customCard}>
// где customCard дублирует commonStyles.card
```

3. **Создавай component-specific стили только для уникальных случаев**

---

## ⚡ ОПТИМИЗАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ

### **1. AI Запросы**

#### **Caching Strategy**
```typescript
// services/ai-cache.service.ts

interface CacheConfig {
  key: string;
  ttl: number; // seconds
  staleWhileRevalidate?: boolean;
}

export class AICacheService {
  // Horoscope predictions - cache for 6 hours
  static readonly HOROSCOPE_TTL = 6 * 60 * 60;

  // Chart interpretation - cache for 24 hours
  static readonly CHART_TTL = 24 * 60 * 60;

  // Advisor recommendations - cache for 1 hour
  static readonly ADVISOR_TTL = 1 * 60 * 60;

  // Dating compatibility - cache for 12 hours
  static readonly DATING_TTL = 12 * 60 * 60;
}
```

#### **Prefetching Pattern**
```typescript
// В HoroscopeScreen prefetch данные для других виджетов
useEffect(() => {
  // Загружаем основной контент
  queryClient.prefetchQuery({
    queryKey: ['lunar-calendar', userId],
    queryFn: () => advisorAPI.getLunarCalendar(),
  });

  // Prefetch для следующих виджетов
  queryClient.prefetchQuery({
    queryKey: ['energy-levels', userId],
    queryFn: () => advisorAPI.getEnergyLevels(),
  });
}, [userId]);
```

#### **Debouncing для AI запросов**
```typescript
// hooks/useAIQuery.ts
import { useDebouncedCallback } from 'use-debounce';

export const useAIQuery = (queryFn: Function, delay = 500) => {
  const debouncedFn = useDebouncedCallback(queryFn, delay);

  return {
    trigger: debouncedFn,
  };
};
```

### **2. Component Optimization**

#### **React.memo для чистых компонентов**
```typescript
export const HoroscopeWidget = React.memo<HoroscopeWidgetProps>(
  ({ data }) => {
    // Component logic
  },
  (prevProps, nextProps) => {
    // Custom comparison
    return prevProps.data.id === nextProps.data.id;
  }
);
```

#### **useMemo для тяжелых вычислений**
```typescript
const planetPositions = useMemo(() => {
  return calculatePlanetPositions(birthDate, birthTime, location);
}, [birthDate, birthTime, location]);
```

#### **useCallback для event handlers**
```typescript
const handlePress = useCallback(() => {
  navigation.navigate('Details', { id });
}, [id, navigation]);
```

### **3. List Optimization**

#### **FlatList с оптимизацией**
```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  // Performance props
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={5}
  // Мемоизированные callbacks
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### **4. Image Optimization**

```typescript
// Используй FastImage вместо Image
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: avatarUrl, priority: FastImage.priority.high }}
  style={styles.avatar}
  resizeMode={FastImage.resizeMode.cover}
/>
```

### **5. Code Splitting**

```typescript
// Lazy load экранов
const CosmicSimulatorScreen = React.lazy(() =>
  import('./screens/CosmicSimulatorScreen')
);

// В navigation
<Stack.Screen
  name="CosmicSimulator"
  component={CosmicSimulatorScreen}
/>
```

### **6. Bundle Size Optimization**

```typescript
// Используй named imports вместо default
// ✅ Правильно
import { useNavigation } from '@react-navigation/native';

// ❌ Неправильно (импортирует весь модуль)
import ReactNavigation from '@react-navigation/native';
const { useNavigation } = ReactNavigation;
```

---

## ✅ ЧЕК-ЛИСТ ДЛЯ КАЖДОЙ СТРАНИЦЫ

При рефакторинге каждой страницы проверяй:

### **1. Layout & SafeArea**
- [ ] Используется правильный Layout wrapper (TabScreenLayout, AuthLayout, etc.)
- [ ] SafeArea edges настроены корректно
- [ ] Bottom padding для tab bar (если нужно)
- [ ] CosmicBackground добавлен (если нужен фон)

### **2. Стили**
- [ ] Все цвета из `theme.colors`
- [ ] Все spacing из `theme.spacing`
- [ ] Все typography из `theme.fontSizes`
- [ ] Используются `commonStyles` где возможно
- [ ] Нет hardcoded значений (16, '#8B5CF6', etc.)
- [ ] Градиенты из `theme.gradients`

### **3. Компоненты**
- [ ] Используются shared components вместо кастомных
- [ ] Нет дублирования UI элементов
- [ ] Props типизированы
- [ ] Component разбит на подкомпоненты если > 200 строк

### **4. State Management**
- [ ] Используется Zustand store или React Query
- [ ] Нет локального state для серверных данных
- [ ] Используются селекторы для Zustand
- [ ] Loading/error states обработаны

### **5. Performance**
- [ ] Тяжелые вычисления в useMemo
- [ ] Event handlers в useCallback
- [ ] Lists используют FlatList с оптимизацией
- [ ] Images используют FastImage
- [ ] AI запросы кэшируются

### **6. UX**
- [ ] Loading indicators для async операций
- [ ] Error states с retry возможностью
- [ ] Empty states для пустых списков
- [ ] Skeleton loaders для контента
- [ ] Animations для transitions

### **7. Accessibility**
- [ ] accessibilityLabel для важных элементов
- [ ] accessibilityRole указан
- [ ] Достаточный contrast ratio для текста
- [ ] Touch targets минимум 44x44

### **8. i18n**
- [ ] Все тексты через `t('key')`
- [ ] Нет hardcoded строк
- [ ] Переводы есть для всех языков (en, ru, es)

### **9. Navigation**
- [ ] Типизированные navigation params
- [ ] Правильный navigation stack
- [ ] Deep linking support (если нужен)

### **10. Code Quality**
- [ ] ESLint warnings исправлены
- [ ] TypeScript errors исправлены
- [ ] Нет console.log (используй logger)
- [ ] Нет commented code
- [ ] Нет unused imports

---

## 📅 ПЛАН ПОЭТАПНОЙ МИГРАЦИИ

### **Phase 1: Фундамент (1-2 недели)**

1. **Создать Shared Components библиотеку**
   - [ ] Button (variants: primary, secondary, outline, ghost)
   - [ ] Card (variants: default, elevated, outlined)
   - [ ] Input (types: text, email, password, number)
   - [ ] Badge
   - [ ] Avatar
   - [ ] LoadingSpinner
   - [ ] EmptyState
   - [ ] ErrorBoundary
   - [ ] SkeletonLoader

2. **Расширить theme.ts и commonStyles.ts**
   - [ ] Добавить animation durations
   - [ ] Добавить opacity levels
   - [ ] Добавить icon sizes
   - [ ] Добавить layout constants
   - [ ] Добавить utility styles

3. **Создать Layout Wrappers**
   - [ ] TabScreenLayout (уже есть, проверить)
   - [ ] AuthLayout
   - [ ] ModalLayout
   - [ ] FullScreenLayout

4. **Создать Performance Utilities**
   - [ ] AICacheService
   - [ ] useAIQuery hook
   - [ ] Prefetch helpers

### **Phase 2: Auth Screens (3-4 дня)**

- [ ] AuthEmailScreen
- [ ] SignUpScreen
- [ ] OptCodeScreen
- [ ] MagicLinkWaitingScreen
- [ ] AuthCallbackScreen

**Для каждого:**
1. Миграция на AuthLayout
2. Замена кастомных кнопок на shared Button
3. Замена кастомных inputs на shared Input
4. Миграция стилей на theme/commonStyles
5. Добавить loading/error states
6. Добавить animations

### **Phase 3: Onboarding Screens (2-3 дня)**

- [ ] FirstOnboardingScreen
- [ ] SecondOnboardingScreen
- [ ] ThirdOnboardingScreen
- [ ] FourthOnboardingScreen

**Для каждого:**
1. Миграция на FullScreenLayout
2. Единообразие animations
3. Миграция стилей
4. Проверка accessibility

### **Phase 4: Tab Screens (1-2 недели)**

- [ ] HoroscopeScreen
- [ ] DatingScreen
- [ ] ChatListScreen
- [ ] ProfileScreen
- [ ] AdvisorScreen

**Для каждого:**
1. Проверка TabScreenLayout usage
2. Миграция widgets на shared components
3. Оптимизация AI запросов (caching, prefetching)
4. Skeleton loaders для loading states
5. Error boundaries

### **Phase 5: Feature Screens (1 неделя)**

- [ ] CosmicSimulatorScreen
- [ ] EditProfileScreen
- [ ] PersonalCodeScreen
- [ ] WelcomeScreen

### **Phase 6: Widgets/Components Refactor (1 неделя)**

- [ ] Horoscope widgets (LunarCalendar, Energy, Transit, etc.)
- [ ] Dating components (DatingCard, CosmicChat)
- [ ] Profile components
- [ ] Chat components

### **Phase 7: Performance Optimization (3-5 дней)**

- [ ] Внедрить AI caching strategy
- [ ] Добавить prefetching
- [ ] Оптимизировать lists (FlatList)
- [ ] Code splitting для тяжелых экранов
- [ ] Bundle analysis и optimization

### **Phase 8: Testing & Documentation (3-5 дней)**

- [ ] Unit tests для shared components
- [ ] Integration tests для critical flows
- [ ] Storybook для component library (optional)
- [ ] Обновить README
- [ ] Code review

---

## 🎯 МЕТРИКИ УСПЕХА

### **Code Quality**
- [ ] 0 ESLint warnings
- [ ] 0 TypeScript errors
- [ ] 100% использование theme constants
- [ ] < 5% дублирования кода (SonarQube)

### **Performance**
- [ ] AI response time < 2s (with cache)
- [ ] Screen render time < 300ms
- [ ] Bundle size reduction > 20%
- [ ] Cache hit rate > 70% для AI запросов

### **Consistency**
- [ ] 100% screens используют layout wrappers
- [ ] 100% UI elements из shared components
- [ ] 100% translations coverage

### **UX**
- [ ] Loading states на всех async операциях
- [ ] Error recovery на всех критичных flows
- [ ] Animations на всех transitions
- [ ] Accessibility score > 90%

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

1. **Прочитай этот гайд полностью**
2. **Начни с Phase 1 (Shared Components)**
3. **После каждого экрана - проходи чек-лист**
4. **Коммить изменения малыми порциями (по экрану/компоненту)**
5. **Тестируй после каждого изменения**

---

## 📝 ЗАМЕТКИ

### **Важные Принципы**

1. **Не ломай что работает** - рефактор не должен менять функциональность
2. **Малые шаги** - один экран/компонент за раз
3. **Тестируй постоянно** - после каждого изменения
4. **Документируй** - комментируй сложные решения
5. **Коммить часто** - малые, атомарные коммиты

### **При возникновении проблем**

1. Проверь existing implementations в других экранах
2. Проверь theme.ts и commonStyles.ts
3. Проверь React Native docs
4. Ask for clarification если неясно

---

**Удачи в рефакторинге! 🚀**
