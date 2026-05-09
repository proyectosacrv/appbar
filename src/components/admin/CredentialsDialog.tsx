"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput, validatePassword } from "@/components/ui/password-input";
import { toast } from "@/hooks/useToast";

type Mode = "email" | "password";

interface CredentialsDialogProps {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  /** Friendly label for the target account, e.g. "Juan García" or the email */
  targetLabel: string;
  /** Current value (email only — used as placeholder hint) */
  currentEmail?: string;
  /** Server action that performs the change. Must return { success?: boolean; error?: string } */
  onSubmit: (
    value: string
  ) => Promise<{ success?: boolean; error?: string } | undefined>;
  /** Toast title shown on success */
  successMessage: string;
  /** Optional callback after success (e.g. router.refresh) */
  onSuccess?: () => void;
}

export function CredentialsDialog({
  open,
  onClose,
  mode,
  targetLabel,
  currentEmail,
  onSubmit,
  successMessage,
  onSuccess,
}: CredentialsDialogProps) {
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue("");
      setConfirm("");
      setSaving(false);
    }
  }, [open]);

  const isEmail = mode === "email";
  const passwordCheck = !isEmail ? validatePassword(value) : null;
  const valid = isEmail
    ? /\S+@\S+\.\S+/.test(value) && value !== currentEmail
    : passwordCheck?.isValid && value === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    const result = await onSubmit(value);
    setSaving(false);
    if (result?.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }
    toast({ title: successMessage, variant: "success" });
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEmail ? "Cambiar email" : "Cambiar contraseña"}
          </DialogTitle>
          <DialogDescription>{targetLabel}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {isEmail ? (
            <div className="space-y-2">
              <Label htmlFor="cred-email">Nuevo email</Label>
              <Input
                id="cred-email"
                type="email"
                placeholder={currentEmail ?? "nuevo@email.com"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                autoFocus
              />
              {currentEmail && value === currentEmail && (
                <p className="text-xs text-amber-600">
                  El nuevo email es igual al actual.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="cred-pw">Nueva contraseña</Label>
                <PasswordInput
                  id="cred-pw"
                  value={value}
                  onChange={(v) => setValue(v)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cred-pw2">Confirmar contraseña</Label>
                <PasswordInput
                  id="cred-pw2"
                  value={confirm}
                  onChange={(v) => setConfirm(v)}
                />
                {confirm && value !== confirm && (
                  <p className="text-xs text-destructive">
                    Las contraseñas no coinciden.
                  </p>
                )}
              </div>
            </>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!valid || saving}
          >
            {saving
              ? isEmail
                ? "Cambiando..."
                : "Guardando..."
              : isEmail
                ? "Cambiar email"
                : "Guardar contraseña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
