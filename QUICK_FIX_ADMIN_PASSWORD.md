# Быстрое исправление: "Invalid password configuration"

## Проблема
Ошибка "Invalid password configuration" возникает, когда переменная окружения `ADMIN_PANEL_PASSWORD_HASH` не установлена или пустая.

## Решение

### 1. Сгенерируйте хеш пароля
```bash
npm run generate-admin-hash "ваш-пароль"
```

Или напрямую:
```bash
npx ts-node --project tsconfig.seed.json scripts/generate-admin-password-hash.ts "ваш-пароль"
```

### 2. Создайте файл `.env.local` в корне проекта
Создайте файл `.env.local` (если его нет) и добавьте:

```env
ADMIN_PANEL_PASSWORD_HASH="скопируйте_хеш_из_шага_1"
ADMIN_PANEL_SLUG="ваш-секретный-slug"
ADMIN_GATE_COOKIE_TTL_MINUTES="120"
```

### 3. Перезапустите dev сервер
```bash
npm run dev
```

## Пример

1. Генерация хеша:
```bash
npm run generate-admin-hash "admin123"
```

Вывод:
```
✓ Password hash generated:
$2b$10$8JlSleLbAKB3/9bLl9M2aO4Z8b7TRLsD3CO2AGJ3yoF9nsCGetYHa
```

2. Добавьте в `.env.local`:
```env
ADMIN_PANEL_PASSWORD_HASH="$2b$10$8JlSleLbAKB3/9bLl9M2aO4Z8b7TRLsD3CO2AGJ3yoF9nsCGetYHa"
```

3. Перезапустите сервер.

## Проверка
После настройки ошибка должна исчезнуть, и вы сможете войти в админ-панель с паролем, который использовали при генерации хеша.
