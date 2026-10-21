"use client";

import { useActionState, useEffect, useState } from "react";
import { Mail, MailCheck } from "lucide-react";
import { requestMagicLink, type MagicLinkState } from "@/app/signin/actions";
import { Alert, buttonClass, FieldError, inputClass, labelClass, Spinner } from "@/components/kit";

const RESEND_SECONDS = 60;
type State = MagicLinkState & { at?: number };

export function SignInForm({ initialSent, authError }: { initialSent: boolean; authError?: string }) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (prev, fd) => ({ ...(await requestMagicLink(prev, fd)), at: Date.now() }),
    { status: initialSent ? "sent" : "idle" },
  );
  const [email, setEmail] = useState("");
  const [formFor, setFormFor] = useState<number | undefined>(undefined); // "use a different email" for this send
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = state.at ? Math.max(0, RESEND_SECONDS - Math.floor((now - state.at) / 1000)) : 0;
  const showSent = state.status === "sent" && formFor !== (state.at ?? -1);

  if (showSent) {
    return (
      <div className="text-center" aria-live="polite">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-300">
          <MailCheck aria-hidden className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-white">Check your inbox</h1>
        <p className="mt-2 text-sm text-slate-400">
          {email ? <>We sent a sign-in link to <strong className="text-slate-200">{email}</strong>.</> : "We sent you a sign-in link."}{" "}
          It works once and expires in 10 minutes.
        </p>
        {email && (
          <form action={formAction} className="mt-6">
            <input type="hidden" name="email" value={email} />
            <button type="submit" disabled={remaining > 0 || pending} className={buttonClass("secondary")}>
              {pending ? <><Spinner /> Sending…</> : remaining > 0 ? `Resend link in ${remaining}s` : "Resend link"}
            </button>
          </form>
        )}
        <button type="button" onClick={() => setFormFor(state.at ?? -1)} className="mt-3 text-sm text-indigo-300 hover:text-indigo-200">
          Use a different email
        </button>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : undefined;
  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Sign in with email</h1>
        <p className="mt-1 text-sm text-slate-400">We&apos;ll email you a one-time link. New here? The same link creates your account.</p>
      </div>
      {authError && <Alert tone="error">{authError}</Alert>}
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            id="email" name="email" type="email" required autoComplete="email" autoFocus
            placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error} aria-describedby={error ? "email-error" : undefined}
            className={`${inputClass} h-11 pl-9`}
          />
        </div>
        <FieldError id="email-error" message={error} />
      </div>
      <button type="submit" disabled={pending} className={`${buttonClass("primary", "lg")} w-full`}>
        {pending ? <><Spinner /> Sending link…</> : "Email me a sign-in link"}
      </button>
    </form>
  );
}
