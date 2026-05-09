-- Migration 009: Robustness overhaul
-- Bundles several improvements:
--   1. Per-bar configuration columns (cart limits, day cutoff, thresholds)
--   2. payment_method column on orders (efectivo / tarjeta / bizum / otro)
--   3. audit_log table for sensitive operations
--   4. Postgres RPC functions for atomic order creation and edit_count increment
--   5. Idempotent — safe to run again

-- ============================================================
-- 1) Per-bar configuration
-- ============================================================
ALTER TABLE public.bars
  ADD COLUMN IF NOT EXISTS cart_max_quantity      INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS bar_day_cutoff_hour    INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS old_order_threshold_min INTEGER NOT NULL DEFAULT 15;

ALTER TABLE public.bars
  DROP CONSTRAINT IF EXISTS bars_cart_max_quantity_check;
ALTER TABLE public.bars
  ADD  CONSTRAINT bars_cart_max_quantity_check
  CHECK (cart_max_quantity BETWEEN 1 AND 99);

ALTER TABLE public.bars
  DROP CONSTRAINT IF EXISTS bars_bar_day_cutoff_hour_check;
ALTER TABLE public.bars
  ADD  CONSTRAINT bars_bar_day_cutoff_hour_check
  CHECK (bar_day_cutoff_hour BETWEEN 0 AND 23);

ALTER TABLE public.bars
  DROP CONSTRAINT IF EXISTS bars_old_order_threshold_check;
ALTER TABLE public.bars
  ADD  CONSTRAINT bars_old_order_threshold_check
  CHECK (old_order_threshold_min BETWEEN 1 AND 240);

-- ============================================================
-- 2) Payment method on orders
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD  CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('efectivo','tarjeta','bizum','otro'));

-- ============================================================
-- 3) Audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          BIGSERIAL PRIMARY KEY,
  bar_id      UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role  TEXT,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_bar_created
  ON public.audit_log(bar_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner lee su audit log"   ON public.audit_log;
DROP POLICY IF EXISTS "Superadmin lee audit log" ON public.audit_log;

CREATE POLICY "Owner lee su audit log"
  ON public.audit_log FOR SELECT
  USING (bar_id = public.get_my_bar_id());

CREATE POLICY "Superadmin lee audit log"
  ON public.audit_log FOR SELECT
  USING (public.get_my_role() = 'superadmin');

-- Inserts only via SECURITY DEFINER server actions (no public/auth INSERT policy)

-- ============================================================
-- 4) Atomic order creation RPC
-- Receives a JSON list of items and creates the order + items in a single
-- transaction. Handles merge logic atomically (FOR UPDATE on the pending row).
-- Returns the new/updated order id and a `merged` boolean.
-- ============================================================
-- Output columns are prefixed with `o_` so they don't collide with the
-- columns of the same name in the `orders` table inside the function body
-- (Postgres raises 42702 / "ambiguous column reference" otherwise).
DROP FUNCTION IF EXISTS public.create_order_atomic(UUID, INTEGER, JSONB, TEXT);

CREATE FUNCTION public.create_order_atomic(
  p_bar_id        UUID,
  p_table_number  INTEGER,
  p_items         JSONB,
  p_notes         TEXT
) RETURNS TABLE (
  o_order_id          UUID,
  o_merged            BOOLEAN,
  o_session_id        UUID,
  o_sub_order_number  INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bar_active   BOOLEAN;
  v_pending_id   UUID;
  v_pending_total NUMERIC;
  v_session_id   UUID;
  v_sub_no       INTEGER;
  v_order_id     UUID;
  v_added_total  NUMERIC := 0;
  v_count_active INTEGER;
BEGIN
  -- Validate bar is active
  SELECT b.is_active INTO v_bar_active
  FROM public.bars b WHERE b.id = p_bar_id;
  IF v_bar_active IS NULL THEN
    RAISE EXCEPTION 'Bar no encontrado';
  END IF;
  IF NOT v_bar_active THEN
    RAISE EXCEPTION 'Bar no activo';
  END IF;

  -- Compute added total
  SELECT COALESCE(SUM((item->>'unit_price')::NUMERIC * (item->>'quantity')::INTEGER), 0)
    INTO v_added_total
  FROM jsonb_array_elements(p_items) AS item;

  -- Find pending sub-order in this bar+table (lock it for update to avoid races)
  SELECT o.id, o.total INTO v_pending_id, v_pending_total
  FROM public.orders o
  WHERE o.bar_id = p_bar_id
    AND o.table_number = p_table_number
    AND o.status = 'pendiente'
    AND (o.status <> 'entregado' OR o.paid_at IS NULL)
  ORDER BY o.sub_order_number ASC
  LIMIT 1
  FOR UPDATE;

  IF v_pending_id IS NOT NULL THEN
    -- Merge: append items + bump total
    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity, notes)
    SELECT
      v_pending_id,
      NULLIF(item->>'product_id','')::UUID,
      item->>'product_name',
      (item->>'unit_price')::NUMERIC,
      (item->>'quantity')::INTEGER,
      NULLIF(item->>'notes','')
    FROM jsonb_array_elements(p_items) AS item;

    UPDATE public.orders AS o
    SET total = v_pending_total + v_added_total,
        updated_at = now()
    WHERE o.id = v_pending_id
    RETURNING o.session_id, o.sub_order_number
    INTO v_session_id, v_sub_no;

    o_order_id          := v_pending_id;
    o_merged            := TRUE;
    o_session_id        := v_session_id;
    o_sub_order_number  := v_sub_no;
    RETURN NEXT;
    RETURN;
  END IF;

  -- No pending sub-order: count active sub-orders to determine session_id and sub number
  SELECT COUNT(*) INTO v_count_active
  FROM public.orders o
  WHERE o.bar_id = p_bar_id
    AND o.table_number = p_table_number
    AND (o.status <> 'entregado' OR o.paid_at IS NULL);

  IF v_count_active > 0 THEN
    SELECT o.session_id INTO v_session_id
    FROM public.orders o
    WHERE o.bar_id = p_bar_id
      AND o.table_number = p_table_number
      AND (o.status <> 'entregado' OR o.paid_at IS NULL)
    ORDER BY o.sub_order_number ASC
    LIMIT 1;
  ELSE
    v_session_id := gen_random_uuid();
  END IF;

  v_sub_no := v_count_active + 1;
  v_order_id := gen_random_uuid();

  INSERT INTO public.orders (id, bar_id, table_number, session_id, sub_order_number, notes, total, status)
  VALUES (v_order_id, p_bar_id, p_table_number, v_session_id, v_sub_no, NULLIF(p_notes,''), v_added_total, 'pendiente');

  INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity, notes)
  SELECT
    v_order_id,
    NULLIF(item->>'product_id','')::UUID,
    item->>'product_name',
    (item->>'unit_price')::NUMERIC,
    (item->>'quantity')::INTEGER,
    NULLIF(item->>'notes','')
  FROM jsonb_array_elements(p_items) AS item;

  o_order_id          := v_order_id;
  o_merged            := FALSE;
  o_session_id        := v_session_id;
  o_sub_order_number  := v_sub_no;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic(UUID, INTEGER, JSONB, TEXT) TO anon, authenticated;

-- ============================================================
-- 5) Atomic edit_count increment RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_order_edit_count(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new INTEGER;
BEGIN
  UPDATE public.orders
  SET edit_count = edit_count + 1,
      updated_at = now()
  WHERE id = p_order_id
  RETURNING edit_count INTO v_new;
  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_order_edit_count(UUID) TO authenticated;
