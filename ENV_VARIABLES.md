# Environment Variables - Полный список

Все важные переменные окружения, которые должны быть в `.env` и в Vercel.

---

## 🔐 Обязательные переменные:

### База данных
```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
```

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### JWT Secrets
```bash
PARTNER_JWT_SECRET="long-random-string-for-partner-sessions"
ADMIN_JWT_SECRET="another-long-random-string-for-admin-sessions"
```

### Admin Panel
```bash
ADMIN_PANEL_SLUG="c8f9a21epewc216aa1c9f2e4b6d8a3c"
ADMIN_PANEL_PASSWORD_HASH="$2b$10$2LY3J802rAE3PckjF31n4udc4eyg8h1r0tSVVU4A1psmla6rS2Edq"
ADMIN_GATE_COOKIE_TTL_MINUTES="120"
```

### App URL (опционально)
```bash
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

---

## 📝 Как получить значения:

### 1. Supabase переменные:
- Откройте Supabase Dashboard → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` = `service_role` `secret` key (⚠️ храните в секрете!)

### 2. Database URLs:
- Откройте Supabase Dashboard → Project Settings → Database
- `DATABASE_URL` = Connection string (Pooled mode, port 6543)
- `DIRECT_URL` = Connection string (Direct connection, port 5432)

### 3. JWT Secrets:
- Сгенерируйте случайные строки (минимум 32 символа)
- Можно использовать: `openssl rand -base64 32`

### 4. Admin Panel:
- `ADMIN_PANEL_SLUG` - случайная строка 20-40 символов
- `ADMIN_PANEL_PASSWORD_HASH` - bcrypt hash пароля (см. ниже)
- `ADMIN_GATE_COOKIE_TTL_MINUTES` - время жизни cookie в минутах (по умолчанию 120)

---

## 🔑 Генерация Admin Password Hash:

```bash
npx ts-node --project tsconfig.seed.json scripts/generate-admin-password-hash.ts "your-password"
```

Скопируйте полученный hash в `ADMIN_PANEL_PASSWORD_HASH`.

---

## ✅ Проверка:

После добавления всех переменных в `.env` и Vercel, убедитесь что:
- ✅ Все переменные добавлены
- ✅ Нет лишних пробелов в значениях
- ✅ Hash пароля содержит ровно 60 символов
- ✅ Vercel проект передеплоен

---

## 📋 Пример полного .env файла:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# JWT Secrets
PARTNER_JWT_SECRET="your-partner-jwt-secret-here"
ADMIN_JWT_SECRET="your-admin-jwt-secret-here"

# Admin Panel
ADMIN_PANEL_SLUG="c8f9a21epewc216aa1c9f2e4b6d8a3c"
ADMIN_PANEL_PASSWORD_HASH="$2b$10$2LY3J802rAE3PckjF31n4udc4eyg8h1r0tSVVU4A1psmla6rS2Edq"
ADMIN_GATE_COOKIE_TTL_MINUTES="120"

# App URL
NEXT_PUBLIC_APP_URL="https://www.dormup-it.com"
```

---

## ⚠️ Важно:

- **НЕ коммитьте** `.env` файл в git (он уже в `.gitignore`)
- **НЕ храните** сырые пароли в репозитории
- **Используйте** `.env.example` как шаблон (без реальных значений)
- **Обновляйте** переменные в Vercel при изменении

