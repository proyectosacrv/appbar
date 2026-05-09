"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  UtensilsCrossed,
  Tags,
  QrCode,
  BarChart2,
  Users,
  LogOut,
  History,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface AdminSidebarProps {
  barSlug: string;
  barName: string;
  logoUrl?: string | null;
  role: "owner" | "staff";
}

export function AdminSidebar({
  barSlug,
  barName,
  logoUrl,
  role,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Close drawer on route change so the sidebar doesn't stay open over the new view.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when the mobile drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const ownerItems: NavItem[] = [
    {
      href: `/admin/${barSlug}/orders`,
      label: "Pedidos",
      icon: <ShoppingBag className="h-5 w-5" />,
    },
    {
      href: `/admin/${barSlug}/menu`,
      label: "Carta",
      icon: <UtensilsCrossed className="h-5 w-5" />,
    },
    {
      href: `/admin/${barSlug}/categories`,
      label: "Categorías",
      icon: <Tags className="h-5 w-5" />,
    },
    {
      href: `/admin/${barSlug}/tables`,
      label: "Mesas / QR",
      icon: <QrCode className="h-5 w-5" />,
    },
    {
      href: `/admin/${barSlug}/history`,
      label: "Historial",
      icon: <History className="h-5 w-5" />,
    },
    {
      href: `/admin/${barSlug}/analytics`,
      label: "Análisis",
      icon: <BarChart2 className="h-5 w-5" />,
    },
    {
      href: `/admin/${barSlug}/employees`,
      label: "Empleados",
      icon: <Users className="h-5 w-5" />,
    },
  ];

  const staffItems: NavItem[] = [
    {
      href: `/admin/${barSlug}/orders`,
      label: "Pedidos",
      icon: <ShoppingBag className="h-5 w-5" />,
    },
  ];

  const navItems = role === "owner" ? ownerItems : staffItems;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Floating hamburger — only on mobile, hidden once the drawer is open */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="md:hidden fixed top-3 left-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg border bg-card shadow-sm hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Backdrop — only visible on mobile while the drawer is open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        />
      )}

      <aside
        className={cn(
          "flex w-64 flex-col border-r bg-card",
          // Mobile: fixed drawer that slides in from the left
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: in normal flow, full height of its parent flex container
          "md:relative md:z-auto md:h-full md:translate-x-0 md:transition-none"
        )}
      >
        {/* Logo / Bar name + close button (mobile) */}
        <div className="border-b p-4 flex items-center gap-3">
          {logoUrl && (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
              <Image
                src={logoUrl}
                alt=""
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-lg truncate">{barName}</h1>
            <p className="text-xs text-muted-foreground">
              {role === "owner" ? "Panel de administración" : "Panel de empleado"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
