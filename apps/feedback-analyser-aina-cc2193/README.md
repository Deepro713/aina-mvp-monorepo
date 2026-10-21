# feedback-analyser-aina

**Feedback Sentiment Analyser.** Connect your own language model, paste customer feedback, and get each entry labelled with a sentiment, a category and a short summary. Entries are saved to Postgres. The dashboard shows the sentiment and category breakdown and the latest entries.

- **Bring your own model:** OpenAI, Anthropic, Gemini, or any OpenAI-compatible HTTPS endpoint, including Ollama on a public URL. `localhost` is not supported.
- **Fixed labels:** sentiment is one of `positive | neutral | negative | mixed`. Category is one of `bug | feature_request | pricing_billing | usability | support | praise | other`.
- **Batch paste:** up to 25 entries at a time, analysed 3 at once in the browser.
- **Label corrections:** every edit is logged so you can measure how accurate the model is.

## Stack

Next.js 16 (App Router, TypeScript, Node 22) · React 19 · shadcn/ui on Tailwind v4 · Neon Postgres via Drizzle ORM · Auth.js v5 magic links via Resend · Vercel AI SDK 5 · zod 4 · Vercel Pro hosting.

## Quickstart

```bash
git clone <repo> feedback-analyser-aina && cd feedback-analyser-aina
nvm use                      # Node 22
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev                  # http://localhost:3000
