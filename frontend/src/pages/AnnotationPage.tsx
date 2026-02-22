import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getFrameImageUrl,
  getFrameAnnotations,
  annotateFrame,
  listFrames,
} from "../services/api";
import BboxCanvas from "../components/BboxCanvas";
import type { AnnotationLabel, ExtractedFrame } from "../types";

const F1_CLASSES = [
  "pit_crew",
  "tire",
  "jack",
  "f1_car",
  "pit_box",
  "wheel_gun",
  "helmet",
];

const CLASS_COLORS: Record<string, string> = {
  pit_crew: "#ef4444",
  tire: "#3b82f6",
  jack: "#f59e0b",
  f1_car: "#10b981",
  pit_box: "#8b5cf6",
  wheel_gun: "#ec4899",
  helmet: "#06b6d4",
};

export default function AnnotationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const frameId = Number(id);

  const [annotations, setAnnotations] = useState<AnnotationLabel[]>([]);
  const [selectedClass, setSelectedClass] = useState(F1_CLASSES[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sibling frames for navigation
  const [siblingIds, setSiblingIds] = useState<number[]>([]);
  const [currentFrame, setCurrentFrame] = useState<ExtractedFrame | null>(null);

  // Load annotations
  useEffect(() => {
    if (!frameId) return;
    getFrameAnnotations(frameId).then((res) => {
      setAnnotations(res.labels);
      setSaved(false);
    });
  }, [frameId]);

  // Load sibling frame IDs for navigation
  useEffect(() => {
    if (!frameId) return;
    // Fetch frames from same pit stop to enable next/prev
    listFrames(undefined, undefined, 1, 200).then((res) => {
      const ids = res.items.map((f) => f.id);
      setSiblingIds(ids);
      const frame = res.items.find((f) => f.id === frameId);
      if (frame) setCurrentFrame(frame);
    });
  }, [frameId]);

  const handleSave = async () => {
    setSaving(true);
    await annotateFrame(frameId, annotations);
    setSaving(false);
    setSaved(true);
  };

  const currentIdx = siblingIds.indexOf(frameId);
  const prevId = currentIdx > 0 ? siblingIds[currentIdx - 1] : null;
  const nextId = currentIdx < siblingIds.length - 1 ? siblingIds[currentIdx + 1] : null;

  const goToFrame = (id: number) => {
    navigate(`/annotate/${id}`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <button
            onClick={() => navigate("/frames")}
            style={{
              padding: "6px 14px",
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              marginRight: 12,
            }}
          >
            Back to Frames
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            Annotate Frame #{currentFrame?.frame_number ?? frameId}
          </span>
          {currentFrame && (
            <span style={{ marginLeft: 12, fontSize: 14, color: "#6b7280" }}>
              ({currentFrame.timestamp_sec.toFixed(2)}s)
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => prevId && goToFrame(prevId)}
            disabled={!prevId}
            style={{
              padding: "6px 14px",
              background: prevId ? "#fff" : "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: prevId ? "pointer" : "not-allowed",
            }}
          >
            Previous
          </button>
          <button
            onClick={() => nextId && goToFrame(nextId)}
            disabled={!nextId}
            style={{
              padding: "6px 14px",
              background: nextId ? "#fff" : "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: nextId ? "pointer" : "not-allowed",
            }}
          >
            Next
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Canvas area */}
        <div style={{ flex: 1 }}>
          <BboxCanvas
            imageUrl={getFrameImageUrl(frameId)}
            annotations={annotations}
            selectedClass={selectedClass}
            onAnnotationsChange={(anns) => {
              setAnnotations(anns);
              setSaved(false);
            }}
          />
        </div>

        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0 }}>
          {/* Class selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Class</div>
            {F1_CLASSES.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  marginBottom: 4,
                  borderRadius: 6,
                  border: selectedClass === cls ? `2px solid ${CLASS_COLORS[cls]}` : "1px solid #e5e7eb",
                  background: selectedClass === cls ? `${CLASS_COLORS[cls]}15` : "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: selectedClass === cls ? 700 : 400,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: CLASS_COLORS[cls],
                    marginRight: 8,
                    verticalAlign: "middle",
                  }}
                />
                {cls}
              </button>
            ))}
          </div>

          {/* Annotation count */}
          <div style={{
            background: "#f9fafb",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Annotations ({annotations.length})
            </div>
            {F1_CLASSES.map((cls) => {
              const count = annotations.filter((a) => a.class_name === cls).length;
              if (count === 0) return null;
              return (
                <div key={cls} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ color: CLASS_COLORS[cls] }}>{cls}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px 0",
              background: saved ? "#10b981" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Annotations"}
          </button>
        </div>
      </div>
    </div>
  );
}
