# 🔧 Руководство по устранению проблем

## 🚨 Быстрая диагностика

### Симптом: Чат не открывается из DatingScreen

**Возможные причины:**

1. ❌ CosmicChat не импортирован
2. ❌ Состояния chatVisible/selectedUser не инициализированы
3. ❌ handleMessage не вызывается

**Решение:**

```typescript
// 1. Проверьте импорт
import CosmicChat from '../components/CosmicChat';

// 2. Проверьте состояния
const [chatVisible, setChatVisible] = useState(false);
const [selectedUser, setSelectedUser] = useState(null);

// 3. Проверьте функцию
const handleMessage = () => {
  console.log('handleMessage called'); // Добавьте для отладки
  if (!current) return;
  setSelectedUser({ ... });
  setChatVisible(true);
};

// 4. Проверьте рендер
{chatVisible && selectedUser && (
  <CosmicChat visible={chatVisible} user={selectedUser} onClose={...} />
)}
```

**Быстрый тест:**

```typescript
// Добавьте в DatingScreen для теста:
useEffect(() => {
  console.log('Chat visible:', chatVisible);
  console.log('Selected user:', selectedUser);
}, [chatVisible, selectedUser]);
```

---

### Симптом: Сообщения не загружаются

**Возможные причины:**

1. ❌ Пользователь не авторизован
2. ❌ otherUserId отсутствует
3. ❌ API endpoint недоступен
4. ❌ Токен авторизации истек

**Диагностика:**

```typescript
// Добавьте в ChatDialogScreen:
const fetchMessages = useCallback(async () => {
  console.log('1. User:', user?.id);
  console.log('2. otherUserId:', otherUserId);

  if (!otherUserId || !user) {
    console.log('❌ Missing user or otherUserId');
    return;
  }

  try {
    console.log('3. Calling API...');
    const items = await chatAPI.listMessages(otherUserId, 100);
    console.log('4. Received items:', items.length);
    setMessages(items);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}, [otherUserId, user]);
```

**Решения:**

1. **Не авторизован:**

   ```typescript
   if (!user) {
     // Redirect to login
     navigation.navigate('Auth');
   }
   ```

2. **Нет otherUserId:**

   ```typescript
   if (!otherUserId) {
     Alert.alert('Ошибка', 'Не указан собеседник');
     navigation.goBack();
   }
   ```

3. **API недоступен:**

   ```typescript
   // Проверьте URL в api.ts
   const API_BASE_URL = 'http://your-server:3000/api';

   // Проверьте доступность:
   curl http://your-server:3000/api/chat/messages?userId=xxx
   ```

4. **Токен истек:**
   ```typescript
   // В api.ts добавьте интерцептор:
   api.interceptors.response.use(
     (response) => response,
     async (error) => {
       if (error.response?.status === 401) {
         // Refresh token or redirect to login
         await tokenService.clearToken();
         navigation.navigate('Auth');
       }
       return Promise.reject(error);
     }
   );
   ```

---

### Симптом: Сообщение не отправляется

**Возможные причины:**

1. ❌ Пустое сообщение
2. ❌ sending = true (уже идет отправка)
3. ❌ Ошибка API
4. ❌ Нет интернета

**Диагностика:**

```typescript
const onSend = useCallback(async () => {
  const payload = text.trim();

  console.log('1. Text:', payload);
  console.log('2. Sending:', sending);
  console.log('3. User:', user?.id);
  console.log('4. Recipient:', otherUserId);

  if (!payload) {
    console.log('❌ Empty message');
    return;
  }

  if (sending) {
    console.log('❌ Already sending');
    return;
  }

  try {
    setSending(true);
    console.log('5. Calling API...');
    const response = await chatAPI.sendMessage(otherUserId, payload, null);
    console.log('6. Response:', response);
    // ...
  } catch (error) {
    console.error('❌ Error:', error);
    Alert.alert('Ошибка', error.message);
  } finally {
    setSending(false);
  }
}, [text, sending, otherUserId, user]);
```

**Решения:**

1. **Пустое сообщение:**
   - UI должен блокировать кнопку если `!text.trim()`
   - Проверьте стиль `sendDisabled`

2. **sending = true:**
   - Убедитесь что `setSending(false)` в `finally`
   - Проверьте что нет зацикливания

3. **Ошибка API:**

   ```typescript
   // Проверьте backend логи:
   // NestJS должен показать ошибку

   // Проверьте формат запроса:
   POST /chat/messages/send
   {
     "recipientId": "uuid",
     "text": "Hello",
     "mediaPath": null
   }
   ```

4. **Нет интернета:**

   ```typescript
   import NetInfo from '@react-native-community/netinfo';

   const checkNetwork = async () => {
     const state = await NetInfo.fetch();
     if (!state.isConnected) {
       Alert.alert('Нет интернета', 'Проверьте подключение');
       return false;
     }
     return true;
   };
   ```

---

### Симптом: Realtime не работает

**Возможные причины:**

1. ❌ Supabase Realtime не включен
2. ❌ Неправильная подписка на канал
3. ❌ RLS блокирует доступ
4. ❌ WebSocket заблокирован

**Диагностика:**

```typescript
useEffect(() => {
  if (!user?.id) {
    console.log('❌ No user ID');
    return;
  }

  console.log('1. Creating channel...');
  const channel = supabase
    .channel(`messages-dialog-${user.id}-${otherUserId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        console.log('2. Realtime event received:', payload);
        // ...
      }
    )
    .subscribe((status) => {
      console.log('3. Subscription status:', status);
    });

  return () => {
    console.log('4. Unsubscribing...');
    supabase.removeChannel(channel);
  };
}, [user, otherUserId]);
```

**Решения:**

1. **Realtime не включен:**

   ```sql
   -- В Supabase Dashboard:
   -- Database → Replication → Enable Realtime
   -- Включите для таблицы messages
   ```

2. **Неправильная подписка:**

   ```typescript
   // Убедитесь что фильтры правильные:
   .on(
     'postgres_changes',
     {
       event: 'INSERT',  // Правильно
       schema: 'public', // Правильно
       table: 'messages' // Правильно (не "message"!)
     },
     handler
   )
   ```

3. **RLS блокирует:**

   ```sql
   -- Проверьте политики:
   SELECT * FROM pg_policies WHERE tablename = 'messages';

   -- Должны быть:
   CREATE POLICY "Users can read own messages"
   ON messages FOR SELECT
   USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
   ```

4. **WebSocket заблокирован:**

   ```typescript
   // Проверьте в консоли браузера:
   // WebSocket connection to 'wss://...' failed

   // Решение: проверьте файрвол/прокси
   ```

**Важно:** Даже если Realtime не работает, polling всё равно обновит сообщения каждые 5 секунд!

---

### Симптом: Дублируются сообщения

**Причина:** Realtime и polling оба добавляют сообщение

**Решение:** Уже реализовано

```typescript
setMessages((prev) => {
  // Проверка на дубликаты
  if (prev.some((x) => x.id === m.id)) {
    console.log('Duplicate detected, skipping');
    return prev;
  }
  return [...prev, newMessage];
});
```

**Дополнительная проверка:**

```typescript
// Если всё равно дублируются, добавьте лог:
console.log(
  'Current messages:',
  messages.map((m) => m.id)
);
console.log('New message ID:', newMessage.id);
```

---

### Симптом: Клавиатура закрывает поле ввода

**Причина:** KeyboardAvoidingView не настроен правильно

**Решение:**

```typescript
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
>
  {/* content */}
</KeyboardAvoidingView>

// Также убедитесь что inputContainer имеет:
position: 'absolute',
bottom: 0,
paddingBottom: Platform.OS === 'ios' ? 32 : 16,
```

**Альтернатива:** Используйте `react-native-keyboard-aware-scroll-view`

---

### Симптом: Сообщения не сохраняются в БД

**Возможные причины:**

1. ❌ Backend не записывает в БД
2. ❌ RLS блокирует INSERT
3. ❌ Неправильный sender_id

**Диагностика:**

```sql
-- 1. Проверьте таблицу напрямую:
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

-- 2. Попробуйте вставить вручную:
INSERT INTO messages (sender_id, recipient_id, content)
VALUES ('your-user-id', 'other-user-id', 'Test message');

-- Если ошибка → проверьте политики:
-- 3. Проверьте политики:
SELECT * FROM pg_policies WHERE tablename = 'messages';
```

**Решение:**

```sql
-- Создайте правильную политику:
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Убедитесь что RLS включен:
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

**В backend (NestJS):**

```typescript
// Убедитесь что используется правильный токен:
async sendMessageWithToken(userAccessToken: string, ...) {
  const client = this.supabase.getClientForToken(userAccessToken);

  // Этот клиент будет иметь правильный auth.uid()
  const { data, error } = await client
    .from('messages')
    .insert({
      sender_id: 'должен быть auth.uid(), не параметр!',
      recipient_id: recipientId,
      content: text
    });
}
```

---

### Симптом: "Требуется авторизация" хотя вы авторизованы

**Причина:** useAuth не возвращает пользователя

**Диагностика:**

```typescript
// В любом компоненте:
const { user } = useAuth();

useEffect(() => {
  console.log('Current user:', user);
  console.log('User ID:', user?.id);
  console.log('User email:', user?.email);
}, [user]);
```

**Решения:**

1. **Токен не сохранился:**

   ```typescript
   // В AuthContext проверьте:
   const loadUser = async () => {
     const token = await tokenService.getToken();
     console.log('Token:', token);

     if (!token) {
       console.log('No token found');
       return;
     }

     // Валидация токена...
   };
   ```

2. **Токен истек:**

   ```typescript
   // Добавьте проверку:
   const isTokenValid = (token: string) => {
     try {
       const decoded = jwtDecode(token);
       const exp = decoded.exp * 1000;
       return Date.now() < exp;
     } catch {
       return false;
     }
   };
   ```

3. **useAuth не в Provider:**
   ```typescript
   // Проверьте App.tsx:
   <AuthProvider>
     <NavigationContainer>
       {/* screens */}
     </NavigationContainer>
   </AuthProvider>
   ```

---

## 🔍 Универсальный чеклист отладки

### 1. Авторизация

- [ ] `user` не null
- [ ] `user.id` существует
- [ ] Токен в AsyncStorage
- [ ] Токен валиден (не истек)
- [ ] AuthProvider обертывает приложение

### 2. API

- [ ] URL правильный (`console.log(API_BASE_URL)`)
- [ ] Backend запущен
- [ ] Endpoint отвечает (curl/Postman)
- [ ] Токен передается в headers
- [ ] Формат запроса правильный

### 3. База данных

- [ ] Таблица `messages` существует
- [ ] RLS включен
- [ ] Политики настроены
- [ ] Realtime включен
- [ ] Индексы созданы

### 4. Frontend

- [ ] Состояния инициализированы
- [ ] useEffect срабатывает
- [ ] Нет ошибок в консоли
- [ ] Импорты правильные
- [ ] Навигация работает

### 5. Realtime

- [ ] Канал создается
- [ ] Подписка активна
- [ ] Фильтры правильные
- [ ] Обработчик срабатывает
- [ ] WebSocket подключен

---

## 📱 Тестирование в разных сценариях

### Сценарий 1: Новый пользователь

```
1. Регистрация
2. Вход в приложение
3. Открыть DatingScreen
4. Нажать на иконку сообщения
✓ Должен открыться CosmicChat
```

### Сценарий 2: Отправка первого сообщения

```
1. Написать "Привет"
2. Нажать Send
✓ Сообщение появляется сразу
✓ Индикатор отправки показывается
✓ Индикатор исчезает
✓ Сообщение остается в чате
```

### Сценарий 3: Получение сообщения

```
1. Другой пользователь отправляет сообщение
✓ Сообщение появляется < 1 секунды
✓ Автопрокрутка к новому сообщению
✓ Нет дубликатов
```

### Сценарий 4: Перезагрузка приложения

```
1. Закрыть приложение
2. Открыть снова
3. Открыть ChatDialog
✓ История сообщений загружается
✓ Все сообщения на месте
✓ Порядок правильный
```

### Сценарий 5: Офлайн режим

```
1. Отключить интернет
2. Попробовать отправить сообщение
✓ Должно показать ошибку
✓ Текст не должен пропасть
✓ Предложить повтор
```

---

## 🎯 Советы по отладке

### 1. Используйте console.log обильно

```typescript
console.log('🔍 [ChatDialog] Mounting...');
console.log('👤 [ChatDialog] User:', user?.id);
console.log('📨 [ChatDialog] Messages count:', messages.length);
console.log('🚀 [ChatDialog] Sending message:', text);
console.log('✅ [ChatDialog] Message sent:', response.id);
```

### 2. React Native Debugger

```bash
# Установка:
brew install --cask react-native-debugger

# Использование:
# 1. Запустить React Native Debugger
# 2. В приложении: Cmd+D (iOS) или Cmd+M (Android)
# 3. Debug → Enable Remote JS Debugging
```

### 3. Network Inspector

```typescript
// В api.ts добавьте:
api.interceptors.request.use((request) => {
  console.log('🌐 Request:', request.method, request.url);
  return request;
});

api.interceptors.response.use((response) => {
  console.log('✅ Response:', response.status, response.data);
  return response;
});
```

### 4. Supabase Dashboard

```
1. Открыть https://app.supabase.com
2. Выбрать проект
3. Table Editor → messages
   - Проверить записи
4. Logs → Realtime
   - Проверить события
```

### 5. Chrome DevTools (для Web)

```
F12 → Network → WS (WebSocket)
- Смотрите Realtime события в реальном времени
```

---

## 🆘 Когда обращаться за помощью

Если после всех проверок проблема не решена:

1. **Соберите информацию:**
   - Версия React Native
   - Версия Supabase
   - Платформа (iOS/Android/Web)
   - Точное сообщение об ошибке
   - Логи консоли
   - Скриншоты

2. **Где спросить:**
   - GitHub Issues
   - Stack Overflow
   - Supabase Discord
   - React Native Community

3. **Как спросить:**

   ```
   Заголовок: [Chat] Messages not loading in ChatDialogScreen

   Описание:
   - Что делаете: "Открываю ChatDialog"
   - Что ожидаете: "Сообщения должны загрузиться"
   - Что получаете: "Пустой экран"
   - Что пробовали: "Проверил user, API, console.log..."
   - Логи: [вставить]
   - Код: [ссылка на gist]
   ```

---

## ✅ Контрольные точки перед продакшеном

### Функциональность

- [ ] Авторизация работает
- [ ] Сообщения загружаются
- [ ] Отправка работает
- [ ] Realtime работает
- [ ] Polling работает
- [ ] Ошибки обрабатываются

### Производительность

- [ ] Загрузка < 1 секунды
- [ ] Отправка < 200ms (визуально)
- [ ] Нет зависаний UI
- [ ] Память не течет

### Безопасность

- [ ] RLS настроен
- [ ] Токены хранятся безопасно
- [ ] SQL инъекции невозможны
- [ ] XSS защита

### UX

- [ ] Индикаторы загрузки
- [ ] Сообщения об ошибках понятны
- [ ] Пустые состояния информативны
- [ ] Анимации плавные

Готово! 🎉
