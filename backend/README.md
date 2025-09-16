# AstraLink Backend

Backend для астрологического приложения AstraLink на NestJS с Prisma ORM и PostgreSQL.

## Структура проекта

```
src/
├── main.ts                 # Точка входа
├── app.module.ts          # Корневой модуль
├── auth/                  # Модуль аутентификации
├── user/                  # Модуль пользователей
├── chart/                 # Модуль астрологических карт
├── connections/           # Модуль связей и синастрии
├── dating/               # Модуль знакомств
├── subscription/         # Модуль подписок
├── prisma/               # Prisma ORM
└── types/                # TypeScript типы
```

## API Эндпоинты

### Аутентификация
- `POST /api/auth/signup` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/profile` - Профиль текущего пользователя

### Пользователи
- `GET /api/user/profile` - Получить профиль
- `PUT /api/user/profile` - Обновить профиль

### Карты
- `GET /api/chart/natal` - Получить натальную карту
- `POST /api/chart/natal` - Сохранить натальную карту
- `GET /api/chart/transits` - Получить транзиты

### Связи
- `POST /api/connections` - Создать связь
- `GET /api/connections` - Список связей
- `GET /api/connections/:id/synastry` - Синастрия
- `GET /api/connections/:id/composite` - Композитная карта

### Знакомства
- `GET /api/dating/matches` - Список кандидатов
- `POST /api/dating/match/:id/like` - Лайк
- `POST /api/dating/match/:id/reject` - Отклонение

### Подписки
- `GET /api/subscription/status` - Статус подписки
- `POST /api/subscription/upgrade` - Обновить подписку

## Установка и запуск

### Локальная разработка

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения:
```bash
cp .env.example .env
```

3. Запустите PostgreSQL и создайте базу данных

4. Примените миграции Prisma:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Запустите сервер:
```bash
npm run start:dev
```

### Docker

1. Запустите все сервисы:
```bash
docker-compose up -d
```

2. Примените миграции:
```bash
docker-compose exec backend npx prisma migrate dev
```

## Переменные окружения

```env
DATABASE_URL="postgresql://user:password@localhost:5432/astralink"
JWT_SECRET="your-secret-key"
PORT=3000
```

## Swagger документация

После запуска сервера документация доступна по адресу:
http://localhost:3000/api/docs

## Скрипты

- `npm run start:dev` - Запуск в режиме разработки
- `npm run build` - Сборка проекта
- `npm run start:prod` - Запуск в продакшене
- `npm run prisma:generate` - Генерация Prisma клиента
- `npm run prisma:migrate` - Применение миграций
- `npm run prisma:studio` - Prisma Studio