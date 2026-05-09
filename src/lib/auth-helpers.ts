import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AuthContext {
  userId: string;
  role: UserRole;
  barId: string | null;
}

/**
 * Returns the current authenticated user's role and bar_id, or an error.
 * Used by server actions to enforce permissions explicitly (defense-in-depth
 * against RLS misconfiguration).
 */
export async function getAuthContext(): Promise<
  { ctx: AuthContext } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, bar_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  return {
    ctx: {
      userId: user.id,
      role: profile.role as UserRole,
      barId: (profile.bar_id as string | null) ?? null,
    },
  };
}

/**
 * Requires the caller to be owner or staff of the given bar.
 * Returns the auth context on success, or an error string.
 */
export async function requireBarAccess(
  barId: string
): Promise<{ ctx: AuthContext } | { error: string }> {
  const result = await getAuthContext();
  if ("error" in result) return result;
  const { ctx } = result;
  if (ctx.role !== "owner" && ctx.role !== "staff") {
    return { error: "Sin permiso" };
  }
  if (ctx.barId !== barId) return { error: "Sin permiso para este bar" };
  return { ctx };
}

/**
 * Stricter than requireBarAccess: only the owner of the bar can pass.
 */
export async function requireOwnerAccess(
  barId: string
): Promise<{ ctx: AuthContext } | { error: string }> {
  const result = await requireBarAccess(barId);
  if ("error" in result) return result;
  if (result.ctx.role !== "owner") return { error: "Solo el dueño puede hacer esto" };
  return result;
}

/**
 * Same as requireBarAccess but for the superadmin role.
 */
export async function requireSuperadmin(): Promise<
  { ctx: AuthContext } | { error: string }
> {
  const result = await getAuthContext();
  if ("error" in result) return result;
  if (result.ctx.role !== "superadmin") return { error: "Sin permiso" };
  return result;
}
