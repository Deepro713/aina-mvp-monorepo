import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { notFound } from "@/lib/api/errors";
import { apiRoute, parseInput, readJson, requireUserId } from "@/lib/api/http";
import { getDb } from "@/lib/db/client";
import { feedbackEntries as fe, labelCorrections, LABEL_FIELDS } from "@/lib/db/schema";
import { getEntry, isUuid, toEntryDto } from "@/lib/queries";
import { entryPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const PATCH = apiRoute<{ id: string }>("entries.patch", async (ctx) => {
  const userId = await requireUserId(ctx);
  const patch = parseInput(entryPatchSchema, await readJson(ctx.req));
  const existing = await getEntry(userId, ctx.params.id); // 404 for not-owned too
  if (!existing) throw notFound();

  const changed = LABEL_FIELDS.filter((f) => patch[f] !== undefined && patch[f] !== existing[f]);
  if (changed.length === 0) return NextResponse.json(toEntryDto(existing)); // no-op → 0 corrections

  const now = new Date();
  const set: Partial<typeof fe.$inferInsert> = { updatedAt: now };
  if (changed.includes("sentiment")) set.sentiment = patch.sentiment;
  if (changed.includes("category")) set.category = patch.category;

  const db = getDb();
  // neon-http batch runs as one transaction: label update + correction log land together.
  const [updatedRows] = await db.batch([
    db.update(fe).set(set).where(and(eq(fe.id, existing.id), eq(fe.userId, userId))).returning(),
    db.insert(labelCorrections).values(changed.map((field) => ({
      userId,
      entryId: existing.id,
      field,
      oldValue: existing[field],
      newValue: patch[field]!,
      createdAt: now,
    }))),
  ]);
  ctx.log.corrections = changed.length;
  return NextResponse.json(toEntryDto(updatedRows[0]));
}, { mutating: true });

export const DELETE = apiRoute<{ id: string }>("entries.delete", async (ctx) => {
  const userId = await requireUserId(ctx);
  if (!isUuid(ctx.params.id)) throw notFound();
  // label_corrections.entry_id is ON DELETE SET NULL, so the correction-rate metric survives.
  const deleted = await getDb()
    .delete(fe)
    .where(and(eq(fe.id, ctx.params.id), eq(fe.userId, userId)))
    .returning({ id: fe.id });
  if (deleted.length === 0) throw notFound();
  return new NextResponse(null, { status: 204 });
}, { mutating: true });
