import { useRef, useState, useEffect, useCallback } from "react";
import type { AnnotationLabel } from "../types";

const CLASS_COLORS: Record<string, string> = {
  pit_crew: "#ef4444",
  tire: "#3b82f6",
  jack: "#f59e0b",
  f1_car: "#10b981",
  pit_box: "#8b5cf6",
  wheel_gun: "#ec4899",
  helmet: "#06b6d4",
};

interface BboxCanvasProps {
  imageUrl: string;
  annotations: AnnotationLabel[];
  selectedClass: string;
  onAnnotationsChange: (annotations: AnnotationLabel[]) => void;
}

export default function BboxCanvas({
  imageUrl,
  annotations,
  selectedClass,
  onAnnotationsChange,
}: BboxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.drawImage(img, 0, 0);

    // Draw existing annotations
    for (const ann of annotations) {
      const color = CLASS_COLORS[ann.class_name] || "#fff";
      const x = ann.bbox_x * canvas.width;
      const y = ann.bbox_y * canvas.height;
      const w = ann.bbox_w * canvas.width;
      const h = ann.bbox_h * canvas.height;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      // Label background
      ctx.fillStyle = color;
      const labelText = ann.class_name;
      ctx.font = "bold 14px sans-serif";
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillRect(x, y - 20, textWidth + 8, 20);

      ctx.fillStyle = "#fff";
      ctx.fillText(labelText, x + 4, y - 5);
    }

    // Draw current selection box
    if (drawing) {
      const color = CLASS_COLORS[selectedClass] || "#fff";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(
        startPos.x,
        startPos.y,
        currentPos.x - startPos.x,
        currentPos.y - startPos.y
      );
      ctx.setLineDash([]);
    }
  }, [annotations, drawing, startPos, currentPos, selectedClass, imgLoaded]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    setStartPos(coords);
    setCurrentPos(coords);
    setDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    setCurrentPos(getCanvasCoords(e));
  };

  const handleMouseUp = () => {
    if (!drawing || !canvasRef.current) return;
    setDrawing(false);

    const canvas = canvasRef.current;
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(currentPos.x - startPos.x);
    const h = Math.abs(currentPos.y - startPos.y);

    // Ignore tiny boxes (accidental clicks)
    if (w < 5 || h < 5) return;

    // Normalize to 0-1
    const newLabel: AnnotationLabel = {
      class_name: selectedClass,
      bbox_x: x / canvas.width,
      bbox_y: y / canvas.height,
      bbox_w: w / canvas.width,
      bbox_h: h / canvas.height,
    };

    onAnnotationsChange([...annotations, newLabel]);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const coords = getCanvasCoords(e);

    // Find and remove the annotation under the click
    const updated = annotations.filter((ann) => {
      const ax = ann.bbox_x * canvas.width;
      const ay = ann.bbox_y * canvas.height;
      const aw = ann.bbox_w * canvas.width;
      const ah = ann.bbox_h * canvas.height;
      return !(coords.x >= ax && coords.x <= ax + aw && coords.y >= ay && coords.y <= ay + ah);
    });

    if (updated.length !== annotations.length) {
      onAnnotationsChange(updated);
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleRightClick}
        style={{
          width: "100%",
          maxHeight: "70vh",
          objectFit: "contain",
          cursor: "crosshair",
          borderRadius: 8,
          border: "1px solid #d1d5db",
        }}
      />
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
        Left-click and drag to draw a box. Right-click a box to delete it.
      </div>
    </div>
  );
}
