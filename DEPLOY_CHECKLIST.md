# Чеклист для деплоя на Vercel

## ✅ Критические проверки перед деплоем

### 1. Переменные окружения (Environment Variables)

Убедитесь, что все следующие переменные установлены в Vercel Dashboard:

#### Обязательные переменные:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ⚠️ КРИТИЧНО для создания профилей

# Database
DATABASE_URL=postgresql://... (pooled connection с pgbouncer)
DIRECT_URL=postgresql://... (direct connection без pgbouncer)

# JWT Secrets
PARTNER_JWT_SECRET=long-random-string
ADMIN_JWT_SECRET=another-long-random-string

# Admin Panel
ADMIN_PANEL_SLUG=your-secret-slug
ADMIN_PANEL_PASSWORD_HASH=bcrypt-hash
ADMIN_GATE_COOKIE_TTL_MINUTES=120  # Опционально, по умолчанию 120
```

#### Опциональные переменные:
```bash
# App URL (для email redirects)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**⚠️ ВАЖНО:** `SUPABASE_SERVICE_ROLE_KEY` требуется для создания профилей пользователей. Без него регистрация не будет работать.

### 2. База данных

- [ ] Миграции Prisma применены: `npx prisma migrate deploy`
- [ ] Prisma Client сгенерирован: `npx prisma generate`
- [ ] Seed данные применены (если нужно)
- [ ] Подключение к Supabase работает (проверьте DATABASE_URL и DIRECT_URL)

### 3. Build проверки

Локально выполните:
```bash
npm run build
```

Проверьте, что:
- [ ] Build проходит без ошибок
- [ ] Нет TypeScript ошибок
- [ ] Нет ошибок импортов
- [ ] Все пути к файлам корректны

### 4. Исправленные проблемы

#### ✅ Обработка ошибок в Server Components
- `app/app/layout.tsx` - добавлен try-catch
- `lib/supabase/server.ts` - добавлена валидация переменных окружения

#### ✅ Error Boundary
- Добавлен `components/ErrorBoundary.tsx`
- Интегрирован в корневой layout

#### ✅ Проверка переменных окружения
- `createServiceRoleClient()` теперь проверяет наличие ключей перед использованием

### 5. Известные проблемы и решения

#### Проблема: "Missing SUPABASE_SERVICE_ROLE_KEY"
**Решение:** Добавьте `SUPABASE_SERVICE_ROLE_KEY` в переменные окружения Vercel

#### Проблема: "Failed to create profile"
**Причины:**
- Отсутствует `SUPABASE_SERVICE_ROLE_KEY`
- Неправильные RLS политики в Supabase
- Проблемы с подключением к базе данных

**Решение:**
1. Проверьте наличие `SUPABASE_SERVICE_ROLE_KEY` в Vercel
2. Убедитесь, что service role может создавать записи в таблице `profiles`
3. Проверьте логи Supabase на наличие ошибок

#### Проблема: Cookies не работают
**Решение:** Убедитесь, что в `next.config.js` правильно настроен domain для cookies в production

### 6. Post-deploy проверки

После деплоя проверьте:

1. **Главная страница:**
   - [ ] `/` загружается корректно
   - [ ] Нет ошибок в консоли браузера

2. **Регистрация:**
   - [ ] `/signup` работает
   - [ ] Email отправляется
   - [ ] Профиль создается после верификации

3. **Авторизация:**
   - [ ] `/login` работает
   - [ ] Редиректы работают корректно

4. **API endpoints:**
   - [ ] `/api/venues` возвращает данные
   - [ ] `/api/discounts/generate` работает
   - [ ] Админ API требует авторизацию

5. **Admin Panel:**
   - [ ] `/control/[slug]` доступен только с правильным slug
   - [ ] Требуется пароль для доступа
   - [ ] Dashboard загружается

### 7. Мониторинг

После деплоя настройте:

1. **Vercel Logs:**
   - Проверьте логи деплоя на наличие ошибок
   - Следите за serverless function logs

2. **Supabase Dashboard:**
   - Проверьте логи аутентификации
   - Проверьте логи базы данных

3. **Error Tracking (рекомендуется):**
   - Настройте Sentry или другой сервис для отслеживания ошибок
   - Добавьте в `components/ErrorBoundary.tsx`

### 8. Рекомендации по безопасности

- [ ] Все секреты хранятся в переменных окружения, не в коде
- [ ] `SUPABASE_SERVICE_ROLE_KEY` используется только на сервере
- [ ] JWT secrets достаточно длинные и случайные
- [ ] HTTPS включен (автоматически на Vercel)
- [ ] Rate limiting настроен для API endpoints

### 9. Troubleshooting

#### Build падает с ошибкой Prisma
```bash
# Решение: добавьте в vercel.json или используйте postinstall hook
"buildCommand": "prisma generate && next build"
```

#### Runtime ошибки с Supabase
- Проверьте переменные окружения
- Убедитесь, что Supabase проект активен
- Проверьте Network tab в DevTools

#### Ошибки с cookies в production
- Убедитесь, что domain настроен правильно
- Проверьте SameSite и Secure флаги для cookies

## Быстрая команда для проверки перед деплоем

```bash
# 1. Локальный build
npm run build

# 2. Проверка типов
npx tsc --noEmit

# 3. Линтинг
npm run lint

# 4. Проверка переменных окружения (вручную сравните с .env.example)
cat .env.local | grep -E "^[A-Z_]+"
```

## Контакты для поддержки

Если возникли проблемы при деплое:
1. Проверьте логи в Vercel Dashboard
2. Проверьте логи Supabase
3. Проверьте этот чеклист
4. Проверьте файл `ERROR_HANDLING_FIX.md` для информации об обработке ошибок
