export function StrengthsWeaknesses({
  strengths,
  weaknesses,
}: {
  strengths: string[];
  weaknesses: string[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-glow/20 bg-glow/[0.04] p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-glow">
          <span className="text-base">✓</span> Strengths
        </h4>
        <ul className="space-y-2">
          {strengths.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <span className="mt-0.5 text-glow">▸</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-rate-f/20 bg-rate-f/[0.04] p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rate-f">
          <span className="text-base">!</span> Weaknesses
        </h4>
        <ul className="space-y-2">
          {weaknesses.map((w, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <span className="mt-0.5 text-rate-f">▸</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
