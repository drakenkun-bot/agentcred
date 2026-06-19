import type { AllocationRating } from "./types";

export function pctFmt(x: number, digits = 1): string {
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(digits)}%`;
}

export function num(x: number): string {
  return x.toLocaleString("en-US");
}

export function usd(x: number, compact = true): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(x);
}

export function ratingColor(rating: AllocationRating): string {
  switch (rating) {
    case "A":
      return "#22e3c4";
    case "B":
      return "#5ad1ff";
    case "C":
      return "#f4c95d";
    case "D":
      return "#f08a5d";
    case "F":
      return "#f0596d";
  }
}

/** Color ramp for a 0..100 score (red → amber → teal). */
export function scoreColor(score: number): string {
  if (score >= 80) return "#22e3c4";
  if (score >= 68) return "#5ad1ff";
  if (score >= 55) return "#f4c95d";
  if (score >= 42) return "#f08a5d";
  return "#f0596d";
}

export function scoreTextClass(score: number): string {
  if (score >= 80) return "text-glow";
  if (score >= 68) return "text-rate-b";
  if (score >= 55) return "text-rate-c";
  if (score >= 42) return "text-rate-d";
  return "text-rate-f";
}

export function relativeAge(days: number): string {
  if (days < 60) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = now - +new Date(iso);
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
