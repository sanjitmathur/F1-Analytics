import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import type { PitStopPhase } from "../types";

interface PhaseTimelineProps {
  phases: PitStopPhase[];
}

const PHASE_COLORS: Record<string, string> = {
  car_arrival: "#3b82f6",
  jacking: "#f59e0b",
  tire_change: "#ef4444",
  release: "#8b5cf6",
  car_departure: "#10b981",
  pit_stop: "#6b7280",
};

const PHASE_LABELS: Record<string, string> = {
  car_arrival: "Arrival",
  jacking: "Jacking",
  tire_change: "Tire Change",
  release: "Release",
  car_departure: "Departure",
  pit_stop: "Pit Stop",
};

export default function PhaseTimeline({ phases }: PhaseTimelineProps) {
  if (!phases.length) {
    return <div style={{ color: "#9ca3af", fontSize: 14 }}>No phases detected</div>;
  }

  const data = phases.map((p) => ({
    name: PHASE_LABELS[p.name] || p.name,
    duration: parseFloat(p.duration_sec.toFixed(2)),
    start: p.start_sec,
    end: p.end_sec,
    crew: p.crew_count_avg,
    notes: p.notes,
    phase: p.name,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
          <XAxis type="number" unit="s" fontSize={12} />
          <YAxis type="category" dataKey="name" fontSize={12} width={80} />
          <Tooltip />
          <Bar dataKey="duration" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={PHASE_COLORS[entry.phase] || "#6b7280"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
        {data.map((entry, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: PHASE_COLORS[entry.phase] || "#6b7280",
              }}
            />
            <span>{entry.name}</span>
            <span style={{ color: "#9ca3af" }}>{entry.duration}s</span>
          </div>
        ))}
      </div>
    </div>
  );
}
