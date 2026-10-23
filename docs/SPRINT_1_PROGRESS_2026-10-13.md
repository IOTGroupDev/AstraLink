# Спринт 1 AstraLink — фактический прогресс

Создано: 13 октября 2026 года. Обновлено: 14 октября 2026 года. Статус: **в работе; первый пакет исправлений готов, полная приёмка спринта не завершена**.

Основной план: [недельные спринты и заключение](AUDIT_CONCLUSION_AND_WEEKLY_SPRINTS_2026-10-13.md).

## Выполнено

| Задача            | Что изменилось                                                                                                                                                                                                  | Где действует                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| S1.1 Auth         | complete-signup защищён session, ID берётся из проверенного контекста; OAuth callbacks верифицируют Supabase token до admin-чтения; ensure-profile не доверяет email/ID из DTO                                  | Код и регрессионные проверки в workspace; deployed backend не подтверждён |
| S1.2 RLS/grants   | client CRUD общего AI-кэша/отчётов и пустых legacy таблиц закрыт; включён RLS; убраны users INSERT/UPDATE/DELETE и default client grants новых public tables/sequences                                          | Применено в живом Supabase AstraLink, проверено повторно                  |
| S1.3 Фото и admin | Свой namespace проверяется до upload/confirm/sign/delete, также в карточках/подборе/профиле/чате; confirm проверяет наличие и MIME/размер объекта; admin endpoints требуют проверенного app_metadata.role=admin | Код готов локально; Storage prefix policy уже применена в Supabase        |
| S1.4 Оплата       | Mock разрешён только в development/test; неизвестные методы отклоняются; отмена верифицирует владельца Stripe sub и устанавливает cancel_at_period_end для уникальных сохранённых sub IDs                       | Код готов; тесты с mock Stripe, живые платежи/отмены не выполнялись       |
| S1.5 Сообщения    | Backend проверяет блокировку в обе стороны и статус диалога; direct INSERT запрещает inactive match, блоки, чужое вложение, system/read_at; небезопасная RPC send_message закрыта                               | RLS/RPC права применены в Supabase; backend-код пока локальный            |

Завершение регистрации для OAuth сохранено отдельным защищённым маршрутом. Исправлена ошибочная группа декораторов logout; отдельный logout снова зарегистрирован. Выход приложения через Supabase signOut не заменялся.

Небезопасное восстановление профиля по email ограничено: чужая stale запись удаляется только после явного Auth 404/user_not_found. Ошибка сети или неопределённое отсутствие не считается разрешением удалить другой профиль.

Существующее начало нового диалога с профиля сохранено. Перед созданием проверяются принадлежность медиа и блокировки; existing blocked/unmatched conversation не допускает отправку. Это не меняет бизнес-правило на «общение исключительно после взаимного лайка».

## Что применено в Supabase

Проект: `ayoucajwdyinyhamousz`. Только изменения прав/политик/функции разрешения сообщений; строки приложения и файлы Storage не удалялись, денежные операции не выполнялись.

| Supabase migration          | Version        | Локальный SQL                                                                                                     |
| --------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| sprint1_access_hardening    | 20261013083924 | [Prisma access migration](../backend/prisma/migrations/20261013000000_sprint1_access_hardening/migration.sql)     |
| sprint1_message_permissions | 20261013084214 | [Prisma message migration](../backend/prisma/migrations/20261013000100_sprint1_message_permissions/migration.sql) |
| sprint1_storage_permissions | 20261013084215 | [Supabase Storage migration](../supabase/migrations/20261013000200_sprint1_storage_permissions.sql)               |

Первые два изменения сохранены для Prisma deploy: в Supabase они уже применены через MCP и записаны в Supabase ledger; Prisma ledger пока не пополнен. При следующем штатном prisma migrate deploy они будут повторно применены и отмечены Prisma. Повторное применение проверено. Storage SQL находится отдельно в существующей цепочке Supabase migrations, а не в Prisma-managed auth/storage DDL.

Повторная live проверка:

- RLS включён на шести ранее открытых таблицах; anon/authenticated не имеют на них SELECT/INSERT/UPDATE/DELETE, серверные права сохранены.
- Authenticated не может обновлять public.users; owner-only чтение и публичная витрина доступны по прежним правилам.
- Проверка с фиктивным subject: закрытый кэш/отчёты недоступны, собственных профилей 0; public_profiles читается согласно существующей политике.
- Service-role читает кэш и отчёты: на момент проверки 70 и 6 строк. Это изменяющиеся данные; их содержимое не извлекалось.
- Storage policies требуют точный собственный префикс; owner=self больше не разрешает чужой каталог. Service-role policies сохранены.
- Новая can_send_message_to(uuid) имеет фиксированный пустой search_path, использует auth.uid(), не принимает чужой sender ID и проверяет входящие/исходящие блокировки через серверный контекст.
- send_message overloads и trigger-only handle_new_user не вызываются authenticated напрямую. Безопасный direct INSERT backend сохранён.
- Security Advisor больше не показывает ERROR rls_disabled_in_public. INFO «RLS on без policy» на server-only таблицах ожидаем: клиентские grants закрыты, сервер работает с BYPASSRLS. Остальные WARN о definer RPC и leaked password protection не объявлены исправленными.

## Изменённые файлы кода

- Auth: `backend/src/auth/auth.controller.ts`, `supabase-auth.service.ts`, `guards/supabase-auth.guard.ts`.
- Общие права: `backend/src/common/guards/admin.guard.ts`, `common.module.ts`, `backend/src/types/auth.ts`.
- Admin и сообщения: `backend/src/chart/chart.controller.ts`, `backend/src/dating/dating.controller.ts`, `backend/src/chat/chat.service.ts`.
- Подписи фото: `backend/src/user/user-photos.service.ts`, `dto/photos.dto.ts`, `user.service.ts`, `backend/src/dating/dating.service.ts`.
- Подписка: `backend/src/subscription/subscription.controller.ts`, `subscription.service.ts`.

В dating.service.ts сохранены существовавшие рабочие изменения; дополнительно исправлены три ошибки отступов без изменения той логики. Остальные незакоммиченные изменения пользователя не откатывались. 14 октября во frontend выполнено только форматирование десяти файлов для обязательного Prettier check. Изменения конфигурации приложения, существовавшие до работ, сохранены; настройки bundle identifier и EAS не менялись этим пакетом. Схема колонок и конфигурация секретов не менялись.

Новые regression specs: два Auth security suite, subscription.billing, user-photos.service, photo-signing-ownership, admin.guard и chat-permissions. SQL fixture/assertions/runner находятся в backend/test и используют только изолированную тестовую БД с вымышленными идентификаторами.

## Автоматические проверки — продолжение 14 октября

Исправлены пять исходных failed suites, а не отключены проверки TypeScript/Jest:

- Chart: вложенные Prisma mocks типизированы отдельно; проверяется актуальный ключ subscription:record и передача данных сервису натальной карты. Пустые тесты расчётов заменены проверками фасада. Эти тесты не подтверждают точность Swiss Ephemeris и не подменяют вычисления.
- Subscription: обновлены зависимости Nest и модели Subscription; проверяются trial, запрет повторного использования, истечение доступа, features, legacy MAX и кеш. Убраны пустые утверждения и измерение скорости на замороженных часах.
- Auth: вместо полностью закомментированного suite работают проверки OTP, возвращаемой личности, существующего/неполного профиля, создания карты и ошибок провайдера.
- AI: сохранены текущие промпты; тест проверяет восемь JSON полей, их типы, ограничения на выдуманные транзиты и стиль на ru/en/es.
- App: ожидание стартового ответа соответствует существующему Hello AstraLink.

CI больше не подавляет ошибки тестов frontend и ESLint backend. Для lint добавлена команда lint:check без изменения исходников. Наличие frontend lint script не имитируется: отдельно выполняется TypeScript. Добавлена обязательная проверка SQL permissions в изолированном PostgreSQL 17. Итоговые jobs не разрешают failure/cancelled/skipped обязательных проверок. Полные workflow не запускались в GitHub: здесь проверены YAML, зависимости jobs и локальные команды.

В root и backend зафиксирован одинаковый Prettier 3.8.1. До этого версии 3.6.2 и 3.8.1 противоречили друг другу при форматировании backend. Исправлено только форматирование отмеченных frontend файлов; бизнес-логика экранов не менялась.

Дополнительно изменены:

- .github/workflows/ci.yml, .github/workflows/code-quality.yml;
- package.json/package-lock.json в корне и backend;
- backend/src/app.controller.spec.ts, auth/supabase-auth.service.spec.ts, chart/chart.service.spec.ts, services/ai.service.spec.ts, subscription/subscription.service.spec.ts;
- форматирование: frontend/app.json; components/lessons/LessonCard.tsx, components/shared/GradientBorderView.tsx; screens/CompatibilityScreen.tsx, EditProfileScreen.tsx, HoroscopeScreen.tsx, NatalChartScreen.tsx, PersonalCodeScreen.tsx; services/advisor-history.ts, services/api/auth.api.ts.

Удалены только устаревшие staged-копии двух наших первоначальных migration paths. Сохранены канонические access/message Prisma migrations и отдельная Storage Supabase migration; чужие staged изменения не сбрасывались.

## Проверки

| Проверка                                           | Результат на 14 октября                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Backend build и TypeScript                         | Прошли                                                                                                        |
| Full backend Jest с --ci --coverage --maxWorkers=2 | 20/20 наборов, 414/414 тестов прошли                                                                          |
| Backend coverage                                   | 24.17% statements/lines, 16.63% branches, 24.60% functions; общего порога backend сейчас нет                  |
| Full backend lint:check                            | 0 ошибок, 4 предупреждения unused variables/argument                                                          |
| Frontend TypeScript                                | Прошёл                                                                                                        |
| Frontend unit CI: npm test -- --ci --maxWorkers=2  | 10/10 наборов, 75/75 тестов прошли                                                                            |
| Frontend test:ci со сбором покрытия                | Тесты 75/75 прошли; команда НЕ прошла порог покрытия 30%                                                      |
| Frontend coverage                                  | statements 8.53%, branches 5.95%, functions 8.16%, lines 8.82%                                                |
| Prettier всего репозитория                         | Версии выровнены, ошибки форматирования исправлены                                                            |
| Изолированный PostgreSQL 17                        | Три миграции применены дважды; доступ, блоки, вложения, Storage и server paths прошли                         |
| Workflow YAML / зависимости jobs                   | Проверены локально; запуск в GitHub ещё не подтверждён                                                        |
| Live Supabase catalog/roles/advisor                | Проверка 13 октября подтвердила новые права и сохранённый server доступ; 14 октября production DDL не менялся |

Frontend unit job сохраняет исходный объём проверки тестов и теперь останавливает CI при ошибке. Сбор покрытия остаётся отдельной командой npm run test:ci: её порог 30% не снижен, collectCoverageFrom не сужен, проблема не объявлена исправленной. Достижение порога требует дополнительных сценариев UI/API и входит в дальнейшие задачи качества.

Первый запуск исправленного Auth suite выявил нормализацию birthDate до YYYY-MM-DD; ожидание поправлено по действующему контракту. Все 20 backend suites теперь исполняются успешно. У SQL runner ранее устранена гонка с временным init-сервером Docker: готовность проверяется после запуска основного postgres PID 1.

## Что ещё не завершено

1. Новый backend не опубликован. Публичный health отвечает HTTP 200 с ok/ts, но не показывает commit/version; совпадение deployed source не установлено. Исправления Auth/Stripe/подписей/admin в production нельзя считать введёнными до развёртывания и smoke-проверки.
2. Нет проверки настоящего Stripe cancel/оплаты и мобильного входа на устройствах. Внешние операции заменены тестовыми mocks; реальный OAuth/OTP/deep link ещё требует staging.
3. Локальные обязательные тесты, build, lint и TypeScript восстановлены; успешный запуск GitHub workflows ещё не подтверждён. Покрытие frontend ниже установленного порога 30%; полный coverage check остаётся невыполненным.
4. Идемпотентность confirm/webhook и invoice/event история относятся к спринту 2. Отмена находит sub IDs из локальных payments; Stripe-подписка, созданная до отказа локальной записи, требует отдельного восстановления/discovery.
5. Сохранённые legacy пути фильтруются при подписи. Конкурентные confirm требуют решения UNIQUE/transaction; размер bucket и проверка байтов файла остаются отдельной задачей. MIME проверяется по метаданным Storage.
6. Не исправлены create_like/ranking, Realtime publication, история >100 сообщений, лунные узлы, backfill, остаточные фото и durable deletion. Они остаются в плане; рекламные обещания и полную готовность релиза этот пакет не подтверждает.

Административная роль читается только из проверенного Supabase app_metadata, не из public.users.role/user_metadata. Назначение администратора выполняет доверенный оператор через Supabase; обычные пользователи больше не могут запускать административные операции.

## Следующие действия

1. Запустить обновлённые workflows на согласованной ветке/PR и проверить реальные результаты GitHub; определить дополнительные frontend сценарии для достижения 30% покрытия.
2. Подготовить развёртывание конкретной версии backend, учесть повтор Prisma migrations и выполнить staging Auth/photo/cancel smoke. Не использовать неподтверждённую health-версию как доказательство доставки исправлений.
3. Пройти приёмку S1 с двумя пользователями и подтвердить production версию; следующий пакет кода — Sprint 2 idempotency/ledger.

Команды из корня репозитория:

```bash
(cd backend && npx prisma generate)
(cd backend && npm run lint:check)
(cd backend && npm run build)
(cd backend && npx tsc --noEmit)
(cd backend && npm test -- --ci --coverage --maxWorkers=2)
bash backend/test/sprint1-security-migrations.sh
(cd frontend && npx tsc --noEmit)
(cd frontend && npm test -- --ci --maxWorkers=2)
npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}"
# Отдельная проверка покрытия frontend: сейчас падает по порогу 30%.
(cd frontend && npm run test:ci)
```

SQL runner требует Docker и локальный образ postgres:17-alpine; не публикует порты, использует --network none и удаляет контейнер. Нельзя выполнять fixture/assertions напрямую на production. Миграции уже применены в данном Supabase; дополнительное применение выполняется только в согласованной цепочке deploy. Откат не должен возвращать открытые client grants; для исправлений предпочтительна следующая миграция с сохранением запретов.
