-- Create table for storing message history between admin and clients
CREATE TABLE public.client_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  telegram_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_client_messages_client_id ON public.client_messages(client_id);
CREATE INDEX idx_client_messages_telegram_id ON public.client_messages(telegram_id);
CREATE INDEX idx_client_messages_sent_at ON public.client_messages(sent_at DESC);

-- Enable RLS
ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

-- Allow reading messages
CREATE POLICY "Anyone can view messages"
ON public.client_messages
FOR SELECT
USING (true);

-- Allow inserting messages (service role)
CREATE POLICY "Service role can insert messages"
ON public.client_messages
FOR INSERT
WITH CHECK (true);

-- Allow updating messages (service role)
CREATE POLICY "Service role can update messages"
ON public.client_messages
FOR UPDATE
USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_messages;