-- ENUMS
CREATE TYPE public.payment_status AS ENUM ('awaiting_payment','awaiting_verification','verified','rejected','expired');
CREATE TYPE public.refund_status AS ENUM ('pending','processing','refunded','rejected');

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  bank text,
  account_number text,
  account_holder text,
  amount numeric NOT NULL DEFAULT 0,
  sender_name text,
  proof_url text,
  status public.payment_status NOT NULL DEFAULT 'awaiting_payment',
  rejection_reason text,
  admin_note text,
  paid_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "Users update own unverified payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status <> 'verified')
  WITH CHECK (auth.uid() = user_id AND status IN ('awaiting_payment','awaiting_verification'));
CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REFUNDS
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  bank text,
  account_number text,
  account_holder text,
  status public.refund_status NOT NULL DEFAULT 'pending',
  proof_url text,
  admin_note text,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

GRANT SELECT, UPDATE ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own refunds" ON public.refunds
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own pending refund account" ON public.refunds
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins manage refunds" ON public.refunds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create payment record for new orders
CREATE OR REPLACE FUNCTION public.create_payment_for_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.payments (order_id, user_id, amount, status)
  VALUES (NEW.id, NEW.user_id, NEW.total, 'awaiting_payment')
  ON CONFLICT (order_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_payment_for_order() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_orders_create_payment AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_payment_for_order();

-- When payment verified -> move order to processing
CREATE OR REPLACE FUNCTION public.sync_order_on_payment_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    IF NEW.verified_at IS NULL THEN
      NEW.verified_at := now();
    END IF;
    UPDATE public.orders SET status = 'processing'
    WHERE id = NEW.order_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_order_on_payment_verified() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_payments_verified BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_on_payment_verified();

-- When order cancelled and payment verified -> create refund
CREATE OR REPLACE FUNCTION public.create_refund_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p RECORD;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    SELECT * INTO p FROM public.payments WHERE order_id = NEW.id;
    IF p.id IS NOT NULL AND p.status = 'verified' THEN
      INSERT INTO public.refunds (order_id, payment_id, user_id, amount, status)
      VALUES (NEW.id, p.id, NEW.user_id, p.amount, 'pending')
      ON CONFLICT (order_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_refund_on_cancel() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_orders_create_refund AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_refund_on_cancel();

-- Storage policies for payment proofs
CREATE POLICY "Users upload own payment proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own payment proofs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins view all payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));