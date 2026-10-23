# AstraLink — полный технический аудит после изменений

> Актуализация 23 октября: последующие изменения, закрытие исходных 54 находок, проверки и незавершённые пункты отражены в [реестре исправлений](AUDIT_REMEDIATION_2026-10-22.md). Числа зависимостей/тестов и список блокеров в исходном снимке ниже относятся к моменту его составления.

Дата проверки: **22 октября 2026 года**, Europe/Moscow. База Git: `1fd19ff` (`fix ui issues`) **плюс текущее рабочее дерево**, включая staged/unstaged/untracked исходники и миграции. Проверенные исправления ещё не составляют отдельного подтверждённого production-релиза.

> После этого снимка аудита 22 октября frontend обновлён с SDK 54 до SDK 57. Результаты миграции, новые версии и проверки: [отчёт SDK 57](EXPO_SDK_57_MIGRATION_2026-10-22.md). Dependency counts и характеристики SDK 54 ниже относятся к состоянию до миграции; это не актуальная инвентаризация нового lockfile. Остальные находки не объявлены закрытыми обновлением SDK.

## 1. Общее заключение

**Техническое состояние улучшилось: прежние ошибки backend-тестов устранены, существенная часть нарушений доступа закрыта в коде и живом Supabase. Готовность к публичному и платному запуску по-прежнему не подтверждена.**

Повторно прошли backend build, проверки типов обеих частей, backend lint, все 414 backend и 75 frontend unit-тестов, форматирование и изолированные SQL-проверки трёх миграций прав. Это проверка работоспособности тестируемого кода, а не подтверждение реального мобильного входа, корректности списаний или доставки изменений на сервер.

Главные оставшиеся блокеры: повторное создание Stripe subscription, неполная история/восстановление платежей, несогласованные RPC знакомств, отсутствие Postgres Changes для чата, выборка сообщений до фильтрации диалога, ошибка лунных узлов, незавершённый lifecycle удаления и конфигурация развёртывания. Добавилась подтверждённая проверка зависимостей: lockfile содержит пакеты с security advisories, требующие отдельного разбора достижимости.

Переписывание приложения целиком не требуется. Нужны последовательные исправления существующих модулей, согласованная доставка миграций и проверка конкретной сборки на стенде.

## 2. Объём и методика

Проверены:

- NestJS entrypoint, глобальные и маршрутные guards, Auth/OAuth/OTP, admin-доступ, DTO и обработка Bearer.
- Пользовательские профили, шифрование birth fields, фото, Storage, удаление аккаунта.
- Подписки, Stripe setup/confirm/webhook/cancel, состояние подписки во frontend.
- Dating/RPC, совместимость, чат, его запросы и Realtime.
- Swiss Ephemeris, идентификаторы объектов, файлы эфемерид, отдельный Swiss endpoint.
- Prisma schema и SQL-история, Redis/очереди/лимиты, analytics, AI-интеграции.
- Expo manifests, хранение сессии, CI, Docker/Compose, скрипты доставки и health.
- Живой Supabase `ayoucajwdyinyhamousz`: проект ACTIVE_HEALTHY, PostgreSQL `17.6.1.006`; каталоги, grants/RLS, тела функций, миграции, агрегаты и Advisors.
- npm audit по lockfile backend/frontend, включая отдельный `--omit=dev`; опубликованные сведения о выбранных критических advisories.

В production выполнены только чтение каталогов/агрегатов и безопасные HTTP GET/OPTIONS. Не создавались аккаунты, сообщения, платежи, файлы или транзакции Stripe. Схема БД, политики, Auth settings и приложение этим аудитом не менялись. Не читались содержимое резервных копий, персональные записи, сообщения, реальные платёжные идентификаторы или значения секретов.

Не выполнены: чистая установка всех зависимостей, сборка/запуск production Docker-образа, EAS/iOS/Android сборка, нагрузочное и длительное тестирование, restore backup, действующие GitHub checks, настоящие Stripe операции и мобильные OAuth/deep links. Root tooling npm audit не завершился в установленный timeout; его результат не выдаётся за отсутствие уязвимостей. Аудит охватывает перечисленные технические области, но не является penetration test или доказательством отсутствия всех дефектов.

Обозначения доказательств: **Код** — подтверждено исходниками; **Локально** — выполнена проверка; **Live** — подтверждено чтением работающего сервиса/БД; **Не подтверждено** — требуется стенд или доступ к фактической доставке.

Приоритеты: **P0** — блокирует безопасный платный выпуск или подтверждение доставки исправлений доступа; **P1** — существенный отказ основного сценария, целостности данных или инфраструктуры; **P2** — качество, устойчивость и сопровождаемость. Приоритет работы не равен CVSS пакета.

## 3. Повторные проверки 22 октября

| Проверка                                                | Фактический результат                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Backend `npm run build`                                 | Exit 0, Nest build + tsc-alias                                                                                                    |
| Backend `npx --no-install tsc --noEmit`                 | Exit 0                                                                                                                            |
| Backend `npm run lint:check`                            | Exit 0; 0 ошибок, 4 предупреждения unused variables/argument                                                                      |
| Backend `npm test -- --ci --coverage --maxWorkers=2`    | Exit 0; 20/20 suites, **414/414 tests**                                                                                           |
| Backend coverage                                        | Statements/lines 24.17%, branches 16.63%, functions 24.60%; общего порога в конфигурации нет                                      |
| Frontend `npx --no-install tsc --noEmit`                | Exit 0                                                                                                                            |
| Frontend `npm run test:ci`                              | **Exit 1 по покрытию**; 10/10 suites, **75/75 tests** прошли                                                                      |
| Frontend coverage / порог                               | Statements 8.53%, branches 5.95%, functions 8.16%, lines 8.82%; требуется 30% по каждой метрике                                   |
| Prettier всего рабочего дерева                          | Exit 0; новый отчёт дополнительно проверен после оформления                                                                       |
| `prisma validate` с фиктивными URL, без соединения с БД | Exit 0; предупреждение об устаревшем preview-флаге multiSchema                                                                    |
| `bash backend/test/sprint1-security-migrations.sh`      | Exit 0; три миграции применены дважды в изолированном PostgreSQL 17, assertions прошли                                            |
| Native Swiss Ephemeris                                  | Модуль загрузился; объекты 10/11 и локальный ephe path проверены повторно                                                         |
| Live `/api/v1/health`                                   | HTTP 200, только `ok` и `ts`; версии/commit нет                                                                                   |
| Live CORS preflight                                     | OPTIONS с Origin `https://astralink.vip` и requested headers `authorization,content-type,x-locale`: HTTP 500, CORS-заголовков нет |
| Production deployment / EAS / настоящие списания        | Не подтверждены                                                                                                                   |

Текущие unit-тесты проходят полностью; frontend coverage-команда не проходит. CI unit job выполняет тесты без сбора покрытия, поэтому его успех не означает выполнение отдельного 30% coverage gate.

SQL fixture проверяет grants, blocks, match status, собственные/чужие вложения и Storage namespace. Это полезная regression-проверка выбранных политик на минимальном стенде, а не запуск всей прикладной миграционной истории или проверка конфигурации управляемого Supabase.

## 4. Что изменилось относительно аудита 13 октября

| Исходная проблема                                         | Состояние 22 октября                                                                                                                                        | Что остаётся                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| T-01: mock-оплата без ограничения среды                   | **Исправлено в рабочем коде**: service разрешает mock только development/test, неизвестный метод отклоняется                                                | Подтвердить развёртывание и HTTP-проверку production                               |
| T-02: отмена только локально                              | **Существенно исправлено**: проверяется владелец Stripe sub, отменяется продление всех известных уникальных sub IDs; ошибка провайдера не считается успехом | Discovery при потерянной локальной записи, удаление аккаунта, межустройственный UI |
| T-03: confirm неидемпотентен                              | **Открыто**                                                                                                                                                 | Повторы, конкуренция, повтор trial, provider/local recovery                        |
| T-04: настройки контейнера                                | **Открыто**; добавленные настройки шифрования не закрывают DIRECT_URL/Stripe/CORS                                                                           | Согласовать Compose, env validation и реальную среду Dokploy                       |
| T-05: BACKEND_PORT                                        | **Открыто**                                                                                                                                                 | Внутренний PORT и опубликованный порт расходятся при нестандартном значении        |
| T-06: x-locale/CORS                                       | **Открыто**; проверенный внешний preflight также не прошёл                                                                                                  | Исправить контракт и проверить разрешённый фактический web Origin                  |
| T-07: лунные узлы                                         | **Открыто**, native-проверка повторена                                                                                                                      | Исправить модель, проверить UTC/speed, определить пересчёт                         |
| T-08: LIMIT до фильтра диалога                            | **Открыто**                                                                                                                                                 | SQL-фильтр, сортировка и cursor до LIMIT                                           |
| T-09: удаление аккаунта                                   | **Открыто частично**: транзакция локальных данных есть, Storage cleanup добавлен                                                                            | Durable внешние стадии, Stripe, retries, полнота очистки                           |
| T-10: тесты/lint и скрывающий ошибки CI                   | **Прежние ошибки закрыты локально**, обязательные unit/type/build/SQL checks настроены                                                                      | Проверка реального GitHub run, frontend coverage и release checks                  |
| T-11: Chat DTO/Bearer                                     | **Открыто частично**: UUID/ownership отправки проверяются service                                                                                           | Runtime DTO для всех полей, конечные limits, единый Bearer parser                  |
| T-12: крупные файлы/слабый E2E                            | **Открыто**                                                                                                                                                 | Интеграционные и мобильные сценарии; постепенная декомпозиция                      |
| CODE-01/02: complete-signup/OAuth identity                | **Исправлено в рабочем коде**                                                                                                                               | Подтвердить серверную версию и реальные OTP/OAuth/deep links                       |
| Photo paths/admin role                                    | **Исправлено в рабочем коде**, добавлены regression specs                                                                                                   | Проверить runtime, конкуренцию confirm, лимиты файлов                              |
| Live cache/reports/legacy grants и Storage owner shortcut | **Исправлено в живой БД**, подтверждено повторно                                                                                                            | Сохранить ограничения в воспроизводимой миграционной цепочке                       |
| Прямые messages INSERT / send_message RPC                 | **Live INSERT ограничен**, опасные overloads RPC закрыты                                                                                                    | Доставка backend-проверок, полноценные тесты чтения/удаления/Realtime              |

Исторический аудит сохранён без подмены прежних результатов: [13 октября](TECHNICAL_AUDIT_2026-10-13.md). Подробности пакета исправлений: [прогресс спринта](SPRINT_1_PROGRESS_2026-10-13.md).

## 5. Архитектура и положительные результаты

Сохраняются React Native/Expo SDK 54, NestJS 10, Prisma 6, PostgreSQL/Supabase Auth, Redis/Bull и Swiss Ephemeris. Backend содержит отдельные Auth/User/Chart/Dating/Chat/Subscription/Compatibility/Advisor модули; оснований заменять стек аудит не выявил.

Зафиксированы работающие защитные механизмы:

- Глобальный SupabaseAuthGuard проверяет Bearer через Supabase `getUser`, а не доверяет декодированному JWT. Сессионная личность нормализуется перед controller.
- complete-signup связывается с проверенным пользователем; OAuth callbacks проверяют access token и соответствие личности до admin-операций. Восстановление по email не удаляет чужой профиль при неопределённой ошибке Auth lookup.
- AdminGuard читает только проверенный `app_metadata.role === 'admin'`. Пользовательские role/user_metadata не дают административный доступ.
- Upload/confirm/sign/delete фото проверяют собственный canonical UID namespace; signers в профилях, dating и chat отбрасывают небезопасные legacy paths. Confirm проверяет существование объекта и image metadata.
- Backend отправки сообщений проверяет блокировку в обе стороны и не возобновляет blocked/unmatched диалог. Live RLS INSERT связывает sender, recipient, active match и собственное вложение; запрещает system/read_at при отправке.
- Stripe webhook проверяет подпись над raw body. Исправленная cancel проверяет владельцев всех известных подписок до изменения провайдера и сохраняет доступ до завершения периода.
- Runtime Dockerfile имеет stages, native build toolchain, non-root пользователя и dumb-init. Успешная сборка образа в этом аудите не утверждается.
- Frontend использует SecureStore для Supabase session на iOS/Android, AsyncStorage для web, PKCE и Bearer в API client. Это не заменяет тесты refresh/deep link/logout на устройствах.
- Глобальный ValidationPipe, Helmet, throttling, явные modules и общий PrismaService сохранены. Не обнаружен подтверждённый путь SQL/shell injection по просмотренным исходникам; это не гарантия отсутствия таких путей.

Основные источники: [guard](../backend/src/auth/guards/supabase-auth.guard.ts), [Auth service](../backend/src/auth/supabase-auth.service.ts), [AdminGuard](../backend/src/common/guards/admin.guard.ts), [photo service](../backend/src/user/user-photos.service.ts), [ChatService](../backend/src/chat/chat.service.ts), [frontend Supabase storage](../frontend/src/services/supabase.ts).

## 6. Приоритетный реестр оставшихся проблем

### A-01 · P0 · Доставка исправлений доступа на production не доказана

**Доказательства:** рабочее дерево остаётся поверх `1fd19ff`; [health controller](../backend/src/health/health.controller.ts), строка 11, возвращает только `ok/ts`. Live health повторно дал 200 без commit/version. Три исправляющие SQL-миграции видны в Supabase ledger, но это не свидетельствует о доставке backend guards и сервисов.

**Влияние:** локально исправленный Auth/photo/admin/billing код нельзя считать действующим на пользовательском сервере. Новая эксплуатация старых ошибок против production не проверялась и не утверждается.

**Действие и приёмка:** выпустить согласованный immutable build, зафиксировать SHA/image digest, проверить его через deployment metadata и выполнить негативные Auth/admin/photo/messaging сценарии с тестовыми пользователями на стенде. SQL и backend должны приниматься отдельно.

### A-02 · P0 для платного выпуска · Повтор confirm создаёт новую Stripe subscription

**Доказательства:** [subscription.service.ts](../backend/src/subscription/subscription.service.ts), строки 437–505: после проверки SetupIntent каждый вызов выполняет `stripe.subscriptions.create` без стабильного idempotency key или сохранённой операции confirm. Строка 486 вновь задаёт trial. Строка 406 создаёт нового customer при подготовке оплаты.

**Влияние:** сетевой повтор/двойное нажатие допускает несколько recurring obligations и повторную выдачу trial. Проверка владельца SetupIntent не решает повторяемость операции.

**Действие и приёмка:** durable operation ID для SetupIntent, Stripe idempotency, переиспользование customer, атомарная локальная фиксация результата и reconciliation. Два параллельных confirm и повтор после потерянного ответа должны возвращать одну subscription. Ограничение trial должно проверяться сервером по истории, а не только по текущему полю.

### A-03 · P1 · Платёжная история смешивает subscription, invoice и event

**Доказательства:** [subscription.service.ts](../backend/src/subscription/subscription.service.ts), строки 571–580, 689–719: ищется payment по `subscription.id`; следующий invoice обновляет прежнюю строку amount/status. Строки 799–818 используют `findFirst` + `create`. В [Prisma Payment](../backend/prisma/schema.prisma), строка 127, `stripeSessionId` не уникален; в live есть 4 группы повторов этого поля и 4 лишние строки.

**Влияние:** теряется история отдельных списаний; гонки и webhook повторы могут создавать дубли или частичное состояние. Числа дублей сами по себе не доказывают повторное списание денег.

**Действие и приёмка:** разделить subscription reference, invoice/payment operation и event receipt; назначить уникальность invoice/event/operation, учесть порядок событий. Не добавлять UNIQUE к `sub_*` всей истории: у одной подписки могут быть разные законные invoices. Миграции — после классификации существующих 9 payment rows, без автоматического удаления данных аудитом.

### A-04 · P1 · Cancel не находит обязательства без локального payment reference

**Доказательства:** [subscription.service.ts](../backend/src/subscription/subscription.service.ts), строки 1006–1035: поиск только `payment.stripeSessionId startsWith sub_`; без ссылок возвращается «не продлевается»/«нет подписки». Код отмены найденных записей теперь корректнее и не отнесён к прежнему дефекту «Stripe вообще не вызывается».

**Влияние:** если Stripe create успел, а локальная запись не сохранилась, обычный cancel не обнаружит продолжающееся обязательство.

**Действие и приёмка:** хранить customer/subscription mapping независимо от Payment ledger и выполнять сверку после частичных отказов. Тест: успешный provider create, отказ локальной записи, затем cancel должен обнаружить и остановить продление, либо явно сообщить о незавершённом восстановлении.

### A-05 · P1 · CORS-контракт не соответствует web-клиенту

**Доказательства:** [cors.config.ts](../backend/src/config/cors.config.ts), строки 46–51 и 74–79, не разрешает `x-locale`, отправляемый [API client](../frontend/src/services/api/client.ts). Внешний OPTIONS для `https://astralink.vip` с этим набором headers вернул 500 без CORS-заголовков.

**Граница вывода:** проверенный Origin мог отсутствовать в фактическом ALLOWED_ORIGINS; причина именно внешнего 500 без серверных логов не установлена. Отсутствие `x-locale` в исходном allowlist подтверждено независимо. Нативный транспорт не подчиняется браузерному CORS.

**Действие и приёмка:** точный список web origins, разрешение согласованных headers и корректный отказ неизвестному origin. Проверить OPTIONS разрешённого origin с Authorization/Content-Type/X-Locale и последующий authenticated GET.

### A-06 · P1 · Стандартный Compose не передаёт нужные настройки интеграций

**Доказательства:** [docker-compose.yml](../docker-compose.yml), строки 64–95, не передаёт DIRECT_URL, ALLOWED_ORIGINS, STRIPE_SECRET_KEY, STRIPE_PREMIUM_PRICE_ID, STRIPE_WEBHOOK_SECRET. `.env` для подстановки Compose не означает передачу всех переменных контейнеру. [schema.prisma](../backend/prisma/schema.prisma), строка 10, использует DIRECT_URL; [start.sh](../backend/scripts/start.sh), строка 8, запускает migrate deploy.

Дополнительно [env.validation.ts](../backend/src/config/env.validation.ts), строки 125–130, требует Anthropic или OpenAI в production, хотя сервис и Compose поддерживают DeepSeek. DeepSeek-only конфигурация не удовлетворяет этому условию. DATA_ENCRYPTION_KEY необязателен; риск описан в A-16.

**Действие и приёмка:** согласовать runtime pooler URL и direct migration URL, Stripe и CORS; валидировать обязательность настроек по реально включённым функциям. Проверять безопасно выведенные имена/наличие переменных внутри тестового контейнера. Фактическая инъекция Dokploy не проверена, поэтому отказ любого production-контейнера не утверждается.

### A-07 · P1 · Порты и сценарии доставки не обеспечивают заявленный rollout

**Доказательства:** [docker-compose.yml](../docker-compose.yml), строки 79/97: приложение получает PORT=BACKEND_PORT, а target mapping и health остаются 3000. BACKEND_PORT=3001 нарушает соответствие. Там же `container_name: astralink-backend` и фиксированный host port; [deploy.sh](../scripts/deploy.sh), строка 84, пытается `--scale backend=2`, что несовместимо с этой конфигурацией.

[deploy.yml](../.github/workflows/deploy.yml), строки 78–81, передаёт для migrate только DATABASE_URL; строка 125 после pull конкретного SHA запускает Compose `--build`, не обеспечивая запуск именно проверенного image digest; строка 150 проверяет `/health`, тогда как приложение использует `/api/v1/health`. Rewrite reverse proxy может менять результат, его фактическая маршрутизация не проверена.

**Действие и приёмка:** фиксированный внутренний порт, согласованная внешняя публикация, один управляемый способ deploy, проверка именно нового digest и корректный health path. Blue/green или другой поддерживаемый rollout вместо неподтверждённого scale. Проверить нестандартный внешний порт и восстановление предыдущего образа на стенде.

### A-08 · P1 · Схема и миграции не воспроизводятся одной подтверждённой цепочкой

**Live:** 11 завершённых Prisma migrations имеют совпадающие локальные SHA-256; 1 историческая запись rolled_back, unresolved failed — 0. Две новые access/message миграции отсутствуют в завершённом Prisma ledger, хотя соответствующий SQL уже применён через Supabase migrations. Storage policy migration находится только в отдельном Supabase каталоге. В Supabase ledger 23 записи, последние три — исправления 13 октября.

**Код:** [Prisma migrations](../backend/prisma/migrations), [Supabase migrations](../supabase/migrations), отдельный backend/migrations; пустая baseline; initial SQL создаёт legacy CamelCase tables. Prisma schema также описывает Supabase-managed auth. Прикладные UserPhoto/UserProfile объявляют String без @db.Uuid, а live user_id — UUID: это подтверждённое различие деклараций, не доказательство отказа всех запросов Prisma.

**Действие и приёмка:** реестр владельцев DDL и единая процедура доставки для tables/RLS/grants/RPC/Storage/publication. Проверить replay двух идемпотентных миграций перед записью Prisma ledger; не править `_prisma_migrations` вручную. Восстановить прикладную схему на чистом тестовом Supabase и проверить UUID/text границы; managed Auth не пересоздавать автоматически. Изолированный SQL fixture этого не подтверждает.

### A-09 · P1 · Лайки вызывают недоступную и несовместимую RPC

**Обновление после аудита:** RPC исправлена и применена в live миграцией `20261022091806`; authenticated EXECUTE и проверки отказа подтверждены. Обработка ошибок UI/backend и исключение обработанных анкет исправлены в рабочем дереве. Deploy и приёмка на iPhone ещё требуются. Подробности: [исправление Like](DATING_LIKE_FIX_2026-10-22.md). Ниже сохранены исходные доказательства дефекта.

**Доказательства:** [dating.service.ts](../backend/src/dating/dating.service.ts), строки 927–945, вызывает `create_like` с user token и преобразует ошибку в `success:false`. Live `create_like(text,text)` не даёт EXECUTE authenticated. Её тело объявляет sender/target как text, а live likes.user_id/target_user_id и matches participants — UUID; дальнейшие выражения требуют исправления типов. В текущем закрытом состоянии функция бизнес-запросом аудитом не вызывалась.

**Влияние:** этот путь не обеспечивает создание лайка/взаимного match. Успешная выдача кандидатов не доказывает работоспособность знакомства целиком.

**Действие и приёмка:** выбрать единый backend/RPC контракт с UUID, привязкой к auth.uid, проверкой блоков и допустимого action. Права возвращать только после исправления. Два тестовых пользователя: like → reciprocal like → единственный match; pass, повтор, block и self-like должны обрабатываться предсказуемо.

### A-10 · P2 · Ночной rank RPC остаётся заглушкой

**Live:** `rank_candidates_nightly()` содержит только `perform 1`; [dating.service.ts](../backend/src/dating/dating.service.ts), строки 953–961, может сообщить success после такого вызова. AdminGuard теперь закрывает ручной endpoint, но не реализует ранжирование.

**Действие и приёмка:** документировать роль существующего synchronous/queue пути и реализовать batch rank/upsert там, где он нужен. Успех job должен означать обработанные пары/период свежести, а не только отсутствие SQL-ошибки. Проверить сбой, повтор и объём очереди.

### A-11 · P1 · Postgres Changes чата: публикация восстановлена после аудита

**Доказательства:** `pg_publication_tables` для `supabase_realtime` вернул 0 tables. [ChatDialogScreen.tsx](../frontend/src/screens/ChatDialogScreen.tsx), строки 535–542, и [ChatListScreen.tsx](../frontend/src/screens/ChatListScreen.tsx), около строки 85, подписываются на `postgres_changes` public.messages.

**Влияние:** по этому механизму изменения messages не доставляются подписчикам. Push, Presence и ручной refresh — другие механизмы; отсутствие публикации не доказывает отказ всех Supabase Realtime возможностей.

**Исправление после аудита, 22.10.2026:** [20261022193347_enable_chat_messages_realtime.sql](../supabase/migrations/20261022193347_enable_chat_messages_realtime.sql) применена в проекте AstraLink. `public.messages` включена в `supabase_realtime`; SELECT для authenticated, запрет SELECT для anon и существующие participant RLS сохранены. Повторное применение дважды проверено на изолированном PostgreSQL. Живая WebSocket-подписка с сервисным клиентом вернула `SUBSCRIBED`; тестовые сообщения в пользовательские диалоги не записывались.

**Клиент:** открытый диалог и список чатов загружают пропущенные сообщения после `SUBSCRIBED`/reconnect и при возврате приложения в active. Ошибки подписки журналируются без токенов и содержимого сообщений; поздние callbacks после отписки игнорируются. Семь тестов проверяют входящий INSERT без повторного открытия, дедупликацию, изоляцию другого диалога, reconnect, foreground и cleanup.

**Осталось для приёмки:** на двух устройствах с обычными пользовательскими сессиями проверить INSERT/read/delete, переподключение и недоступность чужих диалогов. Проверка сервисной подписки не заменяет пользовательскую RLS-проверку. Обработчик DELETE по-прежнему зависит от полей старой строки; при RLS Realtime может передать только первичный ключ, поэтому этот сценарий требует отдельной проверки.

### A-12 · P1 · История чата ограничивается до фильтрации диалога

**Доказательства:** [chat.service.ts](../backend/src/chat/chat.service.ts), строки 535–558: `select('*').limit(Math.max(50, safeLimit * 2))` до выбора собеседника; сортировка — позже в памяти. На SQL-ошибке возвращается пустой массив. В live схема колонок уже известна, включая match_id/sender_id/recipient_id/created_at.

**Влияние:** сообщения нужного диалога вытесняются другими доступными диалогами, актуальная порция не гарантируется; отказ БД отображается как пустая история. Даже если сейчас в БД всего 34 сообщения, алгоритмический дефект остаётся.

**Действие и приёмка:** фильтр по match/participants, стабильная сортировка created_at + id и cursor до LIMIT; различать empty и unavailable. Проверить 3 диалога с более чем 200 сообщениями каждый, одинаковые timestamps и ошибку БД.

### A-13 · P1 · Южный лунный узел рассчитан как TRUE_NODE

**Доказательства:** [ephemeris.service.ts](../backend/src/services/ephemeris.service.ts), строки 447–469: 10 называется north_node, 11 — south_node. У установленного Swiss Ephemeris 10 = MEAN_NODE, 11 = TRUE_NODE. Повторная native-проверка на искусственной дате 1990-01-01 12:00 UTC дала 318.43498371138435° и 316.8702736106922°, а не противоположные узлы.

[swiss.service.ts](../backend/src/modules/swiss/swiss.service.ts), строка 34, возвращает `speed:0`; [swiss.controller.ts](../backend/src/modules/swiss/swiss.controller.ts), строки 54/136, создаёт Date из строки без timezone. Это отдельные дефекты endpoint; основной natal путь не объявлен автоматически затронутым тем же Date parsing.

**Действие и приёмка:** выбрать mean/true north node, выводить south через +180°, именованные constants, сохранять скорость и явный UTC/offset. Эталонные расчёты и TZ-invariance тесты, затем версия расчёта и контролируемый пересчёт карт/транзитов/аспектов/AI cache. В ephe присутствуют sepl_18, semo_18, seas_18; полнота диапазонов дат и каждого объекта этим не доказана.

### A-14 · P1 · Удаление аккаунта не завершает внешние обязательства надёжно

**Доказательства:** [user.service.ts](../backend/src/user/user.service.ts), строки 818–1090, содержит DB transaction; Storage и Auth выполняются после неё. Строки 1118–1145 только журналируют их ошибки, затем объявляют полное удаление. Catch на строке 1159 обещает откат даже для ошибки после commit. Интеграции с отменой Stripe в deleteAccount нет.

[SupabaseService](../backend/src/supabase/supabase.service.ts), строки 240–251: Storage cleanup делает один list с limit=1000 без обхода следующих страниц/вложенных каталогов. Существующие own paths безопаснее, но lifecycle от этого не стал полностью надёжным.

**Влияние:** аккаунт может считаться удалённым при оставшихся Auth/Storage данных или continuing Stripe subscription. При удалении локальных ссылок восстановление billing становится сложнее.

**Действие и приёмка:** durable deletion state/job, идемпотентные стадии billing → app data → Storage/Auth с подтверждённым итогом, retries и наблюдаемостью; точный порядок согласовать с возможностью восстановления provider mapping. Проверить provider timeout, Storage/Auth failure и больше 1000 объектов на искусственном стенде. Новые служебные таблицы/retention требуют отдельной migration.

### A-15 · P1 · Storage ownership исправлен, ограничения содержимого и объёма неполны

**Live:** оба bucket private; UID-префикс в восьми authenticated Storage policies проверяется, прежний owner=self shortcut отсутствует. Однако file_size_limit и allowed_mime_types у обоих buckets — NULL. Это отсутствие собственных bucket-ограничений, а не отсутствие всех глобальных лимитов Supabase.

**Код:** [photo service](../backend/src/user/user-photos.service.ts), строки 93–102, проверяет заявленный contentType и size > 0, но не верхнюю границу/байты. [ChatService](../backend/src/chat/chat.service.ts), строки 86–105, очищает ext, но не ограничивает его перечнем изображений. Прямой authenticated upload в собственный каталог возможен независимо от backend confirm.

**Действие и приёмка:** согласованные bucket MIME/size quotas, проверка фактического формата для используемых изображений, лимит числа объектов/галереи и уборка неподтверждённых загрузок. Проверить oversized, неверный MIME/байты, неподдерживаемое расширение, прерванную загрузку и bypass backend через собственный Storage upload.

### A-16 · P1 · Шифрование birth fields допускает незаметное отключение

**Дополнительная диагностика после аудита:** ключ из `backend/.env` не читает часть live-данных: последний снимок — 18 birth fields шести профилей и три поля одного compatibility report. Подготовлены read-only audit и поддержка прежних ключей для чтения; восстановление требует другого подтверждённого ключа. Обязательность активного ключа в production остаётся отдельной задачей. [Результаты и процедура восстановления](BIRTH_ENCRYPTION_DIAGNOSIS_2026-10-22.md).

**Доказательства:** [SensitiveProfileEncryptionService](../backend/src/common/services/sensitive-profile-encryption.service.ts), строки 32–53: без DATA_ENCRYPTION_KEY возвращается исходный payload. [env.validation.ts](../backend/src/config/env.validation.ts), строки 67–71, считает ключ необязательным. Поэтому BIRTH_DATA_WRITE_PLAINTEXT=false сам по себе не гарантирует отсутствие новых plaintext writes при отсутствующем ключе.

**Live:** 16 пользователей; у 7 заполнены все три encrypted fields, у 3 есть хотя бы одно plaintext birth field. Множества могут пересекаться. Ненулевое ciphertext-поле не доказывает, что оно расшифровывается правильным ключом; сам ключ и расшифрованные данные аудитом не извлекались.

**Действие и приёмка:** обязательность ключа для production-политики шифрования, проверяемая версия ключа/rotation, backfill с проверкой расшифровки и восстановление backup до cleanup. Не запускать необратимую очистку plaintext на основании одного IS NOT NULL. Birth inputs в chart JSON, кэшах и резервных копиях проверить отдельно по согласованной политике данных: шифрование трёх колонок не равно защите всех производных копий.

### A-17 · P1 · Зависимости содержат актуальные security advisories

**Доказательства:** read-only npm audit по текущим lockfile успешно повторён с TLS validation. Первоначальный запуск упирался в недоступный локальный proxy; повтор выполнен без proxy только в окружении процесса аудита, без изменения конфигурации проекта.

| Область                                    | Low | Moderate | High | Critical | Всего |
| ------------------------------------------ | --- | -------- | ---- | -------- | ----- |
| Backend, все dependencies/devDependencies  | 5   | 20       | 44   | 3        | 72    |
| Backend, `--omit=dev`                      | 3   | 14       | 29   | 2        | 48    |
| Frontend, все dependencies/devDependencies | 1   | 10       | 57   | 2        | 70    |
| Frontend, `--omit=dev`                     | 1   | 9        | 35   | 2        | 47    |

Это количества уязвимых записей пакетов в выводе npm audit, не количество независимых CVE, атак или доказанных exploitable endpoints. Суммировать области как уникальные уязвимости нельзя. В Expo часть CLI/tooling находится в dependencies, поэтому `--omit=dev` не означает, что каждый пакет входит в мобильный bundle.

Критические примеры с проверенными версиями:

- Backend: proxy-addr 2.0.7 — [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). Advisory требует определённой ошибочной настройки trusted subnet; такой настройки в просмотренном main.ts не обнаружено. Подмена IP в AstraLink не продемонстрирована.
- Backend tar 6.2.1 и frontend tar 7.5.11 — [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw). Условие — обработка атакующего архива; доступный пользователю HTTP-путь распаковки TAR не выявлен. Наличие пакета требует triage, но не доказывает DoS через API приложения.
- Frontend shell-quote 1.8.3 — [GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p). Уязвимость относится к особым object-token inputs и передаче результата shell; выполнение этого потока из профиля/чата не доказано.
- Backend handlebars 4.7.8 присутствует как devDependency-транзитивная зависимость и имеет critical advisories; после `--omit=dev` не входит в соответствующий runtime-набор. Это отдельный риск build tooling.

В high runtime-наборе backend фигурируют цепочки @nestjs/platform-express, axios, compression, nestjs-i18n, nodemailer, prisma и swisseph; frontend — axios, Expo/React Native tooling. Точное влияние определяется путём вызова и платформой, а не одним severity.

**Действие и приёмка:** сохранить dependency inventory/SBOM, разобрать reachable paths, обновлять совместимыми небольшими пакетами с native/EAS regression. Не применять audit fix --force ко всему стеку: предлагаемые npm переходы могут менять major Nest/Expo/RN. Проверить очищенный production image и actual mobile bundle. Root tooling audit остался неподтверждённым из-за timeout и требует повторного запуска.

### A-18 · P1/P2 · Покрытие и E2E не подтверждают основные сценарии

**Доказательства:** раздел 3; [frontend Jest config](../frontend/jest.config.js) требует 30%, фактически 8.53% statements. Backend coverage 24.17% без общего порога. [tests/e2e/app.spec.ts](../tests/e2e/app.spec.ts), строки 3–7, проверяет только непустой body Expo web app. Реальных мобильных E2E в этой проверке не выполнялось.

**Действие и приёмка:** добавить сценарии по рискам: реальный HTTP guard pipeline, второй пользователь, OTP/onboarding, лайк → match → chat, reconnect, provider retries/webhook ordering, cancel/expiry, durable deletion. Существующие успешные mocks сохранить, порог frontend не снижать ради зелёного результата. Выделить обязательный release gate на staging и mobile preview; GitHub branch protection/check results отдельно проверить в самом GitHub.

### A-19 · P2 · Часть Chat API не имеет полноценной runtime-валидации

**Доказательства:** [chat.controller.ts](../backend/src/chat/chat.controller.ts), строки 23–31, body описан interface; строки 89–91 допускают NaN после parseInt. В createMediaUploadUrl строка 91 service ожидает строковый ext, а runtime DTO его не гарантирует. В getAccessToken строки 164–170 простой split отличается от глобального guard с нормализацией пробелов/Bearer%20.

UUID/ownership в service отправки теперь проверяются; это учтено, но не заменяет валидацию всех API полей и размера текста.

**Действие и приёмка:** DTO classes с валидаторами UUID, текста, enum extensions и конечного integer limit, Swagger и единый parser Authorization. Проверить массив/объект вместо строки, limit=abc/Infinity, слишком большой текст и эквивалентные корректные Bearer headers. Ожидается 400/401 вместо случайных 500.

### A-20 · P1/P2 · Состояние отмены не является полным серверным контрактом

**Доказательства:** [subscription.service.ts](../backend/src/subscription/subscription.service.ts), строки 232–240: status response не содержит isCancelled, userId или provider cancellation state. [user.api.ts](../frontend/src/services/api/user.api.ts), строка 23, читает этот endpoint. [ManageSubscriptionScreen.tsx](../frontend/src/screens/ManageSubscriptionScreen.tsx), строки 43–45/60–76/143–149, восстанавливает отмену из локального AsyncStorage, причём ключ зависит от subscription.userId.

**Влияние:** после перезапуска/переустановки или на другом устройстве UI не имеет надёжного ответа сервера о запланированной отмене. В ответе без userId локальный ключ вообще не формируется. Фактическая отмена Stripe в исправленном cancel и её отображение — разные задачи.

**Действие и приёмка:** серверные cancellation fields с согласованным DTO/schema, идентификатор пользователя из проверенной сессии, один источник состояния вместо локального marker. Проверить отмену на устройстве A, открытие на B и восстановление после очистки storage. Для платного релиза это часть P1 acceptance биллинга.

### A-21 · P2 · Confirm фото защищён от последовательного повтора, но не от гонки

**Доказательства:** [user-photos.service.ts](../backend/src/user/user-photos.service.ts), строки 105–131: findFirst → count → create отдельными операциями. Live не имеет UNIQUE(user_id, storage_path), хотя unique primary index по user_id уже существует. На момент проверки повторов путей нет.

**Влияние:** одновременные confirm одного path могут дублировать gallery row; пара первых разных фото может конфликтовать по primary index. Это не прежний дефект произвольного чужого path — тот закрыт.

**Действие и приёмка:** после проверки данных добавить согласованную уникальность/upsert и обработку конкурентного first-primary. Два параллельных confirm должны давать одну запись и предсказуемый ответ; смена primary — не более одного primary. Нужна отдельная минимальная миграция.

### A-22 · P2 · Analytics не работает на существующей схеме и клиенте

**Доказательства:** live не содержит feature_usage и user_fomo_counters. [analytics.service.ts](../backend/src/analytics/analytics.service.ts), строки 27/51/78, обращается к этим таблицам; SupabaseService.from использует anon client без пользовательского JWT. Ошибки PostgREST часто возвращаются в error, тогда как recordFeatureUsage перехватывает только thrown exceptions и не проверяет error результата insert.

[analytics.controller.ts](../backend/src/analytics/analytics.controller.ts), строки 8–20, для общих subscription/features reports имеет только SupabaseAuthGuard. При последующем исправлении клиента на admin нельзя автоматически открыть общую бизнес-аналитику всем вошедшим пользователям.

**Действие и приёмка:** определить server-only analytics contract, отдельную schema migration, явную обработку error и admin authorization для общих отчётов. При неполной инфраструктуре возвращать ясную unavailable/stale метку, а не достоверные на вид нули. Проверить запись события и чтение его агрегата разрешённой ролью.

### A-23 · P2 · Лимиты зависят от отказов Redis и топологии deployment

**Доказательства:** [rate-limiter.service.ts](../backend/src/common/services/rate-limiter.service.ts), строки 39–56: INCR и EXPIRE раздельны; при недоступности Redis/exception запрос разрешается. Этот limiter применяется в Advisor и Auth guards. Глобальный [ThrottlerModule](../backend/src/app.module.ts), строки 45–61, не задаёт общий Redis storage; в main.ts не настроен trust proxy.

**Влияние:** при отказе Redis снимаются соответствующие прикладные лимиты; прерывание между INCR/EXPIRE может оставить счётчик без TTL. В нескольких репликах global limits не образуют один подтверждённый общий бюджет. За reverse proxy необходимо отдельно проверить корректный req.ip; фактическое распределение IP/лимитов в production не измерялось.

**Действие и приёмка:** атомарные INCR+TTL через Lua/эквивалент, явная политика деградации для дорогих AI/OTP операций, общий бюджет и проверенная proxy topology. Проверить Redis outage, потерю соединения после INCR и запросы через две реплики. Не включать trust proxy=true без модели доверенных hops.

### A-24 · P2 · Readiness, наблюдаемость и масштаб не доказаны

**Доказательства:** [health controller](../backend/src/health/health.controller.ts) не проверяет БД/Redis/очереди; наличие PrismaService.healthCheck не означает его использование в endpoint. В живой БД мало данных: 16 users, 7 charts, 34 messages. Performance Advisor показывает 30 auth_rls_initplan warnings, 1 multiple_permissive_policies, 1 duplicate_index, 4 unindexed foreign keys, 25 unused indexes.

**Действие и приёмка:** разделить liveness/readiness, измерять provider latency/error, queue backlog, DB pool и AI cost. Выполнить load/soak на копии с целевым объёмом. Дублирующий index subscriptions_user_id_key/subscriptions_user_id_unique проверить перед удалением; unused indexes не удалять автоматически — статистика низкой нагрузки не доказывает их бесполезность.

### A-25 · P2 · Сложность модулей и сборочные конфигурации затрудняют приёмку

**Доказательства:** NatalChartScreen 4277 строк, ProfileScreen 1394; DatingService 1520, ChatService 1298, SubscriptionService 1223, UserService 1163. ChatService отключает ESLint целиком с первой строки, сохраняет подбор вариантов колонок и fallback inserts. Root scripts frontend:build/frontend:lint ссылаются на отсутствующие frontend npm scripts.

Root и frontend содержат app.json/eas.json: root app.json не задаёт Expo scheme/bundle/project, тогда как frontend manifest задаёт scheme astralink и EAS project. Это неоднозначность рабочей директории сборки, а не доказательство неработоспособности frontend EAS-профиля.

**Действие и приёмка:** постепенно выделять операции в рамках исправлений, удалять schema-guessing только после закрепления live contract, ограничить eslint-disable конкретными строками. Документировать frontend cwd для EAS/Expo, корректные команды root и профили. Bundle identifier/EAS project не менять без отдельного решения. Чистый preview build и установка на устройства завершают проверку.

## 7. Живой Supabase: актуальное состояние

### 7.1 Права и RLS

Проверено 23 public tables. Для ai_content_cache, compatibility_reports и legacy User/Chart/Connection/DatingMatch включён RLS, отсутствуют client SELECT/INSERT/UPDATE/DELETE, service_role SELECT сохранён. Для users authenticated INSERT/UPDATE/DELETE закрыты; отдельные column write grants также не обнаружены. Собственное чтение сохранено через RLS.

У users остаётся anon table SELECT grant, но нет разрешающей anon policy; grant сам по себе не даёт доступа к строкам. Аналогично payments имеет authenticated table grants, но RLS без клиентских policies: нельзя называть это открытым CRUD только по ACL. Оставшиеся owner UPDATE policies на users/charts не становятся рабочими при отозванных соответствующих grants.

Исключение `_prisma_migrations` без RLS не создаёт прежнюю cache/reports проблему: anon/authenticated доступ к таблице отозван. Безопасность server-role зависит от backend authorization и защиты service key; RLS не ограничивает доверенный BYPASSRLS путь.

Права send_message(uuid,text,text), send_message(uuid,text,text,text), create_like и handle_new_user для anon/authenticated закрыты. can_send_message_to(uuid) намеренно доступна authenticated: фиксированный пустой search_path, identity через auth.uid, проверка существования получателя и блоков в обе стороны. Её SECURITY DEFINER warning не означает автоматически уязвимость.

Default table privileges postgres в public оставляют service_role; широкие authenticated/anon default grants отозваны. Это не охватывает автоматически объекты, которые в будущем создаст другая owner role: реестр DDL должен учитывать владельца.

### 7.2 Security Advisor

| Категория                                 | Количество отдельных findings | Интерпретация                                                                           |
| ----------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| ERROR                                     | 0                             | Прежний rls_disabled_in_public для служебных таблиц не возвращается                     |
| RLS enabled, no policy                    | 7 INFO                        | Server-only/legacy tables и payments; с закрытыми effective client правами это ожидаемо |
| Authenticated SECURITY DEFINER executable | 4 WARN                        | can_send_message_to, get_candidates_for_me, get_primary_photo_path, set_primary_photo   |
| Leaked password protection disabled       | 1 WARN                        | Проверить применимость к выбранным password/OTP/OAuth способам входа и настройкам Auth  |

Для трёх оставшихся клиентских definer-функций нужна проверка бизнес-контракта, а не массовая смена SECURITY DEFINER на INVOKER. Например, get_candidates_for_me выводит cached pairs и primary paths, но в её теле нет фильтра blocked/visibility preferences. Не следует считать внешнюю backend-фильтрацию защитой прямого RPC-вызова. Состав разрешённых public profile данных и поведение после блока нужно зафиксировать тестом.

Нет оснований заявлять полное устранение всех security risks на основании нулевого ERROR Advisor: он не проверяет Stripe idempotency, deployed backend или мобильные сценарии.

### 7.3 Агрегаты без персональных данных

| Объект                                                                    | Значение на момент чтения                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| auth.users / public.users / user_profiles                                 | 16 / 16 / 16                                            |
| charts / compatibility_reports                                            | 7 / 6                                                   |
| messages / payment rows / gallery photo rows                              | 34 / 9 / 9                                              |
| Storage user-photos / chat-media                                          | 96 / 8 объектов                                         |
| Gallery rows без public.users owner                                       | 0                                                       |
| Повторяющиеся user_id + storage_path в галерее                            | 0                                                       |
| Payment reference duplicate groups / extra rows                           | 4 / 4                                                   |
| Users с любым plaintext birth field                                       | 3                                                       |
| Users с тремя encrypted birth fields                                      | 7                                                       |
| Storage paths без ожидаемого UID prefix/с выбранными traversal признаками | 0                                                       |
| supabase_realtime published tables                                        | 0 при аудите; после исправления — 1 (`public.messages`) |

96 объектов user-photos при 9 gallery rows — сигнал для reconciliation, но **не доказательство 87 orphan files**: могут быть unconfirmed uploads, legacy ссылки и другие допустимые ссылки. Требуется сверка всех владельцев/ссылок и retention window до удаления. Нулевой результат ограниченного path predicate не является проверкой содержимого файлов или полного byte-level canonicalization.

### 7.4 Миграционные выводы

Checksums 11 завершённых Prisma migrations совпали. Ранее откатанная попытка compatibility_reports не является unresolved failed migration; новая завершённая запись с тем же именем имеет соответствующий локальный checksum. Ошибочно объявлять любой исторический rolled_back блокером migrate deploy.

Новые Prisma paths access/message SQL уже отражены в Supabase ledger под management versions 20261013083924/20261013084214, Storage — 20261013084215. Prisma deploy впоследствии должен согласованно применить/учесть свои две ещё не записанные миграции. Успешный двойной replay в fixture — необходимое, но недостаточное доказательство полноценного production deployment.

## 8. Техническая готовность по направлениям

| Область                | Что подтверждено                                                                   | Что блокирует окончательную приёмку                                                       |
| ---------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Auth / onboarding      | Guard/token identity и regression tests                                            | Доставка кода, реальные OTP/OAuth/deep links и неполный профиль                           |
| Admin / фото           | Серверная роль, ownership, metadata validation                                     | Runtime negative tests, race confirm, контент/объём и lifecycle                           |
| Подписки               | Mock закрыт для production, подпись webhook, исправленная cancel известных sub IDs | A-02/03/04/14/20 и реальные provider сценарии                                             |
| Натал / транзиты       | Native module и ephe path работают на хосте                                        | Ошибка узлов, timezone/speed и эталонные численные тесты                                  |
| AI / Advisor           | Провайдеры, fallback и JSON prompt contract присутствуют                           | Корректность исходных расчётов, реальные provider failures/cost/load; limiter degradation |
| Dating / compatibility | Выдача/вычислительные сервисы и очередь есть                                       | create_like contract, rank stub и сквозной reciprocal match                               |
| Chat / notifications   | Ограничения отправки усилены, есть push/Realtime код                               | publication, history pagination, DTO, reconnect/device acceptance                         |
| Redis / Bull           | Общий Redis service и background processor присутствуют                            | Outage/multi-instance/load/очередь и атомарные лимиты                                     |
| Аналитика              | Сервис и routes существуют                                                         | Таблицы, role-aware client, error handling и admin gate                                   |
| DevOps / release       | Локальный build и unit/type/lint/SQL checks проходят                               | Чистый образ, env, миграционный replay, digest/rollback/readiness                         |
| Mobile delivery        | Expo SDK 54, manifests и EAS profiles присутствуют                                 | Проверка cwd, preview builds и тесты на iOS/Android                                       |

Наличие экрана, модуля, DTO или enum не означает готовность функции. Например, backend отклоняет apple/google upgrade как неподдерживаемые, а frontend completePurchase для method=apple просто возвращает управление. Поддержку native store purchase/restore нельзя выводить из названий способов оплаты. Решение о канале платного мобильного выпуска требует отдельной продуктовой/платформенной приёмки.

## 9. Порядок продолжения работ и критерии закрытия

Существующий [план недельных спринтов](AUDIT_CONCLUSION_AND_WEEKLY_SPRINTS_2026-10-13.md) остаётся основой. Этот аудит актуализирует технические зависимости, а не объявляет спринт выполненным по прошедшим календарным дням.

| Пакет                       | Находки       | Результат, который надо предъявить                                                                               |
| --------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Завершение S1 / доставка    | A-01, A-05–08 | Стенд с конкретным SHA/digest, рабочий CORS/env/ports, delivery record обеих цепочек SQL и negative access tests |
| S2 / безопасный биллинг     | A-02–04, A-20 | Один recurring sub на operation, полноценные invoices/events, recovery и одинаковая отмена на двух устройствах   |
| Ранний security maintenance | A-15–17, A-23 | Dependency triage/совместимые обновления, upload limits, обязательный encryption mode и тесты отказов            |
| Восстановление dating/chat  | A-09–12, A-19 | Like → reciprocal match → realtime chat; корректная история, блоки, reconnect и runtime DTO                      |
| Расчёты и жизненный цикл    | A-13–16, A-21 | Эталонные узлы/UTC/speed, версионированный пересчёт, безопасный backfill и подтверждённое удаление               |
| Качество и эксплуатация     | A-18, A-22–25 | Реальные GitHub checks, покрытие по рискам, readiness/load, корректные analytics и mobile preview                |

Необходимые migrations должны поставляться вместе с соответствующим исправлением; не ждать отдельного инфраструктурного спринта ради уникальности операции, RLS или publication. Откат приложения не должен возвращать широкие client grants.

Готовность публичного выпуска: известные access P0 доставлены, подтверждены основные пользовательские сценарии и lifecycle, есть воспроизводимая сборка/доставка и мониторинг. Готовность платного выпуска дополнительно требует закрытия A-02/03/04/14/20, приёмки реальных платежей и определённого канала покупки. Успешные unit-тесты не заменяют эти условия.

## 10. Воспроизведение проверок и границы исполнения

Команды из корня репозитория, без запуска прикладных миграций:

```bash
(cd backend && npm run lint:check)
(cd backend && npm run build)
(cd backend && npx --no-install tsc --noEmit)
(cd backend && npm test -- --ci --coverage --maxWorkers=2)
(cd frontend && npx --no-install tsc --noEmit)
(cd frontend && npm run test:ci)
npx --no-install prettier --check "**/*.{ts,tsx,js,jsx,json,md}"
bash backend/test/sprint1-security-migrations.sh
(cd backend && npm audit --json)
(cd backend && npm audit --omit=dev --json)
(cd frontend && npm audit --json)
(cd frontend && npm audit --omit=dev --json)
```

Frontend test:ci ожидаемо завершится exit 1 до достижения coverage threshold. Npm audit exit 1 с vulnerability metadata означает найденные advisories; сетевой timeout/ECONNREFUSED сам по себе таким результатом не является. Dependency counts меняются с advisory database, поэтому для сравнения сохранять датированные JSON и lockfile.

SQL-доказательства: [TECHNICAL_AUDIT_READONLY_2026-10-22.sql](TECHNICAL_AUDIT_READONLY_2026-10-22.sql). Скрипт ограничен READ ONLY transaction, возвращает каталоги/агрегаты и не вызывает бизнес-RPC. Для него нужен административный доступ на чтение. Имена таблиц/политик/версии являются метаданными, персональные строки и секреты не выгружаются.

SQL regression runner требует Docker и локальный postgres:17-alpine, использует --network none и удаляет тестовый контейнер. Его fixture/assertions нельзя направлять в production. Docker Compose/start.sh может запустить migrate deploy; поэтому docker compose up --build не использован как безобидная локальная проверка.

После подготовки отдельного стенда остаются обязательными: чистая установка npm ci; npx prisma generate; проверенный Prisma/Supabase migration deploy; docker compose up --build; frontend EAS preview build и установка на устройства. EAS project/bundle identifier и секреты перед этим не менять автоматически.

## 11. Итоговое техническое заключение

AstraLink имеет рабочую архитектурную основу и теперь воспроизводимо проходит имеющиеся локальные проверки кода. Исправления Sprint 1 — реальные изменения, включая подтверждённое усиление прав в живой БД; повторять прежнее заключение «backend tests/lint не работают и cache/reports открыты» уже неверно.

В то же время это **промежуточное состояние разработки, требующее стендовой приёмки**, а не подтверждённая готовность к релизу. Следующий приоритет — доставка конкретной исправленной версии, защита повторных платежных операций, восстановление dating/chat и устранение ошибок расчётов/удаления. Развитие новых функций и рекламные обещания должны опираться на прошедшую приёмку сборку.

Созданы только этот отчёт и SQL-приложение. Код приложения, manifests, lockfile, миграции и настройки Supabase в ходе настоящего аудита не исправлялись. Старые аудиты и результаты 13–14 октября сохранены как история.
