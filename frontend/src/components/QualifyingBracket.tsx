import type { PredictionResultItem, TeamColors } from "../types";

interface Props {
  results: PredictionResultItem[];
  teamColors: TeamColors;
}

function BracketSection({ title, drivers, teamColors, color, startPosition }: {
  title: string;
  drivers: PredictionResultItem[];
  teamColors: TeamColors;
  color: string;
  startPosition: number;
}) {
  return (
    <div>
      <div style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 800,
        color, letterSpacing: 2, marginBottom: 12,
      }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {drivers.map((d, i) => (
          <div key={d.driver_name} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
            borderRadius: 8, background: "var(--bg-glass)",
            borderLeft: `3px solid ${teamColors[d.team] || "#333"}`,
          }}>
            <span style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 800,
              color: "var(--text-muted)", width: 30, textAlign: "center",
            }}>P{startPosition + i}</span>
            <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{d.driver_name}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.team}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QualifyingBracket({ results, teamColors }: Props) {
  const q1Eliminated = results.filter(r => r.q1_exit_pct > 50).sort((a, b) => b.q1_exit_pct - a.q1_exit_pct);
  const q2Eliminated = results.filter(r => r.q2_exit_pct > 50 && r.q1_exit_pct <= 50).sort((a, b) => b.q2_exit_pct - a.q2_exit_pct);
  const q3Drivers = results.filter(r => r.q1_exit_pct <= 50 && r.q2_exit_pct <= 50).sort((a, b) => a.predicted_position - b.predicted_position);

  const q3Start = 1;
  const q2Start = q3Start + q3Drivers.length;
  const q1Start = q2Start + q2Eliminated.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <BracketSection title={`Q3 — Top ${q3Drivers.length}`} drivers={q3Drivers} teamColors={teamColors} color="var(--accent-green)" startPosition={q3Start} />
      {q2Eliminated.length > 0 && <BracketSection title="Q2 Eliminated" drivers={q2Eliminated} teamColors={teamColors} color="var(--accent-yellow)" startPosition={q2Start} />}
      {q1Eliminated.length > 0 && <BracketSection title="Q1 Eliminated" drivers={q1Eliminated} teamColors={teamColors} color="var(--f1-red)" startPosition={q1Start} />}
    </div>
  );
}
