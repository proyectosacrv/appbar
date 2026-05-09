import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface AdminBarContext {
  user: { id: string; email: string | null };
  profile: { role: "owner" | "staff"; bar_id: string };
  bar: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    logo_url: string | null;
    theme_color: string | null;
    cart_max_quantity: number | null;
    old_order_threshold_min: number | null;
  };
}

// Per-request cached lookup of {user, profile, bar} for an admin route.
// Layout + page share the same cache entry, so only ONE round-trip happens.
export const getAdminBarContext = cache(
  async (barSlug: string): Promise<AdminBarContext | null> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select(
        "role, bar_id, bars!inner(id, name, slug, is_active, logo_url, theme_color, cart_max_quantity, old_order_threshold_min)"
      )
      .eq("id", user.id)
      .eq("bars.slug", barSlug)
      .single();

    if (!data) return null;

    const role = data.role as string;
    if (role !== "owner" && role !== "staff") return null;

    const barRaw = data.bars as unknown;
    const bar = (Array.isArray(barRaw) ? barRaw[0] : barRaw) as
      | AdminBarContext["bar"]
      | undefined;
    if (!bar) return null;

    return {
      user: { id: user.id, email: user.email ?? null },
      profile: { role: role as "owner" | "staff", bar_id: data.bar_id as string },
      bar,
    };
  }
);
