import Link from "next/link";
import type { AllocationRating } from "@/lib/types";
import { ratingColor, scoreColor } from "@/lib/format";

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`panel ${className}`}>{children}</div>;
}

export function SectionTitle({
  kicker,
  title,
  right,
}: {
  kicker?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {kicker && <div className="stat-label mb-1 text-glow/70">{kicker}</div>}
        <h2 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

export function RatingBadge({
  rating,
  size = "md",
}: {
  rating: AllocationRating;
  size?: "sm" | "md" | "lg";
}) {
  const color = ratingColor(rating);
  const dims =
    size === "lg" ? "h-12 w-12 text-2xl" : size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg";
  return (
    <span
      className={`inline-flex ${dims} items-center justify-center rounded-lg font-bold mono`}
      style={{
        color,
        background: `${color}14`,
        boxShadow: `inset 0 0 0 1px ${color}55, 0 0 18px -6px ${color}`,
      }}
    >
      {rating}
    </span>
  );
}

export function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = scoreColor(score);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <span className="mono text-sm font-semibold" style={{ color }}>
          {Math.round(score)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color, boxShadow: `0 0 12px -2px ${color}` }}
        />
      </div>
    </div>
  );
}

export function TrustOrb({ score, size = 84 }: { score: number; size?: number }) {
  const color = scoreColor(score);
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="mono text-xl font-bold" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-slate-500">Trust</span>
      </div>
    </div>
  );
}

export function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

export function ButtonLink({
  href,
  children,
  variant = "ghost",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "ghost" | "solid";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all";
  const styles =
    variant === "solid"
      ? "bg-glow text-ink-950 hover:bg-glow-soft shadow-glow"
      : "border border-white/10 text-slate-200 hover:border-glow/40 hover:text-glow";
  return (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}
