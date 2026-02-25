# SAV AI — Инструкция по миграции в новый проект

## 1. Секреты (Secrets)

В новом проекте Lovable Cloud нужно добавить следующие секреты:

| Секрет | Описание | Где взять |
|--------|----------|-----------|
| `SAV_TELEGRAM_BOT_TOKEN` | Токен Telegram бота для отправки сообщений | @BotFather в Telegram |
| `SAV_TELEGRAM_EXPERT_CHAT_ID` | ID чата/группы для уведомлений экспертов | Telegram API (getUpdates) |

> Системные секреты (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`) создаются автоматически.

## 2. Таблицы базы данных

Все таблицы имеют префикс `sav_`:

- `sav_cities` — города и средние зарплаты
- `sav_clients` — клиенты CRM
- `sav_client_messages` — история сообщений
- `sav_crm_admins` — администраторы CRM
- `sav_experts` — эксперты
- `sav_notification_templates` — шаблоны уведомлений
- `sav_tariff_notifications` — уведомления о тарифах
- `sav_telegram_profiles` — профили Telegram
- `sav_user_calculations` — расчёты пользователей

## 3. Edge Functions (Backend функции)

Все функции имеют префикс `sav-`:

- `sav-ai-match-experts`
- `sav-ai-recommend-tariff`
- `sav-ai-search-clients`
- `sav-classify-business`
- `sav-notify-expert-selection`
- `sav-notify-tariff-selection`
- `sav-send-telegram-message`
- `sav-sync-cities`
- `sav-sync-clients`
- `sav-sync-experts`
- `sav-sync-telegram-profile`
- `sav-telegram-auth`

## 4. SQL миграция для создания таблиц

Скопируйте SQL из папки `supabase/migrations/` в новый проект. Основные таблицы создаются миграциями автоматически при деплое.

## 5. Процесс переноса

1. Создайте новый проект в Lovable
2. Подключите GitHub репозиторий
3. Lovable Cloud создаст базу данных автоматически
4. Добавьте секреты через Cloud → Secrets
5. Edge Functions задеплоятся автоматически
6. Запустите миграции через Cloud → Run SQL
