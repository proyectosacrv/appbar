-- Migration 008: Edit counter on orders
-- Tracks how many times an order has been edited via the admin panel.
-- Used to compute the "edit rate" analytics metric.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0;
