import { bestRegime, worstRegime } from "./regime";
import { deriveBehaviorType, deriveStrengths, deriveWeaknesses, groundingFacts } from "./insights";
import type { AgentDetail, AgentSummary, BehavioralReport, RegimePerformance } from "./types";

// ───────────────────────────────────────────────────────────────────────────
//  OpenRouter client
//
//  Behavioral reports and comparison verdicts are generated live by an LLM via
//  OpenRouter. Configure with OPENROUTER_API_KEY + OPENROUTER_MODEL.
//  Structural facts (behavior type, strengths, weaknesses, best/worst regime)
//  are always derived deterministically so the UI is populated even before /
//  without a live call; the LLM authors the prose narrative on top of them.
// ───────────────────────────────────────────────────────────────────────────

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterNotConfiguredError extends Error {
  constructor() {
    super("OPENROUTER_API_KEY is not set. Add it to .env to generate live AI reports.");
    this.name = "OpenRouterNotConfiguredError";
  }
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

interface ChatOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

async function chat({ system, user, temperature = 0.6, maxTokens = 700, json }: ChatOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new OpenRouterNotConfiguredError();

  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "AgentCred",
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenRouter returned an empty completion.");
  return content;
}

function activeModel(): string {
  return process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4.5";
}

/**
 * Some models (and some OpenRouter providers) ignore `response_format` and wrap
 * JSON in a ```json … ``` markdown fence. Strip it before JSON.parse so the live
 * report path doesn't fall back to the heuristic over a cosmetic wrapper.
 */
function stripCodeFence(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : raw).trim();
}

const REPORT_SYSTEM = `You are AgentCred's lead quantitative analyst. You write concise, professional, Bloomberg-terminal-style assessments of AI trading agents.
Rules:
- Ground every claim ONLY in the supplied metrics. Never invent numbers.
- Be specific and analytical, not promotional. Acknowledge weaknesses honestly.
- The "summary" must be 2-4 sentences of flowing prose describing the agent's behavior, risk posture, and where it performs best/worst.
- Return STRICT JSON only, matching the requested schema.`;

/**
 * Heuristic report used as the deterministic baseline + UI fallback.
 * `generatedBy` is "heuristic"; the route upgrades it to "openrouter" when the
 * LLM call succeeds.
 */
export function heuristicReport(agent: AgentSummary, regime: RegimePerformance[]): BehavioralReport {
  const best = bestRegime(regime);
  const worst = worstRegime(regime);
  const behaviorType = deriveBehaviorType(agent.strategyType, agent.scores, regime);
  const strengths = deriveStrengths(agent.scores, agent.metrics, regime);
  const weaknesses = deriveWeaknesses(agent.scores, agent.metrics, regime);
  const m = agent.metrics;
  const summary =
    `${agent.name} operates as a ${behaviorType.toLowerCase()} running a ${agent.strategyType.toLowerCase()} strategy on ${agent.symbol}. ` +
    `It carries a trust score of ${agent.scores.trust}/100 with ${agent.scores.risk >= 65 ? "disciplined" : "loose"} risk control ` +
    `(${m.maxDrawdownPct}% max drawdown, ${m.sharpeRatio} Sharpe). ` +
    `Performance is strongest in ${best} markets and weakest during ${worst} conditions.`;
  return { summary, strengths, weaknesses, behaviorType, bestRegime: best, worstRegime: worst, generatedBy: "heuristic" };
}

export async function generateBehavioralReport(
  agent: AgentDetail,
): Promise<BehavioralReport> {
  const regime = agent.regimePerformance;
  const base = heuristicReport(agent, regime);

  const user = `Analyze this AI trading agent and return a JSON object.

DATA:
${groundingFacts(agent, regime)}

Pre-computed structural insights you may refine but must stay consistent with:
- behaviorType: ${base.behaviorType}
- candidate strengths: ${base.strengths.join("; ")}
- candidate weaknesses: ${base.weaknesses.join("; ")}

Return JSON with EXACTLY these keys:
{
  "summary": string,            // 2-4 sentence prose assessment
  "behaviorType": string,       // short label, e.g. "Momentum Specialist"
  "strengths": string[],        // 2-4 short bullet phrases
  "weaknesses": string[]        // 2-4 short bullet phrases
}`;

  const raw = await chat({ system: REPORT_SYSTEM, user, json: true, temperature: 0.55 });
  const parsed = JSON.parse(stripCodeFence(raw)) as Partial<BehavioralReport>;

  return {
    summary: typeof parsed.summary === "string" && parsed.summary.length > 0 ? parsed.summary : base.summary,
    behaviorType: parsed.behaviorType || base.behaviorType,
    strengths: Array.isArray(parsed.strengths) && parsed.strengths.length ? parsed.strengths.slice(0, 4) : base.strengths,
    weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length ? parsed.weaknesses.slice(0, 4) : base.weaknesses,
    bestRegime: base.bestRegime,
    worstRegime: base.worstRegime,
    generatedBy: "openrouter",
    model: activeModel(),
  };
}

const VERDICT_SYSTEM = `You are AgentCred's allocation committee analyst. Given two AI trading agents, write a single, balanced verdict paragraph (2-4 sentences) explaining which is the better capital allocation and why, weighing risk-adjusted performance and reliability over raw profit. Ground claims in the provided metrics. Return plain prose, no preamble.`;

export interface ComparisonVerdict {
  verdict: string;
  generatedBy: "openrouter" | "heuristic";
  model?: string;
}

export function heuristicVerdict(a: AgentSummary, b: AgentSummary): string {
  const moreProfit = a.metrics.totalReturnPct >= b.metrics.totalReturnPct ? a : b;
  const lessProfit = moreProfit === a ? b : a;
  const safer = a.scores.risk >= b.scores.risk ? a : b;
  const higherTrust = a.scores.trust >= b.scores.trust ? a : b;
  return (
    `${moreProfit.name} is more profitable (${moreProfit.metrics.totalReturnPct.toFixed(1)}% vs ${lessProfit.metrics.totalReturnPct.toFixed(1)}%), ` +
    `but ${safer.name} demonstrates ${safer === moreProfit ? "comparable or better" : "stronger"} risk control ` +
    `(risk ${safer.scores.risk} vs ${(safer === a ? b : a).scores.risk}). ` +
    `On balance, ${higherTrust.name} carries the higher trust score (${higherTrust.scores.trust} vs ${(higherTrust === a ? b : a).scores.trust}) and is the more dependable capital allocation.`
  );
}

export async function generateComparisonVerdict(
  a: AgentSummary,
  b: AgentSummary,
  regimeA: RegimePerformance[],
  regimeB: RegimePerformance[],
): Promise<ComparisonVerdict> {
  const user = `Compare these two agents and produce the allocation verdict.

AGENT A:
${groundingFacts(a, regimeA)}

AGENT B:
${groundingFacts(b, regimeB)}`;

  const verdict = await chat({ system: VERDICT_SYSTEM, user, temperature: 0.5, maxTokens: 320 });
  return { verdict, generatedBy: "openrouter", model: activeModel() };
}
