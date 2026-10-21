import { z } from "zod";
import { CATEGORIES, PROVIDERS, SENTIMENTS } from "@/lib/db/schema";

export const RANGES = ["7d", "30d", "all"] as const;
export type Range = (typeof RANGES)[number];

export const rangeQuerySchema = z.object({ range: z.enum(RANGES).default("all") });

export const entriesQuerySchema = z.object({
  range: z.enum(RANGES).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(200).optional(),
});

const connectionFields = {
  provider: z.enum(PROVIDERS),
  model_id: z.string().trim().min(1, "Enter a model ID.").max(200),
  base_url: z.string().trim().max(2048).nullish(),
  api_key: z.string().trim().max(1000).nullish(),
};

export const connectionPutSchema = z.object({ ...connectionFields, test_token: z.string().max(300).optional() });
// Every field optional: missing ones fall back to the saved connection.
export const connectionTestSchema = z.object(connectionFields).partial();

export const analyzeSchema = z.object({
  raw_text: z.string().trim().min(1, "Paste some feedback first."),
});

export const entryPatchSchema = z
  .strictObject({
    sentiment: z.enum(SENTIMENTS).optional(),
    category: z.enum(CATEGORIES).optional(),
  })
  .refine((v) => v.sentiment !== undefined || v.category !== undefined, {
    message: "Provide sentiment and/or category.",
  });

export const DELETE_CONFIRM_WORD = "delete";

export const accountDeleteSchema = z.object({
  confirm: z.string().trim().min(1, `Type "${DELETE_CONFIRM_WORD}" to confirm.`),
});
