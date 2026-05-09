-- Migration 006: Decouple payment from kitchen status
-- Adds paid_at timestamp to orders so payment can be recorded
-- independently of the kitchen lifecycle (pendiente→preparando→listo→entregado).
-- Status "cobrado" is removed: a session is "complete" when every sub-order
-- is entregado AND has paid_at set.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Backfill: existing cobrado orders are paid (use updated_at as best estimate)
UPDATE public.orders
SET paid_at = updated_at
WHERE status = 'cobrado' AND paid_at IS NULL;

-- Move every cobrado row to entregado (kitchen-wise they are delivered)
UPDATE public.orders
SET status = 'entregado'
WHERE status = 'cobrado';

-- Replace the status check constraint to drop "cobrado"
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pendiente','preparando','listo','entregado'));

CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at);
