import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { TeamColors } from "../types";

interface Props {
  data: { round: number; [driver: string]: number }[];
  drivers: string[];
  teamColors: TeamColors;
}

export default function ChampionshipChart({ data, drivers, teamColors }: Props) {
  if (data.length === 0) return <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>No data yet</p>;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="round" stroke="rgba(255,255,255,0.2)" fontSize={10}
          fontFamily="'Orbitron', sans-serif"
          tick={{ fill: "rgba(255,255,255,0.35)" }}
        />
        <YAxis
          stroke="rgba(255,255,255,0.2)" fontSize={10}
          tick={{ fill: "rgba(255,255,255,0.35)" }}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15,15,20,0.95)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
            padding: "10px 14px",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "'Orbitron', sans-serif" }}
          itemStyle={{ fontSize: 12 }}
        />
        {drivers.map(driver => (
          <Line
            key={driver} type="monotone" dataKey={driver}
            stroke={teamColors[driver] || "#888"} dot={false} strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
