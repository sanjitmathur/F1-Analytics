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
  drivers: MonteCarloDriver[];
  teamColors: TeamColors;
  metric: keyof MonteCarloDriver;
  label: string;
}

export default function MonteCarloDistribution({ drivers, teamColors, metric, label }: Props) {
  const sorted = [...drivers]
    .sort((a, b) => (b[metric] as number) - (a[metric] as number))
    .slice(0, 10);

  const data = sorted.map((d) => ({
    name: d.driver_name.split(" ").pop() || d.driver_name,
    fullName: d.driver_name,
    team: d.team,
    value: Number((d[metric] as number).toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis
          type="number"
          stroke="rgba(255,255,255,0.2)"
          fontSize={10}
          fontFamily="Inter, sans-serif"
          unit="%"
          tick={{ fill: "rgba(255,255,255,0.35)" }}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
        />
        <YAxis
          dataKey="name"
          type="category"
          stroke="rgba(255,255,255,0.2)"
          fontSize={10}
          fontFamily="Inter, sans-serif"
          width={80}
          tick={{ fill: "rgba(255,255,255,0.5)", fontWeight: 600 }}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={false}
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
          formatter={(value) => [`${Number(value)}%`, label]}
          labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ""}
          cursor={{ fill: "rgba(255,255,255,0.02)" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((entry, index) => {
            const color = teamColors[entry.team] || "#e10600";
            return (
              <Cell
                key={index}
                fill={color}
                fillOpacity={0.8}
                style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
