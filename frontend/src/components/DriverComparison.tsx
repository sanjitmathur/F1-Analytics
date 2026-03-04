import type { HeadToHeadResult, TeamColors } from "../types";

interface Props {
  data: HeadToHeadResult;
  teamColors: TeamColors;
}

export default function DriverComparison({ data, teamColors }: Props) {
  const d1Color = Object.entries(teamColors).find(([, ]) => true)?.[1] || "var(--f1-red)";
  const d2Color = Object.entries(teamColors).find(([, ]) => true)?.[1] || "var(--accent-blue)";

  const bars = [
    { label: "Avg Position", v1: data.driver1_avg_pos, v2: data.driver2_avg_pos, lower: true },
    { label: "Wins", v1: data.driver1_wins, v2: data.driver2_wins },
    { label: "Podiums", v1: data.driver1_podiums, v2: data.driver2_podiums },
    { label: "Points", v1: data.driver1_points, v2: data.driver2_points },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 20, fontWeight: 900 }}>{data.driver1}</div>
        </div>
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 800,
          color: "var(--text-muted)", alignSelf: "center",
        }}>VS</div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 20, fontWeight: 900 }}>{data.driver2}</div>
        </div>
      </div>

      {/* Comparison bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {bars.map(bar => {
          const max = Math.max(bar.v1, bar.v2, 0.01);
          const w1 = bar.lower ? (max > 0 ? (max - bar.v1 + 1) / (max + 1) * 100 : 50) : (bar.v1 / max * 100);
          const w2 = bar.lower ? (max > 0 ? (max - bar.v2 + 1) / (max + 1) * 100 : 50) : (bar.v2 / max * 100);
          return (
            <div key={bar.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 800 }}>
                  {typeof bar.v1 === "number" ? (Number.isInteger(bar.v1) ? bar.v1 : bar.v1.toFixed(1)) : bar.v1}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.5 }}>{bar.label}</span>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 800 }}>
                  {typeof bar.v2 === "number" ? (Number.isInteger(bar.v2) ? bar.v2 : bar.v2.toFixed(1)) : bar.v2}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, height: 6 }}>
                <div style={{ width: `${w1}%`, background: d1Color, borderRadius: 3, transition: "width 0.5s ease" }} />
                <div style={{ width: `${w2}%`, background: d2Color, borderRadius: 3, transition: "width 0.5s ease", marginLeft: "auto" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
