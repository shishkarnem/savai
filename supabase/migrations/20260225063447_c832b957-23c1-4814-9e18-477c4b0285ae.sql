
ALTER TABLE public.client_messages 
ADD COLUMN IF NOT EXISTS media jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS inline_buttons jsonb DEFAULT '[]'::jsonb;
