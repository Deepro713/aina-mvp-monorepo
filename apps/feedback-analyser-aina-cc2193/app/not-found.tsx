import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonClass, Card, Orbs } from "@/components/kit";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="relative isolate flex flex-1 items-center justify-center px-4 py-24">
        <Orbs />
        <Card className="max-w-md text-center">
          <Compass aria-hidden className="mx-auto size-10 text-indigo-300" />
          <p className="mt-4 text-sm font-medium text-indigo-300">404</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">This page doesn&apos;t exist</h1>
          <p className="mt-2 text-sm text-slate-400">The link may be old, or the entry may have been deleted.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/dashboard" className={buttonClass()}>Go to dashboard</Link>
            <Link href="/" className={buttonClass("secondary")}>Home</Link>
          </div>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
