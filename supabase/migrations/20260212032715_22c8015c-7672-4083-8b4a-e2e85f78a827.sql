
ALTER TABLE public.telegram_profiles ADD COLUMN referral_code text DEFAULT NULL;
ALTER TABLE public.telegram_profiles ADD COLUMN referred_by text DEFAULT NULL;
