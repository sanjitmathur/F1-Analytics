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

interface LossData {
  epoch: number;
  box_loss: number;
  cls_loss: number;
}

interface TrainingLossChartProps {
  data: LossData[];
}

export default function TrainingLossChart({ data }: TrainingLossChartProps) {
  return (
    <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb" }}>
      <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Training Loss</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="epoch" label={{ value: "Epoch", position: "insideBottom", offset: -5 }} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="box_loss" stroke="#ef4444" name="Box Loss" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="cls_loss" stroke="#3b82f6" name="Class Loss" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
