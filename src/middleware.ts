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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const appContext = detectAppContext(request);

  // Subdomain isolation:
  //   - On admin host: only allow /login, /admin/*, /superadmin/* and assets
  //   - On customer host: block /admin and /superadmin
  // Falls back to no-op when ADMIN_HOST is not configured.
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
        // Customers shouldn't browse the admin on the public host
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  // Protect /admin and /superadmin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/superadmin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Check role from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, bar_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Superadmin trying to access /admin (and vice versa)
    if (pathname.startsWith("/superadmin") && profile.role !== "superadmin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (
      pathname.startsWith("/admin") &&
      profile.role !== "owner" &&
      profile.role !== "staff"
    ) {
      return NextResponse.redirect(new URL("/superadmin", request.url));
    }
  }

  // Redirect authenticated users away from login
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
