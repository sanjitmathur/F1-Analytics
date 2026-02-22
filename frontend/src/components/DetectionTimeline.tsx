import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Detection } from "../types";

interface Props {
  detections: Detection[];
}

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

export default function DetectionTimeline({ detections }: Props) {
  if (detections.length === 0) {
    return <p style={{ color: "#888" }}>No detections to display.</p>;
  }

  // Group by timestamp, count per class
  const classSet = new Set<string>();
  const timeMap = new Map<number, Record<string, number>>();

  for (const d of detections) {
    const t = Math.round(d.timestamp_sec * 10) / 10; // round to 0.1s
    classSet.add(d.class_name);
    if (!timeMap.has(t)) timeMap.set(t, {});
    const entry = timeMap.get(t)!;
    entry[d.class_name] = (entry[d.class_name] || 0) + 1;
  }

  const classes = Array.from(classSet);
  const data = Array.from(timeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, counts]) => ({ time: `${time.toFixed(1)}s`, ...counts }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {classes.map((cls, i) => (
          <Line
            key={cls}
            type="monotone"
            dataKey={cls}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
