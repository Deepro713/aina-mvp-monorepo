// Type-only re-exports so client components never pull server modules into the bundle.
import type { toConnectionDto } from "@/lib/connection";

export type ConnectionDto = ReturnType<typeof toConnectionDto>;
export type { EntryDto } from "@/lib/queries";
