import { useMemo, useState } from "react";
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

export default function LapTimeChart({ laps }: Props) {
  const drivers = useMemo(() => [...new Set(laps.map((l) => l.driver_name))], [laps]);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(() => new Set(drivers.slice(0, 5)));

  const chartData = useMemo(() => {
    const lapMap = new Map<number, Record<string, number>>();
    for (const lap of laps) {
      if (!selectedDrivers.has(lap.driver_name)) continue;
      if (!lapMap.has(lap.lap)) lapMap.set(lap.lap, {});
      lapMap.get(lap.lap)![lap.driver_name] = Number(lap.lap_time.toFixed(3));
    }
    return [...lapMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([lap, times]) => ({ lap, ...times }));
  }, [laps, selectedDrivers]);

  const palette = [
    "#3671C6", "#E8002D", "#27F4D2", "#FF8000", "#229971",
    "#FF87BC", "#64C4FF", "#6692FF", "#52E252", "#B6BABD",
    "#FF5555", "#55AAFF", "#FFAA00", "#AA55FF", "#55FF55",
    "#FF55AA", "#AAFFFF", "#FFFF55", "#FF7777", "#77FF77",
  ];

  const toggleDriver = (name: string) => {
    setSelectedDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
        {drivers.map((d, i) => {
          const active = selectedDrivers.has(d);
          const color = palette[i % palette.length];
          return (
            <button
              key={d}
              onClick={() => toggleDriver(d)}
              style={{
                fontSize: 9,
                padding: "3px 10px",
                borderRadius: 100,
                border: active ? "none" : "1px solid rgba(255,255,255,0.08)",
                background: active ? color : "transparent",
                color: active ? "#000" : "rgba(255,255,255,0.4)",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.3,
                transition: "all 0.2s ease",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={300}>
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
            stroke="rgba(255,255,255,0.2)"
            fontSize={10}
            fontFamily="Inter, sans-serif"
            domain={["auto", "auto"]}
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
            formatter={(value) => `${Number(value).toFixed(3)}s`}
            cursor={{ stroke: "rgba(225,6,0,0.3)", strokeWidth: 1 }}
          />
          {[...selectedDrivers].map((driver) => {
            const idx = drivers.indexOf(driver);
            return (
              <Line
                key={driver}
                type="monotone"
                dataKey={driver}
                stroke={palette[idx % palette.length]}
                dot={false}
                strokeWidth={1.5}
                strokeOpacity={0.85}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
