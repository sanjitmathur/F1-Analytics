import { useState, useEffect, useCallback, useMemo } from "react";
import {
  listPitStops,
  listModels,
  getModelsUsed,
  getPreviewFrameUrl,
  getSummariesByModel,
  reprocessPitStop,
  getPitStopStatus,
} from "../services/api";
import type { PitStop, ModelInfo, DetectionSummary } from "../types";

export default function ComparisonPage() {
  const [pitStops, setPitStops] = useState<PitStop[]>([]);
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  const [selectedPitStop, setSelectedPitStop] = useState<number | "">("");
  const [modelsUsed, setModelsUsed] = useState<string[]>([]);
  const [modelA, setModelA] = useState("");
  const [modelB, setModelB] = useState("");
  const [frameNumber, setFrameNumber] = useState(0);
  const [summariesA, setSummariesA] = useState<DetectionSummary[]>([]);
  const [summariesB, setSummariesB] = useState<DetectionSummary[]>([]);
  const [runningModel, setRunningModel] = useState<string | null>(null);
  const [imgKeyA, setImgKeyA] = useState(0);
  const [imgKeyB, setImgKeyB] = useState(0);

  useEffect(() => {
    listPitStops().then((all) =>
      setPitStops(all.filter((ps) => ps.status === "completed"))
    );
    listModels().then(setAllModels);
  }, []);

  const loadModelsUsed = useCallback(async (psId: number) => {
    const { models } = await getModelsUsed(psId);
    setModelsUsed(models);
    setModelA(models.length >= 1 ? models[0] : "");
    setModelB(models.length >= 2 ? models[1] : "");
  }, []);

  useEffect(() => {
    if (selectedPitStop === "") return;
    loadModelsUsed(selectedPitStop);
  }, [selectedPitStop, loadModelsUsed]);

  useEffect(() => {
    if (selectedPitStop === "" || !modelA) {
      setSummariesA([]);
      return;
    }
    getSummariesByModel(selectedPitStop, modelA).then(setSummariesA);
  }, [selectedPitStop, modelA]);

  useEffect(() => {
    if (selectedPitStop === "" || !modelB) {
      setSummariesB([]);
      return;
    }
    getSummariesByModel(selectedPitStop, modelB).then(setSummariesB);
  }, [selectedPitStop, modelB]);

  const selectedPs = pitStops.find((ps) => ps.id === selectedPitStop);
  const totalFrames = selectedPs?.total_frames || 0;

  const allClassNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...summariesA.map((s) => s.class_name),
          ...summariesB.map((s) => s.class_name),
        ])
      ).sort(),
    [summariesA, summariesB]
  );

  const handleRunModel = async (modelName: string, side: "A" | "B") => {
    if (selectedPitStop === "") return;
    setRunningModel(modelName);
    try {
      await reprocessPitStop(selectedPitStop, modelName);
      const poll = async () => {
        const status = await getPitStopStatus(selectedPitStop as number);
        if (status.status === "completed") {
          await loadModelsUsed(selectedPitStop as number);
          if (side === "A") {
            setSummariesA(
              await getSummariesByModel(
                selectedPitStop as number,
                modelName
              )
            );
            setImgKeyA((k) => k + 1);
          } else {
            setSummariesB(
              await getSummariesByModel(
                selectedPitStop as number,
                modelName
              )
            );
            setImgKeyB((k) => k + 1);
          }
          setRunningModel(null);
        } else {
          setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 2000);
    } catch {
      setRunningModel(null);
    }
  };

  const modelOptions = useMemo(
    () =>
      Array.from(
        new Set([...modelsUsed, ...allModels.map((m) => m.name)])
      ),
    [modelsUsed, allModels]
  );

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Model Comparison</h1>

      {/* Controls */}
      <div
        style={{
          background: "#f9fafb",
          padding: 20,
          borderRadius: 8,
          marginBottom: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Video
            </label>
            <select
              value={selectedPitStop}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : "";
                setSelectedPitStop(val);
                if (val !== "") {
                  const ps = pitStops.find((p) => p.id === val);
                  if (ps)
                    setFrameNumber(Math.floor((ps.total_frames || 0) / 2));
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                minWidth: 250,
              }}
            >
              <option value="">Select a video...</option>
              {pitStops.map((ps) => (
                <option key={ps.id} value={ps.id}>
                  {ps.original_filename}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Frame: {frameNumber}
            </label>
            <input
              type="range"
              min={0}
              max={totalFrames > 0 ? totalFrames - 1 : 0}
              value={frameNumber}
              onChange={(e) => setFrameNumber(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Frame #
            </label>
            <input
              type="number"
              value={frameNumber}
              onChange={(e) => setFrameNumber(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                width: 100,
              }}
              min={0}
              max={totalFrames > 0 ? totalFrames - 1 : 0}
            />
          </div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      {selectedPitStop !== "" && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            {/* Model A */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Model A:
                </label>
                <select
                  value={modelA}
                  onChange={(e) => setModelA(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    flex: 1,
                  }}
                >
                  <option value="">Select model...</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                      {modelsUsed.includes(m) ? "" : " (not yet run)"}
                    </option>
                  ))}
                </select>
                {modelA && !modelsUsed.includes(modelA) && (
                  <button
                    onClick={() => handleRunModel(modelA, "A")}
                    disabled={runningModel !== null}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: "#3b82f6",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: runningModel ? 0.5 : 1,
                    }}
                  >
                    {runningModel === modelA ? "Running..." : "Run"}
                  </button>
                )}
              </div>
              {modelA && modelsUsed.includes(modelA) ? (
                <img
                  src={getPreviewFrameUrl(
                    selectedPitStop as number,
                    frameNumber,
                    modelA
                  )}
                  alt={`Model A: ${modelA}`}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "2px solid #3b82f6",
                  }}
                  key={`a-${selectedPitStop}-${frameNumber}-${modelA}-${imgKeyA}`}
                />
              ) : (
                <div
                  style={{
                    background: "#f3f4f6",
                    borderRadius: 8,
                    padding: 40,
                    textAlign: "center",
                    color: "#9ca3af",
                    border: "2px dashed #d1d5db",
                    minHeight: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {modelA
                    ? 'Click "Run" to process this video with the selected model'
                    : "Select a model"}
                </div>
              )}
            </div>

            {/* Model B */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Model B:
                </label>
                <select
                  value={modelB}
                  onChange={(e) => setModelB(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    flex: 1,
                  }}
                >
                  <option value="">Select model...</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                      {modelsUsed.includes(m) ? "" : " (not yet run)"}
                    </option>
                  ))}
                </select>
                {modelB && !modelsUsed.includes(modelB) && (
                  <button
                    onClick={() => handleRunModel(modelB, "B")}
                    disabled={runningModel !== null}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: "#8b5cf6",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: runningModel ? 0.5 : 1,
                    }}
                  >
                    {runningModel === modelB ? "Running..." : "Run"}
                  </button>
                )}
              </div>
              {modelB && modelsUsed.includes(modelB) ? (
                <img
                  src={getPreviewFrameUrl(
                    selectedPitStop as number,
                    frameNumber,
                    modelB
                  )}
                  alt={`Model B: ${modelB}`}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "2px solid #8b5cf6",
                  }}
                  key={`b-${selectedPitStop}-${frameNumber}-${modelB}-${imgKeyB}`}
                />
              ) : (
                <div
                  style={{
                    background: "#f3f4f6",
                    borderRadius: 8,
                    padding: 40,
                    textAlign: "center",
                    color: "#9ca3af",
                    border: "2px dashed #d1d5db",
                    minHeight: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {modelB
                    ? 'Click "Run" to process this video with the selected model'
                    : "Select a model"}
                </div>
              )}
            </div>
          </div>

          {/* Detection comparison table */}
          {modelA &&
            modelB &&
            modelsUsed.includes(modelA) &&
            modelsUsed.includes(modelB) &&
            allClassNames.length > 0 && (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    padding: "12px 16px",
                    background: "#f9fafb",
                    fontSize: 14,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Detection Count Comparison
                </h3>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f3f4f6" }}>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Class
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          borderBottom: "1px solid #e5e7eb",
                          color: "#3b82f6",
                        }}
                      >
                        {modelA} (Total)
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          borderBottom: "1px solid #e5e7eb",
                          color: "#3b82f6",
                        }}
                      >
                        {modelA} (Max/Frame)
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          borderBottom: "1px solid #e5e7eb",
                          color: "#3b82f6",
                        }}
                      >
                        {modelA} (Avg Conf)
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          borderBottom: "1px solid #e5e7eb",
                          color: "#8b5cf6",
                        }}
                      >
                        {modelB} (Total)
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          borderBottom: "1px solid #e5e7eb",
                          color: "#8b5cf6",
                        }}
                      >
                        {modelB} (Max/Frame)
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          borderBottom: "1px solid #e5e7eb",
                          color: "#8b5cf6",
                        }}
                      >
                        {modelB} (Avg Conf)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allClassNames.map((cls) => {
                      const sA = summariesA.find((s) => s.class_name === cls);
                      const sB = summariesB.find((s) => s.class_name === cls);
                      return (
                        <tr key={cls}>
                          <td
                            style={{
                              padding: "8px 16px",
                              fontWeight: 600,
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {cls}
                          </td>
                          <td
                            style={{
                              padding: "8px 16px",
                              textAlign: "center",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {sA?.total_count ?? "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 16px",
                              textAlign: "center",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {sA?.max_per_frame ?? "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 16px",
                              textAlign: "center",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {sA
                              ? `${(sA.avg_confidence * 100).toFixed(1)}%`
                              : "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 16px",
                              textAlign: "center",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {sB?.total_count ?? "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 16px",
                              textAlign: "center",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {sB?.max_per_frame ?? "-"}
                          </td>
                          <td
                            style={{
                              padding: "8px 16px",
                              textAlign: "center",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {sB
                              ? `${(sB.avg_confidence * 100).toFixed(1)}%`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </>
      )}

      {selectedPitStop === "" && (
        <div
          style={{
            background: "#f9fafb",
            padding: 40,
            textAlign: "center",
            borderRadius: 8,
            color: "#9ca3af",
          }}
        >
          Select a video above to compare model detections side-by-side.
        </div>
      )}
    </div>
  );
}
