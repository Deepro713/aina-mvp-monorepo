import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass, Card, Orbs } from "@/components/kit";
import { SignInForm } from "@/components/SignInForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Sign in · Feedback Sentiment Analyser" };

const AUTH_ERRORS: Record<string, string> = {
  Verification: "That sign-in link has expired or was already used. Request a new one below.",
  default: "We couldn't sign you in. Request a new link below.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <>
      <SiteHeader>
        <Link href="/" className={buttonClass("ghost", "sm")}>Back to home</Link>
      </SiteHeader>
      <main className="relative isolate flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
        <Orbs />
        <div className="w-full max-w-md">
          <Card>
            <SignInForm initialSent={sent === "1"} authError={error ? AUTH_ERRORS[error] ?? AUTH_ERRORS.default : undefined} />
          </Card>
          <p className="mt-6 text-center text-xs text-slate-500">
            No password needed. By signing in you agree to the{" "}
            <Link href="/terms" className="underline hover:text-slate-300">Terms</Link> and{" "}
            <Link href="/privacy" className="underline hover:text-slate-300">Privacy</Link> notice.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
