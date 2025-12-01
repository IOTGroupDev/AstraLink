# Мультиязычность (i18n) в AstraLink

## 📋 Обзор

В приложение AstraLink добавлена поддержка мультиязычности для трех языков:
- 🇬🇧 **English (en)** - Английский
- 🇪🇸 **Español (es)** - Испанский
- 🇷🇺 **Русский (ru)** - Русский

## 🏗️ Архитектура

### Frontend (React Native)
- **Библиотека**: `i18next` + `react-i18next`
- **Конфигурация**: `/frontend/src/i18n.ts`
- **Переводы**: `/frontend/src/locales/{lang}/{module}.json`

### Backend (NestJS)
- **Библиотека**: `nestjs-i18n`
- **Переводы**: `/backend/src/locales/{lang}/errors.json`

## 📁 Структура файлов

```
frontend/src/locales/
├── en/
│   ├── common.json      # Общие элементы (кнопки, ошибки)
│   ├── auth.json        # Аутентификация
│   ├── dating.json      # Знакомства
│   ├── profile.json     # Профиль
│   ├── chat.json        # Чат
│   ├── horoscope.json   # Гороскоп
│   └── index.ts         # Экспорт всех модулей
├── es/
│   └── ...
└── ru/
    └── ...

backend/src/locales/
├── en/
│   └── errors.json
├── es/
│   └── errors.json
└── ru/
    └── errors.json
```

## 🚀 Использование

### В React Native компонентах

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{t('auth.login.title')}</Text>
      <Text>{t('common.buttons.ok')}</Text>
      <Text>{t('auth.login.biometricLogin', { type: 'FaceID' })}</Text>
    </View>
  );
}
```

### Смена языка

```typescript
import { useTranslation } from 'react-i18next';
import { setStoredLanguage } from '../i18n';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await setStoredLanguage(lang);
  };

  return (
    <Button onPress={() => changeLanguage('es')}>Español</Button>
  );
}
```

### В Alert сообщениях

```typescript
Alert.alert(
  t('common.errors.generic'),
  t('auth.errors.loginFailed')
);
```

## 📝 Примеры переводов

### Common (Общие)
```json
{
  "buttons": {
    "ok": "OK",
    "cancel": "Cancel"
  },
  "errors": {
    "generic": "Error"
  }
}
```

### Auth (Аутентификация)
```json
{
  "login": {
    "title": "Login",
    "email": "Email",
    "password": "Password"
  }
}
```

## ✅ Уже реализовано

- ✅ Установка и настройка i18next
- ✅ Создание структуры переводов (en/es/ru)
- ✅ Переводы для всех основных модулей:
  - common, auth, dating, profile, chat, horoscope
- ✅ Компонент выбора языка (LanguageSelector)
- ✅ Интеграция в ProfileScreen
- ✅ Рефакторинг WelcomeScreen (пример использования)
- ✅ Автоопределение языка устройства
- ✅ Сохранение выбранного языка в AsyncStorage

## 🔄 TODO (Дальнейшие шаги)

### Frontend
- [ ] Рефакторинг DatingScreen для использования i18n
- [ ] Рефакторинг ProfileScreen для использования i18n
- [ ] Рефакторинг ChatDialogScreen для использования i18n
- [ ] Рефакторинг HoroscopeScreen для использования i18n
- [ ] Рефакторинг остальных экранов:
  - OnboardingScreens
  - NatalChartScreen
  - SubscriptionScreen
  - AdvisorChatScreen
- [ ] Добавить переводы для компонентов:
  - DatingCard
  - HoroscopeWidget
  - NatalChartWidget
- [ ] Обновить App.tsx для отображения "Loading..." на выбранном языке

### Backend
- [ ] Настроить nestjs-i18n модуль
- [ ] Рефакторить chart.service.ts для использования i18n
- [ ] Рефакторить supabase-auth.service.ts
- [ ] Добавить Accept-Language header detection
- [ ] Сохранять язык пользователя в БД (таблица users)

### База данных
- [ ] Добавить поле `preferred_language` в таблицу `users`
- [ ] Миграция для существующих пользователей (дефолт: 'en')

## 🧪 Тестирование

1. Запустите приложение
2. Перейдите в Profile → Settings
3. Нажмите на Language Selector
4. Выберите язык (English / Español / Русский)
5. Проверьте, что экран входа (WelcomeScreen) отображается на выбранном языке
6. Перезапустите приложение - язык должен сохраниться

## 📦 Добавление нового языка

1. Создайте папку `/frontend/src/locales/{lang_code}/`
2. Скопируйте все JSON файлы из `/en/`
3. Переведите содержимое
4. Добавьте импорт в `/frontend/src/i18n.ts`:
   ```typescript
   import fr from './locales/fr';
   // ...
   resources: {
     en: { translation: en },
     es: { translation: es },
     ru: { translation: ru },
     fr: { translation: fr }, // новый язык
   }
   ```
5. Добавьте в `LanguageSelector.tsx`:
   ```typescript
   { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }
   ```

## 🎨 Примеры использования в коде

### Простой перевод
```typescript
<Text>{t('auth.login.title')}</Text>
```

### С переменными (интерполяция)
```typescript
<Text>{t('profile.subtitle', { name: user.name })}</Text>
```

### Множественное число (плюрализация)
```json
{
  "hoursRemaining": "{{count}} hour remaining",
  "hoursRemaining_plural": "{{count}} hours remaining"
}
```
```typescript
<Text>{t('hoursRemaining', { count: hours })}</Text>
```

## 🔗 Полезные ссылки

- [i18next документация](https://www.i18next.com/)
- [react-i18next](https://react.i18next.com/)
- [nestjs-i18n](https://nestjs-i18n.com/)

## 👥 Поддержка

Если у вас возникли вопросы по реализации мультиязычности, создайте issue в репозитории.
