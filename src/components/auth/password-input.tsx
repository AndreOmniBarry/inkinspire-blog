"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";
import { passwordStrength } from "@/lib/password-policy";

export function PasswordInput({
  id,
  name,
  autoComplete,
  showStrength = false,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  showStrength?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const score = passwordStrength(value);
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === "new-password" ? 10 : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, showStrength ? `${id}-strength` : null].filter(Boolean).join(" ") || undefined}
          className="field pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:text-ink"
        >
          {visible ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
        </button>
      </div>
      {showStrength && (
        <div id={`${id}-strength`} className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={clsx("h-1 flex-1 rounded-full transition-colors", value && i < score ? (score <= 1 ? "bg-danger" : score === 2 ? "bg-warning" : "bg-success") : "bg-rule")} />
            ))}
          </div>
          <p className="mt-1.5 text-step-n2 text-ink-muted">
            {value ? `${labels[score]}. ` : ""}At least 10 characters. A short sentence you’ll remember is ideal.
          </p>
        </div>
      )}
    </div>
  );
}
