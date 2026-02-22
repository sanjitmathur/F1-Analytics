import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DetectionSummary } from "../types";

interface Props {
  summaries: DetectionSummary[];
}

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

export default function ConfidenceChart({ summaries }: Props) {
  if (summaries.length === 0) {
    return <p style={{ color: "#888" }}>No summaries to display.</p>;
  }

  const data = summaries
    .sort((a, b) => b.total_count - a.total_count)
    .map((s) => ({
      name: s.class_name,
      avg: +(s.avg_confidence * 100).toFixed(1),
      min: +(s.min_confidence * 100).toFixed(1),
      max: +(s.max_confidence * 100).toFixed(1),
      count: s.total_count,
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} label={{ value: "Confidence %", angle: -90, position: "insideLeft" }} />
        <Tooltip
          formatter={(value) => [`${value}%`]}
          labelFormatter={(label) => {
            const item = data.find((d) => d.name === label);
            return `${label} (${item?.count || 0} detections)`;
          }}
        />
        <Bar dataKey="avg" name="Avg Confidence">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
