import { NextResponse } from "next/server";
import { apiRoute, parseInput, requireUserId, searchParams } from "@/lib/api/http";
import { listEntries } from "@/lib/queries";
import { entriesQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute("entries.list", async (ctx) => {
  const userId = await requireUserId(ctx);
  const q = parseInput(entriesQuerySchema, searchParams(ctx.req));
  return NextResponse.json(await listEntries(userId, q));
});
