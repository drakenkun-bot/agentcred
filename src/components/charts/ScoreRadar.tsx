"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { ScoreBreakdown } from "@/lib/types";

const AXES: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: "performance", label: "Performance" },
  { key: "risk", label: "Risk Control" },
  { key: "consistency", label: "Consistency" },
  { key: "adaptability", label: "Adaptability" },
  { key: "survival", label: "Survival" },
];

export interface RadarSeries {
  name: string;
  color: string;
  scores: ScoreBreakdown;
}

// Pentagon "risk-return polyhedron" from the sketch. Supports overlaying two
// agents for comparison.
export function ScoreRadar({ series, height = 280 }: { series: RadarSeries[]; height?: number }) {
  const data = AXES.map(({ key, label }) => {
    const row: Record<string, number | string> = { axis: label };
    series.forEach((s) => {
      row[s.name] = Math.round(s.scores[key]);
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="rgba(255,255,255,0.10)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "#8aa0b2", fontSize: 11 }}
          tickLine={false}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {series.map((s) => (
          <Radar
            key={s.name}
            name={s.name}
            dataKey={s.name}
            stroke={s.color}
            fill={s.color}
            fillOpacity={series.length > 1 ? 0.18 : 0.3}
            strokeWidth={2}
            isAnimationActive
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default ScoreRadar;
