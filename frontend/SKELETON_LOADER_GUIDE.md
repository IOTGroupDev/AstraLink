# 💀 Skeleton Loader Usage Guide

## 📋 Обзор

Skeleton loaders созданы для улучшения UX во время загрузки данных. Они используют lunar gradient из дизайна LunarCalendarWidget для единообразия.

---

## 🎨 Дизайн-система

### Градиенты

```typescript
theme.gradients.lunar // Полноцветные карточки
theme.gradients.skeleton // Для skeleton loaders (с прозрачностью)
```

### Компоненты

1. **SkeletonLoader** - базовый компонент
2. **HoroscopeSkeletons** - специализированные скелетоны для виджетов

---

## 🔧 Базовый SkeletonLoader

### Импорт

```typescript
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
```

### Variants

#### Card (по умолчанию)
```typescript
<SkeletonLoader width="100%" height={120} />
```

#### Text
```typescript
<SkeletonLoader variant="text" width={180} height={20} />
```

#### Circle
```typescript
<SkeletonLoader variant="circle" height={80} />
```

#### Rectangle
```typescript
<SkeletonLoader variant="rect" width={100} height={36} />
```

### Props

```typescript
interface SkeletonLoaderProps {
  width?: number | string;  // Default: '100%'
  height?: number;          // Default: 120
  borderRadius?: number;    // Default: theme.borderRadius.large
  style?: ViewStyle;
  variant?: 'card' | 'text' | 'circle' | 'rect';
}
```

---

## 🎯 Специализированные скелетоны

### Импорт

```typescript
import {
  LargeWidgetSkeleton,
  SmallCardsSkeleton,
  HoroscopeWidgetSkeleton,
  EnergyWidgetSkeleton,
  BiorhythmsWidgetSkeleton,
} from '@/components/horoscope/HoroscopeSkeletons';
```

### LargeWidgetSkeleton

Для больших виджетов (LunarCalendar, MainTransit):

```typescript
{loading ? <LargeWidgetSkeleton /> : <LunarCalendarWidget />}
```

### SmallCardsSkeleton

Для пары маленьких карточек (2 в ряд):

```typescript
{loading ? <SmallCardsSkeleton /> : (
  <View style={styles.row}>
    <SmallCard1 />
    <SmallCard2 />
  </View>
)}
```

### HoroscopeWidgetSkeleton

Для виджета гороскопа:

```typescript
{!predictions && loading ? (
  <HoroscopeWidgetSkeleton />
) : predictions ? (
  <HoroscopeWidget predictions={predictions} />
) : null}
```

### EnergyWidgetSkeleton

Для виджета энергии:

```typescript
{loading ? <EnergyWidgetSkeleton /> : <EnergyWidget />}
```

### BiorhythmsWidgetSkeleton

Для виджета биоритмов:

```typescript
{loading ? <BiorhythmsWidgetSkeleton /> : <BiorhythmsWidget />}
```

---

## 📱 Примеры для разных экранов

### 1. Tab Screen (с TabScreenLayout)

```typescript
import { TabScreenLayout } from '@/components/layout/TabScreenLayout';
import { LargeWidgetSkeleton } from '@/components/horoscope/HoroscopeSkeletons';

const MyTabScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  return (
    <TabScreenLayout>
      {loading ? (
        <>
          <LargeWidgetSkeleton />
          <LargeWidgetSkeleton />
          <LargeWidgetSkeleton />
        </>
      ) : (
        <>
          <Widget1 data={data} />
          <Widget2 data={data} />
          <Widget3 data={data} />
        </>
      )}
    </TabScreenLayout>
  );
};
```

### 2. List Screen (DatingScreen, ChatListScreen)

```typescript
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

const ListItemSkeleton = () => (
  <View style={styles.listItem}>
    <SkeletonLoader variant="circle" height={60} />
    <View style={styles.textArea}>
      <SkeletonLoader variant="text" width={180} height={18} />
      <SkeletonLoader variant="text" width={120} height={14} />
    </View>
  </View>
);

const MyListScreen: React.FC = () => {
  const { data, isLoading } = useQuery(...);

  return (
    <FlatList
      data={isLoading ? Array(5).fill({}) : data}
      renderItem={({ item, index }) =>
        isLoading ? <ListItemSkeleton /> : <ListItem item={item} />
      }
      keyExtractor={(item, index) => isLoading ? `skeleton-${index}` : item.id}
    />
  );
};
```

### 3. Profile Screen

```typescript
const ProfileSkeleton = () => (
  <>
    {/* Header */}
    <View style={styles.profileHeader}>
      <SkeletonLoader variant="circle" height={120} />
      <SkeletonLoader variant="text" width={200} height={24} style={{ marginTop: 16 }} />
      <SkeletonLoader variant="text" width={160} height={16} style={{ marginTop: 8 }} />
    </View>

    {/* Stats */}
    <View style={styles.statsRow}>
      <SkeletonLoader variant="card" width={100} height={80} />
      <SkeletonLoader variant="card" width={100} height={80} />
      <SkeletonLoader variant="card" width={100} height={80} />
    </View>

    {/* Bio */}
    <SkeletonLoader variant="card" width="100%" height={150} />
  </>
);

const ProfileScreen: React.FC = () => {
  const { data, isLoading } = useQuery(...);

  return (
    <TabScreenLayout>
      {isLoading ? <ProfileSkeleton /> : <ProfileContent data={data} />}
    </TabScreenLayout>
  );
};
```

### 4. Chat Screen

```typescript
const MessageSkeleton = ({ isOwn }: { isOwn: boolean }) => (
  <View style={[styles.message, isOwn ? styles.ownMessage : styles.otherMessage]}>
    {!isOwn && <SkeletonLoader variant="circle" height={32} style={{ marginRight: 8 }} />}
    <SkeletonLoader
      variant="rect"
      width={isOwn ? 200 : 250}
      height={60}
    />
  </View>
);

const ChatScreen: React.FC = () => {
  const { messages, isLoading } = useQuery(...);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <MessageSkeleton isOwn={false} />
        <MessageSkeleton isOwn={true} />
        <MessageSkeleton isOwn={false} />
        <MessageSkeleton isOwn={true} />
      </View>
    );
  }

  return <MessagesList messages={messages} />;
};
```

### 5. Dating Cards (Swipeable)

```typescript
const DatingCardSkeleton = () => (
  <BlurView intensity={10} tint="dark" style={styles.card}>
    <LinearGradient
      colors={theme.gradients.skeleton}
      start={{ x: 0, y: 0.44 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      {/* Photo */}
      <SkeletonLoader variant="rect" width="100%" height={400} />

      {/* Info */}
      <View style={styles.info}>
        <SkeletonLoader variant="text" width={180} height={28} />
        <SkeletonLoader variant="text" width={120} height={18} style={{ marginTop: 8 }} />
        <SkeletonLoader variant="text" width="100%" height={16} style={{ marginTop: 12 }} />
      </View>
    </LinearGradient>
  </BlurView>
);

const DatingScreen: React.FC = () => {
  const { candidates, isLoading } = useQuery(...);

  return (
    <TabScreenLayout>
      {isLoading ? (
        <DatingCardSkeleton />
      ) : (
        <SwipeableCards cards={candidates} />
      )}
    </TabScreenLayout>
  );
};
```

---

## ⚡ Best Practices

### 1. Используйте правильный паттерн

```typescript
// ✅ Правильно - показываем скелетон только при первой загрузке
{isLoading && !data ? <Skeleton /> : <Content data={data} />}

// ❌ Неправильно - скелетон показывается при каждом refetch
{isLoading ? <Skeleton /> : <Content data={data} />}
```

### 2. Используйте количество скелетонов соответствующее данным

```typescript
// ✅ Правильно - показываем столько же скелетонов, сколько будет элементов
{Array(expectedCount).fill({}).map((_, i) => <Skeleton key={i} />)}

// ❌ Неправильно - всегда 1 скелетон
{<Skeleton />}
```

### 3. Совпадение размеров

```typescript
// ✅ Правильно - скелетон соответствует размеру контента
<SkeletonLoader width="100%" height={120} /> // Если карточка 120px

// ❌ Неправильно - скелетон не соответствует контенту
<SkeletonLoader width="50%" height={200} /> // Если карточка 120px
```

### 4. Группируйте скелетоны

```typescript
// ✅ Правильно - создаем отдельный компонент для сложных структур
const ComplexWidgetSkeleton = () => (
  <View>
    <SkeletonLoader variant="text" width={180} height={24} />
    <SkeletonLoader variant="circle" height={80} />
    <SkeletonLoader variant="text" width={120} height={16} />
  </View>
);

// ❌ Неправильно - повторяем код в каждом месте
{loading && (
  <View>
    <SkeletonLoader variant="text" width={180} height={24} />
    <SkeletonLoader variant="circle" height={80} />
    ...
  </View>
)}
```

---

## 🎬 Анимация

Скелетоны используют **пульсирующую анимацию** (fade in/out):
- Duration: 1000ms in, 1000ms out
- Opacity: 0.3 ↔ 1.0
- Бесконечный цикл

Анимация создается через `react-native-reanimated` для плавности.

---

## 🎨 Кастомизация

### Создание своего скелетона

```typescript
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { theme } from '@/styles/theme';

export const MyCustomSkeleton = () => {
  return (
    <BlurView intensity={10} tint="dark" style={styles.container}>
      <LinearGradient
        colors={theme.gradients.skeleton}
        start={{ x: 0, y: 0.44 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        {/* Ваша структура */}
        <SkeletonLoader variant="text" width={200} height={24} />
        <SkeletonLoader variant="circle" height={60} />
        {/* ... */}
      </LinearGradient>
    </BlurView>
  );
};
```

### Изменение градиента

Если нужен другой градиент:

```typescript
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['rgba(88, 1, 114, 0.6)', 'rgba(35, 0, 45, 0.6)']} // Reverse
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }} // Diagonal
  style={styles.gradient}
>
  <SkeletonLoader ... />
</LinearGradient>
```

---

## 📊 Приоритетные экраны для добавления скелетонов

### Phase 1 (Критично):
- [x] ✅ HoroscopeScreen
- [ ] DatingScreen
- [ ] ChatListScreen

### Phase 2 (Важно):
- [ ] ProfileScreen
- [ ] EditProfileScreen
- [ ] AdvisorScreen

### Phase 3 (Желательно):
- [ ] ChatDialogScreen
- [ ] NatalChartScreen
- [ ] SubscriptionScreen

---

## 🚀 Следующие шаги

1. Добавить скелетоны в DatingScreen
2. Добавить скелетоны в ChatListScreen
3. Добавить скелетоны в ProfileScreen
4. Создать скелетоны для списков (универсальный)
5. Добавить скелетоны в модальные окна

---

**Дата создания:** 2025-12-19
**Последнее обновление:** 2025-12-19
**Автор:** Claude Code
**Статус:** ✅ Ready to use
