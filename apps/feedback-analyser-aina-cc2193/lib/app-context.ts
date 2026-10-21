import { cache } from "react";
import { getAppContext } from "@/lib/session";

/** Per-request memo: the (app) layout and its page share one auth + connection lookup. */
export const loadAppContext = cache(getAppContext);
