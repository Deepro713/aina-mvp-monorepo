// Relative imports: also used by scripts/seed.ts (run via tsx, no path aliases).
import type { Category, LabelField, Sentiment } from "./db/schema";

export const SAMPLE_MODEL_ID = "sample-data";

export type SampleEntry = {
  rawText: string;
  sentiment: Sentiment;
  category: Category;
  summary: string;
  daysAgo: number;
  correction?: { field: LabelField; oldValue: string };
};

export const SAMPLE_FEEDBACK: SampleEntry[] = [
  { daysAgo: 0, sentiment: "negative", category: "pricing_billing",
    rawText: "Checkout charged my card twice for the annual plan. Support says it'll take 5-7 days to refund. Not great.",
    summary: "Customer was double-charged for the annual plan and is unhappy with the refund timeline." },
  { daysAgo: 1, sentiment: "positive", category: "praise",
    rawText: "The new dashboard is so much faster. Our whole team noticed on Monday — thank you!",
    summary: "Customer praises the faster new dashboard, noticed by their whole team." },
  { daysAgo: 1, sentiment: "negative", category: "bug",
    rawText: "CSV export fails with 'Unexpected error' whenever the date range is longer than 90 days.",
    summary: "Customer reports CSV export errors when the date range exceeds 90 days." },
  { daysAgo: 2, sentiment: "neutral", category: "feature_request",
    rawText: "Is there a way to tag entries by product line? We have three apps and want to split the reports.",
    summary: "Customer asks for tagging by product line to split reports across three apps." },
  { daysAgo: 3, sentiment: "mixed", category: "usability",
    rawText: "Love the insights, but I spent 10 minutes looking for the filter. It's hidden behind the gear icon??",
    summary: "Customer likes the insights but found the filter hard to locate behind the gear icon." },
  { daysAgo: 5, sentiment: "positive", category: "support",
    rawText: "Shout out to Priya on your support team — she fixed our SSO setup in one call.",
    summary: "Customer thanks a support agent for resolving their SSO setup in one call." },
  { daysAgo: 6, sentiment: "negative", category: "usability",
    rawText: "Mobile layout is unusable, buttons overlap the table and I can't scroll horizontally.",
    summary: "Customer says the mobile layout is unusable due to overlapping buttons and no horizontal scroll." },
  { daysAgo: 9, sentiment: "negative", category: "pricing_billing",
    rawText: "Price went up 40% at renewal with no warning email. Considering alternatives.",
    summary: "Customer is considering alternatives after an unannounced 40% renewal price increase." },
  { daysAgo: 12, sentiment: "neutral", category: "support",
    rawText: "Opened ticket #4471 three days ago, still no response. Just checking it was received.",
    summary: "Customer asks whether a ticket opened three days ago was received." },
  { daysAgo: 18, sentiment: "positive", category: "feature_request",
    rawText: "Slack integration would make this perfect. Everything else is spot on.",
    summary: "Customer is happy overall and requests a Slack integration." },
  { daysAgo: 24, sentiment: "negative", category: "bug",
    rawText: "Password reset email links are expired by the time they arrive. Happened 3 times today.",
    summary: "Customer reports password reset links arriving already expired, repeatedly.",
    correction: { field: "category", oldValue: "support" } },
  { daysAgo: 41, sentiment: "mixed", category: "other",
    rawText: "Onboarding call was helpful, though honestly we're still deciding whether we need this tool.",
    summary: "Customer found onboarding helpful but is still unsure the tool fits their needs." },
];
