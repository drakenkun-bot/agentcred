import { scoreColor } from "@/lib/format";

// Deterministic crystalline identicon for an agent, seeded by name. Echoes the
// glowing polyhedron nodes in the hero constellation.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function AgentGlyph({
  seed,
  trust,
  size = 32,
}: {
  seed: string;
  trust: number;
  size?: number;
}) {
  const h = hash(seed);
  const color = scoreColor(trust);
  const sides = 3 + (h % 4); // triangle..hexagon
  const rot = (h >> 3) % 360;
  const cx = 16;
  const cy = 16;
  const r = 11;
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const ang = (i / sides) * Math.PI * 2 + (rot * Math.PI) / 180;
    pts.push(`${cx + Math.cos(ang) * r},${cy + Math.sin(ang) * r}`);
  }
  const inner: string[] = [];
  for (let i = 0; i < sides; i++) {
    const ang = (i / sides) * Math.PI * 2 + (rot * Math.PI) / 180 + Math.PI / sides;
    inner.push(`${cx + Math.cos(ang) * r * 0.5},${cy + Math.sin(ang) * r * 0.5}`);
  }

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
      <circle cx={cx} cy={cy} r={15} fill={`${color}12`} stroke={`${color}40`} strokeWidth={1} />
      <polygon
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        opacity={0.95}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      <polygon points={inner.join(" ")} fill={color} opacity={0.5} />
    </svg>
  );
}
