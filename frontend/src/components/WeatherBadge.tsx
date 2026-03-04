interface Props {
  condition: string;
  temperature?: number | null;
}

const WEATHER_ICONS: Record<string, string> = {
  dry: "☀️",
  wet: "🌧️",
  mixed: "⛅",
};

export default function WeatherBadge({ condition, temperature }: Props) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 20,
      background: condition === "wet" ? "rgba(68,138,255,0.12)" : condition === "mixed" ? "rgba(255,214,0,0.12)" : "rgba(255,255,255,0.06)",
      fontSize: 12, fontWeight: 600,
    }}>
      <span>{WEATHER_ICONS[condition] || "☀️"}</span>
      <span style={{ textTransform: "capitalize" }}>{condition}</span>
      {temperature != null && (
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{temperature}°C</span>
      )}
    </span>
  );
}
