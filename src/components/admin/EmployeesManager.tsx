"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput, validatePassword } from "@/components/ui/password-input";
import {
  createStaffAccount,
  deleteStaffAccount,
  updateStaffEmail,
  updateStaffPassword,
} from "@/actions/staff";
import { toast } from "@/hooks/useToast";
import { Trash2, UserPlus, Mail, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { CredentialsDialog } from "./CredentialsDialog";

interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
}

interface EmployeesManagerProps {
  barId: string;
  barSlug: string;
  staff: StaffMember[];
}

export function EmployeesManager({
  barId,
  barSlug,
  staff,
}: EmployeesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [creating, setCreating] = useState(false);
  const [credModal, setCredModal] = useState<{
    member: StaffMember;
    mode: "email" | "password";
  } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    if (!validatePassword(form.password).isValid) {
      toast({ title: "La contraseña no cumple los requisitos de seguridad", variant: "destructive" });
      return;
    }
    setCreating(true);
    const result = await createStaffAccount({
      barId,
      barSlug,
      email: form.email,
      password: form.password,
      fullName: form.fullName || undefined,
    });
    setCreating(false);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Empleado creado", variant: "success" });
      setForm({ email: "", password: "", fullName: "" });
      router.refresh();
    }
  };

  const handleDelete = (staffId: string) => {
    startTransition(async () => {
      const result = await deleteStaffAccount(staffId, barId, barSlug);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Empleado eliminado", variant: "success" });
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Current staff list */}
      <div className="rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Empleados actuales</h2>
          <p className="text-sm text-muted-foreground">
            Acceso a pedidos únicamente — sin acceso a análisis ni configuración
          </p>
        </div>
        {staff.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No hay empleados registrados
          </div>
        ) : (
          <div className="divide-y">
            {staff.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-4 py-3 gap-2"
              >
                <div className="min-w-0 flex-1">
                  {member.full_name && (
                    <p className="text-sm font-medium truncate">
                      {member.full_name}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Cambiar email"
                    onClick={() => setCredModal({ member, mode: "email" })}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Cambiar contraseña"
                    onClick={() => setCredModal({ member, mode: "password" })}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Eliminar empleado"
                    onClick={() => handleDelete(member.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create new staff */}
      <div className="rounded-xl border">
        <div className="p-4 border-b flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <h2 className="font-semibold">Añadir empleado</h2>
        </div>
        <form onSubmit={handleCreate} className="p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre</Label>
              <Input
                id="fullName"
                placeholder="Juan García"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan@bar.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="password">Contraseña *</Label>
            <PasswordInput
              id="password"
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            />
          </div>
          <Button
            type="submit"
            disabled={creating || !validatePassword(form.password).isValid}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {creating ? "Creando..." : "Crear empleado"}
          </Button>
        </form>
      </div>

      {credModal && (
        <CredentialsDialog
          open={true}
          onClose={() => setCredModal(null)}
          mode={credModal.mode}
          targetLabel={credModal.member.full_name ?? credModal.member.email}
          currentEmail={credModal.member.email}
          successMessage={
            credModal.mode === "email"
              ? "Email actualizado"
              : "Contraseña actualizada"
          }
          onSubmit={async (value) => {
            if (credModal.mode === "email") {
              return updateStaffEmail({
                staffId: credModal.member.id,
                barId,
                barSlug,
                newEmail: value,
              });
            }
            return updateStaffPassword({
              staffId: credModal.member.id,
              barId,
              barSlug,
              newPassword: value,
            });
          }}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
