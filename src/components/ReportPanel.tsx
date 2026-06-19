"use client";

import { useState } from "react";
import type { BehavioralReport } from "@/lib/types";

export function ReportPanel({
  agentId,
  initial,
}: {
  agentId: string;
  initial: BehavioralReport;
}) {
  const [report, setReport] = useState<BehavioralReport>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = report.generatedBy === "openrouter";

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/report?refresh=1`, { method: "POST" });
      const data = await res.json();
      if (data.report) setReport(data.report as BehavioralReport);
      if (!res.ok) {
        setError(data.hint || data.detail || data.error || "Failed to generate report.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`chip ${
            isLive ? "border-glow/30 text-glow" : "border-white/10 text-slate-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-glow animate-pulse-glow" : "bg-slate-500"}`} />
          {isLive ? `AI · ${report.model ?? "OpenRouter"}` : "Baseline (deterministic)"}
        </span>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-glow/30 bg-glow/[0.06] px-3 py-1.5 text-xs font-medium text-glow transition hover:bg-glow/[0.12] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner /> Analyzing…
            </>
          ) : (
            <>✦ {isLive ? "Regenerate" : "Generate AI report"}</>
          )}
        </button>
      </div>

      <p className="text-[15px] leading-relaxed text-slate-300">{report.summary}</p>

      {error && (
        <p className="mt-3 rounded-lg border border-rate-c/20 bg-rate-c/[0.06] px-3 py-2 text-xs text-rate-c">
          {error}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
