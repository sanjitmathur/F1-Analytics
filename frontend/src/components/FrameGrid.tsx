import { getFrameImageUrl } from "../services/api";
import type { ExtractedFrame } from "../types";

interface FrameGridProps {
  frames: ExtractedFrame[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onClickFrame: (frame: ExtractedFrame) => void;
}

export default function FrameGrid({
  frames,
  selectedIds,
  onToggleSelect,
  onClickFrame,
}: FrameGridProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      {frames.map((frame) => (
        <div
          key={frame.id}
          style={{
            border: selectedIds.has(frame.id) ? "3px solid #3b82f6" : "1px solid #d1d5db",
            borderRadius: 8,
            overflow: "hidden",
            background: "#fff",
            cursor: "pointer",
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ position: "relative" }}>
            <img
              src={getFrameImageUrl(frame.id)}
              alt={`Frame ${frame.frame_number}`}
              style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
              onClick={() => onClickFrame(frame)}
            />
            <input
              type="checkbox"
              checked={selectedIds.has(frame.id)}
              onChange={() => onToggleSelect(frame.id)}
              style={{ position: "absolute", top: 6, left: 6, width: 18, height: 18, cursor: "pointer" }}
            />
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                background: frame.is_labeled ? "#10b981" : "#6b7280",
                color: "#fff",
              }}
            >
              {frame.is_labeled ? "Labeled" : "Unlabeled"}
            </span>
          </div>
          <div style={{ padding: "8px 10px", fontSize: 12, color: "#555" }}>
            <div>Frame #{frame.frame_number}</div>
            <div>{frame.timestamp_sec.toFixed(2)}s</div>
          </div>
        </div>
      ))}
    </div>
  );
}
