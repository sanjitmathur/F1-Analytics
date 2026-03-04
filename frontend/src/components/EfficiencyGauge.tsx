interface EfficiencyGaugeProps {
  score: number | null;
  durationSec: number | null;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 50) return "Good";
  if (score >= 20) return "Average";
  return "Slow";
}

export default function EfficiencyGauge({ score, durationSec }: EfficiencyGaugeProps) {
  if (score === null) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 14, color: "#9ca3af" }}>No score available</div>
      </div>
    );
  }

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 48, fontWeight: 800, color, lineHeight: 1 }}>
        {Math.round(score)}
      </div>
      <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>/ 100</div>
      <div style={{ fontSize: 16, fontWeight: 600, color, marginTop: 8 }}>
        {label}
      </div>
      {durationSec !== null && (
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
          {durationSec.toFixed(2)}s stop
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 32px",
  backgroundColor: "#f9fafb",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  minWidth: 160,
};
