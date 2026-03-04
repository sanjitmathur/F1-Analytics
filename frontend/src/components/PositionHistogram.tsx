import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { MonteCarloDriver, TeamColors } from "../types";

interface Props {
  driver: MonteCarloDriver;
  teamColors: TeamColors;
}

export default function PositionHistogram({ driver, teamColors }: Props) {
  const maxPos = Math.max(...Object.keys(driver.position_distribution).map(Number), 20);
  const data = [];

  for (let i = 1; i <= Math.min(maxPos, 20); i++) {
    data.push({
      position: `P${i}`,
      pct: driver.position_distribution[i] || 0,
    });
  }

  const color = teamColors[driver.team] || "#e10600";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="position"
          stroke="rgba(255,255,255,0.2)"
          fontSize={10}
          fontFamily="'Orbitron', sans-serif"
          tick={{ fill: "rgba(255,255,255,0.35)", fontWeight: 600 }}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
        />
        <YAxis
          stroke="rgba(255,255,255,0.2)"
          fontSize={10}
          fontFamily="Inter, sans-serif"
          unit="%"
          tick={{ fill: "rgba(255,255,255,0.35)" }}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15,15,20,0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            padding: "10px 14px",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}
          itemStyle={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter, sans-serif" }}
          formatter={(value) => [`${Number(value).toFixed(1)}%`, "Frequency"]}
          cursor={{ fill: "rgba(255,255,255,0.02)" }}
        />
        <Bar dataKey="pct" radius={[6, 6, 0, 0]} barSize={20}>
          {data.map((entry, index) => {
            const opacity = entry.pct > 0 ? Math.max(0.4, Math.min(1, entry.pct / 30)) : 0.15;
            return (
              <Cell
                key={index}
                fill={color}
                fillOpacity={opacity}
                style={{ filter: entry.pct > 5 ? `drop-shadow(0 0 4px ${color}40)` : "none" }}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
