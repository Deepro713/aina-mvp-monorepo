const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendMagicLinkEmail(opts: { to: string; url: string; from: string; apiKey: string }) {
  const minutes = Math.round(Number(process.env.MAGIC_LINK_MAX_AGE_SECONDS ?? 600) / 60);
  const safeUrl = escapeHtml(opts.url);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: "Your sign-in link for Feedback Sentiment Analyser",
      text: `Sign in: ${opts.url}\n\nThis link works once and expires in ${minutes} minutes. If you didn't request it, ignore this email.`,
      html: `<p>Click to sign in to <strong>Feedback Sentiment Analyser</strong>:</p>
<p><a href="${safeUrl}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Sign in</a></p>
<p style="color:#64748b;font-size:13px">This link works once and expires in ${minutes} minutes. If you didn't request it, ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend send failed with status ${res.status}`);
}
