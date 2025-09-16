# 🚀 Быстрый старт AstraLink

## 1. Установка

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd AstraLink

# Установите все зависимости
npm run install:all
```

## 2. Запуск базы данных

```bash
# Запустите PostgreSQL через Docker
docker-compose up postgres -d

# Создайте схему базы данных
cd backend
npx prisma db push
cd ..
```

## 3. Запуск приложения

```bash
# Запустите все сервисы одновременно
npm run dev
```

Или по отдельности:

```bash
# Backend (терминал 1)
npm run backend:dev

# Frontend (терминал 2)  
npm run frontend:dev
```

## 4. Открытие приложения

- **Backend API**: http://localhost:3001
- **Swagger документация**: http://localhost:3001/api/docs
- **Frontend**: Откройте Expo Go на телефоне и отсканируйте QR код

## 5. Тестирование

1. Откройте приложение на телефоне
2. Зарегистрируйтесь или войдите
3. Изучите экраны: Моя Карта, Связи, Dating

## 🔧 Устранение проблем

### Backend не запускается
- Проверьте, что PostgreSQL запущен
- Убедитесь, что порт 3001 свободен
- Проверьте переменные окружения

### Frontend не подключается к API
- Убедитесь, что backend запущен на порту 3001
- Проверьте настройки CORS в backend

### База данных недоступна
- Запустите `docker-compose up postgres -d`
- Проверьте подключение: `docker-compose logs postgres`

## 📱 Поддержка платформ

- ✅ iOS (Expo Go)
- ✅ Android (Expo Go)  
- ✅ Web (браузер)

## 🆘 Нужна помощь?

Смотрите полную документацию в [README.md](./README.md)
