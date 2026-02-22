interface Props {
  value: number; // 0-100
  label?: string;
}

export default function ProgressBar({ value, label }: Props) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div>
      {label && (
        <div style={{ fontSize: 13, marginBottom: 4, color: "#555" }}>{label}</div>
      )}
      <div
        style={{
          width: "100%",
          height: 20,
          backgroundColor: "#e5e7eb",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: pct === 100 ? "#10b981" : "#3b82f6",
            borderRadius: 10,
            transition: "width 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {pct > 15 && `${pct.toFixed(0)}%`}
        </div>
      </div>
    </div>
  );
}
