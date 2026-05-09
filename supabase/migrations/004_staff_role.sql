-- ============================================================
-- AppBar - Rol staff para empleados del bar
-- ============================================================

-- Ampliar constraint de rol para incluir 'staff'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'superadmin', 'staff'));

-- Staff puede leer su propio bar (para layout/middleware)
-- (La policy "Owner lee su bar" ya usa get_my_bar_id() que funciona para staff,
--  pero la renombramos para mayor claridad con una policy adicional)
CREATE POLICY "Staff lee su bar"
  ON public.bars FOR SELECT
  USING (
    id = public.get_my_bar_id()
    AND public.get_my_role() = 'staff'
  );
