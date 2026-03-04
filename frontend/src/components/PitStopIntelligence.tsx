import type { PitStopAnalytics } from "../types";
import EfficiencyGauge from "./EfficiencyGauge";
import PhaseTimeline from "./PhaseTimeline";

interface PitStopIntelligenceProps {
  analytics: PitStopAnalytics;
}

export default function PitStopIntelligence({ analytics }: PitStopIntelligenceProps) {
  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ marginBottom: 16 }}>Pit Stop Intelligence</h2>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Efficiency Gauge */}
        <EfficiencyGauge
          score={analytics.efficiency_score}
          durationSec={analytics.stationary_duration_sec ?? analytics.total_stop_duration_sec}
        />

        {/* Timing Cards */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1 }}>
          <TimingCard
            label="Total Duration"
            value={analytics.total_stop_duration_sec !== null ? `${analytics.total_stop_duration_sec.toFixed(2)}s` : "-"}
          />
          <TimingCard
            label="Stationary Time"
            value={analytics.stationary_duration_sec !== null ? `${analytics.stationary_duration_sec.toFixed(2)}s` : "-"}
          />
          <TimingCard
            label="Car First Seen"
            value={analytics.car_first_seen_sec !== null ? `${analytics.car_first_seen_sec.toFixed(2)}s` : "-"}
          />
          <TimingCard
            label="Car Last Seen"
            value={analytics.car_last_seen_sec !== null ? `${analytics.car_last_seen_sec.toFixed(2)}s` : "-"}
          />
        </div>
      </div>

      {/* Crew Stats */}
      <h3 style={{ marginTop: 24, marginBottom: 12 }}>Crew Activity</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatBadge label="Peak Crew" value={analytics.max_crew_count?.toString() ?? "-"} />
        <StatBadge label="Avg Crew" value={analytics.avg_crew_count?.toFixed(1) ?? "-"} />
        {analytics.crew_convergence_frame !== null && (
          <StatBadge label="Convergence Frame" value={`#${analytics.crew_convergence_frame}`} />
        )}
      </div>

      {/* Equipment Badges */}
      <h3 style={{ marginTop: 24, marginBottom: 12 }}>Equipment Detected</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <EquipmentBadge label="Jack" detected={analytics.jack_detected} />
        <EquipmentBadge label="Wheel Gun" detected={analytics.wheel_gun_detected} />
        <EquipmentBadge label="Tire Change" detected={analytics.tire_change_detected} />
      </div>

      {/* Phase Timeline */}
      <h3 style={{ marginTop: 24, marginBottom: 12 }}>Phases</h3>
      <PhaseTimeline phases={analytics.phases} />

      {/* Meta */}
      <div style={{ marginTop: 16, fontSize: 12, color: "#9ca3af" }}>
        Model: {analytics.model_name} | Mapping: {analytics.class_mapping_used ?? "auto"} | v{analytics.analysis_version}
      </div>
    </div>
  );
}

function TimingCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "10px 16px",
      backgroundColor: "#f0f9ff",
      borderRadius: 8,
      border: "1px solid #bae6fd",
      minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: "#0369a1", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#0c4a6e" }}>{value}</div>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "8px 14px",
      backgroundColor: "#faf5ff",
      borderRadius: 8,
      border: "1px solid #e9d5ff",
    }}>
      <span style={{ fontSize: 12, color: "#7c3aed" }}>{label}: </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#5b21b6" }}>{value}</span>
    </div>
  );
}

function EquipmentBadge({ label, detected }: { label: string; detected: boolean }) {
  return (
    <div style={{
      padding: "6px 12px",
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
      backgroundColor: detected ? "#dcfce7" : "#f3f4f6",
      color: detected ? "#166534" : "#9ca3af",
      border: `1px solid ${detected ? "#bbf7d0" : "#e5e7eb"}`,
    }}>
      {detected ? "\u2713" : "\u2717"} {label}
    </div>
  );
}
