import Link from "next/link";
import { MessageSquareText } from "lucide-react";

export function SiteHeader({ nav, mobileNav, children, homeHref = "/" }: {
  nav?: React.ReactNode; mobileNav?: React.ReactNode; children?: React.ReactNode; homeHref?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <Link href={homeHref} className="flex items-center gap-2.5 font-semibold text-white">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25">
            <MessageSquareText aria-hidden className="size-4" />
          </span>
          <span className="hidden sm:inline">Feedback Sentiment Analyser</span>
          <span className="sm:hidden">Feedback Analyser</span>
        </Link>
        {nav}
        <div className="ml-auto flex items-center gap-2">{children}</div>
      </div>
      {mobileNav}
    </header>
  );
}
