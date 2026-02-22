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
    """Singleton wrapper around YOLOv8 model."""

    _instance: Optional["YOLODetector"] = None
    _model: Optional[YOLO] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_model(self):
        if self._model is not None:
            return
        model_path = settings.YOLO_MODEL
        logger.info(f"Loading YOLO model: {model_path}")
        self._model = YOLO(model_path)
        logger.info("YOLO model loaded successfully")

    def detect_frame(self, frame: np.ndarray, conf_threshold: float = 0.40) -> list[dict]:
        """Run detection on a single frame.

        Returns list of dicts with keys: class_name, confidence, bbox (x, y, w, h).
        Only returns classes relevant to F1 pit stop analysis.
        """
        if self._model is None:
            self.load_model()

        results = self._model(frame, conf=conf_threshold, verbose=False)
        detections = []

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            for box in boxes:
                class_name = result.names[int(box.cls[0])]
                if class_name not in RELEVANT_CLASSES:
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
