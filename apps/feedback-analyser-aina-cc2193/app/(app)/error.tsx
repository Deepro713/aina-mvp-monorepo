"use client";

import Link from "next/link";
import { Alert, buttonClass, Card } from "@/components/kit";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="space-y-6">
        <Alert tone="error" title="Something went wrong loading this page.">
          Nothing you saved was lost.{error.digest && <> Reference: <code>{error.digest}</code></>}
        </Alert>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className={buttonClass()}>Try again</button>
          <Link href="/dashboard" className={buttonClass("secondary")}>Go to dashboard</Link>
        </div>
      </Card>
    </div>
  );
}
