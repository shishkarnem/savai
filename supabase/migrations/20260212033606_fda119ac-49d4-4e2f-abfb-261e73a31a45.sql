
-- Allow service role to delete clients (needed for bulk delete)
CREATE POLICY "Service role can delete clients"
ON public.clients
FOR DELETE
USING (true);
