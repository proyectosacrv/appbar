"use server";

import { z } from "zod";
import type { AuditAction } from "@/lib/audit";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireSuperadmin, requireBarAccess } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Slug inválido");

const createBarSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema,
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8).max(72),
  ownerName: z.string().max(120).optional(),
});

export async function createBar(input: {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerName?: string;
}) {
  const parsed = createBarSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireSuperadmin();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("bars")
    .select("id")
    .eq("slug", parsed.data.slug)
    .single();

  if (existing) return { error: "Ese slug ya está en uso" };

  const { data: bar, error: barError } = await supabase
    .from("bars")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      owner_email: parsed.data.ownerEmail,
      is_active: true,
      logo_url: null,
      theme_color: null,
    })
    .select()
    .single();

  if (barError || !bar) return { error: "No se pudo crear el bar" };

  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email: parsed.data.ownerEmail,
      password: parsed.data.ownerPassword,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    await supabase.from("bars").delete().eq("id", bar.id);
    return { error: `Error al crear cuenta: ${authError?.message}` };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    bar_id: bar.id,
    role: "owner",
    full_name: parsed.data.ownerName || null,
  });

  if (profileError) {
    return { error: "Bar creado pero error en perfil — revisar manualmente" };
  }

  await logAudit({
    barId: bar.id,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "bar.activated",
    entity: "bar",
    entityId: bar.id,
    payload: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath("/superadmin");
  return { barId: bar.id, barSlug: bar.slug };
}

export async function toggleBarStatus(barId: string, isActive: boolean) {
  const parsed = z
    .object({ barId: z.string().uuid(), isActive: z.boolean() })
    .safeParse({ barId, isActive });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireSuperadmin();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("bars")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.barId);

  if (error) return { error: "No se pudo actualizar el estado del bar" };

  await logAudit({
    barId: parsed.data.barId,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: parsed.data.isActive ? "bar.activated" : "bar.suspended",
    entity: "bar",
    entityId: parsed.data.barId,
  });

  revalidatePath("/superadmin");
  return { success: true };
}

// Owner-controllable settings (NO branding here — branding is superadmin only)
const settingsSchema = z.object({
  barId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).max(120).optional(),
    cartMaxQuantity: z.number().int().min(1).max(99).optional(),
    barDayCutoffHour: z.number().int().min(0).max(23).optional(),
    oldOrderThresholdMin: z.number().int().min(1).max(240).optional(),
  }),
  barSlug: z.string().min(1).max(80),
});

export async function updateBarSettings(
  barId: string,
  data: {
    name?: string;
    cartMaxQuantity?: number;
    barDayCutoffHour?: number;
    oldOrderThresholdMin?: number;
  },
  barSlug: string
) {
  const parsed = settingsSchema.safeParse({ barId, data, barSlug });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireBarAccess(parsed.data.barId);
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (parsed.data.data.name) updateData.name = parsed.data.data.name;
  if (parsed.data.data.cartMaxQuantity !== undefined)
    updateData.cart_max_quantity = parsed.data.data.cartMaxQuantity;
  if (parsed.data.data.barDayCutoffHour !== undefined)
    updateData.bar_day_cutoff_hour = parsed.data.data.barDayCutoffHour;
  if (parsed.data.data.oldOrderThresholdMin !== undefined)
    updateData.old_order_threshold_min = parsed.data.data.oldOrderThresholdMin;

  const { error } = await supabase
    .from("bars")
    .update(updateData)
    .eq("id", parsed.data.barId);

  if (error) return { error: "No se pudo actualizar la configuración" };

  await logAudit({
    barId: parsed.data.barId,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "bar.settings_updated",
    entity: "bar",
    entityId: parsed.data.barId,
    payload: updateData,
  });

  revalidatePath(`/admin/${parsed.data.barSlug}`);
  revalidatePath("/superadmin");
  return { success: true };
}

// ============================================================
// Bar owner credential management (superadmin only)
// Used so the superadmin can hand off a bar to a new owner email
// or reset the owner password if they get locked out.
// ============================================================

// Resolves the current owner of the bar from profiles + auth.
async function getBarOwnerUserId(barId: string): Promise<string | null> {
  const adminSupabase = await createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("bar_id", barId)
    .eq("role", "owner")
    .single();
  return (profile as { id: string } | null)?.id ?? null;
}

const updateOwnerEmailSchema = z.object({
  barId: z.string().uuid(),
  newEmail: z.string().email(),
});

export async function updateBarOwnerEmail(input: {
  barId: string;
  newEmail: string;
}) {
  const parsed = updateOwnerEmailSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireSuperadmin();
  if ("error" in auth) return { error: auth.error };

  const ownerId = await getBarOwnerUserId(parsed.data.barId);
  if (!ownerId) return { error: "Este bar no tiene dueño asignado" };

  const adminSupabase = await createAdminClient();

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(
    ownerId,
    { email: parsed.data.newEmail, email_confirm: true }
  );
  if (authError) {
    return {
      error:
        authError.message?.includes("already")
          ? "Ya existe una cuenta con ese email"
          : "No se pudo cambiar el email",
    };
  }

  // Keep bars.owner_email in sync (used for display in superadmin UI).
  const supabase = await createClient();
  await supabase
    .from("bars")
    .update({ owner_email: parsed.data.newEmail })
    .eq("id", parsed.data.barId);

  await logAudit({
    barId: parsed.data.barId,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "bar.owner_email_changed" as AuditAction,
    entity: "bar",
    entityId: parsed.data.barId,
    payload: { new_email: parsed.data.newEmail },
  });

  revalidatePath("/superadmin");
  revalidatePath(`/superadmin/bars/${parsed.data.barId}`);
  return { success: true };
}

const updateOwnerPasswordSchema = z.object({
  barId: z.string().uuid(),
  newPassword: z.string().min(8).max(72),
});

// ============================================================
// Branding — superadmin only
// The owner CANNOT change logo or theme color. They request changes from
// support and the superadmin applies them. This keeps brand consistency
// across the platform and prevents accidental brand misuse.
// Logos are stored in the product-images bucket under `branding/{barId}/...`.
// ============================================================

export async function uploadBarLogo(
  formData: FormData,
  barId: string
): Promise<{ url?: string; error?: string }> {
  const auth = await requireSuperadmin();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No se proporcionó archivo" };
  if (file.size > 5 * 1024 * 1024) return { error: "Imagen demasiado grande (máx 5 MB)" };
  if (!/^image\//.test(file.type)) return { error: "El archivo no es una imagen" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `branding/${barId}/logo-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true });
  if (error) return { error: "Error al subir el logo" };

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return { url: data.publicUrl };
}

const brandingSchema = z.object({
  barId: z.string().uuid(),
  logoUrl: z.string().max(2000).nullable(),
  themeColor: z
    .string()
    .max(40)
    .regex(/^#?[0-9a-fA-F]{6,8}$/, "Color inválido")
    .nullable(),
});

export async function updateBarBranding(input: {
  barId: string;
  logoUrl: string | null;
  themeColor: string | null;
}) {
  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireSuperadmin();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();

  // Get the bar slug for cache invalidation
  const { data: bar } = await supabase
    .from("bars")
    .select("slug")
    .eq("id", parsed.data.barId)
    .single();
  if (!bar) return { error: "Bar no encontrado" };

  const { error } = await supabase
    .from("bars")
    .update({
      logo_url: parsed.data.logoUrl,
      theme_color: parsed.data.themeColor,
    })
    .eq("id", parsed.data.barId);

  if (error) return { error: "No se pudo actualizar la identidad" };

  await logAudit({
    barId: parsed.data.barId,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "bar.settings_updated",
    entity: "bar",
    entityId: parsed.data.barId,
    payload: {
      logo_url: parsed.data.logoUrl,
      theme_color: parsed.data.themeColor,
    },
  });

  // Invalidate both customer and admin caches so the new branding is picked up
  revalidatePath(`/${bar.slug}`);
  revalidatePath(`/admin/${bar.slug}`);
  revalidatePath("/superadmin");
  revalidatePath(`/superadmin/bars/${parsed.data.barId}`);
  return { success: true };
}

export async function updateBarOwnerPassword(input: {
  barId: string;
  newPassword: string;
}) {
  const parsed = updateOwnerPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireSuperadmin();
  if ("error" in auth) return { error: auth.error };

  const ownerId = await getBarOwnerUserId(parsed.data.barId);
  if (!ownerId) return { error: "Este bar no tiene dueño asignado" };

  const adminSupabase = await createAdminClient();
  const { error } = await adminSupabase.auth.admin.updateUserById(ownerId, {
    password: parsed.data.newPassword,
  });
  if (error) return { error: "No se pudo cambiar la contraseña" };

  await logAudit({
    barId: parsed.data.barId,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "bar.owner_password_reset" as AuditAction,
    entity: "bar",
    entityId: parsed.data.barId,
  });

  return { success: true };
}
