# Admin Panel Setup Guide

## Обзор

Реализована защищённая админка с многоуровневой системой безопасности:
- Скрытый URL (`/control/<SECRET_SLUG>`)
- Проверка Supabase session
- Проверка роли `is_admin` в базе данных
- Дополнительный пароль админки (bcrypt hash)
- HttpOnly cookie с ограниченным временем жизни

## Изменённые файлы

### 1. База данных / Prisma
- `prisma/schema.prisma` - добавлено поле `is_admin Boolean @default(false) @map("is_admin")` в модель Profile
- `prisma/migrations/20260107002110_add_is_admin_to_profile/migration.sql` - миграция для добавления поля

### 2. Конфигурация
- `lib/env.ts` - добавлены переменные:
  - `ADMIN_PANEL_SLUG` - секретный slug для админки
  - `ADMIN_PANEL_PASSWORD_HASH` - bcrypt hash пароля админки
  - `ADMIN_GATE_COOKIE_TTL_MINUTES` - время жизни cookie (по умолчанию 120 минут)

### 3. Middleware и защита
- `middleware.ts` - защита маршрутов `/control/*`:
  - Проверка slug
  - Проверка Supabase session
  - Проверка is_admin в профиле
  - Проверка admin_gate cookie

### 4. Админка
- `app/control/[slug]/page.tsx` - главная страница админки
- `app/actions/admin.ts` - server action для проверки пароля
- `components/admin/AdminPasswordForm.tsx` - форма ввода пароля
- `components/admin/AdminDashboard.tsx` - дашборд админки
- `components/admin/AdminLayoutApp.tsx` - layout для админки (App Router)

### 5. API
- `app/api/admin-link/route.ts` - endpoint для получения admin URL (только для админов)
- `app/api/admin/logout/route.ts` - endpoint для очистки admin_gate cookie

### 6. UI компоненты
- `components/AccountMenu.tsx` - добавлена кнопка "Admin Panel" для админов
- `app/account/page.tsx` - добавлена кнопка "Admin Panel" для админов

### 7. Скрипты
- `scripts/set-admin.ts` - установка is_admin=true для пользователя
- `scripts/generate-admin-password-hash.ts` - генерация bcrypt hash пароля

## Команды для выполнения

### 1. Применить миграцию
```bash
npx prisma migrate deploy
# или для dev окружения:
npx prisma migrate dev
```

### 2. Сгенерировать Prisma Client
```bash
npx prisma generate
```

### 3. Установить админа для пользователя
```bash
ts-node --project tsconfig.seed.json scripts/set-admin.ts mikhail.bilak@studio.unibo.it
```

### 4. Сгенерировать bcrypt hash для пароля админки
```bash
ts-node --project tsconfig.seed.json scripts/generate-admin-password-hash.ts "your-secure-password"
```

## Environment Variables для Vercel

Добавьте следующие переменные в Vercel:

```bash
# Секретный slug для админки (случайная строка 20-40 символов)
ADMIN_PANEL_SLUG="your-random-secret-slug-here-20-40-chars"

# Bcrypt hash пароля админки (сгенерируйте через скрипт)
ADMIN_PANEL_PASSWORD_HASH="$2a$10$your-bcrypt-hash-here"

# Время жизни cookie в минутах (по умолчанию 120)
ADMIN_GATE_COOKIE_TTL_MINUTES="120"
```

## Безопасность

### RLS Policies
Миграция обновляет RLS политики:
- Пользователи могут читать/обновлять только свой профиль
- Пользователи НЕ могут изменять поле `is_admin` (проверка в WITH CHECK)
- Только service_role может изменять `is_admin` (через Prisma с service role)

### Защита маршрутов
1. **Middleware** - первая линия защиты:
   - Проверяет slug
   - Проверяет session
   - Проверяет is_admin
   - Проверяет cookie

2. **Server Components** - вторая линия защиты:
   - Дублируют все проверки middleware
   - Проверяют пароль админки
   - Устанавливают cookie

3. **API Routes** - третья линия защиты:
   - Все admin API проверяют session + is_admin + cookie
   - `/api/admin-link` возвращает URL только для админов

## Тестирование

### Обычный пользователь:
- ✅ Не видит кнопку "Admin Panel"
- ✅ Не может открыть `/control/*` (редирект/404)
- ✅ Не может получить slug через `/api/admin-link` (403)

### Админ:
- ✅ Видит кнопку "Admin Panel" в AccountMenu и на странице /account
- ✅ При клике попадает на скрытый URL
- ✅ Видит экран ввода admin password
- ✅ После правильного пароля попадает в dashboard
- ✅ Cookie истекает через TTL и снова просит пароль
- ✅ Невозможно повысить права через client-side update профиля (RLS + сервер)

## Пример использования

1. Пользователь с email `mikhail.bilak@studio.unibo.it` получает статус админа через скрипт
2. Админ видит кнопку "Admin Panel" в профиле
3. При клике вызывается `/api/admin-link`, который возвращает `/control/<SECRET_SLUG>`
4. Админ попадает на страницу ввода пароля
5. После ввода правильного пароля устанавливается cookie `admin_gate=1`
6. Админ получает доступ к дашборду
7. Cookie истекает через 2 часа (или значение из env)

## Важные замечания

1. **НЕ раскрывайте** `ADMIN_PANEL_SLUG` в `NEXT_PUBLIC_*` переменных
2. **НЕ храните** сырой пароль в репозитории, только hash
3. **Используйте** service_role только на сервере для изменения `is_admin`
4. **Проверяйте** все три уровня защиты (middleware, server, API)
5. **RLS policies** предотвращают изменение `is_admin` через клиент

