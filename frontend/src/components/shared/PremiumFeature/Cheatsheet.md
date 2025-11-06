# 🎯 Шпаргалка: PremiumFeature Component

## Основные режимы работы

### 1️⃣ Режим HIDE (по умолчанию)

**Когда использовать:** Контент должен быть полностью скрыт от бесплатных пользователей
**Что показывается:** Полноэкранный upgrade prompt с кнопками Trial и Upgrade

```tsx
<PremiumFeature feature="ADVANCED_ANALYTICS">
  {/* Контент СКРЫТ без подписки */}
  <AnalyticsChart />
</PremiumFeature>
```

---

### 2️⃣ Режим LOCK (блокировка)

**Когда использовать:** Хотите показать ЧТО доступно, но заблокировать без подписки
**Что показывается:** Затемнённый контент с overlay и замком поверх него

```tsx
<PremiumFeature
  feature="UNLIMITED_EXPORTS"
  lockMode="lock" // 🔑 Ключевой параметр
>
  {/* Контент ВИДЕН, но заблокирован */}
  <ExportButtons />
</PremiumFeature>
```

---

### 3️⃣ Компактная блокировка

**Когда использовать:** Для маленьких элементов (кнопки, карточки, строки списка)
**Что показывается:** Минималистичный замок с надписью "Premium"

```tsx
<PremiumFeature
  feature="CUSTOM_THEMES"
  lockMode="lock"
  compactLock={true} // 🔑 Компактный режим
>
  <SettingButton />
</PremiumFeature>
```

---

## Параметры компонента

| Параметр          | Тип                | По умолчанию     | Описание                                      |
| ----------------- | ------------------ | ---------------- | --------------------------------------------- |
| `feature`         | `string`           | **обязательный** | Ключ функции из FEATURE_REQUIREMENTS          |
| `children`        | `ReactNode`        | `undefined`      | Контент для Premium пользователей             |
| `lockMode`        | `'hide' \| 'lock'` | `'hide'`         | Режим отображения                             |
| `compactLock`     | `boolean`          | `false`          | Компактный замок (только для lockMode='lock') |
| `customTitle`     | `string`           | `'Premium'`      | Заголовок upgrade prompt                      |
| `customMessage`   | `string`           | `auto`           | Сообщение upgrade prompt                      |
| `showTrialButton` | `boolean`          | `true`           | Показать кнопку Trial                         |
| `onUpgradePress`  | `() => void`       | `navigation`     | Callback при нажатии Upgrade                  |

---

## Типичные сценарии использования

### ✅ Экспорт с видимыми кнопками

```tsx
<PremiumFeature feature="UNLIMITED_EXPORTS" lockMode="lock">
  <View>
    <Button title="PDF" />
    <Button title="Excel" /> {/* Видны, но заблокированы */}
    <Button title="CSV" />
  </View>
</PremiumFeature>
```

### ✅ Скрытая аналитика

```tsx
<PremiumFeature feature="ADVANCED_ANALYTICS">
  <ComplexAnalytics /> {/* Полностью скрыта */}
</PremiumFeature>
```

### ✅ Сетка карточек с блокировкой

```tsx
{
  premiumFeatures.map((feat) => (
    <PremiumFeature
      key={feat.id}
      feature={feat.name}
      lockMode="lock"
      compactLock={true}
    >
      <FeatureCard {...feat} />
    </PremiumFeature>
  ));
}
```

### ✅ Список настроек

```tsx
<PremiumFeature feature="CUSTOM_THEMES" lockMode="lock" compactLock={true}>
  <SettingRow icon="color-palette" label="Темы оформления" badge="Premium" />
</PremiumFeature>
```

---

## Визуальное сравнение режимов

### Режим HIDE

```
БЕЗ подписки:
┌─────────────────────────────┐
│         🔒 (иконка)         │
│                             │
│   Продвинутая аналитика     │
│   Получите детальные        │
│   графики и статистику      │
│                             │
│   [ ⭐ Premium ]             │
│   [ 🎁 7 дней бесплатно ]   │
│   [ ⬆️  Улучшить ]           │
└─────────────────────────────┘

С подпиской:
┌─────────────────────────────┐
│   📊 Графики                │
│   📈 Статистика             │
│   📉 Тренды                 │
└─────────────────────────────┘
```

### Режим LOCK (обычный)

```
БЕЗ подписки:
┌─────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← Затемнённый контент
│ ░░ [Button 1] ░░░░░░░░░░░░ │
│ ░░ [Button 2] ░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│         🔒                  │ ← Overlay
│    Premium Feature          │
│   [ Разблокировать ]        │
└─────────────────────────────┘
```

### Режим LOCK (компактный)

```
БЕЗ подписки:
┌───────────────┐
│ ░░░░░░░░░░░░░ │ ← Затемнённый контент
│ ░ [Button] ░░ │
│ ░░░░░░░░░░░░░ │
│   🔒 Premium  │ ← Маленький замок
└───────────────┘
```

---

## Когда использовать какой режим?

### Используйте HIDE когда:

- ✅ Контент сложный и объёмный (графики, таблицы, отчёты)
- ✅ Функция кардинально меняет интерфейс
- ✅ Хотите создать эффект "wow" при активации
- ✅ Контент не имеет смысла показывать частично

### Используйте LOCK когда:

- ✅ Хотите показать ЧТО доступно в Premium
- ✅ Элементы UI простые (кнопки, карточки, строки)
- ✅ Важно визуально показать разницу между free/premium
- ✅ Нужен "teaser" функционала

### Используйте COMPACT LOCK когда:

- ✅ Элементы маленькие (кнопки в ряд, иконки)
- ✅ Мало места для полного overlay
- ✅ Много премиум элементов рядом
- ✅ Нужен минималистичный дизайн

---

## Примеры из реальных приложений

### Notion

```tsx
// Используют LOCK для показа заблокированных блоков
<PremiumFeature feature="ADVANCED_BLOCKS" lockMode="lock">
  <DatabaseBlock />
</PremiumFeature>
```

### Spotify

```tsx
// Используют HIDE для скрытия offline режима
<PremiumFeature feature="OFFLINE_MODE">
  <DownloadButton />
</PremiumFeature>
```

### Canva

```tsx
// Используют COMPACT LOCK для элементов в сетке
<PremiumFeature feature="PRO_TEMPLATES" lockMode="lock" compactLock>
  <TemplateCard />
</PremiumFeature>
```

---

## Частые ошибки

### ❌ Неправильно

```tsx
// Забыли указать lockMode для видимых кнопок
<PremiumFeature feature="EXPORT">
  <Button /> {/* Будет СКРЫТА вместо заблокирована */}
</PremiumFeature>
```

### ✅ Правильно

```tsx
<PremiumFeature feature="EXPORT" lockMode="lock">
  <Button /> {/* Видна, но заблокирована */}
</PremiumFeature>
```

---

### ❌ Неправильно

```tsx
// Используем обычный lock для маленькой кнопки
<PremiumFeature feature="THEME" lockMode="lock">
  <SmallButton /> {/* Overlay слишком большой */}
</PremiumFeature>
```

### ✅ Правильно

```tsx
<PremiumFeature feature="THEME" lockMode="lock" compactLock>
  <SmallButton /> {/* Компактный замок идеален */}
</PremiumFeature>
```

---

## Советы по UX

1. **Показывайте ценность**: Используйте LOCK для демонстрации премиум функций
2. **Не перегружайте**: Не блокируйте слишком много элементов сразу
3. **Будьте последовательны**: Используйте один режим для похожих элементов
4. **Тестируйте**: Убедитесь, что замки не мешают пониманию интерфейса
5. **Анимации**: Встроенные анимации делают блокировку более приятной

---

## Интеграция с аналитикой

```tsx
<PremiumFeature
  feature="EXPORT"
  lockMode="lock"
  onUpgradePress={() => {
    // Отправляем событие в аналитику
    analytics.track('paywall_shown', {
      feature: 'export',
      source: 'export_button',
      tier: currentTier,
    });

    // Показываем экран подписки
    navigation.navigate('Subscription');
  }}
>
  <ExportButton />
</PremiumFeature>
```

---

## Дополнительная кастомизация

```tsx
<PremiumFeature
  feature="CUSTOM_FEATURE"
  lockMode="lock"
  compactLock={false}
  customTitle="🎨 Премиум дизайн"
  customMessage="Разблокируйте эксклюзивные темы и элементы"
  showTrialButton={true}
  onUpgradePress={handleUpgrade}
>
  <YourContent />
</PremiumFeature>
```

---

**Готово! Теперь у вас есть мощный инструмент для управления премиум функциями! 🚀**
