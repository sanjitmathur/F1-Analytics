import type { PredictionResultItem, TeamColors } from "../types";

interface Props {
  results: PredictionResultItem[];
  teamColors: TeamColors;
}

const PODIUM_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function PodiumSpotlight({ results, teamColors }: Props) {
  const top3 = results.slice(0, 3);
  // Reorder for visual: [P2, P1, P3]
  const display = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const heights = [140, 180, 110];

  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16, padding: "24px 0" }}>
      {display.map((d, i) => {
        const actualPos = d === top3[0] ? 1 : d === top3[1] ? 2 : 3;
        return (
          <div key={d.driver_name} style={{ textAlign: "center", width: 140 }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 800,
              color: "var(--text-muted)", letterSpacing: 2, marginBottom: 8,
            }}>
              {d.win_pct.toFixed(1)}% WIN
            </div>
            <div style={{
              fontWeight: 700, fontSize: 14, marginBottom: 4,
              color: teamColors[d.team] || "var(--text-primary)",
            }}>
              {d.driver_name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{d.team}</div>
            <div style={{
              height: heights[i],
              background: `linear-gradient(to top, ${PODIUM_COLORS[actualPos - 1]}22, transparent)`,
              borderTop: `3px solid ${PODIUM_COLORS[actualPos - 1]}`,
              borderRadius: "8px 8px 0 0",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: 32, fontWeight: 900,
                color: PODIUM_COLORS[actualPos - 1],
              }}>
                P{actualPos}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
