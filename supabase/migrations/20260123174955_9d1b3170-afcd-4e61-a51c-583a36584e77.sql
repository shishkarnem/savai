-- Create enum for client status
CREATE TYPE public.client_status AS ENUM (
  'Заблокировано',
  'Инфо',
  'Расчет',
  'Договор',
  'Предоплата',
  'Тариф',
  'Подбор Эксперта',
  'Отказ',
  'Обслуживание',
  'Не на связи',
  'Дубль',
  'Эксперт',
  'Выполнено',
  'В работе',
  'Бот создан',
  'Без напоминаний',
  'Партнер'
);

-- Create enum for send status
CREATE TYPE public.send_status AS ENUM (
  'Отправлено',
  'Отправить',
  'Ожидает'
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Анкетные данные (A-U)
  project_code TEXT,
  telegram_id TEXT,
  telegram_client TEXT,
  full_name TEXT,
  project TEXT,
  calculator_date DATE,
  start_date DATE,
  comment TEXT,
  status TEXT,
  expert_date DATE,
  expert_name TEXT,
  expert_pseudonym TEXT,
  tariff_date DATE,
  tariff TEXT,
  send_status TEXT,
  reminder_time TEXT,
  reminder_text TEXT,
  
  -- Калькулятор (V-BV)
  product TEXT,
  city TEXT,
  department TEXT,
  employees_count TEXT,
  contract_ooo_url TEXT,
  contract_ip_url TEXT,
  project_plan_url TEXT,
  sav_cost TEXT,
  service_price TEXT,
  work_start_date DATE,
  payment_date DATE,
  service_start_date DATE,
  rejection_date DATE,
  refund_amount TEXT,
  work_end_date DATE,
  act_date DATE,
  avg_salary TEXT,
  selected_expert TEXT,
  functionality TEXT,
  service TEXT,
  region_salary TEXT,
  real_salary TEXT,
  ai_employee_cost TEXT,
  service_type TEXT,
  software_price TEXT,
  ai_tokens_price TEXT,
  payback TEXT,
  software_text TEXT,
  department_text TEXT,
  kp_text TEXT,
  
  -- ProTalk (BW-CE)
  block_date DATE,
  protalk_name TEXT,
  protalk_id TEXT,
  script_id TEXT,
  bot_token TEXT,
  last_100_messages TEXT,
  last_message TEXT,
  channel TEXT,
  protalk_send_status TEXT,
  
  -- Мета-данные
  sheet_row_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can view clients"
  ON public.clients
  FOR SELECT
  USING (true);

-- Create policy for service role insert/update
CREATE POLICY "Service role can insert clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update clients"
  ON public.clients
  FOR UPDATE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_experts_updated_at();

-- Create index on telegram_id for fast lookups
CREATE INDEX idx_clients_telegram_id ON public.clients(telegram_id);
CREATE INDEX idx_clients_project_code ON public.clients(project_code);
CREATE INDEX idx_clients_status ON public.clients(status);