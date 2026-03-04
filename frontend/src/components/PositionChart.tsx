import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LapData, TeamColors } from "../types";

interface Props {
  laps: LapData[];
  teamColors?: TeamColors;
}

export default function PositionChart({ laps }: Props) {
  const { chartData, drivers } = useMemo(() => {
    const driverSet = new Set<string>();
    const lapMap = new Map<number, Record<string, number>>();

    for (const lap of laps) {
      driverSet.add(lap.driver_name);
      if (!lapMap.has(lap.lap)) lapMap.set(lap.lap, {});
      lapMap.get(lap.lap)![lap.driver_name] = lap.position;
    }

    const drivers = [...driverSet];
    const chartData = [...lapMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([lap, positions]) => ({ lap, ...positions }));

    return { chartData, drivers };
  }, [laps]);

  const driverColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const palette = [
      "#3671C6", "#E8002D", "#27F4D2", "#FF8000", "#229971",
      "#FF87BC", "#64C4FF", "#6692FF", "#52E252", "#B6BABD",
      "#FF5555", "#55AAFF", "#FFAA00", "#AA55FF", "#55FF55",
      "#FF55AA", "#AAFFFF", "#FFFF55", "#FF7777", "#77FF77",
    ];
    drivers.forEach((d, i) => {
      colors[d] = palette[i % palette.length];
    });
    return colors;
  }, [drivers]);

  if (chartData.length === 0) return <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 40 }}>No lap data available</p>;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="lap"
          stroke="rgba(255,255,255,0.2)"
          fontSize={10}
          fontFamily="Inter, sans-serif"
          tick={{ fill: "rgba(255,255,255,0.35)" }}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
        />
        <YAxis
          reversed
          domain={[1, drivers.length]}
          stroke="rgba(255,255,255,0.2)"
          fontSize={10}
          fontFamily="Inter, sans-serif"
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
          itemStyle={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter, sans-serif", padding: "1px 0" }}
          cursor={{ stroke: "rgba(225,6,0,0.3)", strokeWidth: 1 }}
        />
        {drivers.map((driver) => (
          <Line
            key={driver}
            type="monotone"
            dataKey={driver}
            stroke={driverColors[driver]}
            dot={false}
            strokeWidth={2}
            strokeOpacity={0.85}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
