
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.order_status_history(order_id, created_at);

GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their order history"
ON public.order_status_history FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE POLICY "Admins can view all order history"
ON public.order_status_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert history"
ON public.order_status_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.order_status_history (order_id, status, created_at)
    VALUES (NEW.id, NEW.status, NEW.created_at);
  ELSIF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.order_status_history (order_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_orders_log_status_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

CREATE TRIGGER trg_orders_log_status_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- Backfill history for existing orders
INSERT INTO public.order_status_history (order_id, status, created_at)
SELECT id, status, created_at FROM public.orders
ON CONFLICT DO NOTHING;
