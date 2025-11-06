# 🚀 Шпаргалка - Быстрый старт

## ⚡ Установка за 5 минут

### 1. Скопировать файлы

```bash
# В корне проекта
cp outputs/DatingScreen.tsx src/screens/
cp outputs/ChatDialogScreen.tsx src/screens/
cp outputs/ChatListScreen.tsx src/screens/
```

### 2. Настроить Supabase

```sql
-- SQL в Supabase SQL Editor
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  content TEXT,
  media_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages" ON messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Dashboard → Database → Replication → Enable для messages
```

### 3. Добавить в навигатор

```typescript
// App.tsx или Navigator.tsx
<Stack.Screen name="ChatDialog" component={ChatDialogScreen} />
<Stack.Screen name="ChatList" component={ChatListScreen} />
```

### 4. Готово!

```bash
npm start
```

---

## 💻 Код для копирования

### Открыть чат из DatingScreen

```typescript
// В DatingScreen.tsx

// 1. Добавить состояния
const [chatVisible, setChatVisible] = useState(false);
const [selectedUser, setSelectedUser] = useState(null);

// 2. Функция открытия
const handleMessage = () => {
  if (!current) return;
  setSelectedUser({
    name: current.name,
    zodiacSign: current.zodiacSign,
    compatibility: 85,
  });
  setChatVisible(true);
};

// 3. Рендер модального окна
{chatVisible && selectedUser && (
  <CosmicChat
    visible={chatVisible}
    user={selectedUser}
    onClose={() => setChatVisible(false)}
  />
)}
```

### Открыть чат программно

```typescript
// Из любого места
navigation.navigate('ChatDialog', {
  otherUserId: 'user-uuid',
  displayName: 'Имя пользователя',
  primaryPhotoUrl: 'https://...',
});
```

### Отправить сообщение через API

```typescript
import { chatAPI } from '../services/api';

const sendMessage = async () => {
  try {
    const response = await chatAPI.sendMessage(
      recipientId, // UUID получателя
      'Привет!', // Текст
      null // Медиа (пока null)
    );
    console.log('Sent:', response.id);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Загрузить сообщения

```typescript
import { chatAPI } from '../services/api';

const loadMessages = async () => {
  try {
    const messages = await chatAPI.listMessages(
      otherUserId, // UUID собеседника
      100 // Лимит
    );
    console.log('Messages:', messages);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Подписаться на Realtime

```typescript
import { supabase } from '../services/supabase';

useEffect(() => {
  if (!user?.id) return;

  const channel = supabase
    .channel(`messages-${user.id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        console.log('New message:', payload.new);
        // Добавить в список сообщений
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id]);
```

---

## 🔍 Быстрая диагностика

### Проверить авторизацию

```typescript
const { user } = useAuth();
console.log('User:', user?.id);
// Должен быть UUID
```

### Проверить API

```bash
# В терминале
curl http://localhost:3000/api/chat/messages?userId=UUID
```

### Проверить Realtime

```typescript
// В консоли браузера → Network → WS
// Должен быть подключен WebSocket
```

### Проверить БД

```sql
-- В Supabase SQL Editor
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;
```

---

## 🎯 Основные функции

### chatAPI методы

```typescript
// 1. Список диалогов
const conversations = await chatAPI.listConversations(50);

// 2. Сообщения диалога
const messages = await chatAPI.listMessages(userId, 100);

// 3. Отправить сообщение
const response = await chatAPI.sendMessage(recipientId, text, null);
```

### Навигация

```typescript
// Открыть список чатов
navigation.navigate('ChatList');

// Открыть диалог
navigation.navigate('ChatDialog', {
  otherUserId: 'uuid',
  displayName: 'Имя',
  primaryPhotoUrl: 'url',
});

// Вернуться назад
navigation.goBack();
```

---

## 🐛 Частые ошибки

### "Требуется авторизация"

```typescript
// Проверьте:
const { user } = useAuth();
if (!user) {
  // Redirect to login
}
```

### "Сообщения не загружаются"

```typescript
// Проверьте:
1. user не null
2. otherUserId правильный
3. API отвечает
4. Токен валиден
```

### "Realtime не работает"

```sql
-- Проверьте в Supabase:
Database → Replication → messages (должен быть включен)
```

### "Дублируются сообщения"

```typescript
// Уже реализовано:
setMessages((prev) => {
  if (prev.some((x) => x.id === m.id)) return prev;
  return [...prev, newMessage];
});
```

---

## 📋 Чек-лист запуска

**Backend:**

- [ ] Supabase проект создан
- [ ] Таблица messages создана
- [ ] RLS включен и настроен
- [ ] Realtime включен
- [ ] API endpoints работают

**Frontend:**

- [ ] Файлы скопированы
- [ ] Навигация настроена
- [ ] useAuth работает
- [ ] API URL правильный
- [ ] Зависимости установлены

**Тестирование:**

- [ ] Открывается ChatDialog
- [ ] Загружаются сообщения
- [ ] Отправляется сообщение
- [ ] Получается сообщение
- [ ] Realtime работает

---

## 🎨 Быстрая кастомизация

### Изменить цвет сообщений

```typescript
// ChatDialogScreen.tsx → styles
bubbleMine: {
  backgroundColor: '#YOUR_COLOR', // Свои сообщения
}
bubbleOther: {
  backgroundColor: '#YOUR_COLOR', // Чужие сообщения
}
```

### Изменить частоту обновлений

```typescript
// ChatDialogScreen.tsx
setInterval(() => {
  fetchMessages();
}, 3000); // Каждые 3 секунды вместо 5
```

### Добавить лимит сообщений

```typescript
// ChatDialogScreen.tsx → fetchMessages
const items = await chatAPI.listMessages(otherUserId, 50); // Вместо 100
```

---

## 🔧 Полезные команды

### Логирование

```typescript
// Включить подробные логи
console.log('🔍 [Component] Message:', data);
console.log('✅ [Success] Done!');
console.log('❌ [Error] Failed:', error);
```

### React Native Debugger

```bash
# Установка
brew install --cask react-native-debugger

# Запуск
react-native-debugger

# В приложении: Cmd+D (iOS) / Cmd+M (Android)
# → Debug → Enable Remote JS Debugging
```

### Очистка кеша

```bash
# Metro bundler
watchman watch-del-all
rm -rf node_modules
rm -rf $TMPDIR/react-*
npm install
npm start -- --reset-cache
```

---

## 📱 Тестовый сценарий

### Минимальный тест (1 минута)

1. **Запустить приложение**

   ```bash
   npm start
   ```

2. **Авторизоваться**
   - Email + Password
   - Должен получить токен

3. **Открыть ChatDialog**

   ```typescript
   navigation.navigate('ChatDialog', {
     otherUserId: 'test-uuid',
   });
   ```

4. **Отправить сообщение**
   - Написать "Test"
   - Нажать Send
   - Должно появиться в чате

5. **Проверить БД**
   ```sql
   SELECT * FROM messages WHERE content = 'Test';
   ```

✅ Если все работает - готово!

---

## 🆘 Быстрая помощь

### Ошибка авторизации

```typescript
// Очистить токен и перезайти
import { tokenService } from './services/tokenService';
await tokenService.clearToken();
// Перезайти в приложение
```

### API не отвечает

```bash
# Проверить доступность
curl http://localhost:3000/api/health

# Если не отвечает:
cd backend
npm start
```

### Realtime не подключается

```typescript
// Проверить статус
const channel = supabase.channel('test');
channel.subscribe((status) => {
  console.log('Status:', status); // Должно быть 'SUBSCRIBED'
});
```

---

## 📞 Ресурсы

- [Полная документация](computer:///mnt/user-data/outputs/README.md)
- [Устранение проблем](computer:///mnt/user-data/outputs/TROUBLESHOOTING.md)
- [Архитектура](computer:///mnt/user-data/outputs/ARCHITECTURE.md)

---

## ✨ Готово!

Теперь у вас работающий чат за 5 минут! 🎉

**Следующие шаги:**

1. Прочитать [README.md](computer:///mnt/user-data/outputs/README.md)
2. Протестировать все функции
3. Кастомизировать под свой дизайн
4. Добавить дополнительные функции

---

**Версия:** 1.0.0  
**Дата:** 2024
