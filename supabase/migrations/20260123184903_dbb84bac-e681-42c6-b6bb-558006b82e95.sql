-- Create cities table for calculator
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  avg_salary INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view cities"
ON public.cities
FOR SELECT
USING (true);

-- Service role can manage cities
CREATE POLICY "Service role can insert cities"
ON public.cities
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update cities"
ON public.cities
FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_cities_updated_at
BEFORE UPDATE ON public.cities
FOR EACH ROW
EXECUTE FUNCTION public.update_experts_updated_at();