import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { Alert, buttonClass, Card, Orbs } from "@/components/kit";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { loadAppContext } from "@/lib/app-context";
import { log } from "@/lib/log";
import { signOutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let ctx: Awaited<ReturnType<typeof loadAppContext>>;
  try {
    ctx = await loadAppContext();
  } catch (e) {
    log("error", { route: "app.layout", error_name: (e as Error)?.name });
    return <SetupNeeded />;
  }
  if (!ctx.user) redirect("/signin");

  return (
    <>
      <SiteHeader homeHref="/dashboard" nav={<AppNav />} mobileNav={<AppNav mobile />}>
        <ConnectionBadge connection={ctx.connection} />
        <form action={signOutAction}>
          <button type="submit" className={buttonClass("ghost", "sm")} title={`Signed in as ${ctx.user.email}`}>
            <LogOut aria-hidden className="size-4" /><span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </SiteHeader>
      <main className="relative isolate flex-1">
        <Orbs />
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

function SetupNeeded() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <Card className="max-w-lg space-y-4">
          <h1 className="text-xl font-semibold text-white">Almost there: the server isn&apos;t configured yet</h1>
          <Alert tone="warning">
            Sign-in needs a database and auth secrets. Set <code>DATABASE_URL</code>, <code>AUTH_SECRET</code>,{" "}
            <code>RESEND_API_KEY</code> and <code>KEY_ENCRYPTION_SECRET</code>, then run <code>npm run db:migrate</code>.
          </Alert>
          <p className="text-sm text-slate-400">The public pages and <code>/api/health</code> still work in the meantime.</p>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
