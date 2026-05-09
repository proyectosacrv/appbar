import { createAdminClient } from "@/lib/supabase/server";

export type AuditAction =
  | "order.created"
  | "order.edited"
  | "order.status_advanced"
  | "order.status_reverted"
  | "order.deleted"
  | "session.cobrada"
  | "session.deleted"
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "category.created"
  | "category.updated"
  | "category.deleted"
  | "bar.settings_updated"
  | "bar.activated"
  | "bar.suspended"
  | "bar.owner_email_changed"
  | "bar.owner_password_reset"
  | "staff.created"
  | "staff.deleted"
  | "staff.email_changed"
  | "staff.password_reset";

interface AuditEntry {
  barId: string;
  actorId: string | null;
  actorRole: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Records a sensitive operation in audit_log.
 * Failures are logged but never throw — auditing must not break the action.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = await createAdminClient();
    await admin.from("audit_log").insert({
      bar_id: entry.barId,
      actor_id: entry.actorId,
      actor_role: entry.actorRole,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      payload: (entry.payload ?? null) as Record<string, unknown> | null,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[audit] log failed", e);
  }
}
