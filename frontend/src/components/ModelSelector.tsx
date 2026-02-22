import { useState, useEffect } from "react";
import { listModels, getActiveModel, setActiveModel } from "../services/api";
import type { ModelInfo } from "../types";

interface ModelSelectorProps {
  onModelChange?: (modelName: string) => void;
}

export default function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([listModels(), getActiveModel()]).then(([m, a]) => {
      setModels(m);
      setActive(a.name);
    });
  }, []);

  const handleChange = async (name: string) => {
    setLoading(true);
    await setActiveModel(name);
    setActive(name);
    setLoading(false);
    onModelChange?.(name);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Model:</span>
      <select
        value={active}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #d1d5db",
          fontSize: 13,
        }}
      >
        {models.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name} ({m.type})
          </option>
        ))}
      </select>
      {loading && <span style={{ fontSize: 12, color: "#9ca3af" }}>Switching...</span>}
    </div>
  );
}
