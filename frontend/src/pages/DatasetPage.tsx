import { useState, useEffect } from "react";
import {
  listDatasets,
  createDataset,
  getDatasetStats,
  splitDataset,
  deleteDataset,
  listFrames,
  addFramesToDataset,
} from "../services/api";
import type { Dataset, DatasetStats, ExtractedFrame } from "../types";

const DEFAULT_CLASSES = [
  "pit_crew",
  "tire",
  "jack",
  "f1_car",
  "pit_box",
  "wheel_gun",
  "helmet",
];

export default function DatasetPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Add frames
  const [labeledFrames, setLabeledFrames] = useState<ExtractedFrame[]>([]);
  const [showAddFrames, setShowAddFrames] = useState(false);

  const [splitRatio, setSplitRatio] = useState(0.8);

  const fetchDatasets = async () => {
    setLoading(true);
    const result = await listDatasets();
    setDatasets(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchStats = async (id: number) => {
    const s = await getDatasetStats(id);
    setStats(s);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDataset(newName.trim(), newDesc, DEFAULT_CLASSES);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    fetchDatasets();
  };

  const handleSelect = async (d: Dataset) => {
    setSelectedDataset(d);
    setStats(null);
    await fetchStats(d.id);
  };

  const handleSplit = async () => {
    if (!selectedDataset) return;
    await splitDataset(selectedDataset.id, splitRatio);
    await fetchStats(selectedDataset.id);
    fetchDatasets();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this dataset and all its files?")) return;
    await deleteDataset(id);
    if (selectedDataset?.id === id) {
      setSelectedDataset(null);
      setStats(null);
    }
    fetchDatasets();
  };

  const loadLabeledFrames = async () => {
    const result = await listFrames(undefined, true, 1, 200);
    setLabeledFrames(result.items);
    setShowAddFrames(true);
  };

  const handleAddFrames = async (frameIds: number[]) => {
    if (!selectedDataset || frameIds.length === 0) return;
    await addFramesToDataset(selectedDataset.id, frameIds);
    setShowAddFrames(false);
    await fetchStats(selectedDataset.id);
    fetchDatasets();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Datasets</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "8px 20px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + New Dataset
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8, marginBottom: 20, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., f1_pitstop_v1"
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", width: 220 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Description</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description"
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", width: 300 }}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              style={{
                padding: "8px 20px",
                background: newName.trim() ? "#10b981" : "#9ca3af",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                cursor: newName.trim() ? "pointer" : "not-allowed",
              }}
            >
              Create
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            Classes: {DEFAULT_CLASSES.join(", ")}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 20 }}>
        {/* Dataset list */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ color: "#9ca3af", padding: 20 }}>Loading...</div>
          ) : datasets.length === 0 ? (
            <div style={{ background: "#f9fafb", padding: 40, textAlign: "center", borderRadius: 8, color: "#9ca3af" }}>
              No datasets yet. Create one to get started.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {datasets.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleSelect(d)}
                  style={{
                    padding: 16,
                    border: selectedDataset?.id === d.id ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    borderRadius: 8,
                    background: "#fff",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{d.name}</div>
                      {d.description && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{d.description}</div>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                      style={{ padding: "4px 10px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                    <span>{d.total_images} images</span>
                    <span>{d.total_labeled} labeled</span>
                    <span>Train: {d.train_count} / Val: {d.val_count}</span>
                    <span>v{d.version}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dataset detail */}
        {selectedDataset && (
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <h3 style={{ marginBottom: 16 }}>{selectedDataset.name}</h3>

              {stats && (
                <>
                  <div style={{ fontSize: 13, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span>Total Images</span>
                      <strong>{stats.total_images}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span>Labeled</span>
                      <strong>{stats.total_labeled}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span>Train / Val</span>
                      <strong>{stats.train_count} / {stats.val_count}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span>Avg annotations/image</span>
                      <strong>{stats.avg_annotations_per_image}</strong>
                    </div>
                  </div>

                  {/* Per-class counts */}
                  <div style={{ fontSize: 13, marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Per-class annotations</div>
                    {Object.entries(stats.per_class_counts).map(([cls, count]) => (
                      <div key={cls} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                        <span>{cls}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Add frames button */}
              <button
                onClick={loadLabeledFrames}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                Add Labeled Frames
              </button>

              {/* Split controls */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  type="range"
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  value={splitRatio}
                  onChange={(e) => setSplitRatio(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, minWidth: 50 }}>{Math.round(splitRatio * 100)}% train</span>
              </div>
              <button
                onClick={handleSplit}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                Split Dataset
              </button>

              {/* Ready indicator */}
              {stats && stats.total_labeled >= 10 && stats.train_count > 0 && stats.val_count > 0 && (
                <div style={{
                  background: "#d1fae5",
                  color: "#065f46",
                  padding: 10,
                  borderRadius: 6,
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: 13,
                }}>
                  Ready for Training
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add frames modal */}
      {showAddFrames && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 500, width: "90%" }}>
            <h3 style={{ marginBottom: 16 }}>Add Labeled Frames</h3>
            {labeledFrames.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No labeled frames found. Label some frames first in the annotation tool.</p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
                  Found {labeledFrames.length} labeled frames. Add all to "{selectedDataset?.name}"?
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowAddFrames(false)}
                    style={{ padding: "8px 16px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddFrames(labeledFrames.map((f) => f.id))}
                    style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                  >
                    Add All ({labeledFrames.length})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
