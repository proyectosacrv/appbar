"use server";

import { z } from "zod";
import type { AuditAction } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireOwnerAccess } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72);

const createStaffSchema = z.object({
  barId: z.string().uuid(),
  barSlug: z.string().min(1).max(80),
  email: z.string().email(),
  password: passwordSchema,
  fullName: z.string().max(120).optional(),
});

export async function createStaffAccount(input: {
  barId: string;
  barSlug: string;
  email: string;
  password: string;
  fullName?: string;
}) {
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireOwnerAccess(parsed.data.barId);
  if ("error" in auth) return { error: auth.error };

  const adminSupabase = await createAdminClient();

  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Error al crear la cuenta" };
  }

  const { error: profileError } = await adminSupabase.from("profiles").insert({
    id: authData.user.id,
    bar_id: parsed.data.barId,
    role: "staff",
    full_name: parsed.data.fullName || null,
  });

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return { error: "Error al crear el perfil del empleado" };
  }

  await logAudit({
    barId: parsed.data.barId,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "staff.created",
    entity: "user",
    entityId: authData.user.id,
    payload: { email: parsed.data.email },
  });

  revalidatePath(`/admin/${parsed.data.barSlug}/employees`);
  return { success: true };
}

export async function getStaffAccounts(barId: string) {
  const auth = await requireOwnerAccess(barId);
  if ("error" in auth) return [];

  const adminSupabase = await createAdminClient();

  const [{ data: profiles }, { data: usersData }] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("id, full_name")
      .eq("bar_id", barId)
      .eq("role", "staff"),
    adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (!profiles) return [];

  // Build a fast id → email map from the single listUsers call
  const emailById = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    emailById.set(u.id, u.email ?? "—");
  }

  return profiles.map((p) => ({
    id: p.id as string,
    email: emailById.get(p.id as string) ?? "—",
    full_name: (p.full_name as string | null) ?? null,
  }));
}

export async function deleteStaffAccount(
  staffId: string,
  barId: string,
  barSlug: string
) {
  const parsed = z
    .object({
      staffId: z.string().uuid(),
      barId: z.string().uuid(),
      barSlug: z.string().min(1).max(80),
    })
    .safeParse({ staffId, barId, barSlug });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireOwnerAccess(parsed.data.barId);
  if ("error" in auth) return { error: auth.error };

  const adminSupabase = await createAdminClient();

  const { data: target } = await adminSupabase
    .from("profiles")
    .select("role, bar_id")
    .eq("id", parsed.data.staffId)
    .single();

  if (target?.role !== "staff" || target.bar_id !== parsed.data.barId) {
    return { error: "No se puede eliminar esa cuenta" };
  }

  const { error } = await adminSupabase.auth.admin.deleteUser(
    parsed.data.staffId
  );
  if (error) return { error: "No se pudo eliminar la cuenta" };

  await logAudit({
    barId: parsed.data.barId,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "staff.deleted",
    entity: "user",
    entityId: parsed.data.staffId,
  });

  revalidatePath(`/admin/${parsed.data.barSlug}/employees`);
  return { success: true };
}

// ============================================================
// Staff credential management (only the owner of the bar can use these)
// ============================================================

// Verifies the target user belongs to this bar as staff before any change.
async function assertStaffOfBar(staffId: string, barId: string) {
  const adminSupabase = await createAdminClient();
  const { data: target } = await adminSupabase
    .from("profiles")
    .select("role, bar_id")
    .eq("id", staffId)
    .single();
  if (target?.role !== "staff" || target.bar_id !== barId) {
    return { error: "Cuenta no válida" };
  }
  return { ok: true as const };
}

const updateStaffEmailSchema = z.object({
  staffId: z.string().uuid(),
  barId: z.string().uuid(),
  barSlug: z.string().min(1).max(80),
  newEmail: z.string().email(),
});

export async function updateStaffEmail(input: {
  staffId: string;
  barId: string;
  barSlug: string;
  newEmail: string;
}) {
  const parsed = updateStaffEmailSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireOwnerAccess(parsed.data.barId);
  if ("error" in auth) return { error: auth.error };

  const check = await assertStaffOfBar(parsed.data.staffId, parsed.data.barId);
  if ("error" in check) return { error: check.error };

  const adminSupabase = await createAdminClient();
  const { error } = await adminSupabase.auth.admin.updateUserById(
    parsed.data.staffId,
    { email: parsed.data.newEmail, email_confirm: true }
  );
  if (error) {
    return {
      error:
        error.message?.includes("already")
          ? "Ya existe una cuenta con ese email"
          : "No se pudo cambiar el email",
    };
  }

  await logAudit({
    barId: parsed.data.barId,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "staff.email_changed" as AuditAction,
    entity: "user",
    entityId: parsed.data.staffId,
    payload: { new_email: parsed.data.newEmail },
  });

  revalidatePath(`/admin/${parsed.data.barSlug}/employees`);
  return { success: true };
}

const updateStaffPasswordSchema = z.object({
  staffId: z.string().uuid(),
  barId: z.string().uuid(),
  barSlug: z.string().min(1).max(80),
  newPassword: passwordSchema,
});

export async function updateStaffPassword(input: {
  staffId: string;
  barId: string;
  barSlug: string;
  newPassword: string;
}) {
  const parsed = updateStaffPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireOwnerAccess(parsed.data.barId);
  if ("error" in auth) return { error: auth.error };

  const check = await assertStaffOfBar(parsed.data.staffId, parsed.data.barId);
  if ("error" in check) return { error: check.error };

  const adminSupabase = await createAdminClient();
  const { error } = await adminSupabase.auth.admin.updateUserById(
    parsed.data.staffId,
    { password: parsed.data.newPassword }
  );
  if (error) return { error: "No se pudo cambiar la contraseña" };

  await logAudit({
    barId: parsed.data.barId,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "staff.password_reset" as AuditAction,
    entity: "user",
    entityId: parsed.data.staffId,
  });

  revalidatePath(`/admin/${parsed.data.barSlug}/employees`);
  return { success: true };
}
