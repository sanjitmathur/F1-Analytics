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

interface MapData {
  epoch: number;
  map50: number;
}

interface MapChartProps {
  data: MapData[];
}

export default function MapChart({ data }: MapChartProps) {
  return (
    <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" }}>
      <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Validation mAP</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="epoch" label={{ value: "Epoch", position: "insideBottom", offset: -5 }} />
          <YAxis domain={[0, 1]} />
          <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
          <Legend />
          <Line type="monotone" dataKey="map50" stroke="#10b981" name="mAP@50" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
