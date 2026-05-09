"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordValidation {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
}

export function validatePassword(password: string): PasswordValidation & { isValid: boolean } {
  const checks: PasswordValidation = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(password),
  };
  return { ...checks, isValid: Object.values(checks).every(Boolean) };
}

const REQUIREMENTS = [
  { key: "length" as keyof PasswordValidation, label: "Mínimo 8 caracteres" },
  { key: "uppercase" as keyof PasswordValidation, label: "Una letra mayúscula (A-Z)" },
  { key: "lowercase" as keyof PasswordValidation, label: "Una letra minúscula (a-z)" },
  { key: "number" as keyof PasswordValidation, label: "Un número (0-9)" },
  { key: "symbol" as keyof PasswordValidation, label: "Un símbolo (!@#$%...)" },
] as const;

interface PasswordInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showRequirements?: boolean;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "Contraseña",
  showRequirements = true,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const validation = validatePassword(value);
  const touched = value.length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showRequirements && touched && (
        <ul className="space-y-1">
          {REQUIREMENTS.map(({ key, label }) => (
            <li
              key={key}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                validation[key] ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {validation[key] ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : (
                <X className="h-3 w-3 shrink-0" />
              )}
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
