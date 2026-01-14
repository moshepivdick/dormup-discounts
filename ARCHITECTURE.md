# Архитектура проекта DormUp Discounts

## Общая картина

**DormUp Discounts** — это платформа для студентов с системой скидок и QR-кодов для партнеров (кафе, рестораны, магазины) в городах Римини и Болонья. Проект представляет собой full-stack приложение с тремя основными пользовательскими ролями: студенты, партнеры и администраторы.

---

## Технологический стек

### Frontend
- **Next.js 14.2.5** (Pages Router + App Router гибрид)
- **TypeScript** — типизация
- **React 18.3.1** — UI библиотека
- **Tailwind CSS** — стилизация
- **Chart.js + react-chartjs-2** — графики и дашборды
- **@zxing/browser** — сканирование QR-кодов на клиенте
- **react-qr-code** — генерация QR-кодов

### Backend
- **Next.js API Routes** — серверные эндпоинты (Pages Router)
- **Next.js Route Handlers** — серверные эндпоинты (App Router)
- **Prisma ORM 5.22.0** — работа с базой данных
- **PostgreSQL** (через Supabase) — основная БД
- **JWT (jsonwebtoken)** — аутентификация для партнеров и админов
- **bcryptjs** — хеширование паролей
- **Zod** — валидация данных
- **LRU Cache** — rate limiting в памяти

### Инфраструктура и деплой
- **Vercel** — хостинг и serverless функции
- **Supabase** — PostgreSQL база данных + аутентификация
- **Playwright** — генерация PDF отчетов (headless браузер)

### Сторонние сервисы
1. **Supabase**
   - PostgreSQL база данных (pooled + direct connections)
   - Supabase Auth для студентов (email/passwordless OTP)
   - Row Level Security (RLS)
   - Два схемы: `auth` (Supabase) и `public` (приложение)

2. **Vercel**
   - Serverless функции
   - Edge Network (CDN)
   - Environment variables management
   - Автоматический деплой из Git

---

## Архитектура базы данных

### Схемы
- **`auth`** — таблицы Supabase Auth (users, sessions, identities, etc.)
- **`public`** — таблицы приложения

### Основные модели (Prisma Schema)

#### Бизнес-логика
- **Venue** — заведения (кафе, рестораны)
  - Поля: name, city, category, discountText, coordinates, images
  - Связи: Partner (1:1), DiscountUse[], VenueView[]
  
- **DiscountUse** — использование скидок
  - Поля: generatedCode, qrSlug, status, expiresAt, confirmedAt
  - Связи: Venue, Profile (студент)
  
- **Partner** — партнеры (владельцы заведений)
  - Поля: email, passwordHash, venueId
  - Связи: Venue (1:1)
  
- **Admin** — администраторы платформы
  - Поля: email, passwordHash, role

#### Студенты и университеты
- **Profile** — профили студентов (связано с Supabase users)
  - Поля: email, first_name, university_id, verified_student, is_admin
  - Связи: University, DiscountUse[], VenueView[]
  
- **University** — университеты
  - Поля: name, city, emailDomains[]
  - Связи: Profile[]
  
- **UniversityRequest** — запросы на добавление университета
  - Поля: requestedName, requestedDomains, status

#### Аналитика и метрики
- **VenueView** — просмотры страниц заведений
  - Поля: venueId, city, userAgent, user_id, dedupe_key
  - Индексы для быстрой аналитики
  
- **DailyPartnerMetrics** — дневные метрики по партнерам
  - Поля: page_views, qr_generated, qr_redeemed, unique_users, conversion_rate
  
- **MonthlyPartnerMetrics** — месячные метрики по партнерам
  - Аналогично Daily, но для месяца
  
- **MonthlyGlobalMetrics** — глобальные месячные метрики
  - Агрегированные данные по всем партнерам

#### Отчеты и экспорты
- **ReportSnapshot** — метаданные PDF/PNG отчетов
  - Поля: job_id, scope (admin/partner), status, pdf_path, png_path
  - Связи: Partner, Venue
  
- **ExportJob** — задания на экспорт данных
  - Поля: export_type, format (csv/xlsx), date range, filters_json
  - Статусы: PENDING, READY, FAILED

#### Статистика пользователей
- **user_stats** — статистика по студентам
  - Поля: total_discounts_generated, total_discounts_used, total_venue_views
  
- **UserPlaceStats** — статистика посещений мест
  - Поля: user_id, place_id, visits_count, last_visit_at

---

## Система аутентификации

### Три типа пользователей

#### 1. Студенты (Supabase Auth)
- **Метод**: Email + Passwordless OTP (одноразовый код)
- **Библиотека**: `@supabase/ssr`, `@supabase/supabase-js`
- **Хранение**: Supabase Auth (таблица `users` в схеме `auth`)
- **Профили**: Таблица `profiles` в схеме `public`
- **Верификация**: Email verification tokens
- **Middleware**: Проверка сессии через Supabase в `middleware.ts`

#### 2. Партнеры (JWT + Cookies)
- **Метод**: Email + Password (bcryptjs hash)
- **Хранение**: Таблица `Partner` в БД
- **Сессии**: JWT токены в HTTP-only cookies (`partner_session`)
- **Секрет**: `PARTNER_JWT_SECRET` (env variable)
- **Библиотека**: `jsonwebtoken`
- **Файлы**: `lib/auth.ts`, `pages/api/partner/login.ts`

#### 3. Администраторы (JWT + Cookies + Supabase)
- **Метод**: Email + Password (bcryptjs hash) ИЛИ Supabase Auth
- **Хранение**: Таблица `Admin` в БД + Supabase users с `is_admin=true`
- **Сессии**: JWT токены в HTTP-only cookies (`admin_session`)
- **Секрет**: `ADMIN_JWT_SECRET` (env variable)
- **Дополнительная защита**: Admin panel slug (`ADMIN_PANEL_SLUG`) + password gate cookie
- **Файлы**: `lib/auth.ts`, `pages/api/admin/login.ts`, `middleware.ts`

---

## API Архитектура

### Структура API Routes

#### Pages Router API (`pages/api/`)
- **Публичные эндпоинты**:
  - `GET /api/venues` — список заведений
  - `GET /api/venues/[id]` — детали заведения
  - `GET /api/venues/search` — поиск заведений
  - `POST /api/discounts/generate` — генерация QR-кода скидки
  - `POST /api/analytics/view` — трекинг просмотров
  - `GET /api/check-code-status` — проверка статуса кода
  - `POST /api/confirm-code` — подтверждение кода (публичный)

- **Партнерские эндпоинты**:
  - `POST /api/partner/login` — вход партнера
  - `POST /api/partner/logout` — выход
  - `POST /api/discounts/confirm` — подтверждение скидки (JWT защита)
  - `GET /api/partner/stats` — статистика партнера
  - `POST /api/partner/venue-settings` — настройки заведения

- **Админские эндпоинты**:
  - `POST /api/admin/login` — вход админа
  - `POST /api/admin/logout` — выход
  - `GET/POST /api/admin/venues` — CRUD заведений
  - `PUT/DELETE /api/admin/venues/[id]` — обновление/удаление
  - `GET/POST /api/admin/partners` — CRUD партнеров
  - `PUT/DELETE /api/admin/partners/[id]` — обновление/удаление
  - `GET /api/admin/stats/overview` — общая статистика
  - `GET /api/admin/stats/by-venue` — статистика по заведениям
  - `GET /api/admin/stats/by-day` — статистика по дням
  - `GET /api/admin/exports/jobs` — список экспортов
  - `GET /api/admin/exports/jobs/[id]` — детали экспорта
  - `POST /api/admin/exports/events` — создание экспорта

- **Отчеты**:
  - `POST /api/reports/snapshot` — создание PDF/PNG отчета (Playwright)
  - `GET /api/reports/snapshots` — список отчетов
  - `GET /api/reports/export` — скачивание отчета
  - `GET /api/reports/admin/monthly` — месячный отчет админа
  - `GET /api/reports/partner/monthly` — месячный отчет партнера

- **Cron задачи**:
  - `POST /api/cron/expire-codes` — истечение скидочных кодов

#### App Router API (`app/api/`)
- `GET /api/universities` — список университетов
- `POST /api/profile/upsert` — создание/обновление профиля
- `GET /api/top-spots` — топ заведений
- `POST /api/analytics/view` — трекинг просмотров (App Router версия)
- `GET /api/admin/stats/users` — статистика пользователей
- `POST /api/admin/logout` — выход админа (App Router)
- `GET /api/admin-link` — генерация ссылки на админ-панель

### Безопасность API

#### Rate Limiting
- **Библиотека**: `lru-cache` (in-memory)
- **Файл**: `lib/rate-limit.ts`
- **Применение**: Все POST эндпоинты аутентификации
- **Логика**: Token bucket algorithm с sliding window

#### Валидация
- **Библиотека**: `zod`
- **Файл**: `lib/validators.ts`
- **Применение**: Все API routes через `withMethods()` helper

#### Guards
- **SSR Guards**: `lib/guards.ts` — защита страниц на сервере
- **Admin Guards**: `lib/admin-guards-app-router.ts` — для App Router
- **Middleware**: `middleware.ts` — защита `/control/*` routes

---

## Генерация отчетов (PDF/PNG)

### Технология
- **Playwright** — headless браузер для рендеринга HTML в PDF/PNG
- **Конфигурация**: `vercel.json` — увеличенный timeout (60s) для `/api/reports/snapshot`

### Процесс
1. Клиент запрашивает отчет через `POST /api/reports/snapshot`
2. Создается `ReportSnapshot` запись со статусом `PENDING`
3. Фоновая задача (в том же запросе):
   - Вычисляет метрики через `lib/reports.ts`
   - Рендерит HTML шаблон
   - Использует Playwright для генерации PDF/PNG
   - Сохраняет файлы (путь хранится в БД)
   - Обновляет статус на `READY` или `FAILED`
4. Клиент опрашивает статус через `GET /api/reports/snapshots`
5. Скачивание через `GET /api/reports/export?job_id=...`

### Хранение
- Файлы хранятся в файловой системе Vercel (временное хранилище)
- Для production рекомендуется S3 или Supabase Storage

---

## Экспорт данных (CSV/XLSX)

### Технология
- **csv-stringify** — генерация CSV
- **exceljs** — генерация Excel файлов

### Процесс
1. Админ создает задание через `POST /api/admin/exports/events`
2. Создается `ExportJob` запись
3. Фоновая обработка:
   - Фильтрация данных по параметрам (date range, event types, partner)
   - Генерация файла (CSV или XLSX)
   - Сохранение пути в БД
4. Скачивание через `GET /api/admin/exports/jobs/[id]`

---

## Аналитика и метрики

### Трекинг событий
- **VenueView** — каждый просмотр страницы заведения
  - Трекинг: `POST /api/analytics/view`
  - Данные: venueId, city, userAgent, user_id, dedupe_key (дедупликация)

### Вычисление метрик
- **Файл**: `lib/reports.ts`
- **Функции**:
  - `computeDailyMetrics()` — дневные метрики
  - `computeMonthlyPartnerMetrics()` — месячные метрики партнера
  - `computeMonthlyGlobalMetrics()` — глобальные месячные метрики
  - `upsertMonthlyPartnerMetrics()` — сохранение метрик
  - `getMonthlyAdminReport()` — отчет для админа
  - `getMonthlyPartnerReport()` — отчет для партнера

### Метрики
- **Page Views** — просмотры страниц
- **QR Generated** — сгенерированные QR-коды
- **QR Redeemed** — использованные QR-коды
- **Unique Users** — уникальные пользователи
- **Conversion Rate** — (QR Redeemed / QR Generated) * 100
- **Repeat Users** — пользователи с >= 2 использованиями
- **End-to-End Conversion** — (QR Redeemed / Page Views) * 100

### Дашборды
- **Admin Dashboard**: `/admin/dashboard`
  - Общая статистика
  - Графики по заведениям
  - Дневная статистика (Chart.js)
  
- **Partner Dashboard**: `/partner/stats`
  - Метрики конкретного партнера
  - Графики активности

---

## Структура проекта

```
dormup-discounts/
├── app/                          # App Router (Next.js 14)
│   ├── api/                      # API routes (App Router)
│   ├── actions/                  # Server Actions
│   ├── auth/                     # Страницы аутентификации
│   ├── control/                  # Админ-панель (App Router)
│   └── layout.tsx                 # Root layout
│
├── pages/                        # Pages Router (legacy)
│   ├── api/                      # API routes (Pages Router)
│   ├── admin/                    # Админские страницы
│   ├── partner/                  # Партнерские страницы
│   ├── venues/                   # Страницы заведений
│   └── discount/                 # Страницы скидок
│
├── lib/                          # Утилиты и хелперы
│   ├── prisma.ts                 # Prisma Client (singleton)
│   ├── auth.ts                   # JWT аутентификация
│   ├── supabase/                 # Supabase клиенты
│   │   ├── server.ts             # Server-side клиент
│   │   ├── browser.ts            # Browser клиент
│   │   └── pages-router.ts       # Pages Router клиент
│   ├── api.ts                    # API response helpers
│   ├── validators.ts             # Zod схемы
│   ├── rate-limit.ts             # Rate limiting
│   ├── guards.ts                 # SSR guards
│   ├── reports.ts                # Логика отчетов
│   ├── stats.ts                  # Статистика
│   └── env.ts                    # Environment variables
│
├── prisma/
│   ├── schema.prisma             # Prisma схема
│   ├── migrations/               # Миграции БД
│   └── seed.ts                   # Seed данные
│
├── components/                   # React компоненты
│   ├── admin/                    # Админские компоненты
│   ├── charts/                   # Графики
│   ├── layout/                   # Layout компоненты
│   └── navigation/               # Навигация
│
├── utils/                        # Утилиты
│   ├── maps.ts                   # Работа с картами
│   ├── geocoding.ts             # Геокодирование
│   └── distance.ts              # Расчет расстояний
│
├── types/                        # TypeScript типы
├── hooks/                        # React hooks
├── styles/                       # Глобальные стили
├── public/                       # Статические файлы
├── scripts/                      # Скрипты для разработки
│
├── middleware.ts                 # Next.js middleware
├── next.config.js                # Next.js конфигурация
├── vercel.json                   # Vercel конфигурация
└── package.json                  # Зависимости
```

---

## Environment Variables

### Обязательные
- `DATABASE_URL` — PostgreSQL connection string (pooled, pgbouncer)
- `DIRECT_URL` — PostgreSQL direct connection (для миграций)
- `PARTNER_JWT_SECRET` — секрет для JWT партнеров
- `ADMIN_JWT_SECRET` — секрет для JWT админов
- `NEXT_PUBLIC_SUPABASE_URL` — URL Supabase проекта
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — публичный ключ Supabase

### Опциональные
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (для админских операций)
- `ADMIN_PANEL_SLUG` — секретный slug для админ-панели
- `ADMIN_PANEL_PASSWORD_HASH` — хеш пароля для админ-панели
- `ADMIN_GATE_COOKIE_TTL_MINUTES` — TTL cookie для админ-панели (default: 120)
- `EXPORT_HASH_SALT` — соль для хеширования экспортов
- `MAX_EXPORT_DAYS` — максимальный период экспорта (default: 31)

---

## Потоки данных

### Генерация QR-кода скидки
1. Студент открывает страницу заведения `/venues/[id]`
2. Нажимает "Get discount"
3. `POST /api/discounts/generate`:
   - Отменяет все активные коды для этого заведения
   - Генерирует новый код и QR slug
   - Создает запись `DiscountUse` со статусом `generated`
   - Возвращает код и QR-код
4. Студент видит код и QR на экране

### Подтверждение скидки
1. Партнер сканирует QR через `/partner/scan` (ZXing)
2. Или вводит код вручную
3. `POST /api/discounts/confirm`:
   - Проверяет JWT партнера
   - Ищет `DiscountUse` по `qrSlug` или `generatedCode`
   - Проверяет статус и срок действия
   - Обновляет статус на `confirmed` и `confirmedAt`
4. Партнер видит подтверждение

### Аналитика просмотров
1. Студент открывает `/venues/[id]`
2. `POST /api/analytics/view`:
   - Создает запись `VenueView`
   - Использует `dedupe_key` для дедупликации
3. Метрики обновляются автоматически при вычислении отчетов

---

## Особенности архитектуры

### Гибридный роутинг
- **Pages Router** — для legacy API и страниц
- **App Router** — для новых страниц и API
- Оба работают параллельно

### Connection Pooling
- **Production**: Используется `DATABASE_URL` с pgbouncer (connection_limit=1)
- **Development/Migrations**: Используется `DIRECT_URL` без pooling
- **Логика**: `lib/prisma.ts` автоматически выбирает правильный URL

### Serverless-friendly
- Все API routes stateless
- Rate limiting через in-memory LRU cache (переживает warm invocations)
- Prisma Client singleton pattern для переиспользования соединений

### Multi-schema Prisma
- Поддержка двух схем: `auth` (Supabase) и `public` (приложение)
- Миграции применяются к обеим схемам

---

## Деплой

### Vercel
1. Push в Git репозиторий
2. Vercel автоматически определяет Next.js проект
3. Build command: `npm run build` (включает `prisma generate`)
4. Environment variables настраиваются в Vercel Dashboard
5. После деплоя: запуск миграций через `npx prisma migrate deploy`

### Supabase
- База данных создается в Supabase проекте
- Миграции применяются через Prisma CLI
- Connection strings берутся из Supabase Dashboard

---

## Безопасность

### Аутентификация
- JWT токены в HTTP-only cookies
- Отдельные секреты для партнеров и админов
- Supabase Auth для студентов с email verification

### Защита данных
- Пароли хешируются через bcryptjs
- Все SQL запросы параметризованы (Prisma)
- Rate limiting на всех критичных эндпоинтах
- Валидация через Zod на всех API routes

### Админ-панель
- Двухфакторная защита: Supabase auth + password gate cookie
- Секретный slug в URL (`/control/[slug]`)
- Middleware проверяет доступ перед рендерингом

---

## Производительность

### Оптимизации
- Индексы в БД для частых запросов (venueId, userId, createdAt)
- LRU cache для rate limiting
- Connection pooling через pgbouncer
- Prisma Client singleton для переиспользования соединений

### Масштабирование
- Serverless функции на Vercel (автоматическое масштабирование)
- Supabase PostgreSQL (managed database)
- Статические страницы через Next.js SSG/ISR где возможно

---

## Мониторинг и логирование

### Логирование
- Console.log в development
- Vercel автоматически собирает логи serverless функций
- Supabase Dashboard для мониторинга БД

### Метрики
- Встроенная аналитика через таблицы метрик
- Дашборды для админов и партнеров
- Экспорт данных для внешнего анализа

---

## Будущие улучшения

### Рекомендации
1. **Хранилище файлов**: Интеграция S3 или Supabase Storage для отчетов
2. **Кэширование**: Redis для rate limiting и кэширования метрик
3. **Очереди**: Background jobs для генерации отчетов (Bull, BullMQ)
4. **Мониторинг**: Sentry для error tracking
5. **Тестирование**: Unit и E2E тесты (Jest, Playwright)
6. **CI/CD**: Автоматические тесты и деплой через GitHub Actions

---

## Заключение

Проект представляет собой современное full-stack приложение с четким разделением ответственности:
- **Frontend**: Next.js с гибридным роутингом
- **Backend**: Serverless API routes + Prisma ORM
- **База данных**: Supabase PostgreSQL с multi-schema
- **Аутентификация**: JWT для партнеров/админов, Supabase Auth для студентов
- **Аналитика**: Встроенная система метрик и отчетов
- **Деплой**: Vercel + Supabase

Архитектура спроектирована для масштабирования и легкости поддержки, с использованием современных best practices и паттернов.
