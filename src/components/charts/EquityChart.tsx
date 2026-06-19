"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Trade } from "@/lib/types";

const START_EQUITY = 100_000;

export function EquityChart({ trades, height = 220 }: { trades: Trade[]; height?: number }) {
  const sorted = [...trades].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  let eq = START_EQUITY;
  const data = sorted.map((t) => {
    eq += t.pnl;
    return { t: t.timestamp.slice(0, 10), equity: Math.round(eq) };
  });

  const final = data[data.length - 1]?.equity ?? START_EQUITY;
  const up = final >= START_EQUITY;
  const color = up ? "#22e3c4" : "#f0596d";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="t"
          tick={{ fill: "#5b6b7a", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          minTickGap={48}
        />
        <YAxis
          domain={["dataMin - 2000", "dataMax + 2000"]}
          tick={{ fill: "#5b6b7a", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            background: "#0b0f1a",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            fontSize: 12,
          }}
          labelStyle={{ color: "#8aa0b2" }}
          formatter={(v: number) => [`$${v.toLocaleString()}`, "Equity"]}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={color}
          strokeWidth={2}
          fill="url(#eq)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default EquityChart;
