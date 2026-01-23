-- Create table for Telegram user profiles
CREATE TABLE public.telegram_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.telegram_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read profiles (for display purposes)
CREATE POLICY "Anyone can view telegram profiles" 
ON public.telegram_profiles 
FOR SELECT 
USING (true);

-- Allow insert from edge functions (service role)
CREATE POLICY "Service role can insert profiles" 
ON public.telegram_profiles 
FOR INSERT 
WITH CHECK (true);

-- Allow update from edge functions (service role)
CREATE POLICY "Service role can update profiles" 
ON public.telegram_profiles 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_telegram_profiles_updated_at
BEFORE UPDATE ON public.telegram_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_experts_updated_at();