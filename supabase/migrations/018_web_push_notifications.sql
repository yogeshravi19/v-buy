-- 018_web_push_notifications.sql
-- Web Push Subscriptions and Asynchronous Order Notification Observers

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anon can register push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Anon can register push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Service role full access on push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role full access on push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Notifications Feed Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id text REFERENCES public.outlets(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text DEFAULT '/orders',
  tag text DEFAULT 'vfoods-notification',
  is_read boolean NOT NULL DEFAULT false,
  sent_via_push boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_outlet_id ON public.notifications(outlet_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification read state" ON public.notifications;
CREATE POLICY "Users can update own notification read state"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;
CREATE POLICY "Service role full access on notifications"
  ON public.notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Notification Observer Trigger on Orders (Zero Money Math Touched)
CREATE OR REPLACE FUNCTION public.trg_observe_order_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_num text;
  v_outlet_name text;
BEGIN
  -- Daily order number fallback
  v_num := COALESCE(NEW.daily_number::text, NEW.token::text, '000');

  -- Fetch outlet name if available
  SELECT name INTO v_outlet_name FROM public.outlets WHERE id = NEW.outlet_id;
  IF v_outlet_name IS NULL THEN
    v_outlet_name := 'Campus Canteen';
  END IF;

  -- Condition A: New APP Pre-Order Placed -> Notify Outlet Staff
  IF TG_OP = 'INSERT' AND NEW.status::text = 'placed' AND COALESCE(NEW.order_source, 'APP') = 'APP' THEN
    INSERT INTO public.notifications (outlet_id, title, body, url, tag)
    VALUES (
      NEW.outlet_id,
      'New Order #' || v_num || ' Placed',
      'New pre-order #' || v_num || ' received for ' || v_outlet_name,
      '/staff/live-orders',
      'order-new-' || NEW.id
    );
  END IF;

  -- Condition B: Order Status Changed to READY -> Notify Customer
  IF TG_OP = 'UPDATE' AND OLD.status::text <> 'ready' AND NEW.status::text = 'ready' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, outlet_id, title, body, url, tag)
    VALUES (
      NEW.user_id,
      NEW.outlet_id,
      'Order #' || v_num || ' is Ready!',
      'Your order #' || v_num || ' is ready for pickup at ' || v_outlet_name,
      '/orders',
      'order-ready-' || NEW.id
    );
  END IF;

  -- Condition C: Order Status Changed to CANCELLED -> Notify Customer
  IF TG_OP = 'UPDATE' AND OLD.status::text <> 'cancelled' AND NEW.status::text = 'cancelled' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, outlet_id, title, body, url, tag)
    VALUES (
      NEW.user_id,
      NEW.outlet_id,
      'Order #' || v_num || ' Cancelled',
      'Order #' || v_num || ' was cancelled. Any debited amount has been refunded to your wallet.',
      '/orders',
      'order-cancelled-' || NEW.id
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Safeguard: Never let a notification logging failure disrupt an order workflow
  RAISE WARNING 'trg_observe_order_notifications encountered an issue: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_notifications_observer ON public.orders;
CREATE TRIGGER trg_orders_notifications_observer
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_observe_order_notifications();
