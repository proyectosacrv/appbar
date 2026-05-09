-- ============================================================
-- AppBar - Esquema inicial de base de datos
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- TABLA: bars (tenants)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bars (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  owner_email text NOT NULL,
  logo_url    text,
  theme_color text DEFAULT '#000000',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLA: profiles (extiende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bar_id    uuid REFERENCES public.bars(id) ON DELETE SET NULL,
  role      text NOT NULL CHECK (role IN ('owner', 'superadmin')),
  full_name text
);

-- ============================================================
-- TABLA: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id     uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLA: products
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id      uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name        text NOT NULL,
  description text,
  price       numeric(10,2) NOT NULL,
  image_url   text,
  in_stock    boolean NOT NULL DEFAULT true,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLA: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id       uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  table_number integer NOT NULL,
  status       text NOT NULL DEFAULT 'pendiente'
               CHECK (status IN ('pendiente','preparando','listo','entregado','cobrado')),
  notes        text,
  total        numeric(10,2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLA: order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price   numeric(10,2) NOT NULL,
  quantity     integer NOT NULL DEFAULT 1,
  notes        text
);

-- ============================================================
-- TABLA: tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tables (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id       uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  table_number integer NOT NULL,
  label        text,
  UNIQUE(bar_id, table_number)
);

-- ============================================================
-- FUNCIONES HELPER para RLS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_bar_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT bar_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Trigger para actualizar updated_at en orders
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_bar_id ON public.products(bar_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_bar_id ON public.orders(bar_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_categories_bar_id ON public.categories(bar_id);
CREATE INDEX IF NOT EXISTS idx_tables_bar_id ON public.tables(bar_id);
