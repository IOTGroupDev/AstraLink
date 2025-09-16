# AstraLink

Астрологическое приложение с отдельными frontend и backend проектами.

## 🚀 Технологии

### Backend
- **NestJS** - Node.js фреймворк
- **TypeScript** - Типизация
- **PostgreSQL** - База данных
- **Prisma** - ORM
- **JWT** - Аутентификация
- **Swagger** - API документация

### Frontend
- **Expo** - React Native платформа
- **React Navigation** - Навигация
- **TypeScript** - Типизация
- **Linear Gradient** - 3D эффекты
- **Axios** - HTTP клиент

## 📁 Структура проекта

```
AstraLink/
├── backend/                 # NestJS API сервер
│   ├── src/
│   │   ├── auth/           # Аутентификация
│   │   ├── prisma/         # Prisma сервис
│   │   ├── types/          # TypeScript типы
│   │   └── main.ts         # Точка входа
│   ├── prisma/
│   │   └── schema.prisma   # Схема базы данных
│   └── Dockerfile
├── frontend/               # Expo React Native приложение
│   ├── src/
│   │   ├── screens/        # Экраны приложения
│   │   ├── navigation/     # Навигация
│   │   ├── services/       # API сервисы
│   │   └── types/          # TypeScript типы
│   └── App.tsx
├── docker-compose.yml      # Docker конфигурация
└── package.json           # Корневые скрипты
```

## 🛠 Установка и запуск

### 1. Установка зависимостей

```bash
# Установить все зависимости
npm run install:all

# Или по отдельности
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Настройка базы данных

#### Вариант 1: Docker (рекомендуется)

```bash
# Запустить PostgreSQL через Docker
docker-compose up postgres -d

# Создать схему базы данных
cd backend
npx prisma db push
```

#### Вариант 2: Локальная PostgreSQL

1. Установите PostgreSQL
2. Создайте базу данных `astralink`
3. Скопируйте `.env.example` в `.env` в папке backend
4. Обновите `DATABASE_URL` в `.env`

### 3. Запуск приложения

#### Запуск всех сервисов одновременно

```bash
npm run dev
```

#### Запуск по отдельности

```bash
# Backend (порт 3001)
npm run backend:dev

# Frontend (Expo)
npm run frontend:dev
```

## 📱 Функциональность

### Аутентификация
- Регистрация пользователей
- Вход в систему
- JWT токены
- Защищенные маршруты

### Основные экраны
- **Моя Карта** - Персональная астрологическая карта
- **Связи** - Астрологические связи с другими людьми
- **Dating** - Поиск партнеров по совместимости

### API Endpoints

#### Аутентификация
- `POST /api/auth/signup` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/profile` - Профиль пользователя

#### Планируемые API
- `GET /api/chart` - Астрологические карты
- `GET /api/connections` - Связи пользователей
- `GET /api/dating` - Dating функциональность

## 🔧 Разработка

### Линтинг и форматирование

```bash
# Проверить код
npm run lint

# Форматировать код
npm run format
```

### Сборка

```bash
# Собрать backend
npm run backend:build

# Собрать frontend
npm run frontend:build
```

## 🐳 Docker

### Запуск с Docker

```bash
# Запустить все сервисы
docker-compose up

# Только PostgreSQL
docker-compose up postgres -d
```

## 📚 API Документация

После запуска backend, Swagger документация доступна по адресу:
http://localhost:3001/api/docs

## 🔐 Переменные окружения

### Backend (.env)
```
DATABASE_URL="postgres://user:password@localhost:5432/astralink"
JWT_SECRET="supersecret"
PORT=3001
NODE_ENV=development
```

## 📱 Мобильное приложение

Приложение поддерживает:
- iOS (через Expo Go)
- Android (через Expo Go)
- Web (через браузер)

## 🚀 Развертывание

### Backend
1. Настройте переменные окружения
2. Соберите проект: `npm run backend:build`
3. Запустите: `npm run start:prod`

### Frontend
1. Соберите проект: `npm run frontend:build`
2. Опубликуйте в Expo: `npx expo publish`

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для функции
3. Внесите изменения
4. Создайте Pull Request

## 📄 Лицензия

MIT License
