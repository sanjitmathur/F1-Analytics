import logging
from pathlib import Path
from typing import Optional

import numpy as np
from ultralytics import YOLO

from ..config import settings

logger = logging.getLogger(__name__)


# COCO classes relevant to F1 pit stop analysis
RELEVANT_CLASSES = {
    "person", "car", "truck", "bus",
    "bicycle", "motorcycle",  # wheels/equipment occasionally matched
    "backpack", "handbag", "suitcase",  # equipment mismatches
    "sports ball",  # tyre sometimes matched
    "bottle",
}


class YOLODetector:
    """Multi-model registry supporting COCO base and custom trained models."""

    _instance: Optional["YOLODetector"] = None
    _models: dict[str, YOLO]
    _model_metadata: dict[str, dict]
    _active_model: str

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._models = {}
            cls._instance._model_metadata = {}
            cls._instance._active_model = "default"
        return cls._instance

    def load_model(self, name: str = "default", path: str | None = None):
        """Load a model by name. Default loads the COCO base model."""
        if name in self._models:
            return
        model_path = path or settings.YOLO_MODEL
        logger.info(f"Loading YOLO model '{name}': {model_path}")
        self._models[name] = YOLO(model_path)
        self._model_metadata[name] = {
            "path": model_path,
            "type": "custom" if path else "coco",
        }
        logger.info(f"YOLO model '{name}' loaded successfully")

    def set_active_model(self, name: str):
        if name not in self._models:
            raise ValueError(f"Model '{name}' not loaded")
        self._active_model = name
        logger.info(f"Active model set to '{name}'")

    def get_active_model_name(self) -> str:
        return self._active_model

    def list_models(self) -> list[dict]:
        return [
            {"name": name, **meta}
            for name, meta in self._model_metadata.items()
        ]

    def detect_frame(
        self,
        frame: np.ndarray,
        conf_threshold: float = 0.40,
        model_name: str | None = None,
    ) -> list[dict]:
        """Run detection on a single frame.

        Returns list of dicts with keys: class_name, confidence, bbox (x, y, w, h).
        Uses active model unless model_name is specified.
        """
        name = model_name or self._active_model

        if name not in self._models:
            if name == "default":
                self.load_model(name)
            else:
                raise ValueError(f"Model '{name}' not loaded")

        model = self._models[name]
        meta = self._model_metadata.get(name, {})
        is_coco = meta.get("type") == "coco"

        results = model(frame, conf=conf_threshold, verbose=False)
        detections = []

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            for box in boxes:
                class_name = result.names[int(box.cls[0])]
                # For COCO model, filter to relevant classes only
                if is_coco and class_name not in RELEVANT_CLASSES:
                    continue
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                w = x2 - x1
                h = y2 - y1
                detections.append({
                    "class_name": class_name,
                    "confidence": round(float(box.conf[0]), 4),
                    "bbox_x": round(x1, 2),
                    "bbox_y": round(y1, 2),
                    "bbox_w": round(w, 2),
                    "bbox_h": round(h, 2),
                })

        return detections


detector = YOLODetector()
