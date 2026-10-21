import { NextResponse } from "next/server";
import { apiRoute, parseInput, requireUserId, searchParams } from "@/lib/api/http";
import { getStats } from "@/lib/queries";
import { rangeQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute("stats", async (ctx) => {
  const userId = await requireUserId(ctx);
  const { range } = parseInput(rangeQuerySchema, searchParams(ctx.req));
  return NextResponse.json(await getStats(userId, range));
});
