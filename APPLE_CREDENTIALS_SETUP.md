# Настройка Apple Developer креденшалов для EAS

## Проблема

При попытке собрать или отправить iOS приложение через EAS Build/Submit возникает ошибка:

```
Apple 401 detected - You are either not logged in, your account doesn't have access
to the requested data, or the page doesn't exist
Authentication credentials are missing or invalid. - No valid credentials found in the request.
```

## Причина

EAS требует аутентификацию с Apple Developer для сборки и публикации iOS приложений. Есть несколько способов предоставить эти креденшалы.

## Решения

### Вариант 1: Интерактивная авторизация (Рекомендуется для разработки)

Это самый простой способ. При первой сборке EAS запросит у вас войти в ваш Apple Developer аккаунт.

**Что сделано:**
- Убраны переменные `appleId`, `ascAppId`, `appleTeamId` из `frontend/eas.json`
- Теперь EAS будет запрашивать авторизацию интерактивно

**Использование:**
```bash
cd frontend
eas build --platform ios --profile production
# EAS попросит вас войти в Apple Developer аккаунт через браузер
```

### Вариант 2: Использование EAS Secrets (Рекомендуется для CI/CD)

Безопасное хранение креденшалов в EAS, идеально для GitHub Actions и других CI/CD систем.

**Шаги:**

1. Получите необходимые данные:
   - **APPLE_ID**: Ваш Apple ID email (например, `developer@example.com`)
   - **ASC_APP_ID**: App Store Connect App ID (найдите в App Store Connect)
   - **APPLE_TEAM_ID**: Team ID (найдите в Apple Developer Portal → Membership)

2. Сохраните секреты в EAS:
```bash
cd frontend
eas secret:create --scope project --name APPLE_ID --value "ваш@email.com"
eas secret:create --scope project --name ASC_APP_ID --value "1234567890"
eas secret:create --scope project --name APPLE_TEAM_ID --value "ABCD123456"
```

3. Обновите `frontend/eas.json`:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "${APPLE_ID}",
        "ascAppId": "${ASC_APP_ID}",
        "appleTeamId": "${APPLE_TEAM_ID}",
        "sku": "astralink-ios"
      }
    }
  }
}
```

### Вариант 3: App-Specific Password (Для автоматизации)

Для полной автоматизации (например, в GitHub Actions) также понадобится App-Specific Password.

**Шаги:**

1. Создайте App-Specific Password:
   - Перейдите на https://appleid.apple.com
   - Войдите под вашим Apple ID
   - В разделе "Security" → "App-Specific Passwords" → "Generate Password"
   - Назовите его "EAS Build" и сохраните сгенерированный пароль

2. Сохраните пароль в EAS:
```bash
eas secret:create --scope project --name EXPO_APPLE_APP_SPECIFIC_PASSWORD --value "abcd-efgh-ijkl-mnop"
```

3. Для GitHub Actions добавьте в секреты репозитория:
   - `EXPO_APPLE_ID` → ваш Apple ID
   - `EXPO_APPLE_APP_SPECIFIC_PASSWORD` → сгенерированный пароль

## Как найти необходимые ID

### Apple Team ID
1. Откройте https://developer.apple.com/account
2. Войдите в свой аккаунт
3. Перейдите в "Membership"
4. Team ID будет отображаться там (формат: `ABCD123456`)

### App Store Connect App ID (ASC App ID)
1. Откройте https://appstoreconnect.apple.com
2. Перейдите в "My Apps"
3. Выберите ваше приложение (или создайте новое)
4. В разделе "App Information" найдите "Apple ID" (это числовой ID, например `1234567890`)

## Проверка конфигурации

После настройки проверьте, что все работает:

```bash
cd frontend

# Для интерактивной авторизации
eas build --platform ios --profile production

# Или для автоматической (если настроили секреты)
eas build --platform ios --profile production --non-interactive
```

## Устранение проблем

### Ошибка: "Invalid credentials"
- Убедитесь, что используете правильный Apple ID
- Проверьте, что ваш аккаунт является частью Apple Developer Program
- Для App-Specific Password: создайте новый пароль

### Ошибка: "Team ID not found"
- Убедитесь, что вы зарегистрированы в Apple Developer Program
- Проверьте Team ID в Apple Developer Portal

### Ошибка: "App not found"
- Убедитесь, что приложение создано в App Store Connect
- Проверьте, что Bundle ID совпадает (`astralink.test`)

## Полезные ссылки

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Apple Developer Portal](https://developer.apple.com/account)
- [App Store Connect](https://appstoreconnect.apple.com)
- [App-Specific Passwords](https://support.apple.com/en-us/HT204397)
