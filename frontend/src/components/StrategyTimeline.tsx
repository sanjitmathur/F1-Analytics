import { useMemo } from "react";
import type { LapData, SimulationResult, TeamColors } from "../types";

interface Props {
  laps: LapData[];
  teamColors: TeamColors;
  results: SimulationResult[];
}

const TIRE_COLORS: Record<string, string> = {
  SOFT: "#e10600",
  MEDIUM: "#ffd700",
  HARD: "#f0f0f0",
  INTER: "#39b54a",
  WET: "#0072c6",
};

export default function StrategyTimeline({ laps, teamColors, results }: Props) {
  const drivers = useMemo(() => {
    return results
      .sort((a, b) => a.position - b.position)
      .map((r) => r.driver_name);
  }, [results]);

  const maxLap = useMemo(() => Math.max(...laps.map((l) => l.lap), 1), [laps]);

  const driverStints = useMemo(() => {
    const stints: Record<string, Array<{ start: number; end: number; compound: string }>> = {};

    for (const driver of drivers) {
      const driverLaps = laps
        .filter((l) => l.driver_name === driver)
        .sort((a, b) => a.lap - b.lap);

      if (driverLaps.length === 0) continue;

      const currentStints: Array<{ start: number; end: number; compound: string }> = [];
      let currentCompound = driverLaps[0].tire_compound;
      let stintStart = 1;

      for (const lap of driverLaps) {
        if (lap.tire_compound !== currentCompound) {
          currentStints.push({ start: stintStart, end: lap.lap - 1, compound: currentCompound });
          currentCompound = lap.tire_compound;
          stintStart = lap.lap;
        }
      }
      currentStints.push({ start: stintStart, end: driverLaps[driverLaps.length - 1].lap, compound: currentCompound });
      stints[driver] = currentStints;
    }

    return stints;
  }, [drivers, laps]);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 600 }}>
        {drivers.map((driver) => {
          const result = results.find((r) => r.driver_name === driver);
          const stints = driverStints[driver] || [];
          return (
            <div key={driver} style={{ display: "flex", alignItems: "center", marginBottom: 3, gap: 10 }}>
              <div style={{ width: 150, fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 800,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  width: 28,
                  textAlign: "right",
                }}>
                  P{result?.position}
                </span>
                <span
                  style={{
                    width: 3,
                    height: 16,
                    borderRadius: 2,
                    background: teamColors[result?.team || ""] || "#444",
                    boxShadow: `0 0 6px ${teamColors[result?.team || ""] || "transparent"}40`,
                    flexShrink: 0,
                  }}
                />
                <span style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.75)",
                }}>
                  {driver}
                </span>
              </div>
              <div style={{
                flex: 1,
                height: 22,
                display: "flex",
                position: "relative",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 4,
                overflow: "hidden",
              }}>
                {stints.map((stint, si) => {
                  const tireColor = TIRE_COLORS[stint.compound] || "#666";
                  return (
                    <div
                      key={si}
                      style={{
                        position: "absolute",
                        left: `${((stint.start - 1) / maxLap) * 100}%`,
                        width: `${((stint.end - stint.start + 1) / maxLap) * 100}%`,
                        height: "100%",
                        background: stint.compound === "HARD"
                          ? `linear-gradient(135deg, ${tireColor}, rgba(200,200,200,0.7))`
                          : `linear-gradient(135deg, ${tireColor}, ${tireColor}aa)`,
                        borderRadius: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        fontWeight: 800,
                        fontFamily: "'Orbitron', sans-serif",
                        letterSpacing: 1,
                        color: stint.compound === "HARD" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.6)",
                        textTransform: "uppercase",
                        borderRight: si < stints.length - 1 ? "1px solid rgba(0,0,0,0.3)" : "none",
                      }}
                      title={`${stint.compound}: Lap ${stint.start}–${stint.end}`}
                    >
                      {stint.end - stint.start > 4 ? stint.compound.charAt(0) : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* Legend */}
        <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {Object.entries(TIRE_COLORS).slice(0, 3).map(([compound, color]) => (
            <div key={compound} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
                boxShadow: `0 0 6px ${color}40`,
              }} />
              <span style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 10,
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}>{compound}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
