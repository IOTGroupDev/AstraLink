# Prisma ORM Configuration для AstraLink

## Структура базы данных

### Модели

**User** - Пользователи

- `id` (Int, @id @default(autoincrement))
- `email` (String, @unique)
- `password` (String)
- `name` (String?)
- `birthDate` (DateTime?)
- `birthTime` (String?)
- `birthPlace` (String?)
- `role` (String, default: "user")
- `createdAt` (DateTime, default now())
- `updatedAt` (DateTime, updatedAt)

**Chart** - Астрологические карты

- `id` (Int, @id @default(autoincrement))
- `userId` (Int, FK → User)
- `data` (Json)
- `createdAt` (DateTime, default now())
- `updatedAt` (DateTime, updatedAt)

**Connection** - Связи между пользователями

- `id` (Int, @id @default(autoincrement))
- `userId` (Int, FK → User)
- `targetName` (String)
- `targetData` (Json)
- `createdAt` (DateTime, default now())

**DatingMatch** - Совместимость для знакомств

- `id` (Int, @id @default(autoincrement))
- `userId` (Int, FK → User)
- `candidateData` (Json)
- `compatibility` (Int)
- `liked` (Boolean, default false)
- `rejected` (Boolean, default false)
- `createdAt` (DateTime, default now())

**Subscription** - Подписки пользователей

- `id` (Int, @id @default(autoincrement))
- `userId` (Int, @unique, FK → User)
- `tier` (String, default: "free")
- `startedAt` (DateTime, default now())
- `expiresAt` (DateTime?)

## Команды

### Генерация клиента

```bash
npm run prisma:generate
```

### Миграции

```bash
npm run prisma:migrate
```

### Заполнение тестовыми данными

```bash
npm run prisma:seed
```

### Prisma Studio

```bash
npm run prisma:studio
```

## Тестовые данные

Сидер создает:

- 1 пользователя (test@test.com / password)
- 1 натальную карту с фиктивными данными
- 1 связь с другим человеком
- 2 кандидата для знакомств
- 1 премиум подписку

## Переменные окружения

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/astralink?schema=public"
```

## Схема файлов

```
prisma/
├── schema.prisma    # Схема базы данных
└── seed.ts         # Сидер для тестовых данных
```
