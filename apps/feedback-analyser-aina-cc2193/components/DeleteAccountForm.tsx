"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buttonClass, FieldError, inputClass, labelClass, Spinner } from "@/components/kit";
import { apiFetch, toClientError } from "@/lib/api-client";

export function DeleteAccountForm({ email }: { email: string }) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = value.trim().toLowerCase() === email.toLowerCase();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!matches || pending) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch("/api/account", { method: "DELETE", body: JSON.stringify({ confirm_email: value.trim() }) });
      toast.success("Account deleted");
      window.location.assign("/");
    } catch (err) {
      const c = toClientError(err);
      setError(c.fields?.confirm_email ?? c.message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-md space-y-3">
      <label htmlFor="confirm-email" className={labelClass}>
        Type <span className="font-mono text-rose-200">{email}</span> to confirm
      </label>
      <input id="confirm-email" type="email" autoComplete="off" value={value}
        onChange={(e) => { setValue(e.target.value); setError(null); }}
        aria-invalid={!!error} aria-describedby="confirm-email-error" className={inputClass} />
      <FieldError id="confirm-email-error" message={error} />
      <button type="submit" disabled={!matches || pending} className={buttonClass("danger")}>
        {pending ? <><Spinner /> Deleting…</> : <><Trash2 aria-hidden className="size-4" />Delete my account</>}
      </button>
    </form>
  );
}
