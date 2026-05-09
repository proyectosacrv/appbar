-- Migration 007: Status transition timestamps
-- ready_at: first time the order reached status="listo"
-- delivered_at: first time the order reached status="entregado"
-- Used to compute history metrics (kitchen time, prep time, etc.)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Backfill: existing entregado orders use updated_at as best estimate.
-- ready_at is left NULL for legacy rows (we can't approximate it accurately).
UPDATE public.orders
SET delivered_at = updated_at
WHERE status = 'entregado' AND delivered_at IS NULL;

-- Composite index used by the history page (paid orders sorted by paid_at)
CREATE INDEX IF NOT EXISTS idx_orders_history
  ON public.orders(bar_id, paid_at)
  WHERE paid_at IS NOT NULL;
