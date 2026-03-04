import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer
} from "recharts";

interface DriverStats {
  pace: number;
  racecraft: number;
  consistency: number;
  wet: number;
  experience: number;
  qualifying: number;
}

interface DriverData {
  name: string;
  team: string;
  stats: DriverStats;
}

interface Props {
  driver1: DriverData;
  driver2: DriverData;
  teamColor1: string;
  teamColor2: string;
}

const STAT_LABELS: Record<keyof DriverStats, string> = {
  pace: "PACE",
  racecraft: "RACECRAFT",
  consistency: "CONSISTENCY",
  wet: "WET",
  experience: "EXPERIENCE",
  qualifying: "QUALIFYING",
};

export default function DriverRadarChart({ driver1, driver2, teamColor1, teamColor2 }: Props) {
  const statKeys = Object.keys(STAT_LABELS) as (keyof DriverStats)[];

  const data = statKeys.map((key) => ({
    stat: STAT_LABELS[key],
    [driver1.name]: driver1.stats[key],
    [driver2.name]: driver2.stats[key],
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.15)" />
        <PolarAngleAxis
          dataKey="stat"
          tick={{
            fill: "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontWeight: 600,
          }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          axisLine={false}
        />
        <Radar
          name={driver1.name}
          dataKey={driver1.name}
          stroke={teamColor1}
          fill={teamColor1}
          fillOpacity={0.3}
        />
        <Radar
          name={driver2.name}
          dataKey={driver2.name}
          stroke={teamColor2}
          fill={teamColor2}
          fillOpacity={0.3}
        />
        <Legend
          wrapperStyle={{
            color: "rgba(255,255,255,0.85)",
            fontSize: 13,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
