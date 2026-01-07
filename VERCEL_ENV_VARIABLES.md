# Environment Variables для Vercel

## ⚠️ ВАЖНО: Добавьте эти переменные в настройках Vercel проекта

Перейдите в **Vercel Dashboard → Ваш проект → Settings → Environment Variables** и добавьте:

---

## 🔐 Переменные окружения:

```
ADMIN_PANEL_SLUG=c8f9a21epewc216aa1c9f2e4b6d8a3c
```

```
ADMIN_PANEL_PASSWORD_HASH=$2b$10$NfdPicSbC7ClH/TKi66q0urB/782vryBFjdeZVcBd1NT6hsRLfNNu
```

```
ADMIN_GATE_COOKIE_TTL_MINUTES=120
```

---

## 📝 Инструкция:

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект `dormup-discounts`
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте каждую переменную:
   - **Key**: `ADMIN_PANEL_SLUG`
   - **Value**: `c8f9a21epewc216aa1c9f2e4b6d8a3c`
   - Выберите все окружения (Production, Preview, Development)
   
   - **Key**: `ADMIN_PANEL_PASSWORD_HASH`
   - **Value**: `$2b$10$NfdPicSbC7ClH/TKi66q0urB/782vryBFjdeZVcBd1NT6hsRLfNNu`
   - Выберите все окружения
   
   - **Key**: `ADMIN_GATE_COOKIE_TTL_MINUTES`
   - **Value**: `120`
   - Выберите все окружения

5. **Сохраните** изменения
6. **Передеплойте** проект (или дождитесь автоматического деплоя)

---

## 🔑 Пароль админки:

**Пароль**: `#a*xuG@zDGC5&zA8cBy4`

⚠️ **Храните этот пароль в безопасном месте!** Он не хранится в репозитории.

---

## ✅ После добавления переменных:

Админка будет доступна по адресу:
```
https://www.dormup-it.com/control/c8f9a21epewc216aa1c9f2e4b6d8a3c
```

---

## 📋 Также нужно применить миграцию в базе данных:

Выполните SQL миграцию в Supabase SQL Editor:

```sql
-- Add is_admin field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;

-- Update RLS policies to prevent users from modifying is_admin
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (OLD.is_admin = NEW.is_admin)
  );

-- Add comment to column
COMMENT ON COLUMN public.profiles.is_admin IS 'Admin access flag. Only service_role can modify this field.';
```

После этого установите админа для пользователя через Supabase SQL Editor:

```sql
UPDATE public.profiles 
SET is_admin = TRUE 
WHERE email = 'mikhail.bilak@studio.unibo.it';
```

