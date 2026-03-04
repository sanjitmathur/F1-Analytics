interface Props {
  value: number;
  label: string;
  color?: string;
}

export default function AccuracyGauge({ value, label, color = "var(--accent-green)" }: Props) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={50} cy={50} r={radius} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x={50} y={46} textAnchor="middle" fill="white"
          fontFamily="'Orbitron', sans-serif" fontSize={18} fontWeight={900}>
          {value.toFixed(0)}
        </text>
        <text x={50} y={60} textAnchor="middle" fill="rgba(255,255,255,0.4)"
          fontSize={8} fontFamily="'Orbitron', sans-serif" letterSpacing={1}>
          %
        </text>
      </svg>
      <div style={{
        fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase",
        letterSpacing: 1.5, marginTop: 4,
      }}>{label}</div>
    </div>
  );
}
