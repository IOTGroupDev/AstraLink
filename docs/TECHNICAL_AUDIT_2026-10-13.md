# Технический аудит AstraLink

Дата: 13 октября 2026 года. База: commit `1fd19ff` и текущее рабочее дерево с существующими незакоммиченными изменениями.

## Вывод и границы

Backend собирается, frontend проходит проверку типов и имеющиеся unit-тесты. Архитектура сохраняет NestJS-модули, Supabase Auth, Prisma, Redis и Swiss Ephemeris. При этом backend-тесты и lint не проходят; в платежах, выборке чата и Docker-конфигурации есть подтверждённые дефекты. Успешная сборка не подтверждает готовность production-развёртывания.

Проверены исходники, manifests, Prisma schema, Docker/startup, CI и локальные проверки с уже установленными зависимостями. Не выполнялись установка с чистого lockfile, миграции, запуск Docker, EAS, нагрузочные тесты или запросы в production. Секреты и содержимое пользовательских резервных копий не включены. Состояние применённых миграций, RLS и RPC в Supabase не подтверждено. Это технический аудит, а не полноценный penetration test или проверка актуальных CVE.

Приоритеты: **P0** — блокирует платный запуск; **P1** — отказ инфраструктуры/ключевого сценария; **P2** — сопровождаемость, точность контрактов и качество.

## Фактические результаты

| Проверка                                          | Результат                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| `cd backend && npm run build`                     | Успешно: Nest build + tsc-alias                                            |
| `cd frontend && ./node_modules/.bin/tsc --noEmit` | Успешно                                                                    |
| `cd frontend && npm test -- --runInBand --silent` | 10 наборов, 75 тестов — все прошли                                         |
| `cd backend && npm test -- --runInBand --silent`  | Exit 1; 5 failed / 8 passed наборов; 3 failed / 110 passed тестов          |
| Backend ESLint без `--fix`                        | Exit 1; 3 ошибки форматирования, 4 предупреждения                          |
| Локальный native Swiss Ephemeris                  | Модуль загрузился; позиции объектов 10/11 рассчитаны с локальным ephe path |
| Docker / Prisma migrate / EAS / реальные платежи  | Не запускались                                                             |

Backend Jest: `chart.service.spec.ts` и `subscription.service.spec.ts` не компилируются из-за вызовов `mockResolvedValue*` на методах с обычным Prisma-типом (TS2339); `auth/supabase-auth.service.spec.ts` не содержит тестов; `app.controller.spec.ts:19` ждёт `Hello World!`, получает `Hello AstraLink!`; падает также `services/ai.service.spec.ts`. Числа тестов относятся только к наборам, где тесты смогли запуститься.

ESLint: ошибки `prettier/prettier` в `backend/src/dating/dating.service.ts:904–906`; предупреждения в `services/ai/prompt-style.ts`, `services/interpretation.service.ts` и `subscription/subscription.service.ts`. Автоисправления не применялись, чтобы не менять существующие рабочие изменения пользователя.

## Архитектурная основа

- `backend/src/app.module.ts`: функциональные модули, очереди, events, глобальные ThrottlerGuard и SupabaseAuthGuard.
- `backend/src/main.ts`: `/api/v1`, whitelist/forbidNonWhitelisted ValidationPipe, Helmet, compression, rawBody для webhook, Swagger только по флагу в dev.
- `backend/src/auth/guards/supabase-auth.guard.ts`: проверяет Bearer через Supabase, public metadata, разрешает OPTIONS, заполняет auth context.
- `backend/src/prisma/prisma.service.ts`: общий injectable PrismaClient, retry подключения, health check, disconnect; `RedisModule` глобальный.
- Frontend: React Navigation, Zustand, Supabase session, AsyncStorage/SecureStore; `services/api/client.ts` прикрепляет Bearer и обрабатывает 401 с учётом текущей session.
- `backend/Dockerfile`: multi-stage, native toolchain в сборке, non-root runtime и dumb-init.
- Файлы `sepl_18.se1`, `semo_18.se1`, `seas_18.se1` присутствуют в `backend/ephe`; fallback Moshier объявлен явно. Наличие файлов не подтверждает полноту расчётов для любых дат и объектов.

## Реестр проблем

### T-01 · P0 · Сервер доверяет mock-оплате без ограничения среды

**Источник:** `subscription.controller.ts`, `upgrade()`; `subscription.service.ts:363`, `processMockPayment()` (720), `processPaidPayment()`.

Mock вызывает реальную запись entitlement. Проверки среды или подтверждения провайдера в этой цепочке нет. Неизвестный способ оплаты контроллер также нормализует в mock.

**Исправление:** запретить mock в production на уровне service, отклонять неизвестные методы; выдавать entitlement на основе проверенной операции. Тест должен подтвердить отсутствие DB-записи при отказе. Пользовательский эффект описан в F-02 функционального аудита.

### T-02 · P0 · Локальная отмена не синхронизирует Stripe

**Источник:** `subscription.service.ts:993`, `cancel()`.

Обновляет Prisma и Redis, но не провайдера. **Исправление:** получить активную Stripe-подписку пользователя, установить отмену продления у провайдера, синхронизировать ответ/webhook. Не подтверждать отмену при отказе Stripe. Удаление аккаунта также следует проверить на активные биллинговые обязательства: в `user.service.ts` не найдена интеграция со Stripe для их закрытия.

### T-03 · P1 · Создание подписки неидемпотентно

**Источник:** `subscription.service.ts:431`, `confirmStripePayment()`; `schema.prisma`, модель Payment.

Каждый повтор создаёт Stripe subscription; отсутствует idempotency key и регистрация обработанного SetupIntent. `Payment.stripeSessionId` не уникален, `findFirst` + `create` не обеспечивает защиту от гонки. Выдача подписки и запись платежа в отдельных операциях также допускают частичное состояние.

**Исправление:** стабильный ключ операции, контроль повторов в DB, переиспользование customer, транзакционное обновление локальных записей и восстановление после внешнего успеха/локального отказа. Уникальность платёжного идентификатора требует сначала анализа и устранения дублей, затем миграции; не накладывать ограничение вслепую.

### T-04 · P1 · Docker не передаёт необходимые настройки интеграций

**Источник:** `docker-compose.yml`, `backend/prisma/schema.prisma:10`, `backend/scripts/start.sh`, `backend/src/config/cors.config.ts:20`.

У backend нет `env_file`; явный `environment` не содержит `DIRECT_URL`, `ALLOWED_ORIGINS`, `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`. Корневой `.env` используется Compose для подстановок, но сам по себе не передаёт все переменные контейнеру. Prisma schema использует `env("DIRECT_URL")`; старт по умолчанию вызывает `prisma migrate deploy`. CORS production читает ALLOWED_ORIGINS, а compose передаёт FRONTEND_URL.

**Последствие:** стандартный контейнерный путь не получает direct URL для миграций и конфигурацию Stripe; браузерные запросы с Origin отклоняются без allowlist. Внешняя инъекция Dokploy может изменить результат, она не проверялась.

**Исправление:** явно передавать необходимые переменные и валидировать их по включённым функциям. Для Supabase разделить pooler URL runtime и direct URL миграций, проверить параметры подключения. Не публиковать реальные значения в документах.

### T-05 · P1 · BACKEND_PORT изменяет внутренний и внешний порт несовместимо

**Источник:** `docker-compose.yml:79,97`; health check использует 3000.

`PORT=${BACKEND_PORT:-3000}`, но ports mapping — `${BACKEND_PORT:-3000}:3000`. При BACKEND_PORT=3001 приложение слушает 3001 внутри, проброс и health check обращаются к 3000.

**Исправление:** фиксировать внутренний PORT=3000 и изменять внешний порт либо согласованно параметризовать все обращения. Проверить запуск с нестандартным внешним портом.

### T-06 · P1 · CORS не разрешает обязательный заголовок клиента

**Источник:** `frontend/src/services/api/client.ts:208`; `backend/src/config/cors.config.ts`, оба allowedHeaders.

Клиент отправляет `x-locale`; allowlist его не содержит ни в dev, ни в production. Даже при правильном Origin браузерный preflight не разрешает этот заголовок.

**Исправление:** согласовать контракт заголовков, добавить x-locale либо отказаться от него в пользу поддерживаемого заголовка. Проверить OPTIONS с `Access-Control-Request-Headers: authorization,content-type,x-locale`. На нативный HTTP-транспорт браузерный CORS не распространяется.

### T-07 · P1 · Ошибка модели лунных узлов

**Источник:** `backend/src/services/ephemeris.service.ts`, `planetNames`; установленная `swisseph/lib/swisseph.js`.

11 — TRUE_NODE, а не южный узел. Локальная проверка для 1990-01-01 12:00 UTC: объект 10 = 318.43498371138435°, объект 11 = 316.8702736106922°.

**Исправление:** использовать именованные константы, явно выбрать тип северного узла, вывести южный через 180°. Добавить проверку инварианта и сравнение с эталоном, определить версию расчёта и инвалидировать затронутые карты/AI-кэш. Воздействует на натальные данные, аспекты и зависящие от них интерпретации; схему менять автоматически не требуется.

Дополнительно `modules/swiss/swiss.service.ts` теряет скорость (`speed: 0`), а `modules/swiss/swiss.controller.ts` создаёт Date без timezone: результат endpoint зависит от TZ процесса. Требуется явный UTC/offset контракт и проверка одинакового результата в разных TZ. Основной natal-путь нельзя автоматически считать затронутым этим парсингом.

### T-08 · P1 · LIMIT применяется до фильтрации диалога

**Источник:** `chat/chat.service.ts:490`, `listDialogMessages()`.

`select('*').limit(...)` без server-side фильтра и сортировки, затем фильтрация собеседника в памяти. Выборка не гарантирует актуальную порцию диалога. Ошибка Supabase возвращается как `[]`, поэтому отказ выглядит как пустой чат.

**Исправление:** закрепить схему колонок, фильтровать участников до LIMIT, сортировать по created_at/ID, добавить cursor и отличать ошибку от пустой истории. Проверить несколько диалогов и отказ БД.

### T-09 · P1 · Удаление не имеет надёжного завершения внешних стадий

**Источник:** `user/user.service.ts:733`, `deleteAccount()` и обработка authError после транзакции.

DB-транзакция не охватывает Supabase Auth/Storage. Их ошибки журналируются, но endpoint может закончиться успехом. Общий catch также сообщает «изменения откатаны» даже для ошибки после завершения транзакции.

**Исправление:** durable job/outbox или другое сохраняемое состояние удаления, идемпотентные стадии и retries, проверка финального результата. Возможная новая таблица/статус требует отдельной миграции и retention-плана.

### T-10 · P1 · Backend проверки не проходят, frontend CI скрывает ошибки

**Источник:** результаты Jest/ESLint выше; `.github/workflows/ci.yml`, frontend-test/frontend-lint.

Frontend test запускается с `npm test || echo "No tests found"` и `continue-on-error: true`: реальная регрессия может оставить workflow успешным. Lint аналогично проглатывает ошибки; в `frontend/package.json` вообще нет scripts lint/build, хотя root предлагает `frontend:lint` и `frontend:build`.

**Исправление:** убрать подавление ошибок для обязательных проверок, типизировать Prisma mocks, актуализировать ожидания тестов и заменить пустой suite полезной проверкой. Frontend release проверять соответствующим Expo/EAS-процессом, не ссылаться на отсутствующий npm build. Это аудит конфигурации CI; реальные GitHub checks не запрашивались.

### T-11 · P2 · Chat DTO не получает полноценную runtime-валидацию

**Источник:** `chat/chat.controller.ts`, `SendMessageBody` и `CreateChatMediaUploadUrlBody` объявлены interface; limit преобразуется parseInt.

Interfaces стираются во время выполнения и не дают ValidationPipe декораторы проверки. Нечисловой limit превращается в NaN; тип recipientId и размер текста явно не ограничены DTO.

**Исправление:** классы DTO с валидаторами UUID/строк/лимитов и Swagger; типизированный auth request. Дополнительно унифицировать Bearer parsing: глобальный guard допускает пробелы и Bearer%20, а `ChatController.getAccessToken()` использует простой split и может отвергнуть уже прошедший guard запрос.

### T-12 · P2 · Слишком крупные файлы и слабая end-to-end проверка

**Источник:** `NatalChartScreen.tsx` — 4294 строки, `ProfileScreen.tsx` — 1394; `dating.service.ts` — 1508, `user.service.ts` — 1158, `subscription.service.ts` — 1096. `tests/e2e/app.spec.ts` проверяет только непустой body; Playwright настроен на Desktop Chrome.

**Исправление:** постепенно выделять вычисления/хуки и подкомпоненты в рамках исправлений; добавить реальные сценарии auth/onboarding/chat/subscription. Smoke test не доказывает работоспособность приложения и не заменяет мобильную проверку. Переписывать весь проект не требуется.

## Вопросы, требующие отдельного подтверждения

- Prisma управляет моделями `auth` и `public`. Перед migrate deploy проверить SQL миграций и границы владения Supabase-managed auth schema. В этом аудите миграции не применялись.
- В репозитории несколько SQL-каталогов (`backend/prisma/migrations`, `backend/migrations`, `supabase/migrations`). Prisma startup применяет только свой путь: нужен единый реестр того, как доставляются RPC/RLS и Storage policies.
- ChatService содержит RPC, подбор названий колонок и admin fallback. Проверить каждую ветку на staging с двумя пользователями, без match и после блока. Эксплуатация или обход RLS не утверждаются без проверки действующих политик.
- Root и frontend имеют отдельные app.json/eas.json. Определить рабочую директорию сборки, сравнить проект и профиль; EAS project и bundle identifier в аудите не изменялись.
- Для Alpine проверить Prisma engine, OpenSSL и native swisseph именно внутри образа. Успех native-модуля на хосте этого не гарантирует.
- DATA_ENCRYPTION_KEY, plaintext backfill/cleanup и backup restore требуют проверки на копии данных; необратимую очистку не выполнять без завершённого backfill и восстановления из backup.

## Порядок исправления и команды

1. Платежи: T-01/T-02/T-03; тесты повторов, отказа провайдера и trial.
2. Развёртывание: T-04/T-05/T-06; staging с полной конфигурацией.
3. Данные: T-07/T-08/T-09; пересчёт, пагинация и fault injection.
4. Качество: T-10/T-11; затем постепенная декомпозиция T-12.

Без миграций и внешних изменений:

```bash
(cd backend && npm run build)
(cd backend && ./node_modules/.bin/eslint '{src,apps,libs,test}/**/*.ts')
(cd backend && npm test -- --runInBand)
(cd frontend && npx tsc --noEmit)
(cd frontend && npm test -- --runInBand)
```

После подготовки конфигурации в тестовом окружении:

```bash
(cd backend && npx prisma generate)
docker compose up --build
(cd frontend && eas build --platform ios --profile preview)
```

`npx prisma migrate deploy` выполнять только против согласованного окружения после просмотра SQL и backup; `migrate dev` предназначен для отдельной development БД. Docker startup уже запускает deploy, поэтому даже `docker compose up --build` может изменить указанную в DATABASE_URL БД. Сборку EAS проводить после проверки выбранного проекта и provisioning.

Создание этого отчёта не меняет код приложения или схему БД. Локальная сборка обновляет генерируемые build-артефакты. Пользовательские последствия и критерии приёмки: [функциональный аудит](FUNCTIONAL_AUDIT_2026-10-13.md).

## Дополнение после проверки живого Supabase

Live каталог подтверждает RLS/grants проблемы cache/reports, default authenticated CRUD, RPC/schema drift, пустую Realtime publication, отсутствие analytics tables и неполный lifecycle Storage. Все 11 checksum завершённых Prisma-миграций совпадают; unresolved failed migrations нет. Дубли payments относятся к sub\_\*: уникальность необходимо проектировать по invoice/event, а не запрещать повтор подписки в истории. P0 Auth подтверждены в исходниках; совпадение deployed версии не установлено.

Доказательства, матрицы прав, агрегаты и проверки: [доскональный аудит Supabase](SUPABASE_AUDIT_2026-10-13.md). Рекламное описание возможностей: [функционал для рекламы](ASTRALINK_MARKETING_FEATURES_2026-10-13.md).
