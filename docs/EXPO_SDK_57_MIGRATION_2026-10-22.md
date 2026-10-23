# AstraLink — миграция frontend на Expo SDK 57

Дата: 22 октября 2026 года. **Обновление выполнено в рабочем дереве.** Чистая установка, проверки типов, unit-тесты, Expo Doctor, генерация нативных проектов и JS/Hermes export проходят. Скомпилированные IPA/APK и проверка на устройствах пока не выполнены; production-релиза не было.

## Версии

| Пакет               | Было                                                      | Стало                                       |
| ------------------- | --------------------------------------------------------- | ------------------------------------------- |
| Expo                | ~54.0.33                                                  | ~57.0.31                                    |
| React Native        | 0.81.5                                                    | 0.86.3                                      |
| React / React DOM   | 19.1.0                                                    | 19.2.3                                      |
| Reanimated          | ~4.1.1                                                    | 4.5.1                                       |
| Worklets            | 0.5.1                                                     | 0.10.1                                      |
| Stripe React Native | ^0.66.0                                                   | 0.64.0 — рекомендованная Expo SDK 57 версия |
| TypeScript          | фактически 5.9.3; дублировался в двух dependency sections | ~6.0.3, только devDependencies              |
| Zustand             | 4.5.2                                                     | ~4.5.7                                      |

Все используемые Expo/native packages согласованы с bundledNativeModules установленного Expo 57.0.31. Сохранён package-lock.json, npm ci проверен с чистой переустановкой. Force/legacy-peer-deps не использовались; npm ls не обнаружил invalid dependency tree.

Добавлены явно используемые expo-constants и expo-file-system, а также expo-build-properties, expo-dev-client и expo-system-ui для native configuration, существующего developmentClient профиля и userInterfaceStyle. i18next/react-i18next обновлены в пределах прежних major-версий для совместимости peer types с TypeScript 6; Zustand — патч в той же ветке 4.x для актуального use-sync-external-store.

Stripe приведён именно к проверяемому SDK 57 набору, а не оставлен случайной версией. Native adapter переэкспортирует настоящие StripeProvider/useStripe. Успешное выполнение реального PaymentSheet и списания этим не заявляется.

## Исправления совместимости

- `StyleSheet.absoluteFillObject` заменён на поддерживаемый `StyleSheet.absoluteFill` в существующих стилях, без замены layout/design.
- Старый experimentalBlurMethod заменён на blurMethod. Новый общий BlurView получает явный Android BlurTargetView; отдельные roots добавлены в result modals совместимости и персонального кода. После attachment родительского native view target обновляется в дочерних BlurViews. На iOS сохраняется обычный Expo BlurView. Четыре regression tests проверяют attachment, nested roots, explicit target и iOS behavior.
- Babel использует react-native-worklets/plugin. Jest использует вынесенный @react-native/jest-preset той же версии, что React Native; Jest 29 сохранён совместимым с preset.
- Устаревший TypeScript baseUrl удалён; @assets path сделан явно относительным. Таймер типизирован через ReturnType<typeof setTimeout>, global заменён на globalThis в существующем console override.
- Native Stripe изолирован от web bundle через stripe.tsx/stripe.web.tsx. В web нет фиктивного успешного платежа: PaymentSheet явно недоступен, отказ происходит до запроса создания SetupIntent. В native вызывается настоящий SDK. Web checkout этим обновлением не реализован.
- Удалён больше не поддерживаемый newArchEnabled: новая архитектура обязательна для SDK 57. Прежняя splash config перенесена в expo-splash-screen plugin с теми же изображением, цветом и resizeMode; legacy full-screen image поведение iOS сохранено настройкой plugin.
- expo-build-properties задаёт iOS deployment target 16.4 и enableSceneSupport для совместимости SDK 57 с Xcode 27/iOS 27. На свежем prebuild подтверждён UIApplicationSceneManifest. Фактические cold/warm deep links всё ещё требуют проверки на устройстве.

## Идентичность приложения и нативные проекты

Сохранены iOS bundle identifier `astralink.test`, Android package `astralink.test`, scheme `astralink`, EAS project ID, owner, merchant identifier, версии/номера приложения, build profiles и submit settings. Supabase Auth, API routes, storage keys и backend в рамках миграции не заменялись. Ключи/окружения оплаты не переключались.

Frontend ios/android исключены из Git и генерируются через CNG. Сначала оба проекта были успешно созданы во временной копии без CocoaPods/Gradle build. Затем установлен свежий generated native код SDK 57; исходные локальные SDK 54 папки целиком сохранены вне репозитория:

`../AstraLink-native-sdk54-20261022-9fiawty2/ios` и `../AstraLink-native-sdk54-20261022-9fiawty2/android` — пути относительно корня AstraLink.

Копия содержит прежнее локальное нативное состояние, включая локальные build files; публиковать её не требуется. Для отката нужно согласованно вернуть package.json/lockfile/config и нативные папки. Одного восстановления старых ios/android при новых JS dependencies недостаточно.

## CI и сборочная среда

Frontend требует Node >=22.13, фактически проверен на 22.22.3. Обновлены frontend CI jobs, frontend ветви matrix, iOS workflow, EAS profiles и frontend Dockerfile; backend jobs оставлены на Node 20. Для TypeScript добавлена действующая команда npm run type-check.

В iOS workflow отсутствовавший npm run lint заменён проверкой Expo dependency compatibility. Обязательная проверка версий SDK добавлена также в основной frontend CI job. Глобальная установка legacy expo-cli удалена из setup; используется CLI установленного проекта и EAS CLI. Это не заменяет полноценный frontend ESLint, которого в проекте прежде не было.

## Результаты проверок

| Проверка                                                | Результат                                                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Чистый npm ci                                           | Exit 0; 921 package установлен из lockfile                                                                |
| Manifest/lock agreement                                 | Проверено, dependencies/devDependencies совпадают                                                         |
| npm run type-check                                      | Exit 0                                                                                                    |
| Unit tests после чистой установки                       | **11 suites, 79/79 tests**, exit 0                                                                        |
| npx expo install --check                                | Dependencies are up to date, exit 0                                                                       |
| Expo Doctor                                             | **21/21**, exit 0                                                                                         |
| Fresh CNG prebuild ios + android без install            | Exit 0; target 16.4 и scene manifest подтверждены                                                         |
| expo export --platform all                              | Exit 0: web JS и два Hermes bundles, iOS/Android                                                          |
| Browser smoke на экспортированной production web сборке | SignUp отрисован, переход via email → AuthEmail работает; console errors/warnings 0. Email не отправлялся |
| GitHub YAML/job references                              | Проверены локально                                                                                        |
| Frontend coverage check                                 | **Exit 1 по прежнему порогу 30%**; 79/79 tests прошли                                                     |
| Coverage                                                | Statements 8.64%, branches 6.03%, functions 8.31%, lines 8.92%                                            |
| IPA/APK, CocoaPods/Gradle compile, device smoke         | Не выполнялись                                                                                            |

Первый all-platform export выявил native-only Stripe import в web; исправлен platform adapter, затем export прошёл. Это не фиктивная web-реализация платежей. Native bundling сохраняет настоящий Stripe module.

Порог покрытия не снижен и collectCoverageFrom не сужен. Поэтому отдельный coverage gate, в том числе используемый iOS workflow, остаётся блокером автоматического release pipeline. Успех unit job без покрытия не означает зелёный release pipeline.

Генерация native проектов и Hermes bundle не является компиляцией IPA/APK. На текущем Linux-хосте нет настроенного Android SDK/Java toolchain для этой сборки, Xcode недоступен. Платные/облачные EAS builds и TestFlight submit не запускались.

## Что проверить перед выпуском

1. Создать новые development/preview builds. Бинарник SDK 54 не подходит для JS SDK 57; обычное обновление Metro или OTA этого не исправляет.
2. На iOS >=16.4 и Android проверить cold start, onboarding, OAuth/OTP/deep links, восстановление SecureStore session и logout.
3. Проверить Stripe PaymentSheet, отмену пользователем и возврат в приложение, не смешивая SDK migration с существующими backend billing defects.
4. Проверить свайпы dating, gestures/navigation, blur в карточках и result modals, клавиатуру, date/time pickers, фото/файлы, разрешения и push notifications.
5. Завершить coverage/release gate и закрыть оставшиеся технические блокеры из аудита. SDK upgrade не исправляет Stripe idempotency, Supabase publication, create_like, лунные узлы или durable account deletion.

Команды из каталога frontend:

```bash
npm ci
npm run type-check
npm test -- --ci --maxWorkers=2
npx expo install --check
npx expo-doctor
npx expo export --platform all --output-dir dist
# Отдельный coverage check пока падает на пороге:
npm run test:ci
# Для нового development binary:
npx eas-cli build --platform ios --profile development
# Для приёмки на реальном устройстве:
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform android --profile preview
```

Development iOS profile сейчас предназначен для simulator; preview — для реального устройства. Облачная сборка требует доступа к существующему EAS project и подходящих credentials; app identifiers не менять. При необходимости regeneration локальных native folders сначала сохранять собственные изменения: в SDK 57 prebuild по умолчанию выполняет clean, для сохранения существующих файлов есть --no-clean.

## Изменённые области

Frontend package.json/package-lock.json; app.json/eas.json; Babel/Jest/TypeScript/Docker configs; App и Stripe hook/adapters; общий BlurView и его tests; механические обновления StyleSheet API и blur imports/props в существующих components/screens. Также изменены .github/workflows/ci.yml, code-quality.yml, security.yml, ios-deploy.yml и документация миграции. Прикладная схема БД и backend source не менялись.

Источники требований: [Expo SDK 57 release notes](https://expo.dev/changelog/sdk-57), [Expo SDK 56 breaking changes](https://expo.dev/changelog/sdk-56), [SDK 57 Stripe version](https://docs.expo.dev/versions/v57.0.0/sdk/stripe/), [SDK 57 BlurView](https://docs.expo.dev/versions/v57.0.0/sdk/blur-view/), [scene lifecycle и SDK 57](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md).
