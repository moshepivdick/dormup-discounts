# Система отслеживания пользователей и статистики

## Обзор

Реализована умная система отслеживания пользователей и их статистики, которая:
- ✅ Автоматически привязывает действия пользователей к их профилям
- ✅ Хранит агрегированную статистику для экономии места в БД
- ✅ Обновляет статистику автоматически через триггеры PostgreSQL
- ✅ Поддерживает анонимных пользователей (userId может быть null)

## Архитектура

### База данных

#### Новые поля
- `DiscountUse.userId` - привязка сгенерированных скидок к пользователю (nullable)
- `VenueView.userId` - привязка просмотров venues к пользователю (nullable)
- `Profile.lastActivityAt` - последняя активность пользователя

#### Новая таблица: `UserStats`
Агрегированная статистика пользователя (экономит место вместо хранения каждой записи):
- `totalDiscountsGenerated` - всего сгенерировано скидок
- `totalDiscountsUsed` - всего использовано скидок
- `totalVenueViews` - всего просмотрено venues
- `lastDiscountGeneratedAt` - дата последней генерации
- `lastDiscountUsedAt` - дата последнего использования
- `lastVenueViewAt` - дата последнего просмотра

### Автоматическое обновление статистики

Статистика обновляется автоматически через триггеры PostgreSQL:
1. **При генерации скидки** - увеличивается `totalDiscountsGenerated`
2. **При подтверждении скидки** - увеличивается `totalDiscountsUsed`
3. **При просмотре venue** - увеличивается `totalVenueViews`

Все триггеры также обновляют `Profile.lastActivityAt`.

## API Endpoints

### Получить статистику пользователя
```
GET /api/user/stats
```

**Требует авторизации:** Да (Supabase session)

**Ответ:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalDiscountsGenerated": 5,
      "totalDiscountsUsed": 3,
      "totalVenueViews": 12,
      "lastDiscountGeneratedAt": "2025-01-15T10:30:00Z",
      "lastDiscountUsedAt": "2025-01-14T15:20:00Z",
      "lastVenueViewAt": "2025-01-15T11:00:00Z"
    },
    "recentActivity": {
      "recentDiscounts": [...],
      "recentViews": [...]
    }
  }
}
```

## Использование в коде

### Получение текущего пользователя
```typescript
import { auth } from '@/lib/auth';

const currentUser = await auth.getUserFromRequest(req);
// Returns: { id: string, email: string } | null
```

### Получение статистики пользователя
```typescript
import { getUserStats, getUserActivity } from '@/lib/stats';

// Агрегированная статистика (быстро)
const stats = await getUserStats(userId);

// Детальная активность (медленнее, используйте ограниченно)
const activity = await getUserActivity(userId, limit: 10);
```

## Миграция

Для применения изменений выполните:

```bash
# Применить миграцию
npx prisma migrate deploy

# Или для разработки
npx prisma migrate dev

# Обновить Prisma Client
npx prisma generate
```

Миграция создаст:
- Новые поля в существующих таблицах
- Таблицу `user_stats`
- Индексы для оптимизации запросов
- Триггеры для автоматического обновления статистики

## Обратная совместимость

- ✅ Все новые поля `nullable` - существующие данные не затронуты
- ✅ Анонимные пользователи могут продолжать использовать систему
- ✅ Статистика создается автоматически при первом действии пользователя

## Преимущества подхода

1. **Экономия места**: Вместо миллионов записей - одна строка на пользователя
2. **Производительность**: Быстрые запросы к агрегированным данным
3. **Автоматизация**: Статистика обновляется автоматически через триггеры
4. **Масштабируемость**: Система готова к росту числа пользователей

## Примеры использования

### В API роуте
```typescript
// pages/api/discounts/generate.ts
const currentUser = await auth.getUserFromRequest(req);

await prisma.discountUse.create({
  data: {
    venueId: venue.id,
    userId: currentUser?.id || null, // Привязка к пользователю
    // ... остальные поля
  },
});
```

### Получение статистики пользователя
```typescript
// В компоненте или API роуте
const stats = await getUserStats(userId);
console.log(`Пользователь сгенерировал ${stats.totalDiscountsGenerated} скидок`);
```

## Мониторинг

Для мониторинга активности пользователей можно использовать:
- `Profile.lastActivityAt` - последняя активность
- `UserStats.updatedAt` - последнее обновление статистики
- Запросы к `DiscountUse` и `VenueView` с фильтром по `userId`

## Будущие улучшения

- [ ] Админ-панель для просмотра статистики всех пользователей
- [ ] Экспорт статистики в CSV/JSON
- [ ] Графики активности пользователей
- [ ] Уведомления о неактивных пользователях

