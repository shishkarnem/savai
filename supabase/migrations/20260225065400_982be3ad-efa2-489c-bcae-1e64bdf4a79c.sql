
-- Rename all tables with sav_ prefix
ALTER TABLE public.cities RENAME TO sav_cities;
ALTER TABLE public.clients RENAME TO sav_clients;
ALTER TABLE public.client_messages RENAME TO sav_client_messages;
ALTER TABLE public.crm_admins RENAME TO sav_crm_admins;
ALTER TABLE public.experts RENAME TO sav_experts;
ALTER TABLE public.notification_templates RENAME TO sav_notification_templates;
ALTER TABLE public.tariff_notifications RENAME TO sav_tariff_notifications;
ALTER TABLE public.telegram_profiles RENAME TO sav_telegram_profiles;
ALTER TABLE public.user_calculations RENAME TO sav_user_calculations;

-- Update realtime publication if client_messages was added
-- (This handles any existing realtime subscriptions)
