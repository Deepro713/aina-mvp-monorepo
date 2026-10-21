import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { Alert, Card, Orbs } from "@/components/kit";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { loadAppContext } from "@/lib/app-context";
import { log } from "@/lib/log";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let ctx: Awaited<ReturnType<typeof loadAppContext>>;
  try {
    ctx = await loadAppContext();
  } catch (e) {
    log("error", { route: "app.layout", error_name: (e as Error)?.name });
    return <SetupNeeded />;
  }
  // proxy.ts always issues the workspace cookie for app routes; this is only a safety net.
  if (!ctx.user) redirect("/");

  return (
    <>
      <SiteHeader homeHref="/dashboard" nav={<AppNav />} mobileNav={<AppNav mobile />}>
        <ConnectionBadge connection={ctx.connection} />
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
            The app needs a database and an encryption secret. Set <code>DATABASE_URL</code> and{" "}
            <code>KEY_ENCRYPTION_SECRET</code>, then run <code>npm run db:migrate</code>.
          </Alert>
          <p className="text-sm text-slate-400">The public pages and <code>/api/health</code> still work in the meantime.</p>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
