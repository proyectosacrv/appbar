-- ============================================================
-- AppBar - Políticas de Row Level Security (RLS)
-- Ejecutar DESPUÉS de 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- TABLA: bars
-- ============================================================
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;

-- Clientes pueden ver bares activos (para validar el slug)
CREATE POLICY "Public lee bares activos"
  ON public.bars FOR SELECT
  USING (is_active = true);

-- Dueño puede ver su propio bar (aunque esté suspendido, para mostrar mensaje)
CREATE POLICY "Owner lee su bar"
  ON public.bars FOR SELECT
  USING (id = public.get_my_bar_id());

-- Superadmin tiene acceso total
CREATE POLICY "Superadmin acceso total a bars"
  ON public.bars FOR ALL
  USING (public.get_my_role() = 'superadmin')
  WITH CHECK (public.get_my_role() = 'superadmin');

-- ============================================================
-- TABLA: profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario lee su propio perfil"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Superadmin lee todos los perfiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'superadmin');

CREATE POLICY "Superadmin gestiona perfiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.get_my_role() = 'superadmin');

CREATE POLICY "Superadmin actualiza perfiles"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'superadmin');

-- ============================================================
-- TABLA: categories
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Lectura pública para bares activos
CREATE POLICY "Public lee categorias de bar activo"
  ON public.categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bars
      WHERE id = bar_id AND is_active = true
    )
  );

-- Owner gestiona sus categorías
CREATE POLICY "Owner gestiona sus categorias"
  ON public.categories FOR ALL
  USING (bar_id = public.get_my_bar_id())
  WITH CHECK (bar_id = public.get_my_bar_id());

-- ============================================================
-- TABLA: products
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Lectura pública de productos activos en bares activos
CREATE POLICY "Public lee productos activos de bar activo"
  ON public.products FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.bars
      WHERE id = bar_id AND is_active = true
    )
  );

-- Owner gestiona sus productos (ve también los inactivos)
CREATE POLICY "Owner gestiona sus productos"
  ON public.products FOR ALL
  USING (bar_id = public.get_my_bar_id())
  WITH CHECK (bar_id = public.get_my_bar_id());

-- ============================================================
-- TABLA: orders
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Inserción pública (clientes anónimos hacen pedidos)
CREATE POLICY "Public inserta pedidos en bares activos"
  ON public.orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bars
      WHERE id = bar_id AND is_active = true
    )
  );

-- Owner lee y gestiona pedidos de su bar
CREATE POLICY "Owner gestiona pedidos de su bar"
  ON public.orders FOR ALL
  USING (bar_id = public.get_my_bar_id())
  WITH CHECK (bar_id = public.get_my_bar_id());

-- ============================================================
-- TABLA: order_items
-- ============================================================
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Inserción pública (adjunto al pedido)
CREATE POLICY "Public inserta items de pedidos en bares activos"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.bars b ON b.id = o.bar_id
      WHERE o.id = order_id AND b.is_active = true
    )
  );

-- Owner lee items de pedidos de su bar
CREATE POLICY "Owner lee items de su bar"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.bar_id = public.get_my_bar_id()
    )
  );

-- Owner puede modificar items (edición de pedidos)
CREATE POLICY "Owner modifica items de su bar"
  ON public.order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.bar_id = public.get_my_bar_id()
    )
  );

-- Owner puede borrar items (edición de pedidos)
CREATE POLICY "Owner borra items de su bar"
  ON public.order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.bar_id = public.get_my_bar_id()
    )
  );

-- ============================================================
-- TABLA: tables
-- ============================================================
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Owner gestiona las mesas de su bar
CREATE POLICY "Owner gestiona sus mesas"
  ON public.tables FOR ALL
  USING (bar_id = public.get_my_bar_id())
  WITH CHECK (bar_id = public.get_my_bar_id());

-- ============================================================
-- STORAGE: bucket product-images
-- ============================================================
-- Ejecutar manualmente en Supabase Dashboard > Storage:
-- 1. Crear bucket "product-images" con Public = true
-- 2. O ejecutar:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-images', 'product-images', true)
-- ON CONFLICT DO NOTHING;

-- Política de subida para owners autenticados
-- (necesita Storage RLS habilitado en el Dashboard)
