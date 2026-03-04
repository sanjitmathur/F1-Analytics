import type { RaceWeekend } from "../types";

interface Props {
  race: RaceWeekend;
  onClick: () => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "Australia": "🇦🇺", "China": "🇨🇳", "Japan": "🇯🇵", "Bahrain": "🇧🇭",
  "Saudi Arabia": "🇸🇦", "United States": "🇺🇸", "Italy": "🇮🇹", "Monaco": "🇲🇨",
  "Spain": "🇪🇸", "Canada": "🇨🇦", "Austria": "🇦🇹", "United Kingdom": "🇬🇧",
  "Belgium": "🇧🇪", "Hungary": "🇭🇺", "Netherlands": "🇳🇱", "Azerbaijan": "🇦🇿",
  "Singapore": "🇸🇬", "Mexico": "🇲🇽", "Brazil": "🇧🇷", "Qatar": "🇶🇦",
  "UAE": "🇦🇪",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "var(--text-muted)",
  predicted: "var(--accent-blue)",
  completed: "var(--accent-green)",
};

export default function RaceCalendarCard({ race, onClick }: Props) {
  const flag = COUNTRY_FLAGS[race.country] || "🏁";
  const raceDate = new Date(race.race_date);
  const month = raceDate.toLocaleDateString("en-US", { month: "short" });
  const day = raceDate.getDate();

  return (
    <div
      onClick={onClick}
      style={{
        minWidth: 160, padding: "16px 14px", borderRadius: 12,
        background: "var(--bg-glass)", border: "1px solid var(--border-color)",
        cursor: "pointer", transition: "all 0.2s ease",
        display: "flex", flexDirection: "column", gap: 8,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(225,6,0,0.3)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20 }}>{flag}</span>
        <span style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 800,
          color: "var(--text-muted)",
        }}>R{race.round_number}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{race.name.replace(" Grand Prix", " GP")}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{race.track_name}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
          {month} {day}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
          color: STATUS_COLORS[race.status] || "var(--text-muted)",
        }}>
          {race.status}
        </span>
      </div>
      {race.weather_data && (
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {race.weather_data.condition === "wet" ? "🌧️" : race.weather_data.condition === "mixed" ? "⛅" : "☀️"}
          {race.weather_data.temperature != null && ` ${race.weather_data.temperature}°C`}
        </div>
      )}
    </div>
  );
}
