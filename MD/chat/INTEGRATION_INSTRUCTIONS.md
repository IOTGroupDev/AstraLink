# Интеграция CosmicChat в DatingScreen

## Что изменено:

### 1. Добавлены состояния для модального окна чата:

```typescript
const [chatVisible, setChatVisible] = useState(false);
const [selectedUser, setSelectedUser] = useState<{
  name: string;
  zodiacSign: string;
  compatibility: number;
} | null>(null);
```

### 2. Импортирован компонент CosmicChat:

```typescript
import CosmicChat from '../components/CosmicChat';
```

### 3. Обновлена функция handleMessage:

Теперь она открывает модальное окно CosmicChat вместо навигации на другой экран:

```typescript
const handleMessage = () => {
  if (!current) return;

  // Открываем CosmicChat как модальное окно
  setSelectedUser({
    name: current.name,
    zodiacSign: current.zodiacSign,
    compatibility: getCompatibilityFromBadge(current.badge),
  });
  setChatVisible(true);
};
```

### 4. Добавлена функция закрытия чата:

```typescript
const handleCloseChat = () => {
  setChatVisible(false);
  setSelectedUser(null);
};
```

### 5. Добавлен рендер модального окна чата:

В конце JSX, перед закрывающим тегом View:

```typescript
{/* Модальное окно чата */}
{chatVisible && selectedUser && (
  <CosmicChat
    visible={chatVisible}
    user={selectedUser}
    onClose={handleCloseChat}
  />
)}
```

### 6. Добавлена вспомогательная функция:

Для конвертации badge в процент совместимости:

```typescript
const getCompatibilityFromBadge = (b?: 'high' | 'medium' | 'low'): number =>
  b === 'high' ? 85 : b === 'medium' ? 65 : 45;
```

## Как это работает:

1. Когда пользователь нажимает на иконку сообщения (chatbubble-ellipses)
2. Вызывается функция `handleMessage()`
3. Она сохраняет информацию о текущем пользователе в `selectedUser`
4. Устанавливает `chatVisible` в `true`
5. CosmicChat рендерится как модальное окно поверх экрана
6. Пользователь может закрыть чат, нажав на кнопку "назад"
7. При закрытии вызывается `handleCloseChat()`, который скрывает модальное окно

## Преимущества этого подхода:

✅ **Модальное окно** - чат открывается поверх текущего экрана, не меняя навигацию
✅ **Плавная анимация** - CosmicChat имеет встроенные анимации появления
✅ **Легко закрыть** - кнопка "назад" сразу возвращает к карточкам
✅ **Не теряется контекст** - карточка dating остается на месте
✅ **Быстрый доступ** - можно открыть чат одним нажатием

## Альтернативный вариант (навигация на отдельный экран):

Если вы хотите, чтобы чат открывался как отдельный экран в стеке навигации:

```typescript
const handleMessage = () => {
  if (!current) return;

  navigation.navigate('CosmicChat', {
    user: {
      name: current.name,
      zodiacSign: current.zodiacSign,
      compatibility: getCompatibilityFromBadge(current.badge),
    },
  });
};
```

Но тогда нужно будет:

1. Зарегистрировать CosmicChat как отдельный screen в навигаторе
2. Получать props через route.params
3. Использовать navigation.goBack() вместо onClose

## Что нужно проверить:

1. Убедитесь, что путь импорта CosmicChat правильный: `'../components/CosmicChat'`
2. Проверьте, что все зависимости установлены (react-native-reanimated, expo-linear-gradient)
3. CosmicChat использует overlay с position: absolute и zIndex: 1000

## Возможные улучшения:

1. Добавить передачу реального userId для загрузки истории сообщений
2. Интегрировать с API для отправки/получения реальных сообщений
3. Добавить уведомления о новых сообщениях
4. Сохранять состояние чата при переключении между карточками
