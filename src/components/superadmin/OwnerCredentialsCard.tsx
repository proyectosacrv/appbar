"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CredentialsDialog } from "@/components/admin/CredentialsDialog";
import {
  updateBarOwnerEmail,
  updateBarOwnerPassword,
} from "@/actions/bars";

interface OwnerCredentialsCardProps {
  barId: string;
  barName: string;
  ownerEmail: string;
}

export function OwnerCredentialsCard({
  barId,
  barName,
  ownerEmail,
}: OwnerCredentialsCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "password" | null>(null);

  return (
    <>
      <div className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Credenciales del dueño</h2>
          <p className="text-xs text-muted-foreground">
            Cambia el email o la contraseña con la que el dueño accede a su
            panel. Los cambios son inmediatos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setMode("email")}
          >
            <Mail className="h-4 w-4" />
            Cambiar email
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setMode("password")}
          >
            <KeyRound className="h-4 w-4" />
            Cambiar contraseña
          </Button>
        </div>
      </div>

      {mode && (
        <CredentialsDialog
          open={true}
          onClose={() => setMode(null)}
          mode={mode}
          targetLabel={`${barName} — dueño`}
          currentEmail={ownerEmail}
          successMessage={
            mode === "email"
              ? "Email del dueño actualizado"
              : "Contraseña del dueño actualizada"
          }
          onSubmit={async (value) => {
            if (mode === "email") {
              return updateBarOwnerEmail({ barId, newEmail: value });
            }
            return updateBarOwnerPassword({ barId, newPassword: value });
          }}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}
