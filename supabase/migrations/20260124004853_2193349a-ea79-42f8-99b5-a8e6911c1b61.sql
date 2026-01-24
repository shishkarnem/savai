-- Create enum for CRM access levels
CREATE TYPE public.crm_access_level AS ENUM ('viewer', 'editor', 'admin');

-- Create CRM admins table
CREATE TABLE public.crm_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  access_level crm_access_level NOT NULL DEFAULT 'viewer',
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_admins ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view (for access check)
CREATE POLICY "Anyone can view crm_admins"
ON public.crm_admins
FOR SELECT
USING (true);

-- Service role can insert
CREATE POLICY "Service role can insert crm_admins"
ON public.crm_admins
FOR INSERT
WITH CHECK (true);

-- Service role can update
CREATE POLICY "Service role can update crm_admins"
ON public.crm_admins
FOR UPDATE
USING (true);

-- Service role can delete
CREATE POLICY "Service role can delete crm_admins"
ON public.crm_admins
FOR DELETE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_crm_admins_updated_at
BEFORE UPDATE ON public.crm_admins
FOR EACH ROW
EXECUTE FUNCTION public.update_experts_updated_at();

-- Insert the initial super admin (Telegram ID: 169262990)
INSERT INTO public.crm_admins (telegram_id, access_level, name)
VALUES (169262990, 'admin', 'Super Admin');