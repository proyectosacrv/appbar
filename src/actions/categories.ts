"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireBarAccess } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

export async function createCategory(
  barId: string,
  name: string,
  barSlug: string
) {
  const parsed = z
    .object({
      barId: z.string().uuid(),
      name: z.string().min(1).max(80),
      barSlug: z.string().min(1).max(80),
    })
    .safeParse({ barId, name, barSlug });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireBarAccess(parsed.data.barId);
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("categories")
    .insert({ bar_id: parsed.data.barId, name: parsed.data.name, sort_order: 0 })
    .select("id")
    .single();

  if (error) return { error: "No se pudo crear la categoría" };

  if (created) {
    await logAudit({
      barId: parsed.data.barId,
      actorId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "category.created",
      entity: "category",
      entityId: (created as { id: string }).id,
      payload: { name: parsed.data.name },
    });
  }

  revalidatePath(`/admin/${parsed.data.barSlug}/categories`);
  return { success: true };
}

export async function updateCategory(
  categoryId: string,
  name: string,
  barSlug: string
) {
  const parsed = z
    .object({
      categoryId: z.string().uuid(),
      name: z.string().min(1).max(80),
      barSlug: z.string().min(1).max(80),
    })
    .safeParse({ categoryId, name, barSlug });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("bar_id")
    .eq("id", categoryId)
    .single();
  if (!existing) return { error: "Categoría no encontrada" };

  const auth = await requireBarAccess((existing as { bar_id: string }).bar_id);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", categoryId);

  if (error) return { error: "No se pudo actualizar la categoría" };

  await logAudit({
    barId: (existing as { bar_id: string }).bar_id,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "category.updated",
    entity: "category",
    entityId: categoryId,
    payload: { name: parsed.data.name },
  });

  revalidatePath(`/admin/${parsed.data.barSlug}/categories`);
  return { success: true };
}

export async function deleteCategory(categoryId: string, barSlug: string) {
  const parsed = z
    .object({
      categoryId: z.string().uuid(),
      barSlug: z.string().min(1).max(80),
    })
    .safeParse({ categoryId, barSlug });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("bar_id, name")
    .eq("id", categoryId)
    .single();
  if (!existing) return { error: "Categoría no encontrada" };

  const auth = await requireBarAccess((existing as { bar_id: string }).bar_id);
  if ("error" in auth) return { error: auth.error };

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("is_active", true);

  if (count && count > 0) {
    await supabase
      .from("products")
      .update({ category_id: null })
      .eq("category_id", categoryId);
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) return { error: "No se pudo eliminar la categoría" };

  await logAudit({
    barId: (existing as { bar_id: string }).bar_id,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "category.deleted",
    entity: "category",
    entityId: categoryId,
    payload: { name: (existing as { name: string }).name, reassigned: count ?? 0 },
  });

  revalidatePath(`/admin/${parsed.data.barSlug}/categories`);
  revalidatePath(`/admin/${parsed.data.barSlug}/menu`);
  return { success: true, reassigned: count ?? 0 };
}

export async function reorderCategories(
  categories: Array<{ id: string; sort_order: number }>,
  barSlug: string
) {
  const parsed = z
    .object({
      categories: z
        .array(
          z.object({
            id: z.string().uuid(),
            sort_order: z.number().int().nonnegative().max(10000),
          })
        )
        .max(50),
      barSlug: z.string().min(1).max(80),
    })
    .safeParse({ categories, barSlug });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const updates = parsed.data.categories.map(({ id, sort_order }) =>
    supabase.from("categories").update({ sort_order }).eq("id", id)
  );

  await Promise.all(updates);
  revalidatePath(`/admin/${parsed.data.barSlug}/categories`);
  return { success: true };
}
