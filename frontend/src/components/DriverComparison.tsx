import type { HeadToHeadResult, TeamColors } from "../types";

interface Props {
  data: HeadToHeadResult;
  teamColors: TeamColors;
  driver1Team?: string;
  driver2Team?: string;
}

export default function DriverComparison({ data, teamColors, driver1Team, driver2Team }: Props) {
  const d1Color = (driver1Team && teamColors[driver1Team]) || "var(--f1-red)";
  const d2Color = (driver2Team && teamColors[driver2Team]) || "var(--accent-blue)";

  const metrics = [
    { label: "AVG POS", v1: data.driver1_avg_pos, v2: data.driver2_avg_pos, lower: true },
    { label: "WINS", v1: data.driver1_wins, v2: data.driver2_wins, lower: false },
    { label: "PODIUMS", v1: data.driver1_podiums, v2: data.driver2_podiums, lower: false },
    { label: "POINTS", v1: data.driver1_points, v2: data.driver2_points, lower: false },
  ];

  const fmt = (v: number) => {
    if (v === 0) return "—";
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };

  const getWinner = (v1: number, v2: number, lower: boolean): "d1" | "d2" | "tie" => {
    if (v1 === 0 && v2 === 0) return "tie";
    if (v1 === v2) return "tie";
    if (lower) return v1 < v2 ? "d1" : "d2";
    return v1 > v2 ? "d1" : "d2";
  };

  // Compute overall score: who wins more metrics
  const d1Score = metrics.filter(m => getWinner(m.v1, m.v2, m.lower) === "d1").length;
  const d2Score = metrics.filter(m => getWinner(m.v1, m.v2, m.lower) === "d2").length;

  return (
    <div>
      {/* Header with team color accents */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 32,
        padding: "0 4px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 4, height: 32, borderRadius: 2, background: d1Color }} />
          <div>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 22,
              fontWeight: 900,
              color: d1Color,
              lineHeight: 1.1,
            }}>
              {data.driver1}
            </div>
            {driver1Team && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{driver1Team}</div>
            )}
          </div>
        </div>

        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 11,
          fontWeight: 800,
          color: "var(--text-muted)",
          background: "rgba(255,255,255,0.04)",
          padding: "6px 14px",
          borderRadius: 20,
          letterSpacing: 2,
        }}>
          VS
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 22,
              fontWeight: 900,
              color: d2Color,
              lineHeight: 1.1,
            }}>
              {data.driver2}
            </div>
            {driver2Team && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{driver2Team}</div>
            )}
          </div>
          <div style={{ width: 4, height: 32, borderRadius: 2, background: d2Color }} />
        </div>
      </div>

      {/* Stat rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {metrics.map((m) => {
          const winner = getWinner(m.v1, m.v2, m.lower);
          return (
            <div
              key={m.label}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                padding: "16px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: winner !== "tie" ? `linear-gradient(90deg, ${winner === "d1" ? `${d1Color}08` : "transparent"} 0%, transparent 50%, ${winner === "d2" ? `${d2Color}08` : "transparent"} 100%)` : undefined,
              }}
            >
              <div style={{
                textAlign: "right",
                paddingRight: 24,
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: winner === "d1" ? d1Color : "var(--text-muted)",
                transition: "color 0.3s ease",
              }}>
                {fmt(m.v1)}
              </div>
              <div style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 2.5,
                color: "var(--text-muted)",
                textAlign: "center",
                minWidth: 90,
                fontWeight: 600,
              }}>
                {m.label}
              </div>
              <div style={{
                textAlign: "left",
                paddingLeft: 24,
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: winner === "d2" ? d2Color : "var(--text-muted)",
                transition: "color 0.3s ease",
              }}>
                {fmt(m.v2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score summary */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 16,
        marginTop: 20,
        padding: "12px 0",
      }}>
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 14,
          fontWeight: 800,
          color: d1Score >= d2Score && d1Score > 0 ? d1Color : "var(--text-muted)",
        }}>
          {d1Score}
        </span>
        <span style={{
          fontSize: 10,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: 2,
          alignSelf: "center",
        }}>
          categories won
        </span>
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 14,
          fontWeight: 800,
          color: d2Score >= d1Score && d2Score > 0 ? d2Color : "var(--text-muted)",
        }}>
          {d2Score}
        </span>
      </div>
    </div>
  );
}
