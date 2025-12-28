# 🔧 Исправление неудачной миграции

Миграция `20250116000000_add_email_verification_token` была помечена как неудачная. Нужно применить её вручную.

## Вариант 1: Применить SQL вручную (рекомендуется)

1. Откройте **Supabase Dashboard**
2. Перейдите в **SQL Editor**
3. Скопируйте и вставьте следующий SQL:

```sql
-- CreateTable
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_user_id_key" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

4. Нажмите **Run**
5. После успешного выполнения, в терминале выполните:

```bash
npx prisma migrate resolve --applied 20250116000000_add_email_verification_token
```

6. Готово! Теперь можно запустить:

```bash
npx prisma migrate deploy
```

## Вариант 2: Если таблица уже существует

Если таблица `email_verification_tokens` уже существует, просто пометьте миграцию как примененную:

```bash
npx prisma migrate resolve --applied 20250116000000_add_email_verification_token
```

## Проверка

После применения миграции проверьте:

1. Таблица существует:
   ```sql
   SELECT * FROM email_verification_tokens LIMIT 1;
   ```

2. Миграция помечена как примененная:
   ```bash
   npx prisma migrate status
   ```

## Если ошибка повторится

Если при применении SQL возникает ошибка "таблица уже существует", проверьте:

```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'email_verification_tokens'
);
```

Если таблица существует, просто пометьте миграцию как примененную (Вариант 2).

