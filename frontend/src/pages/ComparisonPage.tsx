import { useState, useEffect } from "react";
import { listPitStops, listModels } from "../services/api";
import type { PitStop, ModelInfo } from "../types";

export default function ComparisonPage() {
  const [pitStops, setPitStops] = useState<PitStop[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedPitStop, setSelectedPitStop] = useState<number | "">("");
  const [modelA, setModelA] = useState("");
  const [modelB, setModelB] = useState("");
  const [frameNumber, setFrameNumber] = useState(0);

  useEffect(() => {
    listPitStops().then((all) => setPitStops(all.filter((ps) => ps.status === "completed")));
    listModels().then(setModels);
  }, []);

  const previewUrl = (model: string) => {
    if (!selectedPitStop) return "";
    return `/api/pit-stops/${selectedPitStop}/preview-frame?frame_number=${frameNumber}`;
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Model Comparison</h1>

      {/* Controls */}
      <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8, marginBottom: 24, border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Video</label>
            <select
              value={selectedPitStop}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : "";
                setSelectedPitStop(val);
                if (val !== "") {
                  const ps = pitStops.find((p) => p.id === val);
                  if (ps) setFrameNumber(Math.floor((ps.total_frames || 0) / 2));
                }
              }}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", minWidth: 250 }}
            >
              <option value="">Select a video...</option>
              {pitStops.map((ps) => (
                <option key={ps.id} value={ps.id}>{ps.original_filename}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Frame</label>
            <input
              type="number"
              value={frameNumber}
              onChange={(e) => setFrameNumber(Number(e.target.value))}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", width: 100 }}
              min={0}
            />
          </div>
        </div>
      </div>

      {/* Side-by-side */}
      {selectedPitStop !== "" && (
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 8, fontSize: 14 }}>Detection Preview</h3>
            <img
              src={`/api/pit-stops/${selectedPitStop}/preview-frame?frame_number=${frameNumber}`}
              alt="Preview with detections"
              style={{ width: "100%", borderRadius: 8, border: "1px solid #e5e7eb" }}
              key={`${selectedPitStop}-${frameNumber}`}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Frame #{frameNumber} with bounding box overlays from active model
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 8, fontSize: 14 }}>Available Models</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {models.map((m) => (
                <div
                  key={m.name}
                  style={{
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      <span
                        style={{
                          marginLeft: 8,
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: m.type === "custom" ? "#dbeafe" : "#f3f4f6",
                          color: m.type === "custom" ? "#1e40af" : "#6b7280",
                        }}
                      >
                        {m.type}
                      </span>
                    </div>
                    {m.best_map50 !== null && m.best_map50 !== undefined && (
                      <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                        mAP: {(m.best_map50 * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{m.path}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 16, background: "#eff6ff", borderRadius: 8, fontSize: 13, color: "#1e40af" }}>
              To compare models side-by-side, use the "Reprocess" button on the Analysis page to re-run detection with a different model, then compare the results.
            </div>
          </div>
        </div>
      )}

      {selectedPitStop === "" && (
        <div style={{ background: "#f9fafb", padding: 40, textAlign: "center", borderRadius: 8, color: "#9ca3af" }}>
          Select a video above to view detection previews and compare models.
        </div>
      )}
    </div>
  );
}
