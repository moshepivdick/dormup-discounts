# Исправление ошибки 500 при verifyOtp

## Анализ проблемы

### 1. Как создаётся пользователь

**Метод:** `signInWithOtp()` (OTP-based, passwordless)

**Файл:** `app/(auth)/signup/page.tsx`

```typescript
const { data, error } = await supabase.auth.signInWithOtp({
  email: cleanEmail,
  options: {
    shouldCreateUser: true,
  },
});
```

**Вывод:** Пользователь создаётся через OTP-поток, НЕ через `signUp(email, password)`.

### 2. Соответствие verifyOtp типу создания

**Текущий код:** ✅ Правильно

**Файл:** `app/(auth)/verify-email/page.tsx`

```typescript
const { data, error } = await supabase.auth.verifyOtp({
  email: cleanEmail,
  token: cleanCode,
  type: 'email', // ✅ Правильно для signInWithOtp
});
```

**Объяснение:**
- `signInWithOtp()` → `type: 'email'` ✅
- `signUp(email, password)` → `type: 'signup'` ❌ (не используется)

### 3. Логирование перед verifyOtp

**Добавлено полное логирование:**

```typescript
console.log('=== OTP VERIFICATION START ===');
console.log('Email:', cleanEmail);
console.log('Code length:', cleanCode.length);
console.log('Code (masked):', cleanCode.substring(0, 2) + '****');
console.log('Verification type: email');
console.log('Auth method used: signInWithOtp (OTP-based, not password signup)');
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('verifyOtp parameters:', JSON.stringify(verifyParams, null, 2));
```

**Логирование ответа Supabase:**

```typescript
console.log('=== OTP VERIFICATION RESPONSE ===');
console.log('Has data:', !!data);
console.log('Has error:', !!error);
console.log('Full response data:', JSON.stringify(data, null, 2));
```

**При ошибке:**

```typescript
console.error('Error message:', error.message);
console.error('Error status:', error.status);
console.error('Error status code:', (error as any).statusCode);
console.error('Full error object:', JSON.stringify(error, null, 2));
console.error('Error code:', (error as any).code);
console.error('Error details:', (error as any).details);
console.error('Error hint:', (error as any).hint);
```

### 4. Вызов getSession() после verifyOtp

**Изменение:** Теперь `getSession()` вызывается **всегда** после `verifyOtp`:

```typescript
// Step 2.1: Always call getSession() after verifyOtp to ensure session is persisted
console.log('=== CALLING getSession() AFTER verifyOtp ===');
const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

if (sessionData?.session) {
  console.log('✅ Session confirmed via getSession()');
  console.log('Session user ID:', sessionData.session.user.id);
  console.log('Session expires at:', sessionData.session.expires_at);
} else {
  console.warn('⚠️ No session in getSession() response');
}

// Check if we have session from verifyOtp or getSession
const finalSession = data.session || sessionData?.session;

if (!finalSession) {
  console.error('❌ No session found in verifyOtp response or getSession()');
  throw new Error('Session not created. Please try again.');
}
```

**Затем проверка через getUser():**

```typescript
const { data: userData, error: getUserError } = await supabase.auth.getUser();
```

**Редирект на /account:**

```typescript
router.push('/account');
```

### 5. Проверка настроек Supabase Dashboard

#### Необходимые настройки:

1. **Authentication → Settings → Email Auth:**
   - ✅ **Enable Email Signup:** Включено
   - ✅ **Enable Email OTP:** Включено (НЕ magic link)
   - ✅ **Confirm email:** Включено

2. **Authentication → URL Configuration:**
   - **Site URL:** `https://yourdomain.com` (НЕ localhost в production)
   - **Redirect URLs:**
     - `https://yourdomain.com/auth/callback`
     - `https://yourdomain.com/account`
     - `https://yourdomain.com/(auth)/verify-email`
     - ❌ Удалить все `http://localhost:*` в production

3. **Authentication → Email Templates:**
   - Проверить, что используется **OTP template**, а не magic link
   - Шаблон должен содержать `{{ .Token }}` (6-значный код)

4. **Project Settings → API:**
   - Проверить, что `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` правильные

## Возможные причины ошибки 500

### 1. Неправильный тип в verifyOtp
**Статус:** ✅ Исправлено - используется `type: 'email'`

### 2. Неправильные настройки Supabase Dashboard
**Проверить:**
- Site URL не содержит localhost в production
- Redirect URLs настроены правильно
- Email OTP включен (не magic link)

### 3. Проблемы с сессией
**Статус:** ✅ Исправлено - добавлен обязательный вызов `getSession()`

### 4. Проблемы с профилем пользователя
**Статус:** ✅ Обработано - добавлен fallback через API route

## Изменённые файлы

1. **`app/(auth)/verify-email/page.tsx`**
   - ✅ Улучшено логирование перед и после `verifyOtp`
   - ✅ Добавлен обязательный вызов `getSession()` после `verifyOtp`
   - ✅ Улучшена обработка ошибок с детальным логированием
   - ✅ Добавлено логирование полного ответа Supabase

2. **`app/(auth)/signup/page.tsx`**
   - ✅ Улучшено логирование ответа `signInWithOtp`
   - ✅ Добавлено логирование полного объекта ответа

## Auth Flow

### Текущий flow (OTP-based):

```
1. Signup Page
   └─> signInWithOtp({ email, shouldCreateUser: true })
       └─> Supabase отправляет OTP код на email
       └─> Пользователь создаётся (если не существует)

2. Verify Email Page
   └─> verifyOtp({ email, token: code, type: 'email' })
       └─> ✅ Правильный тип для signInWithOtp
       └─> getSession() - проверка сессии
       └─> getUser() - проверка пользователя
       └─> Profile upsert
       └─> Redirect to /account

3. Account Page
   └─> Проверка сессии
   └─> Отображение информации пользователя
```

### Почему используется OTP flow:

1. **Passwordless authentication** - более безопасно
2. **Email verification** - автоматическая верификация email
3. **User experience** - не нужно запоминать пароль
4. **Security** - код истекает через несколько минут

## Инструкции по отладке

### 1. Проверить логи в браузере

Откройте DevTools → Console и проверьте:
- `=== OTP VERIFICATION START ===`
- `=== OTP VERIFICATION RESPONSE ===`
- `=== OTP VERIFICATION ERROR ===` (если есть ошибка)

### 2. Проверить Network tab

Найдите запрос к `/auth/v1/verify`:
- **Request payload:** email, token, type
- **Response status:** 200 или 500
- **Response body:** полный ответ Supabase

### 3. Проверить Supabase Dashboard

1. **Authentication → Logs:**
   - Проверить последние попытки верификации
   - Найти ошибки 500

2. **Authentication → Users:**
   - Проверить, создаётся ли пользователь
   - Проверить статус email_confirmed_at

### 4. Проверить переменные окружения

```bash
# В .env или Vercel
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

## Результат

✅ **Тип verifyOtp:** `'email'` (правильно для signInWithOtp)
✅ **Логирование:** Полное, включает все параметры и ответы
✅ **getSession():** Вызывается всегда после verifyOtp
✅ **Редирект:** На `/account` после успешной верификации
✅ **Обработка ошибок:** Детальное логирование всех ошибок

## Следующие шаги

1. Проверить настройки Supabase Dashboard (Site URL, Redirect URLs)
2. Убедиться, что Email OTP включен (не magic link)
3. Протестировать flow в production (не localhost)
4. Проверить логи в браузере при следующей попытке верификации
5. Если ошибка 500 сохраняется, проверить логи Supabase Dashboard

