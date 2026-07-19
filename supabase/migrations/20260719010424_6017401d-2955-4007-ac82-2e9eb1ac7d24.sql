
DROP POLICY IF EXISTS "System can insert history" ON public.order_status_history;
REVOKE INSERT ON public.order_status_history FROM authenticated;
