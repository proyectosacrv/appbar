-- Migration 005: Session-based order grouping
-- Adds session_id to group all sub-orders from the same table visit,
-- and sub_order_number for display ordering within a session.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS sub_order_number INTEGER NOT NULL DEFAULT 1;

-- Backfill: each existing order gets its own UUID as session (standalone session)
UPDATE public.orders
SET session_id = id
WHERE session_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.orders
  ALTER COLUMN session_id SET NOT NULL;

-- Indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_orders_session_id
  ON public.orders(session_id);

CREATE INDEX IF NOT EXISTS idx_orders_bar_table_active
  ON public.orders(bar_id, table_number, status);
