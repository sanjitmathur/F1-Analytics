import json
import logging
import random
import shutil
from pathlib import Path

import yaml

from ..config import settings
from ..database import get_sync_db
from ..models import Dataset, ExtractedFrame

logger = logging.getLogger(__name__)


def create_dataset_sync(name: str, description: str, class_names: list[str]) -> Dataset:
    """Create a new dataset with directory structure."""
    db = get_sync_db()
    try:
        base_dir = Path(settings.DATASETS_DIR) / name
        base_dir.mkdir(parents=True, exist_ok=True)
        (base_dir / "images" / "train").mkdir(parents=True, exist_ok=True)
        (base_dir / "images" / "val").mkdir(parents=True, exist_ok=True)
        (base_dir / "labels" / "train").mkdir(parents=True, exist_ok=True)
        (base_dir / "labels" / "val").mkdir(parents=True, exist_ok=True)

        dataset = Dataset(
            name=name,
            description=description,
            class_names=json.dumps(class_names),
            directory_path=name,
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        return dataset
    finally:
        db.close()


def add_frames_to_dataset_sync(dataset_id: int, frame_ids: list[int]):
    """Copy labeled frames into the dataset images directory."""
    db = get_sync_db()
    try:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            raise ValueError("Dataset not found")

        base_dir = Path(settings.DATASETS_DIR) / dataset.directory_path
        images_dir = base_dir / "images" / "train"  # Default to train, split later
        labels_dir = base_dir / "labels" / "train"

        added = 0
        for fid in frame_ids:
            frame = db.query(ExtractedFrame).filter(ExtractedFrame.id == fid).first()
            if not frame:
                continue

            src_img = Path(settings.EXTRACTED_FRAMES_DIR) / frame.file_path
            src_label = src_img.with_suffix(".txt")

            if not src_img.exists():
                continue

            # Copy image
            dst_img = images_dir / src_img.name
            shutil.copy2(str(src_img), str(dst_img))

            # Copy label if exists
            if src_label.exists():
                dst_label = labels_dir / src_label.name
                shutil.copy2(str(src_label), str(dst_label))

            frame.dataset_id = dataset_id
            added += 1

        dataset.total_images += added
        dataset.total_labeled += sum(
            1 for fid in frame_ids
            if db.query(ExtractedFrame).filter(ExtractedFrame.id == fid, ExtractedFrame.is_labeled.is_(True)).first()
        )
        db.commit()
        logger.info(f"Added {added} frames to dataset {dataset.name}")
    finally:
        db.close()


def split_dataset_sync(dataset_id: int, train_ratio: float = 0.8):
    """Split dataset images into train/val sets."""
    db = get_sync_db()
    try:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            raise ValueError("Dataset not found")

        base_dir = Path(settings.DATASETS_DIR) / dataset.directory_path
        train_imgs = base_dir / "images" / "train"
        val_imgs = base_dir / "images" / "val"
        train_labels = base_dir / "labels" / "train"
        val_labels = base_dir / "labels" / "val"

        # Move all val images back to train first (re-split)
        for img_file in val_imgs.glob("*.jpg"):
            shutil.move(str(img_file), str(train_imgs / img_file.name))
        for lbl_file in val_labels.glob("*.txt"):
            shutil.move(str(lbl_file), str(train_labels / lbl_file.name))

        # Get all images in train
        all_images = sorted(train_imgs.glob("*.jpg"))
        random.shuffle(all_images)

        split_idx = int(len(all_images) * train_ratio)
        val_images = all_images[split_idx:]

        # Move val split
        for img_file in val_images:
            shutil.move(str(img_file), str(val_imgs / img_file.name))
            label_file = train_labels / img_file.with_suffix(".txt").name
            if label_file.exists():
                shutil.move(str(label_file), str(val_labels / label_file.name))

        train_count = split_idx
        val_count = len(val_images)
        dataset.train_count = train_count
        dataset.val_count = val_count
        db.commit()

        # Generate data.yaml
        _generate_data_yaml(dataset, base_dir)

        logger.info(f"Split dataset {dataset.name}: {train_count} train, {val_count} val")
    finally:
        db.close()


def get_dataset_stats_sync(dataset_id: int) -> dict:
    """Get detailed statistics for a dataset."""
    db = get_sync_db()
    try:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            raise ValueError("Dataset not found")

        base_dir = Path(settings.DATASETS_DIR) / dataset.directory_path
        class_names = json.loads(dataset.class_names)

        # Count per-class annotations
        per_class_counts: dict[str, int] = {c: 0 for c in class_names}
        total_annotations = 0
        labeled_count = 0

        for split in ("train", "val"):
            labels_dir = base_dir / "labels" / split
            for label_file in labels_dir.glob("*.txt"):
                content = label_file.read_text().strip()
                if not content:
                    continue
                labeled_count += 1
                for line in content.split("\n"):
                    parts = line.strip().split()
                    if len(parts) >= 1:
                        class_id = int(parts[0])
                        if 0 <= class_id < len(class_names):
                            per_class_counts[class_names[class_id]] += 1
                        total_annotations += 1

        total_images = len(list((base_dir / "images" / "train").glob("*.jpg"))) + \
                       len(list((base_dir / "images" / "val").glob("*.jpg")))
        avg_ann = total_annotations / labeled_count if labeled_count > 0 else 0

        return {
            "total_images": total_images,
            "total_labeled": labeled_count,
            "train_count": dataset.train_count,
            "val_count": dataset.val_count,
            "per_class_counts": per_class_counts,
            "avg_annotations_per_image": round(avg_ann, 1),
        }
    finally:
        db.close()


def _generate_data_yaml(dataset: Dataset, base_dir: Path):
    """Generate the YOLO data.yaml configuration file."""
    class_names = json.loads(dataset.class_names)
    data_config = {
        "path": str(base_dir.resolve()),
        "train": "images/train",
        "val": "images/val",
        "nc": len(class_names),
        "names": class_names,
    }
    yaml_path = base_dir / "data.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(data_config, f, default_flow_style=False)
    logger.info(f"Generated data.yaml at {yaml_path}")
