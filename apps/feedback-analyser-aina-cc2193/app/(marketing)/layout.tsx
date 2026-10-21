import Link from "next/link";
import Script from "next/script";
import { buttonClass } from "@/components/kit";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

// Plausible loads ONLY on public marketing pages (PRD requirement).
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <>
      {domain ? (
        <Script defer data-domain={domain} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
      ) : null}
      <SiteHeader
        nav={
          <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
            <Link href="/#how" className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-white">How it works</Link>
            <Link href="/privacy" className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-white">Privacy</Link>
          </nav>
        }
      >
        <Link href="/dashboard" className={buttonClass("primary", "sm")}>Open the app</Link>
      </SiteHeader>
      <main className="relative isolate flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
