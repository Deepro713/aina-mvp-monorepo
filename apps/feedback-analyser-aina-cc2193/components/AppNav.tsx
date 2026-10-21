"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Plug, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/analyze", label: "Analyze", icon: Sparkles },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/connect", label: "Connect", icon: Plug },
  { href: "/account", label: "Account", icon: UserRound },
];

export function AppNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className={mobile ? "flex gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden" : "hidden items-center gap-1 md:flex"}
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href} href={href} aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon aria-hidden className="size-4" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
