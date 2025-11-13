# Geolocation Feature for Edit Profile

## Overview

Пользователи могут автоматически определить свое текущее местоположение в поле **"Место жительства"** в Edit Profile, нажав одну кнопку.

## Features

✅ **Автоматическое определение местоположения** на iPhone и Android
✅ **Обратное геокодирование** (координаты → читаемый адрес)
✅ **Кнопка с иконкой локации** рядом с полем "Место жительства"
✅ **Запрос разрешений** на iOS и Android
✅ **Loading indicator** во время определения
✅ **Обработка ошибок** с понятными алертами

---

## How It Works

### User Flow:

1. Пользователь открывает **Edit Profile**
2. Рядом с полем **"Место жительства"** видит кнопку с иконкой локации 📍
3. Нажимает кнопку
4. Система запрашивает разрешение на доступ к геолокации (только первый раз)
5. Приложение получает GPS координаты
6. Координаты преобразуются в читаемый адрес (город, регион, страна)
7. Поле автоматически заполняется адресом
8. Показывается alert с успешным результатом

---

## Technical Implementation

### 1. Dependencies

```json
{
  "expo-location": "~17.0.1"
}
```

Установлено через:
```bash
npm install expo-location@~17.0.1
```

### 2. Permissions

#### iOS (Info.plist)

Требуется добавить в `ios/[AppName]/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Мы используем вашу геолокацию для автоматического определения города в профиле</string>
```

#### Android (AndroidManifest.xml)

Требуется добавить в `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**Примечание:** Expo автоматически добавляет эти разрешения при использовании `expo-location`.

### 3. Code Implementation

**File:** `frontend/src/screens/EditProfileScreen.tsx`

#### Import:

```typescript
import * as Location from 'expo-location';
```

#### State:

```typescript
const [gettingLocation, setGettingLocation] = useState(false);
```

#### Function:

```typescript
const handleGetCurrentLocation = async () => {
  try {
    setGettingLocation(true);

    // 1. Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Доступ запрещен', 'Разрешите доступ к геолокации в настройках');
      return;
    }

    // 2. Get current coordinates
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // 3. Reverse geocoding (coordinates → address)
    const [address] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    if (address) {
      // Format readable address
      const parts = [];
      if (address.city) parts.push(address.city);
      if (address.region && address.region !== address.city) {
        parts.push(address.region);
      }
      if (address.country) parts.push(address.country);

      const locationString = parts.join(', ');
      setCity(locationString);

      Alert.alert('Успех', `Местоположение определено: ${locationString}`);
    } else {
      Alert.alert('Ошибка', 'Не удалось определить адрес');
    }
  } catch (error) {
    console.error('Geolocation error:', error);
    Alert.alert('Ошибка', 'Не удалось определить местоположение. Проверьте настройки GPS.');
  } finally {
    setGettingLocation(false);
  }
};
```

#### UI:

```tsx
<View style={styles.inputGroup}>
  <View style={styles.locationHeader}>
    <Text style={styles.inputLabel}>Место жительства</Text>
    <TouchableOpacity
      style={styles.locationButton}
      onPress={handleGetCurrentLocation}
      disabled={gettingLocation}
    >
      {gettingLocation ? (
        <ActivityIndicator size="small" color="#8B5CF6" />
      ) : (
        <Ionicons name="locate" size={20} color="#8B5CF6" />
      )}
    </TouchableOpacity>
  </View>
  <AstralInput
    value={city}
    onChangeText={setCity}
    placeholder="Город, страна"
    icon="home-outline"
    animationValue={animationValue}
  />
</View>
```

#### Styles:

```typescript
locationHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
locationButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: 'rgba(139, 92, 246, 0.2)',
  borderWidth: 1,
  borderColor: 'rgba(139, 92, 246, 0.3)',
  justifyContent: 'center',
  alignItems: 'center',
},
```

---

## Accuracy Levels

Expo Location поддерживает несколько уровней точности:

```typescript
Location.Accuracy.Lowest;       // ~3000m (экономия батареи)
Location.Accuracy.Low;          // ~1000m
Location.Accuracy.Balanced;     // ~100m (используется в коде) ⭐
Location.Accuracy.High;         // ~10m
Location.Accuracy.Highest;      // ~1m (максимальная точность)
Location.Accuracy.BestForNavigation; // Для навигации
```

**Выбран `Balanced`** для оптимального баланса между точностью и расходом батареи.

---

## Address Format

Обратное геокодирование возвращает объект:

```typescript
{
  city: "Москва",
  region: "Москва",
  country: "Россия",
  street: "Тверская улица",
  name: "Кремль",
  postalCode: "103132",
  // ... другие поля
}
```

**Форматирование адреса:**
- Если `city` и `region` одинаковые → показываем только `city`
- Итоговый формат: `"Город, Регион, Страна"`
- Пример: `"Москва, Россия"` или `"Санкт-Петербург, Ленинградская область, Россия"`

---

## Error Handling

### 1. Permission Denied

**Scenario:** Пользователь отклонил запрос на доступ к геолокации

**Handling:**
```typescript
Alert.alert('Доступ запрещен', 'Разрешите доступ к геолокации в настройках');
```

**User Action:**
- iOS: Settings → [App Name] → Location → While Using the App
- Android: Settings → Apps → [App Name] → Permissions → Location

### 2. GPS Disabled

**Scenario:** GPS выключен в настройках устройства

**Handling:**
```typescript
Alert.alert('Ошибка', 'Не удалось определить местоположение. Проверьте настройки GPS.');
```

**User Action:**
- iOS: Settings → Privacy & Security → Location Services → On
- Android: Settings → Location → On

### 3. No Address Found

**Scenario:** Не удалось преобразовать координаты в адрес (редкий случай)

**Handling:**
```typescript
Alert.alert('Ошибка', 'Не удалось определить адрес');
```

### 4. Network Error

**Scenario:** Нет интернета для обратного геокодирования

**Handling:**
```typescript
console.error('Geolocation error:', error);
Alert.alert('Ошибка', 'Не удалось определить местоположение. Проверьте настройки GPS.');
```

---

## Testing

### iOS Simulator:

1. **Установить местоположение:**
   - Simulator → Features → Location → Custom Location
   - Введите координаты (например, 55.7558° N, 37.6173° E для Москвы)

2. **Тестировать:**
   - Откройте Edit Profile
   - Нажмите кнопку локации
   - Проверьте, что поле заполнилось адресом

### Android Emulator:

1. **Установить местоположение:**
   - Emulator Extended Controls (⋮) → Location
   - Введите координаты или выберите на карте

2. **Тестировать:**
   - Откройте Edit Profile
   - Нажмите кнопку локации
   - Проверьте результат

### Physical Device:

1. **Включите GPS:**
   - iOS: Settings → Privacy → Location Services → On
   - Android: Settings → Location → On

2. **Разрешите доступ:**
   - При первом нажатии на кнопку → Allow "While Using the App"

3. **Тестируйте:**
   - Нажмите кнопку локации
   - Проверьте, что определился реальный адрес

---

## Performance

### Loading Time:

- **Запрос разрешений:** ~1-2 секунды (только первый раз)
- **Получение координат:** ~2-5 секунд (зависит от GPS сигнала)
- **Обратное геокодирование:** ~1-2 секунды (зависит от интернета)
- **Итого:** ~3-9 секунд

### Battery Impact:

- **Accuracy.Balanced:** Низкий расход батареи ✅
- **Одноразовый запрос:** Минимальное влияние
- **No background tracking:** GPS используется только при нажатии кнопки

---

## Future Enhancements

Возможные улучшения в будущем:

1. **Кеширование последнего местоположения:**
   ```typescript
   const lastLocation = await Location.getLastKnownPositionAsync();
   ```

2. **Выбор из предложенных адресов:**
   - Показать несколько вариантов (city, district, region)
   - Пользователь выбирает нужный

3. **Интеграция с Google Places API:**
   - Autocomplete для ввода города
   - Более точное определение адреса

4. **Сохранение истории местоположений:**
   - Быстрый выбор из ранее использованных адресов

5. **Определение места рождения:**
   - Добавить такую же кнопку для `birthPlace` поля

---

## Troubleshooting

### Problem: "Permission denied" on iOS

**Solution:**
1. Check Info.plist has `NSLocationWhenInUseUsageDescription`
2. Rebuild app: `cd ios && pod install && cd .. && npm run ios`

### Problem: "Permission denied" on Android

**Solution:**
1. Check AndroidManifest.xml has location permissions
2. Rebuild app: `npm run android`

### Problem: "No address found"

**Solution:**
1. Check internet connection (required for reverse geocoding)
2. Try different location (some areas have limited map data)
3. Use manual input as fallback

### Problem: Slow location detection

**Solution:**
1. Ensure GPS is enabled
2. Try outdoors (better GPS signal)
3. Wait 10-15 seconds for GPS to initialize
4. Consider using `Location.Accuracy.Low` for faster results

---

## Documentation Links

- [Expo Location API](https://docs.expo.dev/versions/latest/sdk/location/)
- [iOS Location Permissions](https://developer.apple.com/documentation/corelocation/requesting_authorization_to_use_location_services)
- [Android Location Permissions](https://developer.android.com/training/location/permissions)

---

## Commit

```
adcee0e - feat: add geolocation for current location in Edit Profile
```

**Files:**
- `frontend/package.json` (added expo-location@~17.0.1)
- `frontend/src/screens/EditProfileScreen.tsx` (+60 lines)
