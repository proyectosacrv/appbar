import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Host that the admin app lives on (only when subdomain routing is configured).
// Set NEXT_PUBLIC_ADMIN_HOST=app.tu-dominio.com in env to enable.
// Without it the legacy single-domain routing keeps working.
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST?.toLowerCase();

function getHost(request: NextRequest): string {
  return (request.headers.get("host") ?? "").toLowerCase();
}

// Returns "admin" if the request comes from the admin host, "customer" otherwise.
function detectAppContext(request: NextRequest): "admin" | "customer" {
  if (!ADMIN_HOST) return "customer";
  const host = getHost(request).replace(/:\d+$/, "");
  return host === ADMIN_HOST ? "admin" : "customer";
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const appContext = detectAppContext(request);

  // Subdomain isolation (cheap host-based routing — no DB needed)
  if (ADMIN_HOST) {
    if (appContext === "admin") {
      const isAdminPath =
        pathname.startsWith("/admin") ||
        pathname.startsWith("/superadmin") ||
        pathname === "/login" ||
        pathname === "/" ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api");
      if (!isAdminPath) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } else {
      if (
        pathname.startsWith("/admin") ||
        pathname.startsWith("/superadmin")
      ) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  // Only do auth work on protected routes. Customer/public routes don't need
  // session validation, which avoids hitting Supabase on every public page load.
  const needsAuth =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin") ||
    pathname === "/login";

  if (!needsAuth) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Single source of truth for auth: getUser() validates the JWT (HTTP call to
  // Supabase). Layouts and pages downstream can trust the cookie and use the
  // cheaper getSession() (no HTTP) since this middleware already gate-kept them.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect admin/superadmin routes — only check that there IS a user.
  // Role-based authorization (owner vs staff vs superadmin) is enforced in the
  // layout via getAdminBarContext(), avoiding a duplicate profile query here.
  if (pathname.startsWith("/admin") || pathname.startsWith("/superadmin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // If logged in and visiting /login, route to the right dashboard.
  // This is the only place we need profile data in the middleware, since the
  // user hasn't picked a destination yet.
  if (pathname === "/login" && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, bar_id, bars(slug)")
      .eq("id", user.id)
      .single();

    if (profile?.role === "superadmin") {
      return NextResponse.redirect(new URL("/superadmin", request.url));
    }

    if (profile?.role === "owner" || profile?.role === "staff") {
      const bar = profile.bars as unknown as { slug: string } | null;
      if (bar?.slug) {
        return NextResponse.redirect(
          new URL(`/admin/${bar.slug}/orders`, request.url)
        );
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
