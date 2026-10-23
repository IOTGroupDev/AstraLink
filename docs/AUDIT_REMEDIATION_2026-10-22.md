# Проверка и исправление присланного аудита AstraLink

Проверка начата 22 октября, обновлена 23 октября 2026 года. Источник — присланный `Pasted text.txt`, аудит от 13 октября; SHA-256 `91fec2222a8bcc9e7b45a5f501e301237474f294855563c3252a4e2d147eb1eb`.

Проверены все 54 исходные находки. **41 — исправлена в рабочем коде или уже была исправлена; 12 — частично закрыты; 1 — устарела (MAX/Premium).** Готовность к production не подтверждается одной сборкой: ротация ключей, IAP и baseline остаются условиями релиза. Здесь «готово» относится к конкретной исходной находке; устройство, внешние среды и выпуск отмечены отдельно.

Изменения сделаны постепенно поверх существующего рабочего дерева; чужие изменения не откатывались. Backend и frontend не развёртывались, платежи и удаления реальных аккаунтов не выполнялись. Две добавочные миграции текущего пакета применены в Supabase после изолированной проверки, см. ниже. Секреты и персональные данные в отчёт не включены.

## Реестр 54 находок

| ID        | Приоритет | Проверенный статус                                                                                                             | Исходный пункт                                                                                                  |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| OPS-001   | P0        | Частично: файл исключён из Git; ротация ключей и очистка истории ещё не выполнены                                              | service_role-ключ Supabase и пароль БД в репозитории (запушены на GitHub)                                       |
| OPS-002   | P1        | Частично: runtime audit backend 0 critical / 3 high, frontend 0 critical / 28 high                                             | Уязвимости runtime-зависимостей backend: 2 critical, 29 high                                                    |
| OPS-003   | P1        | Готово: автоматический legacy deploy отключён, prepare job заблокирован                                                        | deploy.yml устарел и опасен: миграции из CI на каждый push в main и несуществующий compose-профиль              |
| OPS-004   | P2        | Частично: live introspection и UUID-типы исправлены; полный baseline ещё нужен                                                 | Дрейф схемы: Prisma-миграции не создают реальные таблицы                                                        |
| OPS-005   | P2        | Частично: ошибки типов/тестов/audit блокируют jobs, actions закреплены; remote CI/EAS не запускались                           | CI не блокирует ошибки frontend; iOS-workflow сломан; проверки безопасности не гейтят                           |
| OPS-006   | P2        | Готово: production API api.astralink.vip, корректный приоритет env и CORS в Compose                                            | Три разных API-домена в конфигурации                                                                            |
| OPS-007   | P3        | Частично: proxy/IP, порты БД, ignore исправлены; Git/release, monitoring и backup расписание не подтверждены                   | Незакоммиченные prod-изменения и гигиена репозитория                                                            |
| OPS-008   | P3        | Готово: example и validation согласованы, включая DeepSeek                                                                     | .env.production.example противоречит валидации env                                                              |
| BE-001    | P0        | Готово: OAuth identity проверяется по Supabase token, есть регрессионные тесты                                                 | Публичные OAuth-callback-и принимают user.id из тела без проверки токена                                        |
| BE-002    | P0        | Готово: mock-активация закрыта, Stripe-подтверждение проверяется сервером                                                      | Mock-оплата выдаёт Premium/MAX любому пользователю                                                              |
| BE-003    | P1        | Готово: storage ownership проверяется до подписи, подтверждения и удаления                                                     | IDOR по storage-путям фото: можно удалить или подменить чужие фото                                              |
| BE-004    | P1        | Готово: admin endpoints и analytics защищены AdminGuard                                                                        | Административные операции доступны любому авторизованному пользователю                                          |
| BE-005    | P1        | Готово: непрерывный backoff, атомарный Lua limiter, 503 при отказе Redis                                                       | Redis после 5 неудачных попыток больше не переподключается; лимиты работают fail-open                           |
| BE-006    | P1        | Готово: conversation filter/order/cursor до LIMIT, точность до микросекунд                                                     | Диалог чата берёт 100 произвольных сообщений пользователя без фильтра и сортировки                              |
| BE-007    | P2        | Готово: одна проверка токена на один HTTP-request без межзапросного auth cache                                                 | SupabaseAuthGuard выполняется дважды на запрос, без кэша                                                        |
| BE-008    | P2        | Готово: connections/natal используют Supabase, отдельная JWT strategy отключена                                                | Две схемы проверки токена; connections и natal скорее всего всегда отвечают 401 в prod                          |
| BE-009    | P2        | Готово: runtime DTO auth/profile/chart/connections/chat/dating/AI/personal-code                                                | Тела запросов без валидации (interface/any вместо DTO-классов)                                                  |
| BE-010    | P2        | Готово: ensure-profile не принимает email/identity как доказательство из тела                                                  | /auth/ensure-profile доверяет email из тела: захват email                                                       |
| BE-011    | P2        | Готово: persistence отключён на сервере, OTP verification использует отдельный клиент                                          | Серверный анонимный singleton-клиент Supabase используется для данных и может «впитать» пользовательскую сессию |
| BE-012    | P2        | Готово: per-user лимит и общий deadline до 30с на вызов каждого provider, вложенные retries отключены                          | AI-эндпоинты без per-user лимита и таймаутов; лимит из env не используется                                      |
| BE-013    | P2        | Готово: Redis cache, общий Nominatim lease, offline geo-tz и исторический offset                                               | Публичный geo-прокси: один запрос даёт до 9 внешних вызовов, без кэша и лимита                                  |
| BE-014    | P2        | Готово: PostgreSQL visibility + lazy перенос Redis, явная текущая схема messages                                               | Скрытые сообщения хранятся только в Redis без TTL; чат угадывает схему таблицы                                  |
| BE-015    | P2        | Готово: карточка и список mutual matches учитывают блокировки                                                                  | Карточка dating-профиля отдаётся любому пользователю без учёта блокировок                                       |
| BE-016    | P2        | Готово: LOG_LEVEL применяется, birth values и fingerprint удалены из соответствующих logs                                      | LOG_LEVEL не подключён; debug-логи с birth-данными пишутся в prod                                               |
| BE-017    | P2        | Устарело: MAX нормализуется в Premium, отдельного продаваемого тарифа MAX нет                                                  | Stripe: MAX и Premium оплачиваются одной ценой                                                                  |
| BE-018    | P3        | Готово: shutdown hooks включены, HSTS управляется HTTPS proxy                                                                  | Не включены shutdown hooks; HSTS preload в приложении                                                           |
| BE-019    | P3        | Готово ранее: logout смонтирован отдельно, OAuth completion не является logout                                                 | Метод logout смонтирован как POST /auth/complete-signup-OAuth                                                   |
| AUTH-001  | P0        | Готово: complete-signup защищён и работает только для verified owner                                                           | POST /auth/complete-signup публичный и берёт userId из тела                                                     |
| AUTH-002  | P1        | Готово: ошибка восстановления профиля не отправляет существующего пользователя в onboarding                                    | Существующий пользователь попадает в онбординг при сбое загрузки профиля на холодном старте                     |
| AUTH-003  | P2        | Готово: AppState auto-refresh и один API retry после refresh без смены владельца запроса                                       | Нет startAutoRefresh/stopAutoRefresh по AppState; 401 не повторяется после refresh                              |
| AUTH-004  | P2        | Готово: общий QueryClient, отмена запросов, очистка query cache и persisted stores                                             | Принудительный сброс сессии не чистит react-query и persisted-stores                                            |
| AUTH-005  | P2        | Готово по исходным пробелам: отчёты/cache/Storage/Auth, 5xx и повтор, отмена продления Stripe до удаления                      | Пробелы в удалении аккаунта                                                                                     |
| AUTH-006  | P2        | Готово в коде: Apple nonce и full_name; device sign-in ещё не принимался                                                       | Sign in with Apple без nonce; fullName не сохраняется                                                           |
| AUTH-007  | P2        | Частично: production key обязателен и keyring поддерживается; прежний ключ старых профилей не найден                           | DATA_ENCRYPTION_KEY необязателен: без ключа запись birth-данных молча идёт в plaintext, а старые не читаются    |
| AUTH-008  | P3        | Частично: native SecureStore с миграцией AsyncStorage и решение в AGENTS; web CSP на хостинге не подтверждён                   | Хранилище сессии: SecureStore на native и localStorage на web при развёрнутой web-сборке                        |
| ASTRO-001 | P0        | Готово: descending mean node = ascending +180°, версия и cache обновлены                                                       | «Южный узел» на самом деле True North Node: показан в знаке Северного                                           |
| ASTRO-002 | P1        | Готово: UTC+0, IANA historical offset, дробные пояса и отказ для DST gap                                                       | Зоны UTC+0 (Лондон, Лиссабон, Рейкьявик, Западная Африка) зимой считаются как UTC+3                             |
| ASTRO-003 | P1        | Готово: нет молчаливой Москвы/времени; 12:00 только явно обозначенный unknown-time reference                                   | Молчаливые подстановки: Москва и 12:00 по умолчанию, приближённый пояс по долготе                               |
| ASTRO-004 | P1        | Готово: persisted birth_time_known, без домов/углов/их AI; реальный диапазон Луны за сутки                                     | Неизвестное время рождения: дома и Асцендент считаются и показываются для 12:00                                 |
| ASTRO-005 | P0        | Готово: случайные транзиты удалены, при сбое отображается ошибка                                                               | CosmicSimulator при ошибке API показывает выдуманные транзиты с Math.random()                                   |
| ASTRO-006 | P2        | Готово: одноимённые cross-chart пары, aspect weights и корректные summary counts                                               | Синастрия: исключены одноимённые пары, веса аспектов не применяются                                             |
| ASTRO-007 | P2        | Готово: native house indexing, Placidus→Porphyry при polar error, без фиктивных домов                                          | Фиктивные дома при ошибке swe_houses; код ошибки и система домов не проверяются                                 |
| ASTRO-008 | P2        | Готово: все ephe files, native source/mode metadata, readiness 503 при неполных данных                                         | Fallback на Moshier и отсутствие файлов не отражаются в результате                                              |
| ASTRO-009 | P2        | Частично: новые JSON birth metadata шифруются; старый plaintext backfill требует нового backend и проверенных ключей           | Birth-данные в plaintext в charts.data и compatibility_reports                                                  |
| ASTRO-010 | P3        | Готово для новых расчётов: locale в fortune/synastry/composite/reports, dedupe учитывает язык и версию                         | Интерпретации, захардкоженные на русском, в мультиязычном приложении                                            |
| ASTRO-011 | P3        | Готово: общий versioned transit cache с точным интервалом без userId                                                           | Кэш транзитов привязан к userId, хотя данные не персональные                                                    |
| MOB-001   | P0        | Частично: test key убран, production iOS Stripe purchase закрыт; StoreKit/IAP/Restore ещё не реализованы                       | iOS: цифровая подписка продаётся через Stripe, IAP нет; в prod-конфиге тестовый ключ Stripe                     |
| MOB-002   | P2        | Готово: locale headers разрешены, проверен настоящий HTTP preflight                                                            | Web-сборка: CORS не разрешает заголовок x-locale, preflight всех API-запросов падает                            |
| MOB-003   | P2        | Готово: подгрузка ранней истории без повторного открытия диалога                                                               | Чат: нет пагинации истории, список не inverted                                                                  |
| MOB-004   | P3        | Частично: release name/purpose strings исправлены, bundle ID сохранён по AGENTS; Store configuration требует отдельной приёмки | Конфиг релиза: тестовые имя и bundle id, лишние и стандартные purpose-строки                                    |
| MOB-005   | P3        | Готово: автоматическая синхронизация не запрашивает разрешение, запрос только по действию в профиле                            | Разрешение на push запрашивается сразу при входе в онбординг, без контекста                                     |
| MOB-006   | P3        | Готово: один настроенный QueryClient, mutation retry отключён                                                                  | Два QueryClient; сконфигурированный не используется                                                             |
| MOB-007   | P3        | Частично: lazy lesson locales, удалены неиспользуемые пакеты/копии; большой рефакторинг экранов не завершён                    | Крупные файлы и дублирующиеся зависимости                                                                       |
| MOB-008   | P3        | Частично: исходные примеры, auth API errors и новые режимы переведены; весь UI ещё требует языковой приёмки                    | Захардкоженные русские строки в UI                                                                              |

## Что изменено по шагам

### 1. Доступ, авторизация и запросы

- `backend/.env.migration` исключён из Git index с сохранением локального файла. `.env.*`, локальные backups и диагностические выгрузки игнорируются. Старые значения остаются в истории Git и требуют отзыва.
- Проверенные Supabase identity/app_metadata используются для OAuth, complete-signup, ensure-profile и admin guards. Analytics тоже защищена. Connections/natal больше не зависят от JWT_SECRET; отдельная JWT strategy убрана из AuthModule.
- Повторные guards используют WeakMap для одного объекта HTTP-request и того же Bearer token. Между запросами токены не кэшируются, поддельный request.user не заменяет проверку токена.
- Тела auth/profile/chart/connections/chat/dating/AI/personal-code теперь DTO-классы с runtime validation, ограничениями дат, UUID, размеров, координат и enum.
- Серверные Supabase-клиенты не сохраняют auth-сессии. OTP verification создаёт изолированный клиент; совместное состояние сессии не переносится между запросами.

Основные файлы: `backend/src/auth`, `backend/src/common/dto/request-validation.dto.ts`, `backend/src/analytics/analytics.controller.ts`, `backend/src/supabase/supabase.service.ts`.

### 2. Redis, AI, geo и IP

- Redis продолжает переподключение после любого числа отказов с backoff до 5 секунд. Лимитер меняет счётчик и TTL атомарно в Lua, при недоступном Redis возвращает 503 для защищённых операций.
- `MAX_AI_REQUESTS_PER_HOUR` применяется на пользователя. Один вызов provider имеет общий бюджет до 30 секунд на свои попытки, поддерживает отмену; вложенные SDK retries отключены. Failover между разными providers может занять больше одного такого бюджета.
- Geo использует Redis cache, общий lease с интервалом 1.1 секунды, timeout Nominatim и локальный `geo-tz`. Поиск не вызывает внешний timezone API для каждого кандидата. При проблемах не придумывается неизвестный город или пояс по долготе.
- Express получает настраиваемый `TRUST_PROXY`; auth guards используют `req.ip`, сырой X-Forwarded-For больше не позволяет выбирать ключ лимитера. Для конкретной production сети следует задать точные доверенные CIDR.
- `LOG_LEVEL` применяется к Nest; старые/new birth values и fingerprint в соответствующих логах убраны. Добавлены shutdown hooks и `/api/v1/health/ready`; отсутствие ephe files, DB или Redis делает readiness неуспешным, liveness остаётся отдельной проверкой.

### 3. Расчёты

- Mean ascending node использует Swiss ID 10, descending node вычисляется как +180°. Новая `nodes-utc-houses-v3` отделяет исправленные карты, planet/transit/synastry cache от старых результатов.
- UTC+0 больше не превращается в UTC+3. Offset берётся на историческую дату рождения, включая дробные зоны. Несуществующее местное время при DST gap не подменяется другим поясом.
- Дома читаются по фактическому native массиву из 12 cusps. Если Placidus недоступен в полярной области, рассчитывается настоящий Porphyry и система указывается в metadata. Фиктивные дома исключены.
- При неизвестном времени явно используется 12:00 как приблизительная reference-точка для планет; дома, ASC/MC, Part of Fortune и зависящие от времени интерпретации не выдаются. Луна имеет диапазон реального движения за местные сутки. Признак сохраняется в `users.birth_time_known` и учитывается при первом параллельном bootstrap и пересчёте.
- Исправлены same-planet synastry pairs, применение весов, подсчёт аспектов в summary. Язык прокинут в новые расчётные описания. Новые отчёты записывают язык и версию расчёта, дедупликация не возвращает вместо них старый результат другой версии/языка.
- CosmicSimulator при ошибке API показывает ошибку без Math.random fallback. Неперсональные транзиты используют общий cache с точным интервалом.

Изменятся положения Южного узла, дома полярных карт, UTC-смещения и итоговые scores/интерпретации. Старые карты обновляются существующим механизмом пересчёта при чтении; массовый backfill не запускался. Профилям с неизвестным старым encryption key может потребоваться восстановление ключа или повторный ввод исходных данных.

### 4. Chat и dating

- Conversation filter, stable sort и composite cursor применяются до LIMIT; timestamp cursor сохраняет микросекунды PostgreSQL. Сбой БД больше не выглядит как пустой диалог.
- В ChatDialog есть загрузка предыдущих страниц, сохранение позиции и объединение с realtime-данными. Ранее внесённый realtime catch-up при подписке/reconnect/AppState сохранён.
- Delete-for-me хранится в PostgreSQL. Старые Redis entries переносятся при обращении владельца, cache очищается только после успешной записи. После переноса сброс Redis не воскрешает скрытую переписку. При отказе записи не возвращается ложный success.
- Карточка профиля и mutual matches учитывают блокировки. Сохранены ранее исправленные половые фильтры, like RPC, photo upload/confirm и повторный показ просмотренных/лайкнутых анкет по «Обновить».

### 5. Сессии, удаление и чувствительные данные

- На 401 выполняется не более одного повтора после refresh и только для того же владельца запроса. Нельзя повторить старый запрос от имени другого аккаунта. AppState управляет auto-refresh.
- При invalidation/deletion отменяются query-запросы, очищается общий QueryClient и persisted stores. Native Supabase storage переносит legacy AsyncStorage session в SecureStore и удаляет обе копии при logout. Решение зафиксировано в AGENTS.md.
- Apple использует raw nonce/SHA-256, сохраняет full_name первого разрешения.
- До удаления локальных данных останавливается продление Stripe. Удаляются compatibility reports и опциональные FOMO counters, Storage проходит все страницы/папки, очищаются пользовательские cache keys. Ошибки Storage/Redis/Auth дают 5xx; повтор работает и после удаления DB-профиля. Распределённая durable deletion saga пока не добавлена; при незавершённом внешнем шаге требуется повтор того же DELETE, API не объявляет успех.
- Production требует DATA_ENCRYPTION_KEY. Новые JSON-записи карт и partner birth documents шифруют исходные дату, время, UTC datetime и координаты/место; внутренние сервисы читают их через совместимую гидратацию. Старые JSON поддерживаются, но не были массово переписаны. Полнота шифрования старых данных поэтому ещё не подтверждена.

### 6. Mobile, платежи и CI

- Используется один QueryClient; mutation retry отключён. Автоматическая push-синхронизация проверяет уже выданное разрешение; системный prompt вызывается только после действия «Уведомления» в профиле.
- Встроенный pk_test убран. `app.config.ts` принимает публичные build env, проверяет HTTPS и запрещает test Stripe key в production. Production iOS не открывает Stripe-покупку цифровой подписки; development/preview сохраняют возможность проверки при настроенном ключе. **StoreKit, server verification и Restore ещё не реализованы.** Это ограничение до готовности IAP, а не работающая альтернативная оплата.
- Production display name — AstraLink. Bundle ID и EAS project ID сохранены. Gallery permission описана явно, неиспользуемые camera/microphone permission для image picker отключены.
- Уроки загружают базу выбранной локали при обращении. Убраны неиспользуемые `react-native-vector-icons`, dotlottie web library, expo-location, backend nodemailer/nestjs-i18n; TypeScript уже в devDependencies. Обе используемые navigation-библиотеки сохранены. Большие экраны ещё не разложены на небольшие компоненты, image-cache migration не выполнена.
- Переведены MagicLinkWaiting, EnergyIndicator, DateTimePicker, auth API fallback errors, новые unknown-time/push/payment сообщения. Ключи ru/en/es совпадают. Общий языковой аудит всех веток интерфейса ещё не завершён; логовые строки, контрактные enum и неиспользуемые demo/debug компоненты нельзя механически заменять переводами.
- CI проверяет типы/тесты без маскировки ошибок. Security audit получает настоящий exit code; отчёт сохраняется при сбое. TruffleHog и Trivy закреплены на проверенные SHA (`v3.99.4`, `v0.36.0`), CodeQL использует javascript-typescript. Production branch protection и удалённые workflow runs не проверены; iOS coverage threshold не снижался.

## Supabase / Prisma: применено и не применено

Добавлены и применены после replay-теста в изолированном PostgreSQL:

1. `supabase/migrations/20261022203008_persist_chat_visibility.sql`: две backend-only таблицы с RLS и FK owner→auth.users ON DELETE CASCADE; anon/authenticated не получили доступ.
2. `supabase/migrations/20261022205031_persist_birth_time_known.sql`: nullable boolean без изменения старых дат/времени и без массовой подстановки флага.

Версии локальных файлов сверены с Supabase ledger. Live SELECT подтвердил nullable boolean, включённый RLS и отсутствие client privileges для новых таблиц. Ранее применённые like/realtime миграции сохранены.

Read-only `prisma db pull --print` получил 51 модель; снимок сохранён вне Git в `/tmp/astralink-live-introspection-20261023.prisma`. У introspection обнаружен дублирующий виртуальный relation alias `messages.users`; только в диагностической копии он нормализован для сравнения. Начальный diff содержал 756 строк, 22 CREATE TABLE, 55 ALTER TABLE, 1 DROP TABLE и 17 DROP COLUMN. **Этот SQL не выполнялся и не является готовой миграцией.**

Десять Prisma ID/userId-полей получили @db.Uuid по фактической live схеме. Прямые read-only Prisma запросы к chart, connection, datingMatch, subscription, userPhoto, userProfile прошли. Изменение client metadata не меняло типы колонок базы.

Автоматические `prisma migrate deploy` при startup и legacy deploy отключены; отдельный Docker target migrations подготовлен для контролируемого release после baseline. Нельзя запускать migrate dev/reset/db push на этой базе по текущей исторической цепочке. Нужны воспроизводимый Supabase baseline с RLS/RPC/storage, staging restore и согласование migration ledger; Supabase-managed auth DDL нельзя переносить как обычные app-миграции.

## Проверки

**Финальный полный прогон: backend 528/528 тестов (38 suites), frontend 121/121 (17 suites).** Backend build, frontend TypeScript, Prisma validate/generate прошли. ESLint: 0 ошибок, 4 предупреждения о неиспользуемых объявлениях; они не скрывались настройкой проверки.

- Backend build, Prisma validate/generate, unit/integration regression, ESLint; frontend tsc и Jest. Полный AppModule дополнительно компилируется в изолированном DI-тесте с заменёнными DB/Supabase/Redis/queue providers; он обнаружил и закрыл отсутствующий импорт SupabaseModule в ConnectionsModule.
- Native Swiss: Sun(JD2451545)≈280.3689°, узлы +180°, UTC+0/DST, house1=ASC, polar Porphyry, unknown-time lunar range и отсутствие домов.
- Настоящий HTTP CORS preflight с Authorization, x-locale и Accept-Language.
- Isolated PostgreSQL: replay новых migrations, RLS/ACL, auth-user deletion cascade. Live metadata verification без изменения пользовательских строк.
- Expo Doctor: 21/21; Expo web export прошёл. Совместимый patch expo-notifications обновлён до SDK57-required версии.
- Compose config проверен с синтетическими переменными без запуска приложений/подключения к production. Без переменных обычный config закономерно требует DATABASE_URL; это не тест запуска среды.

Команды повторной локальной проверки:

```bash
cd backend
npm run build
npm run lint:check
npm test -- --runInBand
npx prisma validate
npx prisma generate
cd ../frontend
npx tsc --noEmit
npm test -- --runInBand
npx expo-doctor
```

Из корня: `bash backend/test/chat-visibility.sh`. Для реального выпуска отдельно нужны iOS device regression и EAS build; они не запускались. `docker compose up --build` также не запускался с реальными production env.

## Остаток и порядок следующего этапа

| Порядок | ID                         | Что именно осталось                                                                                     | Критерий закрытия                                                                                                     |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1       | OPS-001                    | Ротация service-role/DB credentials и обновление Dokploy/EAS; старые значения в истории                 | Старые credentials отозваны, все среды работают с новыми, история и копии очищены согласованным способом              |
| 2       | AUTH-007, ASTRO-009        | Доступ к прежнему ключу и контролируемый backfill старых birth документов после доставки нового backend | Все подлежащие записи читаются проверенным keyring, backup/rollback проверены, новые и старые plaintext copies учтены |
| 3       | MOB-001, MOB-004           | Реальные App Store products, StoreKit, server verification, Restore, native QA                          | Sandbox purchase/renewal/cancel/refund/restore подтверждаются сервером; store release проходит приёмку                |
| 4       | OPS-004                    | Воспроизводимый baseline и staging restore                                                              | Новая изолированная среда содержит app schema, RLS, RPC, storage; migration ledger согласован без destructive diff    |
| 5       | OPS-002, OPS-005           | Совместимые исправления остатка зависимостей, реальные CI/EAS проверки                                  | Пройден security gate без скрывания ошибок; major migrations отдельно протестированы; branch protection проверена     |
| 6       | AUTH-008, OPS-006, OPS-007 | Production web CSP, фактические proxy CIDR/hosts, monitoring и backup расписание                        | Заголовки и routing проверены на реальном хосте, мониторинг принимает ошибки, restore из backup выполнен              |
| 7       | MOB-007, MOB-008           | Последовательное выделение UI-модулей, image caching, языковая приёмка                                  | Небольшие отдельно проверяемые изменения экранов, ru/en/es проверены на устройстве без смешивания языков              |

Ротация ключей и App Store configuration недоступны через предоставленные операции Supabase/локального репозитория; этот этап не имитировался изменением SQL или фиктивными SKU. База, платежи и история Git не подвергались разрушительным «автоисправлениям».

## Заключение

Основные подтверждённые дефекты доступа, Redis limits, фото/dating/chat, исходных расчётов и сессии исправлены и покрыты проверками. **Полный исходный аудит ещё не закрыт: остаются 12 частично выполненных пунктов.** Релиз платной iOS-версии и автоматические миграции пока не считаются готовыми. Дальнейшая работа разбита по конкретным исходным ID и критериям приёмки выше.

Источники для внешних требований: [Apple App Review Guidelines, §3.1](https://developer.apple.com/app-store/review/guidelines/#business), [Apple In-App Purchase / Restore](https://developer.apple.com/in-app-purchase/), [GitHub CodeQL: javascript-typescript](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning).
