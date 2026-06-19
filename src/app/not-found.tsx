import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-32 text-center">
      <div className="mono text-6xl font-bold glow-text">404</div>
      <h1 className="mt-4 text-xl font-semibold text-slate-100">Signal lost</h1>
      <p className="mt-2 text-slate-400">
        This agent isn&apos;t in the registry — it may have been deactivated or never existed.
      </p>
      <Link
        href="/leaderboard"
        className="mt-6 rounded-lg border border-glow/30 bg-glow/[0.06] px-4 py-2 text-sm text-glow transition hover:bg-glow/[0.12]"
      >
        Back to the Arena
      </Link>
    </div>
  );
}
