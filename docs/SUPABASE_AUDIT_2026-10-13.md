# Доскональный аудит Supabase и интеграции AstraLink

Дата: 13 октября 2026 года. Проект **AstraLink**, ref `ayoucajwdyinyhamousz`, регион `eu-central-1`, статус Management API `ACTIVE_HEALTHY`, PostgreSQL 17.6. Проект выбран по совпадению с backend/frontend конфигурацией. Исходники: commit `1fd19ff` и существующие рабочие изменения.

## Итог

**Публичный и платный запуск требует исправления критических границ доступа.** В живом Supabase любые authenticated пользователи получают полный доступ к общему AI-кэшу и отчётам совместимости. В локальном backend дополнительно обнаружены публичные маршруты, доверяющие переданному userId и работающие через service role: они допускают чтение или изменение чужого профиля без подтверждения личности. Применимость этих backend-уязвимостей к размещённому API зависит от совпадения развёрнутой версии с исходниками; атакующие запросы не выполнялись.

Из функциональных проблем подтверждены: отсутствие Realtime-публикации сообщений, запрещённая для пользователя RPC лайка, пустое ежедневное ранжирование, расхождения контрактов RPC/таблиц, отсутствие аналитических таблиц. Найдены оставшиеся фото исчезнувших пользователей, неполный backfill шифрования, несогласованные флаги onboarding и дубли платёжных записей.

Проведён **аудит без изменения БД, политик, пользователей, объектов Storage, миграций и настроек**. Проверки — SELECT каталогов/агрегатов, read-only транзакции с фиктивным JWT subject и откатом, чтение advisories/logs и публичных Auth settings. Не выгружались реальные UUID пользователей, email, тексты сообщений, фотографии, токены или подписанные ссылки. Исходный код приложения не исправлялся.

## Степень доказанности

- **LIVE**: каталоги, grants, политики и агрегаты реально подключённого проекта.
- **LIVE+CODE**: несовместимость или нарушение следует из сочетания живой схемы и текущих исходников.
- **CODE**: подтверждённая ветка исходников; совпадение deployed backend не установлено.
- **НЕ ПРОВЕРЕНО**: отсутствует доступный инструмент настройки или нужны изменяющие интеграционные тесты.

P0 — срочное закрытие доступа/идентификации или блокер оплаты; P1 — нарушение ключевого сценария/данных; P2 — последующая надёжность, ограничения и производительность. Приоритет отражает потенциальный ущерб, а не подтверждённый факт эксплуатации.

## Главные результаты и порядок исправления

| Приоритет | Доказательство        | Проблема                                                                     | Первая мера                                                                  |
| --------- | --------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| P0        | CODE-01 / CODE        | Public complete-signup меняет профиль по переданному UUID                    | Проверять Supabase session, брать ID из неё                                  |
| P0        | CODE-02 / CODE        | OAuth callback admin-читают профиль без верификации токена                   | Проверять токен и соответствие владельца перед admin-чтением                 |
| P0        | RLS / LIVE            | AI-кэш открыт всем authenticated на полный CRUD                              | Закрыть ненужные client grants, включить RLS с согласованной моделью         |
| P0        | RLS / LIVE            | Отчёты совместимости открыты всем authenticated                              | Ограничить direct доступ и владельца; не выдавать клиенту запись результатов |
| P0        | T-01/F-02 / CODE      | Mock upgrade выдаёт платный доступ в любой среде                             | Запретить mock в production                                                  |
| P0        | T-02/F-01 / CODE      | Отмена подписки не отменяет продление в Stripe                               | Синхронизировать отмену с провайдером                                        |
| P1        | S-STOR-01 / LIVE+CODE | Произвольный photo path подписывается/удаляется админом                      | Проверять принадлежность пути во всех операциях                              |
| P1        | RT-01 / LIVE+CODE     | messages отсутствует в Realtime publication                                  | Подключить таблицу после проверки RLS и сценария двух пользователей          |
| P1        | S-RPC-01 / LIVE+CODE  | create_like нельзя выполнять authenticated; UUID/text drift                  | Исправить типы и правила, затем дать точечный EXECUTE                        |
| P1        | S-RPC-02 / LIVE       | Nightly ranking делает только perform 1                                      | Реализовать расчёт, проверять результат задания                              |
| P1        | CHAT-01 / LIVE+CODE   | Админ-создание match обходит отсутствие пользовательского INSERT             | Проверять блокировки, статус и правила начала диалога                        |
| P1        | DATA-01 / LIVE+CODE   | 86 фотообъектов с префиксами исчезнувших пользователей                       | План очистки с grace period и повтором внешних стадий                        |
| P1        | CODE-06 / LIVE+CODE   | 3 пользователя с plaintext без ciphertext; все 7 карт содержат birth context | Backfill и проверка восстановимости, определить охват шифрования             |
| P1        | PAY-01 / LIVE+CODE    | 4 группы повторных subscription ID в payments; invoice не выделен            | Разделить subscription/event/invoice и обеспечить идемпотентность            |
| P1        | MIG-01 / LIVE+CODE    | Локальная история не воспроизводит полный Supabase с нуля                    | Согласовать обе цепочки и проверить bootstrap отдельно                       |
| P2        | ANA-01 / LIVE+CODE    | feature_usage/user_fomo_counters отсутствуют                                 | Создать согласованный контракт и корректный серверный клиент                 |

Нельзя исправлять проблему RLS механическим добавлением широких owner write policies: AI-результаты, платёжные данные и вычисленные карты должны сохранять серверную целостность. Backend с service_role/Prisma необходимо проверить до отзыва прав; миграции не применялись.

## Снимок состояния

Первые проверки выполнены около 10:28 МСК; итоговый агрегат получен **10:37:00 МСК** (07:37 UTC). Проверки проходили последовательно, это не один глобальный MVCC-снимок. AI-кэш изменился с 68 до 70 строк во время аудита; аудитор ничего не записывал.

| Показатель                                                     |                 Результат |
| -------------------------------------------------------------- | ------------------------: |
| public таблицы / представления                                 |                    23 / 1 |
| RLS-политики public / storage                                  |                   43 / 12 |
| Auth users / public users / user_profiles / public_profiles    |         16 / 16 / 16 / 16 |
| Auth без public / public без Auth                              |                     0 / 0 |
| Расхождения email / имени витрины                              |                     0 / 0 |
| Несогласованные флаги onboarding                               |                         2 |
| Натальные карты                                                |                         7 |
| Карты с birthDate, birthTime, birthDateTimeUtc и location      |                         7 |
| Users с plaintext birth; без соответствующего ciphertext       |                      3; 3 |
| Users с тремя encrypted birth fields формата v1.\*             |                         7 |
| AI-кэш / истёкшие записи                                       |                   70 / 55 |
| AI-кэш без существующего пользователя                          |       2 (horoscope_daily) |
| Отчёты совместимости / compatibility_scores                    |                     5 / 0 |
| Matches / messages / likes                                     |                7 / 34 / 0 |
| Сообщения с участниками, не соответствующими match             |                         0 |
| Subscriptions: free / premium                                  |                     3 / 7 |
| Premium с истёкшим expires_at                                  |                         4 |
| Payments / повторные группы stripe_session_id                  | 9 / 4 (8 строк в группах) |
| Фотообъекты / photo rows                                       |                    96 / 9 |
| Фотообъекты без photo row / без пользователя по префиксу       |                   87 / 86 |
| Chat-media objects / без ссылки из messages.attachment_path    |                     8 / 1 |
| Edge Functions                                                 |                         0 |
| Размер БД / соединения / max_connections                       |           18 MB / 14 / 60 |
| Idle transactions / ожидающие блокировки в операционном снимке |                     0 / 0 |

Истёкшая строка premium сама по себе не доказывает выдачу доступа: сервис проверяет срок. Формат v1.\* не доказывает успешное дешифрование — секреты и plaintext не извлекались. Отсутствие photo row не означает, что объект можно сразу удалить: есть незавершённые загрузки и возможные дополнительные ссылки.

## Проверка прямой доступности API

Роль authenticated с фиктивным subject, которому не принадлежат профили, прочитала COUNT=68 из ai_content_cache и COUNT=5 из compatibility_reports; users/user_profiles COUNT=0. INSERT/UPDATE/DELETE не выполнялись: их доступность подтверждена grants, отсутствием RLS и защитных custom triggers.

Проверка REST с **anon** key, `Accept-Profile: public` и `limit=0` для обеих таблиц дала HTTP 401 / SQLSTATE 42501 `permission denied for table ...`. Это подтверждает существование маршрутов exposed public и отсутствие anonymous-grant. Сам HTTP запрос с настоящей пользовательской session не выполнялся; authenticated-доступ подтверждён ролевой проверкой PostgreSQL и каталогами. [Модель grants + RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Дополнительные подтверждённые выводы

### RT-01 · P1 · Новые сообщения не публикуются для подписок frontend

LIVE: `supabase_realtime` имеет 0 включённых отношений. Другая публикация содержит внутренние партиции `realtime.messages_*`, а не `public.messages`. CODE: `frontend/src/screens/ChatDialogScreen.tsx:538–544` и `ChatListScreen.tsx:83–89` подписаны на postgres_changes public.messages. Этого потока изменений не будет; собственная отправка и загрузка при фокусе могут маскировать проблему. Таблицу необходимо включить в publication после проверки доступа, затем проверить доставку двум устройствам, reconnect и медиа. [Требование публикации](https://supabase.com/docs/guides/realtime/postgres-changes).

### CHAT-01 · P1 · Начало переписки и блокировки не защищены общим серверным правилом

`backend/src/chat/chat.service.ts:941–1005`, ensureMatch(): ищет любую пару без проверки status, затем пытается создать match клиентом и при отказе RLS создаёт через admin. В sendMessageWithToken (:107–308) нет проверки user_blocks. LIVE RLS INSERT messages проверяет sender/recipient/принадлежность match, но не status='active' и не блокировки. Следовательно, ограничение БД на создание match не обеспечивает бизнес-ограничение API; существующий blocked/unmatched match также не запрещает direct INSERT. На текущем снимке user_blocks пуст; реальная атакующая отправка не выполнялась. Если приложение допускает сообщения без взаимного лайка, это нужно явно оформить; блокировки и статус всё равно проверять на сервере и в разрешённом direct write пути.

### PAY-01 · P1 · Payments смешивает подписку и платежную операцию

Все 9 records содержат `sub_*`, 8 со status completed, 1 canceled. В 4 группах один sub ID встречается дважды, чужих userId внутри группы нет. LIVE payments имеет только PK: нет FK user_id, UNIQUE invoice/event, CHECK amount/status/tier. Сейчас orphan payments=0.

CODE `subscription.service.ts:561–716` на invoice event ищет одну запись по subscription.id и перезаписывает amount/status; это не полноценная история отдельных списаний. confirmStripePayment (:431–499) каждый раз создаёт подписку без idempotency key; проверить право повторного trial. Суммы хранятся как Stripe minor units (в текущих данных 999.00 USD означает исходную amount=999; не объявлять это 999 долларов без соглашения единиц).

Исправление: отдельные IDs customer/subscription/invoice/event, уникальность именно операции, транзакционная локальная запись, повторяемая обработка webhook. **Не накладывать UNIQUE на subscription ID в таблице истории платежей без изменения модели: у одной подписки бывает несколько законных invoice.** Mock и отмена Stripe остаются P0 из предыдущего аудита.

### DATA-01 · P1 · Lifecycle данных не завершён полностью

LIVE: 86 photo objects имеют первый UUID-сегмент, отсутствующий в Auth и public.users; 87 не связаны с photo rows. 2 AI-cache строки относятся к отсутствующим users; у ai_content_cache user_id=text нет FK. При этом Auth/public/users/profile/vitrine сейчас согласованы, orphan payments/reports=0, живой FK compatibility_reports → users имеет ON DELETE CASCADE.

Это свидетельство остаточных данных, но не доказательство причины именно в текущем deleteAccount: могла влиять старая версия, seed/reset или ручное удаление. CODE удаление возвращает успех после ошибок внешнего Auth/Storage; removeStorageObjectsByPrefix ограничен одной порцией 1000 и не обходит вложенные каталоги. Нужны сохраняемый статус удаления, retry, проверяемый итог и retention для pending uploads. Перед уборкой проверить все ссылки и резервную копию; очистка не запускалась.

### MIG-01 · P1 · История согласована по checksum, но недостаточна для воспроизведения

LIVE \_prisma_migrations: 12 строк, 11 завершённых; один отказ compatibility_reports отмечен rolled_back и затем успешно повторён. Незавершённых неоткаченных миграций нет. **SHA-256 всех 11 локальных migration.sql совпадает с завершёнными миграциями БД.** Поэтому факт изменённых применённых Prisma-файлов не обнаружен.

Отдельный Supabase ledger содержит 20 миграций. Prisma init создаёт пустые legacy User/Chart/Connection/DatingMatch с int IDs, следующая baseline пустая, поздние migrations рассчитывают на уже существующие current таблицы. SQL/RPC/RLS ведутся ещё в отдельных каталогах. migrate deploy не воспроизводит весь установленный Supabase с нуля. Runtime schema.prisma включает managed auth и в ряде прикладных моделей задаёт String без @db.Uuid при UUID в live колонке.

План: воспроизвести bootstrap в отдельном Supabase окружении, сверить diff, закрепить владельца Auth schema, включить права/RLS в создание каждой таблицы. Не применять migrate dev/reset к production. Наличие всех checksum не является доказательством отсутствия ручного DDL drift.

### ANA-01 · P2 · Аналитика не сохраняется по текущему контракту

LIVE public.feature_usage и public.user_fomo_counters отсутствуют. CODE AnalyticsService (:27–100) пишет через общий anonymous SupabaseService.from, не проверяя обычный `{error}` результата insert/update. Даже создание таблицы без исправления клиента оставит проблемы с RLS. Analytics ожидает tier/success/created_at, Prisma FeatureUsage (:138–147) определяет used_at. Требуются согласованный контракт, серверные ограниченные права, явная обработка ошибок; неверно считать текущую аналитику доказанно работающей.

### AUTH-01 · P2 · Auth настройки и границы проверки

Публичный /auth/v1/settings: email/Google/Apple включены; anonymous и phone выключены; signup разрешён; mailer_autoconfirm=false; SAML=false. 16 пользователей, 11 с email_confirmed_at; verified MFA factors=0; enabled custom OAuth providers=1. Отсутствие подтверждённого email у OAuth-пользователя само по себе не означает ошибку.

Security Advisor сообщает Leaked Password Protection Disabled. Это актуально для password-входа; приложение прежде всего использует OTP/OAuth. Проверить доступные настройки Auth в Dashboard. Redirect allowlist, JWT lifetime, refresh rotation, SMTP, CAPTCHA/rate limits, key rotation, OAuth secrets и backup/PITR доступными инструментами не подтверждены. Наличие custom OAuth provider не раскрывает его конфигурацию; секреты не читались.

### OPS-01 · P2 · Логи показывают повторяющийся schema drift

За фиксированное окно **12 октября 10:28 → 13 октября 10:28 МСК**, до основной SQL-проверки: 44 ERROR PostgreSQL, все SQLSTATE 42703 от postgrest (undefined column); классификация нормализованных запросов: 40 messages, 4 media_path. Это согласуется с перебором названий колонок/fallback, но без raw-запросов точная причина каждой ошибки не установлена. Auth: 8 session_not_found и 3 bad_jwt, ответы /user 403. Они могут быть результатом устаревших сессий и не доказывают обход Auth.

Текущее состояние соединений благополучное: 14 из 60, ожиданий lock и idle transaction не обнаружено; timezone UTC. Статистика queries/indexes накоплена с сентября 2025: нельзя переносить её на сегодняшнюю нагрузку. Самый долгий tracked execution около 100.8 s не атрибутирован конкретному запросу приложения; нагрузочный тест не выполнялся.

### PERF-01 · P2 · Индексы и политики требуют точечной оптимизации

Performance Advisor: 4 unindexed FK (3 пустые legacy таблицы и blocked_user_id), 31 auth_rls_initplan, 26 unused index, 1 multiple permissive policy, 1 duplicate index. Приоритет — покрыть blocked_user_id для поиска входящих блоков и убрать подтверждённый дубль subscriptions_user_id_key/subscriptions_user_id_unique после проверки зависимостей. Оставшиеся индексы не удалять только по статистике unused; таблицы малы, часть индексов нужна для целостности/редких сценариев.

Ссылки для каждой категории: [неиндексированные FK](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [повторные Auth-вычисления](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [unused index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), [duplicate index](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index). INFO не означает аварийную деградацию.

## Что не подтвердилось как уязвимость

- \_prisma_migrations: RLS off, но client grants отсутствуют; текущего anonymous/authenticated чтения нет.
- Payments: RLS on, policies нет — прямой клиентский доступ закрыт. Создавать политики только ради устранения INFO не требуется.
- View v_public_profiles: security_invoker=true, поля ограничены витриной; email/birth/точные координаты не раскрываются через неё.
- Buckets private; public binary exposure по флагам не обнаружено.
- У основной проверки Bearer через Supabase getUser есть верификация; критические исключения — отдельные @Public маршруты.
- Ни одна public RPC не имеет отсутствующего search_path; authenticated/anon не имеют CREATE public/storage. Сам SECURITY DEFINER не доказывает уязвимость. [Функции и права](https://supabase.com/docs/guides/database/functions).
- Users/Auth сейчас не содержат взаимных orphan records; photo rows имеют правильный prefix и существующий объект.

## Проверки после исправлений

1. Без токена нельзя менять onboarding или получить birth data; токен пользователя A не даёт админ-чтение/запись пользователя B.
2. Direct authenticated API не читает/меняет чужие AI-cache/reports; anon denied; backend с минимально необходимыми правами продолжает работать.
3. Два пользователя: лайк/ответный лайк, отсутствие match, active/unmatched/blocked, текст/медиа, RLS INSERT, reconnect, чтение истории более 100 сообщений.
4. Фото: свой/чужой prefix, подмена path, pending upload, ошибочный MIME/размер, primary concurrency, удаление чужой строки/объекта.
5. Оплата: повтор SetupIntent/webhook, разные invoices одного sub, повтор trial, Stripe отказ, отмена и завершение доступа. Отдельно проверить Apple/Google purchase contract.
6. Удаление: Auth/Storage недоступны; job возобновляется, все данные удаляются по согласованной retention-модели; новое устройство не восстанавливает удалённый профиль.
7. Шифрование: decrypt+GCM authentication, сравнение перед очисткой, missing/wrong key, полный backup restore; chart JSON остаётся в явно согласованном охвате.
8. Bootstrap нового окружения создаёт все current таблицы, RPC, policies, grants, cron и publication; существующие миграции не меняют managed Auth случайно.

Копируемые запросы для повторного безопасного аудита: [SUPABASE_AUDIT_READONLY_2026-10-13.sql](SUPABASE_AUDIT_READONLY_2026-10-13.sql).

```bash
psql "$DIRECT_URL" -X -v ON_ERROR_STOP=1 -f docs/SUPABASE_AUDIT_READONLY_2026-10-13.sql
(cd backend && npm run build)
(cd backend && npm test -- --runInBand)
(cd frontend && npx tsc --noEmit)
(cd frontend && npm test -- --runInBand)
```

SQL рассчитан на аудитора с доступом к каталогам/Auth/Storage; он делает только чтение в READ ONLY транзакциях. Сборка/тесты выполнены в предыдущем аудите; повтор здесь не запускался, поскольку код не менялся. Prisma validate дополнительно прошёл offline с фиктивными URL; schema diff и чистый install не выполнялись.

## Детальные доказательства

Ниже полные технические разделы RLS/grants, RPC/Storage и локальной границы интеграции. В них права записи установлены по каталогам и логике ограничений; изменяющие проверки production не проводились. Исправления требуют отдельной работы: этот аудит не применяет предложенные изменения.

## Приложение: RLS и grants

Дата: 2026-10-13. Проект: ayoucajwdyinyhamousz. Метаданные и агрегаты получены через Supabase execute_sql; данные пользователей, UUID настоящих пользователей, токены и содержимое сообщений не выгружались. БД не изменялась.

## Метод

- pg_class/pg_namespace: RLS, владелец, FORCE RLS, права через has_table_privilege.
- pg_policies: все политики public и storage.objects.
- information_schema.role_table_grants; pg_attribute.attacl: табличные права и отдельно выданные права колонок.
- pg_default_acl: права будущих объектов.
- pg_get_viewdef/reloptions: состав и режим представления.
- pg_trigger/pg_get_functiondef/pg_constraint: ограничения обновления users.role.
- BEGIN READ ONLY + SET LOCAL ROLE + фиктивный JWT sub + COUNT(\*) + ROLLBACK: фактическая видимость строк.

## Подтверждённые приоритетные проблемы

### P0: compatibility_reports открыт всем authenticated на чтение и изменение

- RLS=false.
- authenticated: SELECT, INSERT, UPDATE, DELETE. anon: нет этих прав.
- Каталог колонок содержит user_id uuid, partner_birth_data jsonb, partner_chart_data jsonb, result jsonb, score integer, ai_provider.
- Непривязанный к существующему пользователю фиктивный sub получил COUNT(\*)=5.
- Следствие: любой пользователь с валидной сессией может читать все отчёты с данными рождения партнёров, создавать, менять и удалять отчёты других пользователей через стандартный API Supabase, public exposed schema подтверждена отдельной REST-проверкой основного аудита. Не требуется доступ к NestJS.
- INSERT/UPDATE/DELETE не выполнялись: их возможность установлена grants, отсутствием RLS и отсутствием иных ограничивающих механизмов на таблице; ограничения формы записи всё ещё действуют.
- Исправление: если доступ должен быть только через NestJS/Prisma, отозвать CRUD у authenticated/anon и включить RLS; если нужен клиентский read, явно дать SELECT и owner policy auth.uid()=user_id. Не создавать широкие owner write политики на расчётные поля без продуктового основания.

### P0: ai_content_cache открыт всем authenticated на чтение и изменение

- RLS=false.
- authenticated: SELECT, INSERT, UPDATE, DELETE. anon: нет.
- Фиктивный sub получил COUNT(\*)=68, хотя собственных users/user_profiles видимых строк=0.
- Колонки: user_id text, content_type, subject_key, locale, chart_fingerprint, content_json, expires_at.
- Следствие: чтение персонального AI-контента и доступ к глобальному отравлению/удалению кэша, изменение срока действия и полей, которые приложение считает серверными.
- Исправление: закрыть direct client grants; включить RLS с backend-only моделью или отдельным SELECT owner policy. Для user_id text нужна совместимая проверка auth.uid()::text=user_id; не приводить произвольный user_id к UUID без проверки реальных данных.

### P1: users.role и другие служебные поля допускают прямое обновление владельцем

- authenticated имеет UPDATE таблицы users без ограничений колонок.
- owner UPDATE policy: USING(auth.uid()=id), WITH CHECK(auth.uid()=id).
- pg_attribute.attacl: отдельных column ACL нет.
- role: text NOT NULL DEFAULT 'user'; CHECK или enum на роль отсутствует.
- Триггеры users: touch updated_at, создание профиля после INSERT, обновление public profile при name. Триггера, запрещающего смену role, нет.
- Следствие: клиент может менять свою public.users.role, email, onboarding_completed, plaintext/encrypted birth fields и created_at вне DTO и бизнес-логики NestJS.
- Смена role не означает доказанный доступ к админ API: SupabaseAuthGuard берёт role из auth User, а не public.users; влияние на другие участки авторизации нужно проверить отдельно.
- Исправление: убрать общий UPDATE grant и дать список разрешённых колонок либо запретить любые клиентские UPDATE users и оставить серверные операции. Служебные role/email/id/encrypted поля должны меняться только сервером. Обычный REVOKE UPDATE(role) не помогает, пока существует UPDATE grant на всю таблицу.

### P1: будущие таблицы postgres автоматически получают полный authenticated CRUD

- pg_default_acl postgres, public, relations: authenticated=arwd, service_role=arwdDxtm.
- RLS новых PostgreSQL-таблиц по умолчанию выключен.
- Следствие: любая новая таблица из миграции postgres без явного REVOKE/RLS повторяет текущую проблему кэша и отчётов.
- Исправление: убрать authenticated grants из default table privileges postgres IN SCHEMA public; миграции должны явно задавать нужные права и политики. Изменение default ACL не исправляет уже существующие таблицы.

### P2: legacy User/Chart/Connection/DatingMatch без RLS с authenticated CRUD

- Имена регистрозависимы: public."User", public."Chart", public."Connection", public."DatingMatch".
- authenticated SELECT/INSERT/UPDATE/DELETE; anon нет.
- По данным общей инвентаризации основного аудита таблицы сейчас пусты; отсутствие строк не закрывает возможность клиентского INSERT.
- Риск повторного использования/заполнения устаревших таблиц и роста ненужных данных.
- Исправление: закрыть client grants и включить RLS; удаление таблиц не требуется для устранения риска.

### P2: messages разрешает INSERT серверных/служебных колонок

- RLS INSERT корректно проверяет sender_id=auth.uid(), non-null recipient_id и взаимное соответствие двух участников существующего match.
- Однако табличный INSERT grant допускает все колонки. CHECK(type IN ('text','image','system')) включает 'system'.
- RLS не ограничивает type, read_at, created_at или attachment_path; проверка принадлежности attachment_path в NestJS ChatService не действует при прямом Supabase INSERT.
- Следствие: участник match может создавать сообщения type='system', подставлять read_at/дату и ссылки на вложения вне серверного пути. Доступ к содержимому чужих Storage-файлов этим не доказан: Storage имеет отдельные ограничения.
- Исправление: серверный RPC как единственный путь записи, либо отдельные права колонок, CHECK/trigger для read_at/type/attachment_path и необходимых бизнес-условий. Проверить, должен ли direct insert вообще поддерживаться.

## Фактическая матрица authenticated

S/I/U/D обозначают SELECT/INSERT/UPDATE/DELETE. Указаны эффективные возможности по grants + RLS, без выполнения записи и без SQL-инъекций/security definer RPC.

| Relation              | RLS  | Grants | Эффективная модель                                                                  |
| --------------------- | ---- | ------ | ----------------------------------------------------------------------------------- |
| "User"                | off  | SIUD   | Все строки, все операции                                                            |
| "Chart"               | off  | SIUD   | Все строки, все операции                                                            |
| "Connection"          | off  | SIUD   | Все строки, все операции                                                            |
| "DatingMatch"         | off  | SIUD   | Все строки, все операции                                                            |
| ai_content_cache      | off  | SIUD   | Все строки, все операции                                                            |
| compatibility_reports | off  | SIUD   | Все строки, все операции                                                            |
| \_prisma_migrations   | off  | none   | Direct client доступ отсутствует                                                    |
| charts                | on   | S      | Только собственные строки; owner I/U policies не дают права без grants              |
| compatibility_scores  | on   | S      | Только участники person_a/person_b                                                  |
| connections           | on   | SIUD   | Собственные S/I/U; DELETE запрещён отсутствием policy                               |
| dating_matches        | on   | SIUD   | Собственные S/I/U; DELETE запрещён                                                  |
| likes                 | on   | SIUD   | Чтение отправителем/получателем; INSERT от себя, не себе; U/D запрещены             |
| matches               | on   | SIUD   | Только SELECT участниками; I/U/D запрещены                                          |
| messages              | on   | SIUD   | SELECT участниками match; INSERT от себя правильному участнику match; U/D запрещены |
| payments              | on   | SIUD   | Ни одной public policy: S не видит строк; I/U/D запрещены                           |
| public_profiles       | on   | SIUD   | Все строки SELECT; I/U/D запрещены                                                  |
| subscriptions         | on   | S      | Только service_role policy: authenticated не видит строк                            |
| user_blocks           | on   | SIUD   | Собственные S/I/D; U запрещён                                                       |
| user_devices          | on   | S      | Свои строки; ALL owner policy без write grants не даёт write                        |
| user_photos           | on   | S      | Свои строки; owner write policies без write grants не дают write                    |
| user_profiles         | on   | SIU    | Собственные S/I/U; D отсутствует и по grants, и policy                              |
| user_reports          | on   | SIUD   | Собственные S/I; U/D запрещены                                                      |
| users                 | on   | SIU    | Собственные S/U; I policy отсутствует                                               |
| v_public_profiles     | view | S      | SELECT public_profiles через security_invoker                                       |

Права TRUNCATE, REFERENCES, TRIGGER authenticated/anon в public не выданы. service_role и postgres имеют BYPASSRLS, поэтому политики не являются защитой от ошибок серверного кода с этими правами.

## Проверка реальной видимости без PII

Транзакция authenticated, фиктивный UUID 00000000-0000-0000-0000-000000000001:

| Проверка                           | Результат |
| ---------------------------------- | --------: |
| ai_content_cache visible rows      |        68 |
| compatibility_reports visible rows |         5 |
| users visible rows                 |         0 |
| user_profiles visible rows         |         0 |
| public_profiles visible rows       |        16 |
| v_public_profiles visible rows     |        16 |
| payments visible rows              |         0 |
| subscriptions visible rows         |         0 |

anon без sub: users visible rows=0; has_table_privilege(cache, SELECT)=false; reports SELECT=false.

Это подтверждает защиту users и отсутствие anonymous утечки этих таблиц на уровне прямого SQL доступа. Наличие anon SELECT на users избыточно, но само по себе не открывает строки: anon SELECT policy отсутствует, RLS включён.

## Что проверено и не является найденной уязвимостью

- v_public_profiles имеет reloptions=['security_invoker=true']; owner postgres не обходит RLS вызывающего пользователя через это представление.
- Поля представления: user_id,name,zodiac_sign,city,primary_photo_path. Email, точные координаты, birth data не проецируются.
- public_profiles SELECT policy true для authenticated соответствует публичной витрине; вопрос видимости заблокированных/неактивных профилей требует продуктового решения.
- \_prisma_migrations RLS off не является доказанной утечкой: authenticated/anon не имеют grants.
- payments без RLS policy при включённом RLS работает deny by default, несмотря на широкие grants.
- Нет наследования service_role у anon/authenticated; authenticator может SET ROLE согласно штатной архитектуре Supabase.
- user_devices policy TO public не даёт anon доступ автоматически: anon не имеет соответствующего SELECT grant.
- Default privileges postgres на функции (all schemas) отзывают PUBLIC EXECUTE; доступ конкретных RPC надо проверять отдельно.

## Несогласованности как возможные функциональные ограничения

- charts, user_devices, user_photos имеют owner write policies, но не grants. Direct client writes будут permission denied, даже если пользователь владелец. Если используются только защищённые backend/admin/RPC операции, это допустимо и не требует расширения grants.
- subscriptions has SELECT grant but only service_role policy: прямое чтение собственного тарифа клиентом невозможно; backend с admin правами должен отдавать данные.
- connections/dating_matches DELETE отсутствует в policies. matches и likes UPDATE/DELETE отсутствуют. messages UPDATE/DELETE отсутствуют. Наличие grants не помогает.
- Рекомендация: документировать намеренные маршруты записи, отозвать неиспользуемые grants и убрать вводящие в заблуждение политики. Не выдавать права только ради формального совпадения.

## Storage policy nuance (проверка Storage)

- В INSERT/UPDATE user-photos/chat-media условие owner=auth.uid() OR name LIKE uid||'/%'.
- Поскольку обычная загрузка присваивает owner вызывающему пользователю, OR не обеспечивает обязательный UID prefix: можно создавать собственные объекты под произвольным каталогом.
- Подтверждено по логике policies; эксплуатация перезаписи чужого существующего объекта/чтение чужих файлов не выполнялась и не утверждается.
- Безопасная модель: фиксировать допустимый bucket и UID prefix через AND/первый сегмент имени, затем отдельно проверять права owner. Учесть backend uploads с service_role.

## Воспроизводимые read-only команды

```sql
SELECT c.relname, c.relrowsecurity,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') AS auth_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') AS auth_update,
       has_table_privilege('authenticated', c.oid, 'DELETE') AS auth_delete
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v')
ORDER BY c.relname;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT current_user,
  (SELECT count(*) FROM public.ai_content_cache) AS cache_visible,
  (SELECT count(*) FROM public.compatibility_reports) AS reports_visible,
  (SELECT count(*) FROM public.users) AS users_visible;
ROLLBACK;
```

## Приложение: RPC, Storage и триггеры

Проект `ayoucajwdyinyhamousz`. Выполнены только SELECT каталогов и агрегатов. Изменяющие RPC не вызывались; пользовательские UUID, пути объектов, содержимое сообщений и подписанные ссылки не выводились. Выводы о неработающих изменяющих RPC сделаны по определениям функций, каталогу колонок и effective EXECUTE grants, а не по пробной записи.

## Существенные находки

### S-RPC-01 / P1 — активный endpoint лайков вызывает запрещённую ему RPC

Live `public.create_like(p_target_user_id text,p_action text)` принадлежит postgres и имеет ACL `{postgres=X/postgres}`. `has_function_privilege('authenticated', oid, 'EXECUTE') = false`, аналогично `service_role` и `anon`. `DatingController` POST `/dating/like` вызывает `DatingService.likeUserViaSupabase`, а тот `rpcWithToken('create_like', ...)` (`backend/src/dating/dating.service.ts:919–932`). Следствие: штатный пользовательский вызов завершится permission error, backend вернёт `success:false`/`Like failed`.

Дополнительный drift: функция использует `v_me text`, `p_target_user_id text`, `v_user_a text`, `v_user_b text`, тогда как live `likes.user_id`, `likes.target_user_id`, `matches.user_a`, `matches.user_b` — UUID. В теле есть сравнения `l.user_id = p_target_user_id` и `l.target_user_id = v_me`, а также сравнения UUID match полей с text-переменными. Простое предоставление EXECUTE не завершает исправление: необходимо исправить типы и проверить бизнес-правила (blocked, onboarding, super_like entitlement).

Функция проверяет auth.uid(), action и self-like, но не проверяет user_blocks, состояние профиля/аккаунта или право super_like. Пока EXECUTE отозван, это латентные проблемы, не работающий обход.

### S-RPC-02 / P1 — nightly ranking успешно запускает пустую заглушку

Live `public.rank_candidates_nightly()` — SECURITY DEFINER с телом только `perform 1;`, комментарий TODO. В `cron.job` один активный job, он вызывает только эту функцию, username postgres, schedule `5 3 * * *`. В `cron.job_run_details` 355 результатов `succeeded`, от 2025-10-24 03:05 UTC до 2026-10-13 03:05 UTC. `compatibility_scores` содержит 0 строк. Успешный cron не рассчитывает совместимость и не заполняет ranked cache. В `/dating/candidates` backend имеет fallback, поэтому это не доказательство полной недоступности экрана кандидатов; это доказательство отсутствующего планового расчёта.

Ручной `DatingService.runRankCandidatesNightly()` вызывает `rpcAdmin`, однако у `service_role` EXECUTE=false, поэтому live ручной путь также не работает. Пользовательская авторизация endpoint `rank/run` проверяется родительским аудитом отдельно.

### S-RPC-03 / P1 (путь RPC отключён по умолчанию) — send_message с recipient несовместима с live таблицей

Authenticated может вызывать только overload `public.send_message(p_recipient_id uuid,p_text text,p_media_path text DEFAULT NULL)`. Она SECURITY DEFINER и делает:

```sql
insert into public.messages(sender_id,recipient_id,content,media_path)
values(v_sender,p_recipient_id,nullif(p_text,''),p_media_path);
```

Live `public.messages` НЕ содержит `media_path`; содержит `attachment_path`; `match_id UUID NOT NULL` без default. Поэтому функция не может выполнять показанную вставку. В backend `ChatService.preferRpc` включается только `CHAT_PREFER_RPC=true`, по умолчанию false (`backend/src/chat/chat.service.ts:53`). При включении RPC backend пытается fallback insert. Нельзя объявлять весь чат неработающим на основании этой RPC.

Доступная RPC дополнительно не проверяет: активный match, user_blocks, ownership/path bucket, соответствие получателя match, запрет сообщения себе. Это latent security risk, который нельзя сохранять при ремонте колонки. Другой overload `send_message(p_match_id uuid,p_type text,p_content text,p_attachment_path text)` postgres-only, authenticated/service_role EXECUTE=false. Его проверка подтверждает лишь членство в match, не `status='active'`, не блокировку и не принадлежность attachment.

### S-STOR-01 / P1 — произвольный photo path + admin Storage обходит правила принадлежности

Live `user_photos` имеет только PK и FK `user_id -> users ON DELETE CASCADE`; `storage_path text NOT NULL`; path-ownership CHECK/FK отсутствует; индекс storage_path не UNIQUE. `UserPhotosService.getSignedUploadUrl` принимает произвольный path (`:34–41`), `confirmPhoto` сохраняет произвольный path в собственную строку (`:53–74`) и создаёт signed read URL через service role. `deletePhoto` проверяет owner строки, затем удаляет её `storagePath` admin Storage (`:179–193`). `ConfirmPhotoDto` проверяет только IsString.

Следовательно, если известен путь чужого фото, backend допускает зарегистрировать этот путь на себя, получить signed URL и затем удалить чужой объект. Guard защищает аутентификацию, но не принадлежность объекта. Storage bucket private и owner-prefix RLS не ограничивают admin calls. Получение signed upload token для чужого префикса также позволяет создавать объекты в чужом namespace; возможность перезаписать уже существующий объект зависит от параметров signed upload/upsert и отдельно не тестировалась.

Это подтверждённый дефект авторизации по исходникам + live ограничениям, не доказательство эксплуатации. На текущих данных 9 photo rows: wrong owner prefix=0, missing object=0, duplicate path groups=0.

Рекомендация: генерировать путь на сервере, запретить произвольные namespaces, подтверждать существующий объект собственного prefix/type/size, связать pending upload с автором, проверять prefix во всех delete/sign, рассмотреть CHECK правильного prefix и UNIQUE storage_path после отдельной проверки схемы.

### S-STOR-02 / P1 — фотографии продолжают храниться после удаления аккаунтов/строк

`storage.objects`: user-photos=96 объектов (32,566,097 байт), chat-media=8 объектов (21,017,969 байт).

Для user-photos:

- 87/96 объектов не имеют ссылки из `public.user_photos.storage_path`.
- 86/96 первых сегментов UUID отсутствуют и в `auth.users`, и в `public.users`.
- 9/9 актуальных photo rows ссылаются на существующие объекты и имеют правильный owner prefix.

Для chat-media: 1/8 объектов не находится в `messages.attachment_path` ни как raw path, ни как `chat-media:` prefix; остальные 7 находятся. Объекты chat-media имеют существующих пользователей в обоих пространствах.

Отсутствующий FK не чистит Storage автоматически. Это сильное свидетельство хранения объектов исчезнувших пользователей, но причина могла быть старым delete, seed/reset или ручным удалением. Не объявлять установленной причиной текущий endpoint delete. Не удалять автоматически все unreferenced объекты: сначала retention, незавершённые загрузки и другие ссылки/legacy aliases.

Рекомендация: отдельная сверка, grace period, pending uploads, серверная очистка после account deletion с retry/наблюдением, проверка всех legacy references. Публичного раскрытия из bucket flags не обнаружено.

### S-STOR-03 / P2 — нет bucket-specific MIME и размера

Оба buckets `public=false`, но `file_size_limit=NULL`, `allowed_mime_types=NULL`. Это означает отсутствие лимитов на уровне этих buckets, не отсутствие глобального Supabase upload-limit. Прямые uploads по authenticated owner-prefix и admin signed URL могут обходить frontend ограничения. Все существующие объекты имеют MIME image/jpeg или image/png; наблюдений иных MIME нет.

В chat-media максимум 3,521,850 байт; user-photos максимум 2,556,729 байт. Эти размеры сами по себе не инцидент. Следует определить product limits и применить MIME allowlist/size на bucket плюс backend validation.

### S-RPC-04 / P2 — direct RPC кандидатов/фотографий обходят backend privacy filters

`get_candidates_for_me(integer)` SECURITY DEFINER, authenticated EXECUTE=true, owner postgres BYPASSRLS=true. Она выбирает only cached compatibility_scores по auth.uid() и computed_at >=14 days, limit clamp 1..50. Не учитывает `expires_at`, user_blocks, match status, incomplete/deleted profile filters. В backend `getCandidatesViaSupabase` фильтрует excludedUserIds, onboarding и completeness, но прямой Supabase RPC вызов не проходит NestJS фильтр. Сейчас `compatibility_scores=0`, поэтому текущих результатов не выдаёт; риск появится при заполнении.

`get_primary_photo_path(p_user_id uuid)` SECURITY DEFINER и authenticated EXECUTE=true. Любой authenticated caller может запросить primary storage path произвольного UUID независимо от таблицы user_photos RLS. Это путь, не signed URL и не доступ к private binary, но раскрывает namespace и усиливает S-STOR-01. Такое чтение может быть намеренной частью dating; необходимо определить consent/block/visibility и enforce в DB/API.

### S-RPC-05 / P2 — лишний EXECUTE trigger-only function

`handle_new_user()` trigger-returning SECURITY DEFINER имеет authenticated/service_role EXECUTE=true. Нельзя напрямую безопасно вызвать trigger-returning function как обычную RPC (PostgreSQL требует trigger context), поэтому advisor про доступный DEFINER не равен доказанному auth bypass. Для least privilege authenticated EXECUTE лишний; trigger на auth.users выполняет функцию по trigger privileges независимо от такого пользовательского гранта.

## Инвентарь RPC и грантов

18 функций public; 13 SECURITY DEFINER. Все принадлежат postgres (rolsuper=false, rolbypassrls=true). Во всех определениях установлен search_path; ни одна не имеет NULL/mutable-default search_path. Authenticated и anon не имеют CREATE на public/storage, поэтому отдельного доказательства search_path object-hijack нет.

| Функция                                                   | Definer | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE |
| --------------------------------------------------------- | ------- | ------------ | --------------------- | -------------------- |
| cache_compatibility                                       | no      | no           | no                    | no                   |
| compat_scores_set_norm                                    | no      | no           | no                    | no                   |
| create_like(text,text)                                    | yes     | no           | no                    | no                   |
| create_user_profile_if_missing                            | yes     | no           | no                    | no                   |
| get_candidates_for_me(integer)                            | yes     | no           | yes                   | no                   |
| get_compatibility                                         | no      | no           | no                    | no                   |
| get_primary_photo_path(uuid)                              | yes     | no           | yes                   | no                   |
| handle_new_user                                           | yes     | no           | yes                   | yes                  |
| rank_candidates_nightly                                   | yes     | no           | no                    | no                   |
| refresh_public_profile                                    | yes     | no           | no                    | no                   |
| send_message(match uuid,type text,content text,path text) | yes     | no           | no                    | no                   |
| send_message(recipient uuid,text text,media text)         | yes     | no           | yes                   | no                   |
| set_primary_photo(uuid)                                   | yes     | no           | yes                   | no                   |
| tg_refresh_public_profile_from_user_photos                | yes     | no           | no                    | no                   |
| tg_refresh_public_profile_from_user_profiles              | yes     | no           | no                    | no                   |
| tg_refresh_public_profile_from_users                      | yes     | no           | no                    | no                   |
| touch_updated_at                                          | no      | no           | no                    | no                   |
| update_updated_at_column                                  | no      | no           | no                    | no                   |

5 authenticated DEFINER grants совпадают с advisor inventory. Их критичность зависит от тела, а не от самого SECURITY DEFINER. Не следует исправлять удалением всех definer functions: функции публичного профиля и создания пользователя намеренно работают в privileged trigger context.

`set_primary_photo(uuid)` проверяет user_id выбранного фото против auth.uid(). При обычном authenticated JWT ownership проверка есть; anon execute отсутствует. Нет явной auth.uid IS NULL guard; применение нулевого JWT контекста только authenticated role вне штатного Supabase потока не проверялось и не объявляется exploitable. Функция делает один UPDATE всех photo rows. Live unique partial index `idx_user_photos_primary_unique(user_id) WHERE is_primary=true` ограничивает primary до одной строки. Порядок переключения одной UPDATE может конфликтовать с immediate unique index; отдельная транзакционная проверка нужна, в audit не выполнялась. Backend photo controller использует собственную двухэтапную Prisma transaction, не эту RPC.

## Триггеры и materialized public profile

Все 10 найденных custom triggers включены (`tgenabled='O'`):

- auth.users AFTER INSERT -> handle_new_user.
- users AFTER INSERT -> create_user_profile_if_missing.
- users AFTER INSERT/UPDATE OF name -> tg_refresh_public_profile_from_users.
- users BEFORE UPDATE -> update_updated_at_column.
- user_profiles AFTER INSERT/UPDATE OF zodiac_sign,city -> tg_refresh_public_profile_from_user_profiles.
- user_profiles BEFORE UPDATE -> touch_updated_at.
- user_photos AFTER INSERT/DELETE/UPDATE -> tg_refresh_public_profile_from_user_photos.
- charts/subscriptions BEFORE UPDATE -> update_updated_at_column.
- compatibility_scores BEFORE INSERT/UPDATE OF person_a,person_b -> compat_scores_set_norm.

`refresh_public_profile` upsert public_profiles по users.name, user_profiles.zodiac_sign/city, primary photo storage_path. public_profiles FK -> users ON DELETE CASCADE. `v_public_profiles` выбирает user_id,name,zodiac_sign,city,primary_photo_path из public_profiles; security/grants рассматриваются разделом RLS.

Auth handle_new_user нормализует email, допускает OAuth users без email (backend ensure-profile fallback), игнорирует collision users_email_key с делегированием backend. Это намеренное поведение по комментариям, не автоматически дефект. Триггер только INSERT: последующие изменения email auth.users не синхронизируют public.users.email на уровне этого trigger; application ensure-profile нужно проверить отдельно.

public_profile trigger из user_photos использует COALESCE(NEW.user_id,OLD.user_id); если owner фотографии когда-либо меняется, старый public profile не обновляется. В штатных backend путях owner не меняется; значение риска зависит от доступных UPDATE grants/policies. user_profiles DELETE не обновляет public profile; deletion users закрывается FK cascade. Это edge cases для migration/regression tests, не текущий установленный drift.

## Storage policy coverage

`storage.objects`, `storage.buckets` RLS=true, FORCE RLS=false. У buckets нет custom policies, значит обычные anon/authenticated не могут менять bucket metadata через row operations несмотря на table grants. Objects 12 policies: по 4 SELECT/INSERT/UPDATE/DELETE для user-photos и chat-media роли authenticated, и 4 service_role full-access. Policy predicate:

```sql
bucket_id = <bucket> AND (owner = auth.uid() OR name LIKE auth.uid()::text || '/%')
```

UPDATE имеет одинаковые USING/WITH CHECK. Нет authenticated read политики для recipients chat-media или чужих dating photos; это совместимо с backend service-role signing. Нет anon object policies; buckets private. Все 104 objects owner=NULL и owner_id=NULL; принадлежность определяется prefix. Все 104 prefixes UUID, поэтому prefix ownership branch пригоден для оставшихся пользователей. Owner-null ожидаем при admin signed uploads и сам по себе не публичный доступ.

Отдельный P2: OR-ветка `owner=auth.uid()` не требует правильного namespace. Если upload/rename сохраняет owner UID текущего пользователя, policy может разрешить объект с чужим prefix. Это риск засорения namespace и взаимодействия с prefix cleanup, а не доказанный доступ к чужому existing binary. В текущих 104 объектах owner NULL; поведение fresh normal user upload не тестировалось. Следует сделать корректный prefix обязательным, если это product ownership contract, и не полагаться на OR-ветку при account cleanup.

## Повторяемые безопасные проверки

```sql
-- Effective execute matrix, без вызова RPC.
SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,p.prosecdef,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' ORDER BY p.proname,p.oid;

SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets;

SELECT bucket_id,count(*) AS objects,
 count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM auth.users a
   WHERE a.id::text=split_part(o.name,'/',1))) AS prefix_missing_auth_user
FROM storage.objects o GROUP BY bucket_id;

SELECT count(*) AS unreferenced_photo_objects FROM storage.objects o
WHERE bucket_id='user-photos'
 AND NOT EXISTS(SELECT 1 FROM public.user_photos p WHERE p.storage_path=o.name);

SELECT count(*) AS total_jobs,count(*) FILTER(WHERE active) AS active_jobs,
 count(*) FILTER(WHERE command ~* 'rank_candidates_nightly') AS rank_jobs
FROM cron.job;

SELECT count(*) AS scores FROM public.compatibility_scores;
```

Эти проверки не скачивают изображения, не создают пользователей или токены и не проверяют модификации в production. Следующий этап после согласованного fixes — staging с двумя test users: own/foreign signed paths, delete rights, profile trigger sync, blocked/unmatched chat, primary switch and concurrent uploads, typed like RPC, cron verifies computed rows and not only succeeded status.

## Приложение: Контракты backend/frontend с Supabase

Проверка выполнена только по исходникам. Удалённая БД, объекты Storage и пользователи не читались и не изменялись. Применимость уязвимостей к production зависит от версии развёрнутого backend; состояние БД необходимо сопоставить с удалённым аудитом.

## Критические границы доверия

### CODE-01 / P0 — публичное завершение регистрации позволяет изменить чужой профиль

`backend/src/auth/auth.controller.ts:282–305`: `POST /auth/complete-signup` помечен `@Public()`, берёт `userId` из тела запроса; Authorization только извлекается. Глобальный SupabaseAuthGuard пропускает методы с этим декоратором (`backend/src/auth/guards/supabase-auth.guard.ts:30–37`).

`backend/src/auth/supabase-auth.service.ts:598–599,714–721`: существующий пользователь загружается через service role, затем name/дата/время/место рождения обновляются без проверки владельца. `735–759` меняют onboarding, `785–795` запускают построение карты, `808–818` возвращают настоящий email профиля. Вызов getUser на строке 622 находится исключительно в ветке отсутствующего профиля и не связывает токен с переданным userId.

Возможный результат: запрос без сессии с известным UUID меняет чужие персональные данные и карту и раскрывает email. RLS не защищает от этого, поскольку service role его обходит. Никакой запрос для эксплуатации не выполнялся.

Исправление: убрать публичность, обязательный SupabaseAuthGuard, выбирать id исключительно из проверенной сессии; `dto.userId` удалить из входного контракта либо проверять совпадение. Нужны регрессионные проверки отсутствие токена=401, чужой id=403/игнорируется, свой id=успех, отсутствие побочных записей при отказе.

### CODE-02 / P0 — OAuth callback доверяет произвольному body.user.id

`backend/src/auth/auth.controller.ts:191–244`: три POST callback маршрута Google/Apple/Yandex публичны.

`backend/src/auth/supabase-auth.service.ts:450–565`: processOAuthCallback не проверяет access_token в Supabase и не обменивает OAuth code. Вместо этого admin-читает `body.user.id` (460–461), getUserProfileAdmin гидратирует зашифрованные поля (`backend/src/supabase/supabase.service.ts:474–485`). Ответ (492–506) раскрывает имя и дату/время/место рождения. При отсутствии строки service role вставляет произвольный профиль и создаёт подписку (511–541).

Это раскрытие PII и возможность загрязнения профилей при знании UUID; возвращаемый access_token — входной токен, поэтому подтверждённой выдачи действительной сессии атакующему нет. Исправление: обязательная проверка Supabase getUser(access_token), идентификатор/email брать только из результата; поддержать существующий клиентский поток OAuth. Фронтенд не обращается к этим callback маршрутам по результатам поиска исходников, но удаление маршрутов должно предваряться проверкой реальных клиентов.

### CODE-02B / P2 — ошибочно сгруппированные декораторы маршрута logout

`backend/src/auth/auth.controller.ts:251–270`: декораторы старого complete-signup-OAuth идут без метода перед декораторами logout. Проверка метаданных с реальными Nest/Swagger decorators в изолированной VM (без запуска приложения/подключений) дала для logout: path=complete-signup-OAuth, method=POST, isPublic=true, guards=[SupabaseAuthGuard]. Декораторы исполняются снизу вверх: верхний Post('complete-signup-OAuth') перекрывает Post('logout'). Оба SupabaseAuthGuard учитывают @Public и пропускают запрос.

Результат: публичный POST /auth/complete-signup-OAuth возвращает `{success:true}` без завершения регистрации; /auth/logout этим методом не зарегистрирован. Backend logout и так не отзывает сессию (`270–274`). Активный frontend вызывает правильный /auth/complete-signup (`frontend/src/services/api/auth.api.ts:1290`) и Supabase signOut (`1328`), поэтому основной клиентский logout не ломается. Нужно разделить/удалить подвешенные декораторы и актуализировать Swagger. Метаданные других методов также подтверждены: completeSignup публичный без локальных guards, googleCallback публичный без guards, ensure-profile не public с SupabaseAuthGuard.

### CODE-03 / P1 — service-role Storage API не проверяет владельца path фотографии

`backend/src/user/user-photos.service.ts:34–42`: подписывает upload URL на произвольный path из тела. `53–75`: confirmPhoto записывает произвольный path в принадлежащую заявителю строку и admin-подписывает чтение. `179–193`: deletePhoto проверяет владельца строки, затем удаляет её storagePath через service role.

`backend/src/user/dto/photos.dto.ts:8–24` допускает любой string; контроллер `backend/src/user/user-photos.controller.ts:63–102` не проверяет prefix. Пользователь, знающий чужой объект path, может зарегистрировать его себе, получить signed URL, а затем удалить чужой объект. Перезапись объекта через signed upload зависит от поведения upsert и требует отдельной безопасной проверки; не заявляется подтверждённой. Для чтения/удаления цепочка прямо следует из кода. Возможные live DB constraints/triggers могут изменить оценку, их нужно проверить.

Исправление: сервер генерирует пути; confirm проверяет точный `${authenticatedId}/` prefix и существование/тип/размер загруженного объекта. Добавить ограничение согласованности user_id/storage_path и уникальность storage_path, чтобы прямой INSERT через Supabase не обходил API. Перед удалением повторно проверять path владельца. Аналогичная проверка для chat media уже есть (`backend/src/chat/chat.service.ts:124–127,686–699`).

### CODE-04 / P1 — администраторский перерасчёт кандидатов доступен любому вошедшему пользователю

`backend/src/dating/dating.controller.ts:28–29,199–205`: POST /dating/rank/run защищён только SupabaseAuthGuard, роли администратора не проверяются. `backend/src/dating/dating.service.ts:945–953`: backend вызывает rank_candidates_nightly от имени service role. Наличие/эффект функции требуется подтвердить в live DB. Риск: повторный дорогостоящий массовый расчёт и нагрузка. Ограничить административной ролью/внутренним cron, идемпотентностью и блокировкой конкурентного запуска.

## Данные, удаление и шифрование

### CODE-05 / P1 — результат удаления аккаунта скрывает отказ Auth/Storage

`backend/src/user/user.service.ts:1091–1140`: после удаления application DB Storage/Auth ошибки только логируются; API завершает удаление успехом. Auth-пользователь может остаться и снова создать public profile. `backend/src/supabase/supabase.service.ts:240–259`: очистка storage prefix делает один list(limit:1000), не ходит по вложенным папкам и не пагинирует; значения folder с id=null не исключаются фильтром. `backend/src/user/user-photos.service.ts:195–203` удаляет DB row при Storage ошибке, теряя прямую ссылку для повторной очистки.

Нужна задача удаления с сохранённым статусом шагов и повторными попытками, работающей до удаления ссылок; прерывание/очередь при отказе Auth, рекурсивная пагинация Storage. Live checks: aggregate Auth без public profile, public без Auth, Storage prefix без действующего пользователя, число пользователей с >1000 объектов и число вложенных объектов. Значения имён, id и объектов не выводить.

Удаление совместимости зависит от реального CASCADE FK: compatibility_reports в ручном списке существующих таблиц (`user.service.ts:781–796`) не присутствует. Prisma модель/SQL migration заявляют CASCADE (`backend/prisma/schema.prisma:209`, `backend/prisma/migrations/20260429000000_add_compatibility_reports/migration.sql:29–32`), но необходимо подтвердить живой FK. user_fomo_counters и ranking-кэш требуют проверки существования, FK и охвата удаления; user_fomo_counters используется аналитикой, но не перечислен в deleteAccount.

### CODE-06 / P1 — шифрование разрешает тихое сохранение plaintext при отсутствии ключа

`backend/src/common/services/sensitive-profile-encryption.service.ts:32–38,49–54`: отсутствующий DATA_ENCRYPTION_KEY отключает шифрование без ошибки. `backend/src/config/env.validation.ts:67–70` делает ключ optional; `docker-compose.yml:72–73` также допускает пустой ключ даже при BIRTH_DATA_WRITE_PLAINTEXT=false. Нужна обязательность ключа в production либо явно задокументированный отключённый режим; метрика ошибки дешифрования и план ротации.

Шифрование не покрывает natal JSON: `backend/src/services/ephemeris.service.ts:308–313` помещает birthDate, birthTime, birthDateTimeUtc, location в карту; `backend/src/chart/services/natal-chart.service.ts:1083–1085` сохраняет её целиком. Поэтому очищенные plaintext колонки users сами по себе не означают отсутствие открытой даты/времени рождения в БД. Проверить только агрегаты наличия ключей в charts.data и старых вложенных форматах. Совместимость аккуратнее: partnerBirthData передаётся в encryption (`backend/src/compatibility/compatibility.service.ts:146–159`), sanitizePartnerChart удаляет явные дату/время/location (`584–593`). Географические координаты в partnerBirthData остаются plaintext (`151–153`).

`backend/src/chart/listeners/chart-event.listener.ts:37–49` пишет старые и новые birth values в debug logs. Нужна проверка включённых уровней логирования и retention; содержимое логов не выгружать в документ.

### CODE-07 / P1 — plaintext cleanup не проверяет восстановимость ciphertext

`backend/src/scripts/cleanup-plaintext-birth-fields.ts:54–64,113–120`: скрипт проверяет только наличие трёх ciphertext strings, затем стирает plaintext. DATA_ENCRYPTION_KEY не требуется, GCM authentication/decrypt не проверяются. Если ciphertext повреждён или был записан другим ключом, очистка может лишить возможности восстановления. dry-run существует (`21`), но по умолчанию скрипт изменяет данные. Перед применением нужны backup, обязательный ключ, проверка дешифрования/сравнение значения, устойчивый pagination и отчёт только агрегатов. Скрипт в этом аудите не запускался.

## Дрейф схемы и прямой клиентский доступ

### CODE-08 / P1 — две независимые цепочки миграций не воспроизводят единую схему

Prisma initial migration создаёт legacy "User", "Chart", "Connection" и integer IDs (`backend/prisma/migrations/20250917072349_init/migration.sql:2–60`). Следующая baseline migration пустая (0 строк). Поздние migrations предполагают наличие current public.users/charts/user_photos и extensions.gen_random_uuid, которые эта цепочка не создаёт. Supabase RLS/encryption migrations находятся отдельно в supabase/migrations; типичный deploy запускает только prisma migrate deploy (`.github/workflows/deploy.yml:81,128`, `scripts/deploy.sh:73`).

Нужна сверка обоих migration ledgers и dry schema diff в отдельном окружении. Не выполнять migrate dev/reset против production. Prisma включает внутреннюю auth-схему (`backend/prisma/schema.prisma:11,218–555`), что связывает прикладную схему с управляемыми внутренностями Supabase; не генерировать migration изменения auth из локального drift.

`backend/prisma/schema.prisma:559` определяет public.users.id как String без @db.Uuid, большинство userId также text; Subscription migration использует uuid (`20251113000000_fix_subscriptions:7–8`), CompatibilityReport.userId явно uuid (`schema.prisma:201`). Нужна сверка real SQL types и всех FK, включая raw SQL `::uuid` в deleteAccount. Prisma validate проходит и не является проверкой real DB compatibility.

Новые таблицы payments/ai_content_cache/compatibility_reports migrations не включают ENABLE RLS/CREATE POLICY. Не заключать отсутствие RLS на production по файлам: это надо проверить живыми pg_class/pg_policies/grants. Они содержат финансовые и персональные данные.

### CODE-09 / P1-P2 — owner RLS не гарантирует целостность управляемых сервером колонок

Миграция `supabase/migrations/20260425000100_security_phase3_profile_chart_rls_hardening.sql:17–22` даёт владельцу UPDATE public.users, ограничивая только id. public.users содержит role/onboarding/ciphertext (`schema.prisma:565–569`). INSERT/UPDATE charts также разрешены владельцу (`migration:71–82`), что потенциально позволяет обходить серверный Swiss Ephemeris pipeline и квоты. user_photos owner INSERT/UPDATE ограничивает только user_id (`supabase/migrations/20260424000300_security_phase2_policy_cleanup.sql:25–36`), не владельца storagePath.

Проверить live table/column privileges, REVOKE/GRANT, constraints и triggers. При широких grants нужна колонковая защита либо запрет прямых writes для полей/таблиц, которыми управляет backend. Клиентское приложение напрямую таблицы не использует, но аутентифицированный пользователь может обращаться к PostgREST вне UI.

Самостоятельное изменение `public.users.role` не доказывает получения admin-доступа: текущий SupabaseAuthGuard заполняет request.user.role из Supabase Auth role (`backend/src/auth/guards/supabase-auth.guard.ts:87`), а не из public.users. Подтверждённый риск — целостность серверных данных; конкретную эскалацию роли нельзя утверждать без отдельного пути использования этой колонки.

### CODE-10 / P2 — аналитика работает anonymous-клиентом и игнорирует PostgREST errors

`backend/src/analytics/analytics.service.ts:27–33,51–57,77–100` обращается через SupabaseService.from. `backend/src/supabase/supabase.service.ts:44,101–102` — singleton с anon key без контекста JWT. Доступ не становится authenticated от того, что пользователь прошёл HTTP guard. Insert/update не проверяют возвращённый error, catch не фиксирует обычные Supabase ошибки. Аналитика может молча не сохраняться под правильным RLS.

Контракт колонок feature_usage расходится: аналитика пишет tier/success/created_at, Prisma имеет только user_id/feature_name/used_at (`schema.prisma:138–147`). Проверить live columns и используемые write paths. Исправление: отдельный безопасный service-role путь аналитики либо user-scoped client, явная обработка error, единый контракт.

## Live RPC и realtime inventory, который требуется проверить

- User RPC: get_candidates_for_me(p_limit) (`dating.service.ts:443–445`), create_like(p_target_user_id,p_action) (`924–930`), set_primary_photo(p_photo_id) (`user-photos.service.ts:133–136`, сейчас основной маршрут использует Prisma вместо RPC).
- Admin RPC: rank_candidates_nightly (`dating.service.ts:946–948`).
- Optional chat RPC: send_message/delete_message (`chat.service.ts:52–56,137,1052`); пути по умолчанию обходят RPC, но RPC может остаться доступным напрямую.
- Проверить signature/grants/SECURITY DEFINER/search_path/null auth.uid/ownership/self/block/status/quota checks; особое внимание прямым create_like/send_message writes, обходящим backend проверки. SQL definitions большинства этих RPC отсутствуют в repo, поэтому восстановление через локальную цепочку неполно.
- Frontend глобальный канал `presence:global` не помечен private (`frontend/src/services/presence.ts:112–116`), идентификатор presence key задаётся клиентом. Возможны перечисление онлайн UUID и подмена онлайн-статуса; применимость зависит от project realtime config. Проверить private-only/enabled public access и актуальные realtime policy settings. Не публиковать presence payload пользователей.

## Что в интеграции выполнено правильно

- Основной guard проверяет токен через Supabase auth.getUser; устойчиво разбирает Bearer, не логирует токен (`SupabaseAuthGuard:40–89`).
- PrismaService один в DI; new PrismaClient найден только в standalone maintenance script. Runtime query params в debug редактируются (`prisma.service.ts:47–50`).
- Frontend использует SecureStore для native Supabase сессии, AsyncStorage для web, PKCE (`frontend/src/services/supabase.ts:112–154`). Service-role ключ в активном frontend исходнике не найден.
- Frontend работает с Supabase Auth, signed Storage и presence; прямые table/RPC calls в активных исходниках не найдены.
- Очистка local state/storage/secure keys есть (`frontend/src/services/cleanupService.ts:97–135,157–220`); реальное account deletion запускается API из ProfileScreen, а authEngine.deleteAccount сам по себе только signOut (`frontend/src/services/authEngine.ts:363–365`).
- Prisma validate выполнен с фиктивными локальными URL, без подключения к БД: valid schema; предупреждение deprecated multiSchema. Эта проверка не доказывает соответствие production схеме.

Все приложения/SQL-файлы оставлены без изменений. Данные пользователей, ключи и signed URLs в этот вклад не включались.
