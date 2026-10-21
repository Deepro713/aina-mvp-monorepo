type Handler = (req: Request, segment?: { params: Promise<Record<string, string>> }) => Promise<Response>;

export type CallOpts = {
  method?: string;
  path?: string;
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

/** Invoke a Next.js route handler directly with a real Request and parse the JSON body. */
export async function call(handler: Handler, opts: CallOpts = {}) {
  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...opts.headers },
  };
  if (opts.body !== undefined) init.body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  const req = new Request(`http://localhost${opts.path ?? "/"}`, init);
  const res = await handler(req, opts.params ? { params: Promise.resolve(opts.params) } : undefined);
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: res.status, json, text, headers: res.headers };
}
