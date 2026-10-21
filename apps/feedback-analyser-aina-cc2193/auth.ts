import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/lib/db/client";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { sendMagicLinkEmail } from "@/lib/email";
import { config } from "@/lib/env";
import { consumeMagicLinkQuota } from "@/lib/rate-limit";

export class MagicLinkRateLimitError extends Error {
  constructor() { super("Magic link rate limit exceeded"); this.name = "MagicLinkRateLimitError"; }
}

// Lazy config: the adapter (and DB) is only touched when an auth call actually happens.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
      maxAge: config.magicLinkMaxAgeSeconds, // single-use + 10 min; Auth.js stores tokens hashed
      async sendVerificationRequest({ identifier, url, provider }) {
        if (!(await consumeMagicLinkQuota(identifier))) throw new MagicLinkRateLimitError();
        await sendMagicLinkEmail({ to: identifier, url, from: provider.from ?? "", apiKey: provider.apiKey ?? "" });
      },
    }),
  ],
  session: { strategy: "database", maxAge: 30 * 24 * 3600, updateAge: 24 * 3600 },
  pages: { signIn: "/signin", verifyRequest: "/signin?sent=1", error: "/signin" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  trustHost: true,
}));
