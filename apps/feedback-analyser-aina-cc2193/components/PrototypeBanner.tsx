import { REPO_URL } from "@/lib/site";

// Required on every page; intentionally not dismissable while the app is V0.
export function PrototypeBanner() {
  return (
    <div className="bg-gradient-to-r from-fuchsia-600/95 to-indigo-600/95 px-4 py-2 text-center text-[12.5px] text-white">
      <strong>Prototype · Base template</strong> · To extend,{" "}
      <a href={`${REPO_URL}/issues/new?title=%40claude+`} className="font-semibold underline" target="_blank" rel="noreferrer">
        open a GitHub issue
      </a>{" "}
      starting with <code className="rounded bg-white/10 px-1">@claude</code> · The repo runs an autonomous AI agent that
      opens PRs as you ask for features
    </div>
  );
}
