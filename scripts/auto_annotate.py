"""Auto-annotate extracted frames using a COCO YOLO model.

Maps COCO classes to F1 pit stop classes and writes YOLO-format label files.
Uses yolov8s for better accuracy than yolov8n, with a lower confidence threshold.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import cv2
import numpy as np
from ultralytics import YOLO

# F1 class mapping
F1_CLASSES = ["pit_crew", "tire", "jack", "f1_car", "pit_box", "wheel_gun", "helmet"]
F1_CLASS_TO_ID = {name: idx for idx, name in enumerate(F1_CLASSES)}

# COCO class -> F1 class mapping
COCO_TO_F1 = {
    "person": "pit_crew",
    "car": "f1_car",
    "truck": "f1_car",
    "bus": "f1_car",
    "sports ball": "tire",
    "backpack": "tire",
    "suitcase": "tire",
    "handbag": "tire",
    "bicycle": "jack",
    "motorcycle": "jack",
}


def auto_annotate_frames(frames_dir: str, conf_threshold: float = 0.20):
    """Auto-annotate all frames in a directory."""
    frames_path = Path(frames_dir)
    if not frames_path.exists():
        print(f"Directory not found: {frames_dir}")
        return

    # Use yolov8s for better accuracy
    print("Loading YOLOv8s model...")
    model = YOLO("yolov8s.pt")

    image_files = sorted(frames_path.rglob("*.jpg"))
    print(f"Found {len(image_files)} images to annotate")

    total_annotations = 0
    labeled_count = 0

    for img_path in image_files:
        label_path = img_path.with_suffix(".txt")

        # Skip if already labeled
        if label_path.exists() and label_path.stat().st_size > 0:
            labeled_count += 1
            continue

        img = cv2.imread(str(img_path))
        if img is None:
            continue

        h, w = img.shape[:2]

        # Run detection with lower threshold
        results = model(img, conf=conf_threshold, verbose=False)

        lines = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                class_name = result.names[int(box.cls[0])]
                confidence = float(box.conf[0])

                # Map COCO class to F1 class
                f1_class = COCO_TO_F1.get(class_name)
                if f1_class is None:
                    continue

                class_id = F1_CLASS_TO_ID[f1_class]

                # Convert to normalized YOLO format (center_x, center_y, width, height)
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cx = ((x1 + x2) / 2) / w
                cy = ((y1 + y2) / 2) / h
                bw = (x2 - x1) / w
                bh = (y2 - y1) / h

                # Clamp to [0, 1]
                cx = max(0, min(1, cx))
                cy = max(0, min(1, cy))
                bw = max(0, min(1, bw))
                bh = max(0, min(1, bh))

                # Skip very small or very large detections
                if bw < 0.01 or bh < 0.01 or bw > 0.95 or bh > 0.95:
                    continue

                lines.append(f"{class_id} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

        if lines:
            label_path.write_text("\n".join(lines))
            total_annotations += len(lines)
            labeled_count += 1
            print(f"  {img_path.name}: {len(lines)} annotations")
        else:
            # Write empty file so we know it was processed
            label_path.write_text("")

    print(f"\nDone! Labeled {labeled_count} images with {total_annotations} total annotations")


if __name__ == "__main__":
    # Find extracted frames directory
    project_root = Path(__file__).resolve().parent.parent
    frames_dir = project_root / "data" / "extracted_frames"

    print(f"Scanning: {frames_dir}")
    # Process all subdirectories
    subdirs = [d for d in frames_dir.iterdir() if d.is_dir()] if frames_dir.exists() else []

    if not subdirs:
        print("No frame directories found. Extract frames first.")
        sys.exit(1)

    for subdir in subdirs:
        print(f"\n--- Processing {subdir.name} ---")
        auto_annotate_frames(str(subdir))
