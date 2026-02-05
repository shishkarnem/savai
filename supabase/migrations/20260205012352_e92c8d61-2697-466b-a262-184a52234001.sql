-- Create notification templates table
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expert_selection', -- 'expert_selection', 'tariff_selection', 'chat'
  header_text TEXT,
  footer_text TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  use_media_caption BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user calculations history table
CREATE TABLE public.user_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  calculation_type TEXT NOT NULL, -- 'calculator' or 'ai_seller'
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tariff notifications log table
CREATE TABLE public.tariff_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT,
  telegram_username TEXT,
  tariff_name TEXT NOT NULL,
  payment_type TEXT,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  message_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_templates (public read, service role write)
CREATE POLICY "Anyone can view notification templates"
  ON public.notification_templates FOR SELECT USING (true);

CREATE POLICY "Service role can insert templates"
  ON public.notification_templates FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update templates"
  ON public.notification_templates FOR UPDATE USING (true);

CREATE POLICY "Service role can delete templates"
  ON public.notification_templates FOR DELETE USING (true);

-- RLS policies for user_calculations
CREATE POLICY "Anyone can view calculations"
  ON public.user_calculations FOR SELECT USING (true);

CREATE POLICY "Service role can insert calculations"
  ON public.user_calculations FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update calculations"
  ON public.user_calculations FOR UPDATE USING (true);

CREATE POLICY "Service role can delete calculations"
  ON public.user_calculations FOR DELETE USING (true);

-- RLS policies for tariff_notifications
CREATE POLICY "Anyone can view tariff notifications"
  ON public.tariff_notifications FOR SELECT USING (true);

CREATE POLICY "Service role can insert tariff notifications"
  ON public.tariff_notifications FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_experts_updated_at();

CREATE TRIGGER update_user_calculations_updated_at
  BEFORE UPDATE ON public.user_calculations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_experts_updated_at();

-- Create index for faster queries
CREATE INDEX idx_user_calculations_telegram_id ON public.user_calculations(telegram_id);
CREATE INDEX idx_user_calculations_type ON public.user_calculations(calculation_type);
CREATE INDEX idx_tariff_notifications_telegram_id ON public.tariff_notifications(telegram_id);
CREATE INDEX idx_notification_templates_type ON public.notification_templates(type);