import { useState, useEffect } from "react";
import {
  listDatasets,
  startTraining,
  listTrainingRuns,
  getTrainingProgress,
} from "../services/api";
import ProgressBar from "../components/ProgressBar";
import TrainingLossChart from "../components/TrainingLossChart";
import MapChart from "../components/MapChart";
import type { Dataset, TrainingRun, TrainingProgress } from "../types";

export default function TrainingPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [runs, setRuns] = useState<TrainingRun[]>([]);
  const [activeProgress, setActiveProgress] = useState<TrainingProgress | null>(null);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);

  // Training config form
  const [datasetId, setDatasetId] = useState<number | "">("");
  const [modelName, setModelName] = useState("");
  const [baseModel, setBaseModel] = useState("yolov8s.pt");
  const [epochs, setEpochs] = useState(100);
  const [batchSize, setBatchSize] = useState(16);
  const [imageSize, setImageSize] = useState(640);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    listDatasets().then(setDatasets);
    listTrainingRuns().then(setRuns);
  }, []);

  // Poll active training
  useEffect(() => {
    if (activeRunId === null) return;
    const interval = setInterval(async () => {
      const progress = await getTrainingProgress(activeRunId);
      setActiveProgress(progress);
      if (progress.status === "completed" || progress.status === "failed") {
        clearInterval(interval);
        listTrainingRuns().then(setRuns);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeRunId]);

  // Auto-detect active training run on load
  useEffect(() => {
    const active = runs.find((r) => r.status === "training" || r.status === "pending");
    if (active) {
      setActiveRunId(active.id);
    }
  }, [runs]);

  const handleStart = async () => {
    if (datasetId === "" || !modelName.trim()) return;
    setStarting(true);
    const result = await startTraining({
      dataset_id: datasetId as number,
      model_name: modelName.trim(),
      base_model: baseModel,
      epochs,
      batch_size: batchSize,
      image_size: imageSize,
    });
    setActiveRunId(result.training_run_id);
    setActiveProgress({ status: "pending", current_epoch: 0, total_epochs: epochs, progress_pct: 0, train_loss: null, val_map50: null, val_map50_95: null, loss_history: null });
    setStarting(false);
    listTrainingRuns().then(setRuns);
  };

  const formatTime = (sec: number | null) => {
    if (sec === null) return "-";
    const mins = Math.floor(sec / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m ${Math.round(sec % 60)}s`;
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Training</h1>

      {/* Start Training Form */}
      <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8, marginBottom: 24, border: "1px solid #e5e7eb" }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Start New Training</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Dataset</label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value ? Number(e.target.value) : "")}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", minWidth: 200 }}
            >
              <option value="">Select dataset...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.total_images} images)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Model Name</label>
            <input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., f1_pitstop_v1"
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", width: 180 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Base Model</label>
            <select
              value={baseModel}
              onChange={(e) => setBaseModel(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
            >
              <option value="yolov8n.pt">YOLOv8n (Nano - fast, less accurate)</option>
              <option value="yolov8s.pt">YOLOv8s (Small - recommended)</option>
              <option value="yolov8m.pt">YOLOv8m (Medium - slow, most accurate)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Epochs</label>
            <input
              type="number"
              value={epochs}
              onChange={(e) => setEpochs(Number(e.target.value))}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", width: 80 }}
              min={5}
              max={500}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Batch Size</label>
            <input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", width: 80 }}
              min={1}
              max={64}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Image Size</label>
            <select
              value={imageSize}
              onChange={(e) => setImageSize(Number(e.target.value))}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
            >
              <option value={320}>320px</option>
              <option value={640}>640px</option>
            </select>
          </div>

          <button
            onClick={handleStart}
            disabled={datasetId === "" || !modelName.trim() || starting}
            style={{
              padding: "8px 24px",
              background: datasetId === "" || !modelName.trim() || starting ? "#9ca3af" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: datasetId === "" || !modelName.trim() || starting ? "not-allowed" : "pointer",
            }}
          >
            {starting ? "Starting..." : "Start Training"}
          </button>
        </div>
      </div>

      {/* Active Training Progress */}
      {activeProgress && activeProgress.status === "training" && (
        <div style={{ background: "#fff", padding: 20, borderRadius: 8, marginBottom: 24, border: "2px solid #3b82f6" }}>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>
            Training in Progress
            <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280", marginLeft: 8 }}>
              Epoch {activeProgress.current_epoch} / {activeProgress.total_epochs}
            </span>
          </h3>

          <ProgressBar value={activeProgress.progress_pct} label={`${activeProgress.progress_pct}%`} />

          {/* Live metrics */}
          <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 14 }}>
            {activeProgress.train_loss !== null && (
              <div>
                <span style={{ color: "#6b7280" }}>Loss: </span>
                <strong>{activeProgress.train_loss.toFixed(4)}</strong>
              </div>
            )}
            {activeProgress.val_map50 !== null && (
              <div>
                <span style={{ color: "#6b7280" }}>mAP@50: </span>
                <strong>{(activeProgress.val_map50 * 100).toFixed(1)}%</strong>
              </div>
            )}
          </div>

          {/* Charts */}
          {activeProgress.loss_history && activeProgress.loss_history.length > 1 && (
            <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <TrainingLossChart data={activeProgress.loss_history} />
              </div>
              <div style={{ flex: 1 }}>
                <MapChart data={activeProgress.loss_history} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Training History */}
      <h3 style={{ marginBottom: 12, fontSize: 16 }}>Training History</h3>
      {runs.length === 0 ? (
        <div style={{ background: "#f9fafb", padding: 40, textAlign: "center", borderRadius: 8, color: "#9ca3af" }}>
          No training runs yet. Configure and start training above.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>Model</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>Base</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>Status</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>Epochs</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>mAP@50</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>Precision</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>Recall</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.id}
                style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                onClick={() => {
                  if (run.status === "training") setActiveRunId(run.id);
                }}
              >
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{run.model_name}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "#6b7280" }}>{run.base_model}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background:
                        run.status === "completed" ? "#d1fae5" :
                        run.status === "training" ? "#dbeafe" :
                        run.status === "failed" ? "#fee2e2" : "#f3f4f6",
                      color:
                        run.status === "completed" ? "#065f46" :
                        run.status === "training" ? "#1e40af" :
                        run.status === "failed" ? "#991b1b" : "#6b7280",
                    }}
                  >
                    {run.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{run.current_epoch}/{run.epochs}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
                  {run.best_map50 !== null ? `${(run.best_map50 * 100).toFixed(1)}%` : "-"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>
                  {run.precision !== null ? `${(run.precision * 100).toFixed(1)}%` : "-"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>
                  {run.recall !== null ? `${(run.recall * 100).toFixed(1)}%` : "-"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "#6b7280" }}>
                  {formatTime(run.training_time_sec)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
