-- ============================================================
-- AppBar - Seed del superadmin
--
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard > Authentication > Users
-- 2. Crea un usuario manualmente con tu email y contraseña
-- 3. Copia el UUID del usuario creado
-- 4. Sustituye 'TU-UUID-AQUI' por ese UUID en este script
-- 5. Ejecuta este script en SQL Editor
-- ============================================================

-- Reemplaza este UUID con el de tu usuario superadmin:
INSERT INTO public.profiles (id, bar_id, role, full_name)
VALUES (
  'baf5bb95-78d8-492c-9b5b-aee9340283fe',   -- UUID del usuario creado en Authentication
  NULL,             -- Sin bar asignado (superadmin no tiene bar)
  'superadmin',
  'Administrador'
)
ON CONFLICT (id) DO UPDATE
  SET role = 'superadmin', bar_id = NULL;

-- Ejemplo con UUID real (descomenta y edita):
-- INSERT INTO public.profiles (id, bar_id, role, full_name)
-- VALUES (
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--   NULL,
--   'superadmin',
--   'Mi Nombre'
-- )
-- ON CONFLICT (id) DO UPDATE SET role = 'superadmin', bar_id = NULL;
