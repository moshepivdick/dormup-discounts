# Настройка Supabase для OTP аутентификации

## Проблема: Ошибка 500 при верификации OTP

Если вы получаете ошибку "Error confirming user" с кодом 500 от Supabase, выполните следующие шаги:

## 1. Применить миграцию с триггером

Выполните миграцию в Supabase SQL Editor или через Prisma:

```bash
npx prisma migrate deploy
```

Или вручную выполните SQL из файла:
`prisma/migrations/20250121000000_add_profile_trigger/migration.sql`

## 2. Настройки Email в Supabase Dashboard

1. Откройте **Supabase Dashboard** → ваш проект
2. Перейдите в **Authentication** → **Settings** → **Email Auth**
3. Убедитесь, что:
   - ✅ **Enable email confirmations** - ВКЛЮЧЕНО (для безопасности)
   - ✅ **Enable email signups** - ВКЛЮЧЕНО
   - ✅ **Secure email change** - ВКЛЮЧЕНО (опционально)

4. В разделе **Email Templates**:
   - Проверьте шаблон **Magic Link** или **OTP**
   - Убедитесь, что шаблон настроен правильно

## 3. Проверка RLS политик

Убедитесь, что RLS политики для таблицы `profiles` настроены правильно:

```sql
-- Проверить существующие политики
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Должны быть следующие политики:
-- 1. "Users can read their own profile" (SELECT)
-- 2. "Users can update their own profile" (UPDATE)
-- 3. "Users can insert their own profile" (INSERT)
```

## 4. Проверка триггера

Проверьте, что триггер создан:

```sql
-- Проверить триггеры
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Проверить функцию
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
```

## 5. Проверка структуры таблицы profiles

Убедитесь, что таблица `profiles` имеет все необходимые колонки:

```sql
-- Проверить структуру таблицы
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

Должны быть колонки:
- `id` (UUID, PRIMARY KEY)
- `email` (TEXT, UNIQUE, NOT NULL)
- `university_id` (UUID, nullable)
- `verified_student` (BOOLEAN, default FALSE)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## 6. Тестирование

После применения всех настроек:

1. Попробуйте зарегистрироваться снова
2. Проверьте логи в Supabase Dashboard → Logs → API Logs
3. Проверьте, что профиль создается автоматически при регистрации

## 7. Если проблема сохраняется

Проверьте логи Supabase:
- Dashboard → Logs → API Logs
- Dashboard → Logs → Postgres Logs

Ищите ошибки, связанные с:
- Foreign key constraints
- RLS policies
- Trigger execution

## Альтернативное решение

Если триггер не работает, можно временно отключить автоматическое создание профиля и создавать его только через API (что уже реализовано в коде).

