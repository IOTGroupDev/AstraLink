# 🔄 AstraLink Refactoring - Session Guide

> **Для использования в новых чатах с Claude**
>
> Этот документ содержит весь необходимый контекст для продолжения работы по рефакторингу AstraLink в новых сессиях.

---

## 📋 КОНТЕКСТ ПРОЕКТА

**Проект:** AstraLink - React Native приложение для астрологии и знакомств

**Стек:**

- **Frontend:** React Native (Expo), TypeScript, Zustand, React Query, i18next
- **Backend:** NestJS, Prisma, PostgreSQL, Redis, AI (Claude/OpenAI/DeepSeek)
- **Особенности:** Тяжелые AI запросы (долгие), Redis кэширование

**Текущая ветка:** `claude/refactor-app-architecture-a6pyi`

---

## 🎯 ЦЕЛЬ РЕФАКТОРИНГА

Проходим по каждому экрану приложения и обеспечиваем:

1. ✅ **Единообразие стилей** - все через `theme.ts` и `commonStyles.ts`
2. ✅ **Переиспользование компонентов** - создаем shared components
3. ✅ **Оптимизацию производительности** - AI кэширование, мемоизация
4. ✅ **Правильные Layout wrappers** - SafeArea, TabScreenLayout и т.д.
5. ✅ **Чистоту кода** - типизация, i18n, без hardcoded значений

---

## 📚 ДОКУМЕНТАЦИЯ

В проекте есть полная документация:

1. **REFACTORING_GUIDE.md** - полное руководство (1100+ строк)
   - Анализ текущего состояния
   - Архитектурные паттерны
   - План из 8 фаз
   - Чек-лист для каждой страницы

2. **CLAUDE_REFACTOR_PROMPT.md** - рабочий промпт для Claude
   - Обязательные правила
   - Чек-лист при работе с экраном
   - Красные флаги
   - Полезные snippets

3. **REFACTORING_SESSION_GUIDE.md** (этот файл) - для переноса контекста между чатами

---

## 🚀 ПОДХОД К РЕФАКТОРИНГУ

### **Выбранная Стратегия**

Работаем **экран за экраном**:

1. Пользователь называет экран
2. Анализируем его по чек-листу
3. **Постепенно создаем shared components** по мере необходимости
4. Применяем все паттерны
5. Коммитим малыми порциями

### **Почему именно так?**

- Сразу видим результат на реальном экране
- Можем корректировать подход по ходу
- Не создаем лишние компоненты "на будущее"
- Понимаем реальные потребности приложения

---

## ✅ ЧЕК-ЛИСТ ДЛЯ КАЖДОГО ЭКРАНА

### **1. Layout & SafeArea**

```typescript
// Tab экраны
<TabScreenLayout scrollable={true} edges={['top', 'left', 'right']}>

// Auth экраны
<AuthLayout>

// Модалки
<ModalLayout visible={isVisible} onClose={handleClose}>

// Full screen
<FullScreenLayout edges={['top', 'bottom', 'left', 'right']}>
```

- [ ] Используется правильный Layout wrapper
- [ ] SafeArea edges настроены корректно
- [ ] Bottom padding для tab bar (если нужно)
- [ ] CosmicBackground добавлен (если нужен)

### **2. Стили**

```typescript
// ✅ ВСЕГДА ТАК
import { theme } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md, // НЕ 16
    backgroundColor: theme.colors.card, // НЕ '#1E1E2E'
    borderRadius: theme.borderRadius.medium, // НЕ 12
  },
});
```

- [ ] Все цвета из `theme.colors`
- [ ] Все spacing из `theme.spacing`
- [ ] Все typography из `theme.fontSizes`
- [ ] Используются `commonStyles` где возможно
- [ ] Нет hardcoded значений
- [ ] Градиенты из `theme.gradients`

### **3. Компоненты**

- [ ] Используются shared components (если есть)
- [ ] Создаем новый shared component если паттерн повторяется > 2 раз
- [ ] Props типизированы
- [ ] Component разбит на подкомпоненты если > 200 строк

### **4. State Management**

```typescript
// Zustand для app state
const user = useAuthStore((s) => s.user);

// React Query для server data
const { data, isLoading, isError } = useQuery({
  queryKey: ['horoscope', userId],
  queryFn: () => advisorAPI.getHoroscope(userId),
  staleTime: 6 * 60 * 60 * 1000, // 6 hours
});
```

- [ ] Zustand store или React Query (не useState для server data)
- [ ] Селекторы для Zustand
- [ ] Loading/error/empty states обработаны

### **5. Performance**

```typescript
// Мемоизация
const value = useMemo(() => calculate(), [dep]);
const handler = useCallback(() => {}, [dep]);
const Component = React.memo(MyComponent);

// AI caching
const { data } = useQuery({
  queryKey: ['key', id],
  queryFn: () => api.getData(),
  staleTime: 6 * 60 * 60 * 1000, // TTL based on data type
});
```

- [ ] Тяжелые вычисления в useMemo
- [ ] Event handlers в useCallback
- [ ] Pure components в React.memo
- [ ] AI запросы кэшируются (правильный TTL)
- [ ] FlatList оптимизирован (если есть списки)

### **6. UX**

```typescript
{isLoading && <SkeletonLoader />}
{isError && <ErrorState error={error} onRetry={refetch} />}
{isEmpty && <EmptyState title={t('empty.title')} />}
{data && <Content data={data} />}
```

- [ ] Loading indicators (Skeleton > Spinner)
- [ ] Error states с retry
- [ ] Empty states для пустых списков
- [ ] Animations для transitions

### **7. i18n**

```typescript
const { t } = useTranslation();
<Text>{t('horoscope.title')}</Text>
```

- [ ] Все тексты через `t('key')`
- [ ] Нет hardcoded строк
- [ ] Переводы есть для en, ru, es

### **8. Code Quality**

- [ ] 0 ESLint warnings
- [ ] 0 TypeScript errors
- [ ] Нет `console.log` (используй `logger`)
- [ ] Нет commented code
- [ ] Нет unused imports

---

## 🔴 КРАСНЫЕ ФЛАГИ (НЕ ДОПУСКАТЬ)

```typescript
// ❌ Hardcoded colors/spacing
backgroundColor: '#8B5CF6'
padding: 16

// ❌ Hardcoded text
<Text>Welcome to App</Text>

// ❌ console.log
console.log('debug:', data);

// ❌ Any types
const data: any = response;

// ❌ useState для server data
const [user, setUser] = useState();
useEffect(() => {
  api.getUser().then(setUser);
}, []);
// Используй React Query!
```

---

## 📁 СТРУКТУРА SHARED COMPONENTS

Когда создаем shared component:

```
components/shared/ComponentName/
├── ComponentName.tsx       # Implementation
├── ComponentName.types.ts  # TypeScript types
├── ComponentName.styles.ts # Styles (optional, если большие)
└── index.ts               # Export
```

**Приоритетные shared components:**

1. **Button** - primary, secondary, outline, ghost
2. **Card** - default, elevated, outlined
3. **Input** - text, email, password с validation
4. **Badge** - для статусов
5. **Avatar** - с placeholder
6. **LoadingSpinner** / **SkeletonLoader**
7. **EmptyState** - для пустых списков
8. **ErrorBoundary**

---

## 🎨 THEME CONSTANTS

### **Locations:**

- `/home/user/AstraLink/frontend/src/styles/theme.ts`
- `/home/user/AstraLink/frontend/src/styles/commonStyles.ts`

### **Что есть в theme:**

```typescript
theme.colors; // primary, secondary, background, card, text, etc.
theme.spacing; // xs(4), sm(8), md(16), lg(24), xl(32), xxl(40)
theme.fontSizes; // xs(12), sm(14), md(16), lg(18), xl(24), xxl(28), huge(32)
theme.borderRadius; // small(8), medium(12), large(16), xlarge(24), full(9999)
theme.shadows; // small, medium, large
theme.gradients; // cosmic, fire, earth, air, water
```

### **Что есть в commonStyles:**

```typescript
commonStyles.card; // Базовая карточка
commonStyles.button; // Базовая кнопка
commonStyles.row; // Flex row
commonStyles.column; // Flex column
commonStyles.rowSpaceBetween; // Row с space-between
// ... и другие
```

---

## ⚡ ОПТИМИЗАЦИЯ AI ЗАПРОСОВ

### **TTL Стратегия:**

```typescript
// Horoscope predictions - 6 hours
staleTime: 6 * 60 * 60 * 1000;

// Chart interpretation - 24 hours
staleTime: 24 * 60 * 60 * 1000;

// Advisor recommendations - 1 hour
staleTime: 1 * 60 * 60 * 1000;

// Dating compatibility - 12 hours
staleTime: 12 * 60 * 60 * 1000;
```

### **Prefetching Pattern:**

```typescript
useEffect(() => {
  // Prefetch данные для следующих виджетов
  queryClient.prefetchQuery({
    queryKey: ['next-data', userId],
    queryFn: () => api.getNextData(),
  });
}, [userId]);
```

### **Debouncing для input:**

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (query) => searchAPI.search(query),
  500 // 500ms delay
);
```

---

## 🔄 WORKFLOW ПРИ РАБОТЕ С ЭКРАНОМ

### **1. Получение задачи**

```
Пользователь: "AuthEmailScreen"
```

### **2. Анализ текущего состояния**

```bash
# Читаем файл экрана
Read: /home/user/AstraLink/frontend/src/screens/Auth/AuthEmailScreen.tsx

# Проверяем зависимости (какие компоненты использует)
Read: components/auth/*
```

### **3. Создание плана**

```markdown
Используй TodoWrite для создания плана:

- [ ] Analyze current implementation
- [ ] Check layout wrapper usage
- [ ] Migrate styles to theme/commonStyles
- [ ] Create/use shared Button component
- [ ] Create/use shared Input component
- [ ] Add loading/error states
- [ ] Migrate texts to i18n
- [ ] Clean up code (warnings, console.logs)
- [ ] Test the screen
- [ ] Commit changes
```

### **4. Рефакторинг по шагам**

#### **4.1. Layout Wrapper**

```typescript
// Было
<SafeAreaView>
  <View style={styles.container}>
    {content}
  </View>
</SafeAreaView>

// Стало
<AuthLayout>
  {content}
</AuthLayout>
```

#### **4.2. Styles Migration**

```typescript
// Было
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1E1E2E',
  },
});

// Стало
const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
  },
});
```

#### **4.3. Shared Components**

```typescript
// Было
<TouchableOpacity style={styles.button} onPress={handleSubmit}>
  <Text style={styles.buttonText}>Submit</Text>
</TouchableOpacity>

// Стало
<Button
  variant="primary"
  size="medium"
  title={t('auth.submit')}
  onPress={handleSubmit}
  loading={isLoading}
/>
```

#### **4.4. State & Performance**

```typescript
// Было
const [email, setEmail] = useState('');
const handleSubmit = () => {
  authAPI.login(email);
};

// Стало
const [email, setEmail] = useState('');

const loginMutation = useMutation({
  mutationFn: (email: string) => authAPI.login(email),
  onSuccess: () => navigation.navigate('Home'),
  onError: (error) => Toast.show({ type: 'error', text: error.message }),
});

const handleSubmit = useCallback(() => {
  loginMutation.mutate(email);
}, [email]);
```

#### **4.5. i18n**

```typescript
// Было
<Text>Enter your email</Text>

// Стало
const { t } = useTranslation();
<Text>{t('auth.email.placeholder')}</Text>
```

### **5. Создание Shared Component (если нужно)**

Если во время рефакторинга понимаем, что нужен shared component:

```typescript
// 1. Создаем структуру
components/shared/Button/
├── Button.tsx
├── Button.types.ts
└── index.ts

// 2. Реализуем компонент
// Button.types.ts
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export interface ButtonProps {
  variant?: ButtonVariant;
  title: string;
  onPress: () => void;
  loading?: boolean;
  // ...
}

// Button.tsx
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  title,
  onPress,
  loading,
}) => {
  // Implementation using theme
};

// index.ts
export { Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button.types';

// 3. Используем в экране
import { Button } from '@/components/shared/Button';
```

### **6. Тестирование**

```bash
# Запустить приложение
cd frontend && npm start

# Проверить экран в эмуляторе/симуляторе
# Проверить все states (loading, error, success)
# Проверить i18n (переключить язык)
```

### **7. Коммит**

```bash
# Малые атомарные коммиты
git add .
git commit -m "refactor(auth): migrate AuthEmailScreen to AuthLayout"

git add .
git commit -m "refactor(auth): replace custom buttons with shared Button"

git add .
git commit -m "refactor(auth): migrate styles to theme constants"

git add .
git commit -m "feat(shared): add Button component"
```

### **8. Push**

```bash
git push -u origin claude/refactor-app-architecture-a6pyi
```

---

## 📝 ПРИМЕРЫ КОММИТОВ

```bash
# Типы коммитов:
refactor:  # Рефакторинг без изменения функциональности
perf:      # Оптимизация производительности
feat:      # Новая фича (shared component, layout wrapper)
fix:       # Исправление бага
style:     # Форматирование
docs:      # Документация

# Примеры:
git commit -m "refactor(horoscope): migrate to TabScreenLayout"
git commit -m "feat(shared): add Button component with variants"
git commit -m "perf(horoscope): add AI response caching (6h TTL)"
git commit -m "refactor(horoscope): migrate styles to theme constants"
```

---

## 🎯 ИНСТРУКЦИЯ ДЛЯ CLAUDE В НОВОМ ЧАТЕ

### **Когда начинаешь новую сессию:**

1. **Прочитай контекст:**

   ```
   Read: /home/user/AstraLink/REFACTORING_SESSION_GUIDE.md
   ```

2. **Прочитай рабочий промпт:**

   ```
   Read: /home/user/AstraLink/CLAUDE_REFACTOR_PROMPT.md
   ```

3. **Опционально - полное руководство:**

   ```
   Read: /home/user/AstraLink/REFACTORING_GUIDE.md
   ```

4. **Получи задачу от пользователя:**

   ```
   Пользователь: "HoroscopeScreen"
   ```

5. **Создай план с TodoWrite:**

   ```typescript
   TodoWrite([
     { content: 'Read current screen implementation', status: 'in_progress' },
     { content: 'Analyze and create refactoring plan', status: 'pending' },
     // ...
   ]);
   ```

6. **Начинай работу** следуя чек-листу и workflow из этого документа

---

## 📊 ТЕКУЩИЙ ПРОГРЕСС

### **Созданные Shared Components:**

<!-- Обновляй этот список по мере создания компонентов -->

- [ ] Button
- [ ] Card
- [ ] Input
- [ ] Badge
- [ ] Avatar
- [ ] LoadingSpinner
- [ ] SkeletonLoader
- [ ] EmptyState
- [ ] ErrorBoundary

### **Созданные Layout Wrappers:**

<!-- Обновляй этот список -->

- [x] TabScreenLayout (уже есть)
- [ ] AuthLayout
- [ ] ModalLayout
- [ ] FullScreenLayout

### **Отрефакторенные экраны:**

<!-- Обновляй этот список по мере завершения экранов -->

**Auth Screens:**

- [ ] AuthEmailScreen
- [ ] SignUpScreen
- [ ] OptCodeScreen
- [ ] MagicLinkWaitingScreen
- [ ] AuthCallbackScreen

**Onboarding Screens:**

- [ ] FirstOnboardingScreen
- [ ] SecondOnboardingScreen
- [ ] ThirdOnboardingScreen
- [ ] FourthOnboardingScreen

**Tab Screens:**

- [ ] HoroscopeScreen
- [ ] DatingScreen
- [ ] ChatListScreen
- [ ] ProfileScreen
- [ ] AdvisorScreen

**Feature Screens:**

- [ ] CosmicSimulatorScreen
- [ ] EditProfileScreen
- [ ] PersonalCodeScreen
- [ ] WelcomeScreen

---

## 🚨 ВАЖНЫЕ ЗАМЕТКИ

### **Git Branch:**

```bash
# Всегда работаем в этой ветке
claude/refactor-app-architecture-a6pyi

# Проверить текущую ветку
git branch

# Если не на правильной ветке
git checkout claude/refactor-app-architecture-a6pyi
```

### **Не ломать работающее:**

- Рефакторинг НЕ должен менять функциональность
- Только улучшаем структуру, стили, производительность
- Тестируем после каждого изменения

### **Малые шаги:**

- Один экран за раз
- Малые атомарные коммиты
- Проверяем git status перед коммитом

### **Shared Components:**

- Создаем только когда РЕАЛЬНО нужны
- Не создаем "на будущее"
- Если паттерн повторяется > 2 раз → shared component

---

## 📞 БЫСТРЫЙ СТАРТ В НОВОМ ЧАТЕ

**Copy-paste это в новый чат:**

```
Привет! Продолжаю работу по рефакторингу AstraLink.

Прочитай контекст:
1. /home/user/AstraLink/REFACTORING_SESSION_GUIDE.md
2. /home/user/AstraLink/CLAUDE_REFACTOR_PROMPT.md

Текущая ветка: claude/refactor-app-architecture-a6pyi

Готов работать с экраном: [НАЗВАНИЕ_ЭКРАНА]
```

Замени `[НАЗВАНИЕ_ЭКРАНА]` на конкретный экран, например `AuthEmailScreen`.

---

## ✅ ФИНАЛЬНЫЙ ЧЕК-ЛИСТ ПЕРЕД ЗАВЕРШЕНИЕМ ЭКРАНА

- [ ] Layout wrapper используется правильно
- [ ] Все стили из theme/commonStyles
- [ ] Shared components используются
- [ ] Loading/Error/Empty states есть
- [ ] i18n для всех текстов
- [ ] Performance (memo/useMemo/useCallback где нужно)
- [ ] 0 warnings/errors
- [ ] Нет console.log
- [ ] Нет commented code
- [ ] Протестировано в эмуляторе
- [ ] Закоммичено и запушено

---

**Удачи в рефакторинге! 🚀**

_Последнее обновление: 2025-12-15_
