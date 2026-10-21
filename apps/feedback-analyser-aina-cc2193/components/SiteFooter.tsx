import Link from "next/link";
import { Github } from "lucide-react";
import { PRODUCT_NAME, REPO_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-slate-950/80">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-semibold text-slate-200">{PRODUCT_NAME}</p>
          <p>Bring your own model. Paste feedback. See what customers are saying.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
            <Github aria-hidden className="size-4" /> GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
