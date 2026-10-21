import Link from "next/link";
import { ArrowRight, Plug } from "lucide-react";
import { buttonClass, Card } from "@/components/kit";

export function ConnectCard() {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-300">
        <Plug aria-hidden className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">Connect a model to start</h2>
      <p className="mt-2 text-sm text-slate-400">
        Feedback is analyzed by the language model you connect: OpenAI, Anthropic, Gemini, or your own OpenAI-compatible endpoint.
      </p>
      <Link href="/connect" className={`${buttonClass()} mt-6`}>Connect a model <ArrowRight aria-hidden className="size-4" /></Link>
    </Card>
  );
}
