# AstraLink — исправление Like в Dating

Дата: 22 октября 2026 года.

## Причина

Подтверждён дефект A-09 технического аудита: live `create_like(text,text)` не имела EXECUTE для authenticated, а её переменные text были несовместимы с UUID в likes/matches. Backend превращал ошибку RPC в HTTP 200 / success:false. Frontend не проверял success и переходил к следующей анкете даже при ошибке запроса.

## Изменения

- [Миграция](../supabase/migrations/20261022091806_fix_create_like_uuid_and_permissions.sql) исправляет существующую RPC. Сигнатура PostgREST и параметры API сохранены; внутри используются UUID. Отправитель определяется только через auth.uid(). Проверяются action, self-like, существование пользователей и блокировки в обе стороны.
- SECURITY DEFINER использует пустой search_path и явные схемы. EXECUTE открыт authenticated, закрыт PUBLIC/anon. Права на таблицы и их RLS не расширены.
- Повторные like/super_like обновляют одну запись действия и возвращают существующий активный match. Pass не создаёт match. Закрытые unmatched/blocked matches не активируются повторно.
- Блокировка транзакции для пары пользователей сериализует одновременные взаимные лайки и предотвращает ситуацию, когда оба запроса не замечают встречное действие.
- Backend возвращает HTTP-ошибку при отказе RPC, валидирует UUID/action через DTO. Discovery исключает уже обработанные анкеты, включая fallback выдачи.
- Frontend отклоняет старый ответ success:false, показывает сообщение при ошибке и сохраняет текущую анкету. Повторные запросы блокируются до завершения первого. После неудачного свайпа карточка возвращается в исходное положение. Добавлены доступные подписи Like/Pass на трёх языках.

## Доставка

**RPC-миграция применена в live Supabase AstraLink.** Запись ledger: `20261022091806`, имя `fix_create_like_uuid_and_permissions`. Локальный filename согласован с ledger. Старый backend вызывает ту же RPC и может использовать исправленный успешный путь без изменения контракта.

Изменения TypeScript/frontend находятся в рабочем дереве. Развёртывание backend, публикация EAS update и сборка нового IPA/APK в рамках этого исправления не выполнялись. Для доставки обработки ошибок и исключения обработанных анкет нужен обычный deploy обновлённого backend; локальный Expo Go получает frontend из Metro после перезагрузки.

Миграция меняет функцию и её EXECUTE, не меняет столбцы и не переписывает существующие лайки/matches. Исходное определение сохранено локально в `/tmp/astralink-dating-create-like-before-20261022.sql`. Для аварийного закрытия RPC можно отозвать EXECUTE у authenticated; это снова сделает лайки недоступными и не удалит данные.

## Проверки

- Изолированный PostgreSQL 17 в Docker без сети: миграция применяется дважды; проверены first like, pass, reciprocal super_like, повтор, единственность match, закрытый match, блокировки в обе стороны, отсутствующая авторизация, self-like, неверный UUID/action, отсутствующий target/sender и одновременные взаимные лайки. Контейнер удаляется после теста.
- Live: authenticated EXECUTE = true, anon EXECUTE = false, SECURITY DEFINER и пустой search_path подтверждены. Под ролью authenticated в транзакции с ROLLBACK проверены отсутствие авторизации, self-like и неверный UUID. Лайки реальным пользователям для проверки не создавались.
- Backend: сборка и **423/423 теста, 20 suites**; lint без ошибок, четыре прежних предупреждения вне этого изменения.
- Frontend: TypeScript, **88/88 тестов, 13 suites** и iOS Hermes export. UI-тесты проверяют нажатие Like, сохранение карточки и повтор после ошибки, а также защиту от двойного запроса. Нативные графические компоненты в UI-тестах замоканы.
- Реальный Like с iPhone через развёрнутый backend и два устройства для взаимного match ещё требует приёмки. Hermes export не является сборкой IPA.

Команды из корня проекта:

```bash
bash backend/test/dating-like.sh
npm --prefix backend run build
npm --prefix backend run lint:check
npm --prefix backend test -- --ci --maxWorkers=2
npm --prefix frontend run type-check
npm --prefix frontend test -- --ci --maxWorkers=2
```

На iPhone проверить Like → следующая анкета → перезагрузка выдачи; при встречном Like должен появиться один match. Затем проверить потерю сети: сообщение об ошибке, возврат карточки и успешную повторную попытку. Для проверки обновлённого frontend перезапустить Metro из frontend командой `npx expo start -c` и перезагрузить проект в Expo Go.
