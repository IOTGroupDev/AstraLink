# AstraLink Docker Setup

Проект использует Docker для контейнеризации и поддерживает два режима запуска:

- **Development**: с локальным PostgreSQL
- **Production**: с Supabase PostgreSQL (managed database)

## Архитектура

### Production (VPS)

```
Internet → Nginx (SSL) → Backend (NestJS) → Supabase PostgreSQL
                              ↓
                         Redis (Docker)
```

### Development (Local)

```
localhost:3000 → Backend (NestJS) → PostgreSQL (Docker)
                      ↓
                 Redis (Docker)
```

## Сервисы

| Сервис       | Development | Production  | Назначение          |
| ------------ | ----------- | ----------- | ------------------- |
| **postgres** | ✅ Docker   | ❌ Supabase | База данных         |
| **redis**    | ✅ Docker   | ✅ Docker   | Кэш и очереди       |
| **backend**  | ✅ Docker   | ✅ Docker   | NestJS API          |
| **nginx**    | ❌          | ✅ Docker   | Reverse proxy + SSL |
| **certbot**  | ❌          | ✅ Docker   | SSL сертификаты     |

## Быстрый старт

### Development (локальная разработка)

1. **Скопируйте example конфигурацию:**

```bash
cp .env.development.example .env
```

2. **Запустите с локальным PostgreSQL:**

```bash
docker-compose --profile development up -d
```

Это запустит:

- PostgreSQL на `localhost:5432`
- Redis на `localhost:6379`
- Backend на `localhost:3000`

3. **Выполните миграции:**

```bash
docker-compose exec backend npx prisma migrate deploy
```

### Production (VPS)

1. **Скопируйте production конфигурацию:**

```bash
cp .env.production.example .env
```

2. **Настройте переменные в `.env`:**

```bash
# Supabase Database URL (получите из dashboard)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Supabase credentials
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Domain и SSL
DOMAIN=api.yourdomain.com
SSL_EMAIL=admin@yourdomain.com
```

3. **Первоначальная настройка VPS:**

```bash
sudo bash scripts/vps-setup.sh
```

4. **Запустите production стек:**

```bash
docker-compose --profile production up -d
```

Это запустит:

- Redis (кэш)
- Backend (API)
- Nginx (reverse proxy + SSL)
- Certbot (SSL certificates)

5. **Выполните миграции в Supabase:**

```bash
docker-compose exec backend npx prisma migrate deploy
```

## Управление

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f nginx
```

### Остановка

```bash
# Development
docker-compose --profile development down

# Production
docker-compose --profile production down
```

### Перезапуск

```bash
docker-compose restart backend
docker-compose restart nginx
```

### Выполнение команд в контейнере

```bash
# Prisma Studio
docker-compose exec backend npx prisma studio

# NestJS CLI
docker-compose exec backend npm run start:dev

# Shell в контейнере
docker-compose exec backend sh
```

## Бэкапы

### Автоматические бэкапы

```bash
# Запустить бэкап вручную
bash scripts/backup.sh

# Настроить cron для автоматических бэкапов
crontab -e
# Добавить: 0 2 * * * /opt/astralink/scripts/backup.sh
```

**Важно:** PostgreSQL бэкапы управляются Supabase автоматически. Скрипт делает бэкап только Redis и uploads.

### Восстановление из бэкапа

**Redis:**

```bash
docker cp backups/redis/redis_TIMESTAMP.rdb astralink-redis:/data/dump.rdb
docker-compose restart redis
```

**База данных:**

- Используйте Supabase Dashboard: https://supabase.com/dashboard/project/[PROJECT-ID]/database/backups
- Или используйте Point-in-Time Recovery (PITR)

## Deployment

### Автоматический (через GitHub Actions)

```bash
# Push в main триггерит автоматический деплой
git push origin main
```

### Ручной

```bash
# На VPS
cd /opt/astralink
bash scripts/deploy.sh
```

## Переменные окружения

### Обязательные (Production)

- `DATABASE_URL` - Supabase connection string
- `JWT_SECRET` - JWT signing key
- `DOMAIN` - Ваш домен
- `SSL_EMAIL` - Email для Let's Encrypt

### Опциональные

- `ANTHROPIC_API_KEY` - Claude AI
- `OPENAI_API_KEY` - OpenAI GPT
- `DEEPSEEK_API_KEY` - DeepSeek AI
- `REDIS_PASSWORD` - Redis пароль (рекомендуется)

## Troubleshooting

### Backend не может подключиться к Supabase

```bash
# Проверьте DATABASE_URL
docker-compose exec backend printenv DATABASE_URL

# Проверьте доступность Supabase
docker-compose exec backend nc -zv [SUPABASE-HOST] 6543
```

### SSL сертификат не получен

```bash
# Проверьте DNS
dig +short $DOMAIN

# Проверьте порты
sudo ufw status

# Перезапустите certbot
docker-compose --profile production run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email $SSL_EMAIL --agree-tos -d $DOMAIN
```

### Redis connection refused

```bash
# Проверьте пароль
docker-compose exec backend printenv REDIS_URL

# Проверьте Redis
docker-compose exec redis redis-cli ping
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping
```

## Мониторинг

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Production (через nginx)
curl https://api.yourdomain.com/health
```

### Использование ресурсов

```bash
docker stats

# Или конкретный контейнер
docker stats astralink-backend
```

### Логи nginx

```bash
docker-compose logs nginx | grep -i error
```

## Безопасность

- ✅ Все сервисы в изолированной Docker сети
- ✅ Backend работает от non-root пользователя
- ✅ SSL/TLS через Let's Encrypt
- ✅ Rate limiting в nginx
- ✅ Security headers (HSTS, CSP, etc.)
- ✅ Firewall (ufw) настроен в vps-setup.sh
- ✅ Fail2ban для защиты от брутфорса

## Дополнительно

### Обновление зависимостей

```bash
cd backend
npm update
docker-compose build backend
docker-compose up -d backend
```

### Масштабирование backend

```bash
# Запустить несколько инстансов (требует настройки nginx upstream)
docker-compose up -d --scale backend=3
```

### Очистка

```bash
# Удалить неиспользуемые образы
docker image prune -a

# Удалить все (ВНИМАНИЕ: удалит volumes!)
docker-compose down -v
```
