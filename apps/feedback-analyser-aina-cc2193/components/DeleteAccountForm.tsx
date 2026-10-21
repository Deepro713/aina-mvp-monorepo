"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buttonClass, FieldError, inputClass, labelClass, Spinner } from "@/components/kit";
import { apiFetch, toClientError } from "@/lib/api-client";

const DELETE_CONFIRM_WORD = "delete"; // mirrors lib/validation.ts (kept local so zod/schema stay out of the client bundle)

export function DeleteAccountForm() {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = value.trim().toLowerCase() === DELETE_CONFIRM_WORD;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!matches || pending) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch("/api/account", { method: "DELETE", body: JSON.stringify({ confirm: value.trim() }) });
      toast.success("Workspace deleted");
      window.location.assign("/");
    } catch (err) {
      const c = toClientError(err);
      setError(c.fields?.confirm ?? c.message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-md space-y-3">
      <label htmlFor="confirm-delete" className={labelClass}>
        Type <span className="font-mono text-rose-200">{DELETE_CONFIRM_WORD}</span> to confirm
      </label>
      <input id="confirm-delete" type="text" autoComplete="off" value={value}
        onChange={(e) => { setValue(e.target.value); setError(null); }}
        aria-invalid={!!error} aria-describedby="confirm-delete-error" className={inputClass} />
      <FieldError id="confirm-delete-error" message={error} />
      <button type="submit" disabled={!matches || pending} className={buttonClass("danger")}>
        {pending ? <><Spinner /> Deleting…</> : <><Trash2 aria-hidden className="size-4" />Delete my workspace</>}
      </button>
    </form>
  );
}
