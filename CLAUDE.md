# AppBar — CLAUDE.md

## Resumen del proyecto
Sistema SaaS multi-tenant para gestión de bares. Los clientes escanean QR en mesas para ver la carta y hacer pedidos. Los dueños gestionan la carta y ven pedidos en tiempo real. Un superadmin (el desarrollador) controla todos los bares y puede suspenderlos por impago.

## Stack tecnológico
- **Next.js 16** (App Router, TypeScript, `src/` directory)
- **Supabase** (PostgreSQL + Auth + Realtime + Storage) — Free tier
- **TailwindCSS v4** (sin tailwind.config.ts, configuración por CSS `@theme inline`)
- **shadcn/ui** (componentes manuales en `src/components/ui/`)
- **Zustand v5** — carrito del cliente (estado efímero, no persiste en BD)
- **Zod v4** — validación de formularios
- **qrcode.react v4** — generación de QR (`QRCodeSVG` named export)
- **Vercel** — deploy gratuito

## Arquitectura multi-tenant
- **Un solo proyecto Supabase** con campo `bar_id` en todas las tablas
- **RLS (Row Level Security)** como barrera de aislamiento entre bares
- **Funciones helper** en BD: `get_my_bar_id()` y `get_my_role()`
- **Suspensión por impago**: `bars.is_active = false` bloquea acceso via RLS + layout check

## Estructura de URLs
```
/[barSlug]?mesa=N          → Carta del cliente (pública, anónima)
/[barSlug]/order            → Confirmación de pedido (doble check)
/[barSlug]/order/success    → Pedido enviado
/login                      → Login unificado owners + superadmin
/admin/[barSlug]/orders     → Dashboard pedidos tiempo real
/admin/[barSlug]/menu       → Gestión de carta
/admin/[barSlug]/categories → Gestión de categorías
/admin/[barSlug]/tables     → Generador de QR por mesa
/admin/[barSlug]/analytics  → Analytics del día
/superadmin                 → Panel de bares (solo superadmin)
/superadmin/bars/new        → Crear nuevo bar + cuenta de dueño
/superadmin/bars/[barId]    → Detalle + control de acceso
```

## Base de datos (tablas principales)
- `bars` — tenants, tiene `is_active` para suspensión
- `profiles` — extiende `auth.users`, tiene `role` (owner|superadmin) y `bar_id`
- `categories` — categorías de la carta
- `products` — productos, tienen `in_stock` y `is_active` (soft delete)
- `orders` — pedidos, status flow: `pendiente→preparando→listo→entregado→cobrado`
- `order_items` — líneas del pedido (snapshot precio/nombre al hacer el pedido)
- `tables` — mesas para generación de QR

## Decisiones de arquitectura (no cambiar sin razón)
1. Los pedidos de clientes son **anónimos** (no requieren auth)
2. El número de mesa viaja en la URL: `?mesa=N`
3. **Server Actions** para todas las mutaciones (no API routes)
4. **Dos clientes Supabase**: `server.ts` (cookies, para Server Components) y `client.ts` (browser)
5. El carrito solo existe en el cliente (Zustand), no se persiste en BD
6. Las Server Actions usan `revalidatePath()` o `refresh()` para refrescar datos

## Flujo de status de pedidos
```
pendiente → preparando → listo → entregado → cobrado
```
Solo avanza, nunca retrocede. El dueño puede editar los items pero no cambiar el estado hacia atrás.

## Comandos
```bash
npm run dev                            # Servidor de desarrollo
node node_modules\typescript\bin\tsc --noEmit  # Verificar tipos TypeScript
npm run build                          # Build de producción (usa Turbopack)
```

## Notas de compatibilidad Next.js 16
- El build muestra un aviso `The "middleware" file convention is deprecated. Please use "proxy" instead.` — es solo informativo, el middleware funciona correctamente con Supabase SSR.
- Tailwind v4: no hay `tailwind.config.ts`, la configuración va en CSS con `@theme inline`.

## Variables de entorno (ver .env.example)
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Clave pública (segura para el cliente)
- `SUPABASE_SERVICE_ROLE_KEY` — Clave de servicio (SOLO servidor, bypasa RLS)
- `NEXT_PUBLIC_APP_URL` — URL base para generar URLs de QR

## Setup inicial de Supabase (solo una vez)
1. Ejecutar `supabase/migrations/001_initial_schema.sql`
2. Ejecutar `supabase/migrations/002_rls_policies.sql`
3. En Dashboard > Database > Replication: añadir tabla `orders` a Realtime
4. En Dashboard > Storage: crear bucket `product-images` (público)
5. En Dashboard > Authentication > Users: crear usuario superadmin
6. Editar y ejecutar `supabase/migrations/003_seed_superadmin.sql`

## Convenciones de código
- **Server Components** por defecto
- `"use client"` solo cuando hay event handlers, hooks o Realtime
- Componentes en `src/components/{customer,admin,superadmin,shared,ui}/`
- Server Actions en `src/actions/` — SIEMPRE con `"use server"` al inicio del archivo
- Tipos en `src/types/database.ts`

## Lo que NO hacer
- NO usar `supabase.auth.admin` en el cliente
- NO omitir filtros `bar_id` en queries (aunque RLS protege, es buena práctica)
- NO almacenar el carrito en la BD
- NO crear API routes para mutaciones (usar Server Actions)
- NO usar `@radix-ui/react-badge` (no existe, usar el componente `src/components/ui/badge.tsx` que es un div)
