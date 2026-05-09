"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireBarAccess } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

const productInputSchema = z.object({
  barId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  price: z.number().nonnegative().max(9999),
  imageUrl: z.string().max(2000).optional(),
  sortOrder: z.number().int().nonnegative().max(10000).optional(),
});

interface ProductInput {
  barId: string;
  categoryId?: string | null;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  sortOrder?: number;
}

export async function createProduct(input: ProductInput, barSlug: string) {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireBarAccess(parsed.data.barId);
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("products")
    .insert({
      bar_id: parsed.data.barId,
      category_id: parsed.data.categoryId || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      image_url: parsed.data.imageUrl || null,
      in_stock: true,
      is_active: true,
      sort_order: parsed.data.sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error) return { error: "No se pudo crear el producto" };

  if (created) {
    await logAudit({
      barId: parsed.data.barId,
      actorId: auth.ctx.userId,
      actorRole: auth.ctx.role,
      action: "product.created",
      entity: "product",
      entityId: (created as { id: string }).id,
      payload: { name: parsed.data.name },
    });
  }

  revalidatePath(`/admin/${barSlug}/menu`);
  return { success: true };
}

const updateProductSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  price: z.number().nonnegative().max(9999).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().max(2000).nullable().optional(),
  inStock: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function updateProduct(
  productId: string,
  input: Partial<ProductInput> & { inStock?: boolean; isActive?: boolean },
  barSlug: string
) {
  const idCheck = z.string().uuid().safeParse(productId);
  if (!idCheck.success) return { error: "ID inválido" };

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("products")
    .select("bar_id")
    .eq("id", productId)
    .single();
  if (!existing) return { error: "Producto no encontrado" };

  const auth = await requireBarAccess((existing as { bar_id: string }).bar_id);
  if ("error" in auth) return { error: auth.error };

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    updateData.description = parsed.data.description;
  if (parsed.data.price !== undefined) updateData.price = parsed.data.price;
  if (parsed.data.categoryId !== undefined)
    updateData.category_id = parsed.data.categoryId;
  if (parsed.data.imageUrl !== undefined)
    updateData.image_url = parsed.data.imageUrl;
  if (parsed.data.inStock !== undefined) updateData.in_stock = parsed.data.inStock;
  if (parsed.data.isActive !== undefined) updateData.is_active = parsed.data.isActive;

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) return { error: "No se pudo actualizar el producto" };

  await logAudit({
    barId: (existing as { bar_id: string }).bar_id,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "product.updated",
    entity: "product",
    entityId: productId,
    payload: updateData,
  });

  revalidatePath(`/admin/${barSlug}/menu`);
  return { success: true };
}

export async function toggleProductStock(
  productId: string,
  inStock: boolean,
  barSlug: string
) {
  return updateProduct(productId, { inStock }, barSlug);
}

const toggleCategoryStockSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  inStock: z.boolean(),
  barId: z.string().uuid(),
  barSlug: z.string().min(1).max(80),
});

export async function toggleCategoryStock(
  categoryId: string | null,
  inStock: boolean,
  barId: string,
  barSlug: string
) {
  const parsed = toggleCategoryStockSchema.safeParse({
    categoryId,
    inStock,
    barId,
    barSlug,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireBarAccess(parsed.data.barId);
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();

  let query = supabase
    .from("products")
    .update({ in_stock: parsed.data.inStock })
    .eq("bar_id", parsed.data.barId)
    .eq("is_active", true);

  if (parsed.data.categoryId === null) {
    query = query.is("category_id", null);
  } else {
    query = query.eq("category_id", parsed.data.categoryId);
  }

  const { error } = await query;
  if (error) return { error: "No se pudo actualizar el stock" };

  revalidatePath(`/admin/${parsed.data.barSlug}/menu`);
  return { success: true };
}

export async function deleteProduct(productId: string, barSlug: string) {
  const idCheck = z.string().uuid().safeParse(productId);
  if (!idCheck.success) return { error: "ID inválido" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("products")
    .select("bar_id, name")
    .eq("id", productId)
    .single();
  if (!existing) return { error: "Producto no encontrado" };

  const auth = await requireBarAccess((existing as { bar_id: string }).bar_id);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", productId);

  if (error) return { error: "No se pudo eliminar el producto" };

  await logAudit({
    barId: (existing as { bar_id: string }).bar_id,
    actorId: auth.ctx.userId,
    actorRole: auth.ctx.role,
    action: "product.deleted",
    entity: "product",
    entityId: productId,
    payload: { name: (existing as { name: string }).name },
  });

  revalidatePath(`/admin/${barSlug}/menu`);
  return { success: true };
}

export async function uploadProductImage(
  formData: FormData,
  barId: string
): Promise<{ url?: string; error?: string }> {
  const auth = await requireBarAccess(barId);
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No se proporcionó archivo" };
  if (file.size > 5 * 1024 * 1024) return { error: "Imagen demasiado grande (máx 5 MB)" };
  if (!/^image\//.test(file.type)) return { error: "El archivo no es una imagen" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${barId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true });

  if (error) return { error: "Error al subir la imagen" };

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return { url: data.publicUrl };
}
