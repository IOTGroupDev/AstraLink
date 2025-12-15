# 🤖 Claude Refactoring Prompt

> **Используй этот промпт при работе с каждым экраном/компонентом**

---

## КОНТЕКСТ РЕФАКТОРИНГА

Я работаю над комплексным рефакторингом AstraLink - React Native приложения для астрологии и знакомств. Моя цель - обеспечить единообразие, максимальное переиспользование компонентов и высокую производительность.

---

## ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ПРИ КАЖДОМ ИЗМЕНЕНИИ

### 1. **СТИЛИ - ТОЛЬКО ИЗ THEME**
```typescript
// ✅ ВСЕГДА ТАК
import { theme } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,           // НЕ 16
    backgroundColor: theme.colors.card,  // НЕ '#1E1E2E'
    borderRadius: theme.borderRadius.medium, // НЕ 12
  },
});

// ❌ НИКОГДА ТАК
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
  },
});
```

### 2. **ПЕРЕИСПОЛЬЗОВАНИЕ КОМПОНЕНТОВ**
- Перед созданием нового компонента - проверь `components/shared/`
- Если UI паттерн повторяется > 2 раз → создать shared component
- Используй композицию вместо дублирования

### 3. **LAYOUT WRAPPERS - ОБЯЗАТЕЛЬНЫ**
```typescript
// Tab Screens
<TabScreenLayout scrollable={true} edges={['top', 'left', 'right']}>
  {content}
</TabScreenLayout>

// Auth Screens
<AuthLayout>
  {content}
</AuthLayout>

// Modals
<ModalLayout visible={isVisible} onClose={handleClose}>
  {content}
</ModalLayout>

// Full Screen
<FullScreenLayout edges={['top', 'bottom', 'left', 'right']}>
  {content}
</FullScreenLayout>
```

### 4. **PERFORMANCE - ВСЕГДА**
```typescript
// AI запросы - ВСЕГДА кэшировать
const { data, isLoading } = useQuery({
  queryKey: ['horoscope', userId, date],
  queryFn: () => advisorAPI.getHoroscope(userId, date),
  staleTime: 6 * 60 * 60 * 1000, // 6 hours для horoscope
  gcTime: 24 * 60 * 60 * 1000,
});

// Тяжелые вычисления - useMemo
const planetPositions = useMemo(
  () => calculatePlanetPositions(birthData),
  [birthData]
);

// Event handlers - useCallback
const handlePress = useCallback(() => {
  navigation.navigate('Details', { id });
}, [id, navigation]);

// Components - React.memo
export const Widget = React.memo<WidgetProps>(({ data }) => {
  // ...
});
```

### 5. **LOADING & ERROR STATES - ОБЯЗАТЕЛЬНЫ**
```typescript
// Loading state
{isLoading && <SkeletonLoader />}

// Error state с retry
{isError && (
  <ErrorState
    message={error.message}
    onRetry={refetch}
  />
)}

// Empty state
{data?.length === 0 && (
  <EmptyState
    title={t('empty.title')}
    message={t('empty.message')}
  />
)}

// Success state
{data && <Content data={data} />}
```

### 6. **ТИПИЗАЦИЯ - 100%**
```typescript
// Props ВСЕГДА типизированы
interface ScreenProps {
  navigation: NavigationProp<RootStackParamList, 'ScreenName'>;
  route: RouteProp<RootStackParamList, 'ScreenName'>;
}

// State типизирован
const [data, setData] = useState<UserProfile | null>(null);

// API responses типизированы
const response: HoroscopeResponse = await advisorAPI.getHoroscope();
```

### 7. **i18n - ВСЕ ТЕКСТЫ**
```typescript
// ✅ ПРАВИЛЬНО
const { t } = useTranslation();
<Text>{t('horoscope.title')}</Text>

// ❌ НЕПРАВИЛЬНО
<Text>Your Daily Horoscope</Text>
```

### 8. **ЧИСТОТА КОДА**
```typescript
// ❌ УДАЛИТЬ
console.log('debug info');
// Commented code
// const oldFunction = () => { ... };

// ✅ ИСПОЛЬЗОВАТЬ
import { logger } from '@/services/logger';
logger.log('component', 'Debug info', { data });

// ❌ УДАЛИТЬ unused imports
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// если TouchableOpacity не используется
```

---

## ЧЕК-ЛИСТ ПРИ РАБОТЕ С ЭКРАНОМ

Когда работаю с экраном, проверяю по порядку:

```markdown
### Layout
- [ ] Используется правильный Layout wrapper
- [ ] SafeArea edges настроены корректно
- [ ] CosmicBackground добавлен (если нужен)

### Стили
- [ ] Все из theme.colors, theme.spacing, theme.fontSizes
- [ ] Используются commonStyles где возможно
- [ ] Нет hardcoded значений

### Компоненты
- [ ] Shared components вместо кастомных
- [ ] Props типизированы
- [ ] Разбито на подкомпоненты если > 200 строк

### State & Data
- [ ] Zustand/React Query для state
- [ ] Селекторы для Zustand
- [ ] Loading/error/empty states

### Performance
- [ ] useMemo для вычислений
- [ ] useCallback для handlers
- [ ] React.memo для pure components
- [ ] AI запросы кэшируются
- [ ] FlatList оптимизирован

### UX
- [ ] Loading indicators
- [ ] Error states с retry
- [ ] Empty states
- [ ] Skeleton loaders
- [ ] Animations

### i18n
- [ ] Все тексты через t('key')
- [ ] Переводы для en, ru, es

### Quality
- [ ] 0 ESLint warnings
- [ ] 0 TypeScript errors
- [ ] Нет console.log
- [ ] Нет commented code
- [ ] Нет unused imports
```

---

## ПРИОРИТЕТЫ ОПТИМИЗАЦИИ

### 🔴 **КРИТИЧНО** (AI Requests)
```typescript
// Кэширование с правильным TTL
- Horoscope: 6 hours
- Chart interpretation: 24 hours
- Advisor: 1 hour
- Dating compatibility: 12 hours

// Prefetching
useEffect(() => {
  queryClient.prefetchQuery({
    queryKey: ['next-data', userId],
    queryFn: () => api.getNextData(),
  });
}, [userId]);

// Debouncing
const debouncedSearch = useDebouncedCallback(
  (query) => searchAPI.search(query),
  500
);
```

### 🟡 **ВАЖНО** (Component Performance)
```typescript
// Мемоизация
const memoizedValue = useMemo(() => expensiveCalc(), [dep]);
const memoizedCallback = useCallback(() => handler(), [dep]);
const MemoizedComponent = React.memo(Component);

// FlatList optimization
<FlatList
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  getItemLayout={getItemLayout}
/>
```

### 🟢 **ЖЕЛАТЕЛЬНО** (Code Quality)
```typescript
// Code splitting
const LazyScreen = React.lazy(() => import('./Screen'));

// Bundle optimization
import { specific } from 'library'; // not 'import library'
```

---

## СТРУКТУРА КОММИТОВ

```bash
# Малые, атомарные коммиты
git commit -m "refactor(horoscope): migrate to TabScreenLayout"
git commit -m "refactor(horoscope): replace custom buttons with shared Button"
git commit -m "refactor(horoscope): migrate styles to theme constants"
git commit -m "perf(horoscope): add AI response caching"
git commit -m "feat(horoscope): add skeleton loader"

# Типы:
# - refactor: рефакторинг без изменения функциональности
# - perf: оптимизация производительности
# - feat: новая фича
# - fix: исправление бага
# - style: форматирование (не влияет на код)
# - docs: документация
```

---

## КОГДА СОЗДАВАТЬ SHARED COMPONENT

**Создавай shared component если:**
1. UI паттерн повторяется > 2 раз
2. Компонент используется в > 1 feature
3. Компонент не зависит от конкретной feature логики
4. Компонент можно параметризовать через props

**Структура shared component:**
```
components/shared/ComponentName/
├── ComponentName.tsx       # Implementation
├── ComponentName.types.ts  # TypeScript types
├── ComponentName.styles.ts # Styles (optional)
└── index.ts               # Export
```

---

## КРАСНЫЕ ФЛАГИ (НЕ ДОПУСКАТЬ)

```typescript
// ❌ Hardcoded colors/spacing
backgroundColor: '#8B5CF6'
padding: 16

// ❌ Hardcoded text
<Text>Welcome to App</Text>

// ❌ Inline styles для сложных объектов
<View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 8 }}>

// ❌ console.log в коде
console.log('user data:', user);

// ❌ Commented code
// const oldFunction = () => { };

// ❌ Дублирование компонентов
// Две версии одной и той же кнопки в разных местах

// ❌ State для server data
const [horoscope, setHoroscope] = useState();
useEffect(() => {
  api.getHoroscope().then(setHoroscope);
}, []);
// Используй React Query!

// ❌ Нетипизированные props
const Component = (props) => { }

// ❌ Any types
const data: any = response;
```

---

## ПОЛЕЗНЫЕ SNIPPETS

### Loading State Pattern
```typescript
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['key', id],
  queryFn: () => api.getData(id),
});

if (isLoading) return <SkeletonLoader />;
if (isError) return <ErrorState error={error} onRetry={refetch} />;
if (!data) return <EmptyState />;

return <Content data={data} />;
```

### Form Pattern
```typescript
const [formData, setFormData] = useState<FormData>(initialData);
const [errors, setErrors] = useState<FormErrors>({});

const mutation = useMutation({
  mutationFn: (data: FormData) => api.submitForm(data),
  onSuccess: () => {
    navigation.goBack();
    Toast.show({ type: 'success', text: t('form.success') });
  },
  onError: (error) => {
    setErrors(error.fieldErrors);
  },
});

const handleSubmit = () => {
  const validationErrors = validateForm(formData);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  mutation.mutate(formData);
};
```

---

## ПОРЯДОК РАБОТЫ С ЭКРАНОМ

1. **Прочитай текущий код** - пойми что делает
2. **Проверь чек-лист** - что нужно исправить
3. **Создай план** - в каком порядке менять
4. **Рефактор по шагам:**
   - Layout wrapper
   - Стили → theme/commonStyles
   - Компоненты → shared components
   - State → Zustand/React Query
   - Performance → memo/useMemo/useCallback
   - UX → loading/error/empty states
   - i18n → t('key')
   - Cleanup → warnings/errors/console.logs
5. **Тестируй** - работает ли экран
6. **Коммить** - малые атомарные коммиты

---

## ИТОГОВОЕ ПРАВИЛО

> **Каждое изменение должно делать код:**
> 1. **Более единообразным** (theme, commonStyles, shared components)
> 2. **Более производительным** (cache, memo, debounce)
> 3. **Более понятным** (типизация, названия, структура)
> 4. **Более поддерживаемым** (DRY, composition, separation of concerns)

---

**При каждом запросе на работу с экраном - перечитываю этот промпт!**
