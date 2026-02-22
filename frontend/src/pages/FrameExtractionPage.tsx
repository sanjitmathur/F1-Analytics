import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  listPitStops,
  extractFrames,
  getExtractionStatus,
  listFrames,
} from "../services/api";
import FrameGrid from "../components/FrameGrid";
import ProgressBar from "../components/ProgressBar";
import type { PitStop, ExtractedFrame } from "../types";

export default function FrameExtractionPage() {
  const navigate = useNavigate();

  const [pitStops, setPitStops] = useState<PitStop[]>([]);
  const [selectedPitStop, setSelectedPitStop] = useState<number | "">("");
  const [numFrames, setNumFrames] = useState(100);
  const [strategy, setStrategy] = useState("uniform");

  const [extracting, setExtracting] = useState(false);
  const [extractionPct, setExtractionPct] = useState(0);
  const [jobId, setJobId] = useState<number | null>(null);

  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [totalFrames, setTotalFrames] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load completed pit stops
  useEffect(() => {
    listPitStops().then((all) => {
      setPitStops(all.filter((ps) => ps.status === "completed"));
    });
  }, []);

  // Load frames for selected pit stop
  const loadFrames = useCallback(async (psId: number, pg: number) => {
    setLoading(true);
    const result = await listFrames(psId, undefined, pg, 50);
    setFrames(result.items);
    setTotalFrames(result.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedPitStop !== "") {
      loadFrames(selectedPitStop, page);
    }
  }, [selectedPitStop, page, loadFrames]);

  // Poll extraction status
  useEffect(() => {
    if (!extracting || jobId === null) return;
    const interval = setInterval(async () => {
      const status = await getExtractionStatus(jobId);
      setExtractionPct(status.progress_pct);
      if (status.status === "completed" || status.status === "failed") {
        setExtracting(false);
        if (status.status === "completed" && selectedPitStop !== "") {
          loadFrames(selectedPitStop, 1);
          setPage(1);
        }
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [extracting, jobId, selectedPitStop, loadFrames]);

  const handleExtract = async () => {
    if (selectedPitStop === "") return;
    setExtracting(true);
    setExtractionPct(0);
    const result = await extractFrames(selectedPitStop, numFrames, strategy);
    setJobId(result.job_id);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === frames.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(frames.map((f) => f.id)));
    }
  };

  const totalPages = Math.ceil(totalFrames / 50);

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Frame Extraction</h1>

      {/* Controls */}
      <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8, marginBottom: 24, border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Video</label>
            <select
              value={selectedPitStop}
              onChange={(e) => {
                setSelectedPitStop(e.target.value ? Number(e.target.value) : "");
                setPage(1);
                setFrames([]);
                setSelectedIds(new Set());
              }}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", minWidth: 250 }}
            >
              <option value="">Select a completed video...</option>
              {pitStops.map((ps) => (
                <option key={ps.id} value={ps.id}>
                  {ps.original_filename} ({ps.duration_sec?.toFixed(1)}s)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Frames</label>
            <input
              type="number"
              value={numFrames}
              onChange={(e) => setNumFrames(Math.max(1, Number(e.target.value)))}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", width: 100 }}
              min={1}
              max={1000}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
            >
              <option value="uniform">Uniform (evenly spaced)</option>
              <option value="random">Random</option>
              <option value="interval">Interval (every Nth)</option>
            </select>
          </div>

          <button
            onClick={handleExtract}
            disabled={selectedPitStop === "" || extracting}
            style={{
              padding: "8px 20px",
              background: selectedPitStop === "" || extracting ? "#9ca3af" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: selectedPitStop === "" || extracting ? "not-allowed" : "pointer",
            }}
          >
            {extracting ? "Extracting..." : "Extract Frames"}
          </button>
        </div>

        {extracting && (
          <div style={{ marginTop: 16 }}>
            <ProgressBar value={extractionPct} label="Extracting frames..." />
          </div>
        )}
      </div>

      {/* Frame grid */}
      {selectedPitStop !== "" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              {totalFrames} frames extracted {selectedIds.size > 0 && `(${selectedIds.size} selected)`}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {frames.length > 0 && (
                <button
                  onClick={selectAll}
                  style={{
                    padding: "6px 14px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {selectedIds.size === frames.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading frames...</div>
          ) : frames.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", background: "#f9fafb", borderRadius: 8 }}>
              No frames extracted yet. Select a video and click "Extract Frames" above.
            </div>
          ) : (
            <FrameGrid
              frames={frames}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onClickFrame={(frame) => navigate(`/annotate/${frame.id}`)}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "6px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  background: page === 1 ? "#f3f4f6" : "#fff",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ padding: "6px 12px", fontSize: 14 }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "6px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  background: page === totalPages ? "#f3f4f6" : "#fff",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
