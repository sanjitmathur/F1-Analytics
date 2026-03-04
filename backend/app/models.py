from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class PitStop(Base):
    __tablename__ = "pit_stops"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    source_url = Column(String, nullable=True)
    status = Column(String, default="pending")  # downloading, pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    duration_sec = Column(Float, nullable=True)
    total_frames = Column(Integer, nullable=True)
    processed_frames = Column(Integer, default=0)
    fps = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    detections = relationship("Detection", back_populates="pit_stop", cascade="all, delete-orphan")
    summaries = relationship("DetectionSummary", back_populates="pit_stop", cascade="all, delete-orphan")


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    pit_stop_id = Column(Integer, ForeignKey("pit_stops.id", ondelete="CASCADE"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    timestamp_sec = Column(Float, nullable=False)
    class_name = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)
    model_name = Column(String, nullable=False, default="default")

    pit_stop = relationship("PitStop", back_populates="detections")


class DetectionSummary(Base):
    __tablename__ = "detection_summaries"

    id = Column(Integer, primary_key=True, index=True)
    pit_stop_id = Column(Integer, ForeignKey("pit_stops.id", ondelete="CASCADE"), nullable=False)
    class_name = Column(String, nullable=False)
    total_count = Column(Integer, nullable=False)
    max_per_frame = Column(Integer, nullable=False, default=0)
    avg_confidence = Column(Float, nullable=False)
    min_confidence = Column(Float, nullable=False)
    max_confidence = Column(Float, nullable=False)
    first_seen_sec = Column(Float, nullable=False)
    last_seen_sec = Column(Float, nullable=False)
    model_name = Column(String, nullable=False, default="default")

    pit_stop = relationship("PitStop", back_populates="summaries")


class ExtractedFrame(Base):
    __tablename__ = "extracted_frames"

    id = Column(Integer, primary_key=True, index=True)
    pit_stop_id = Column(Integer, ForeignKey("pit_stops.id", ondelete="CASCADE"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    timestamp_sec = Column(Float, nullable=False)
    file_path = Column(String, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    is_labeled = Column(Boolean, default=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    pit_stop = relationship("PitStop")
    dataset = relationship("Dataset", back_populates="frames")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    version = Column(String, default="1.0")
    description = Column(Text, nullable=True)
    class_names = Column(Text, nullable=False)  # JSON array
    total_images = Column(Integer, default=0)
    total_labeled = Column(Integer, default=0)
    train_count = Column(Integer, default=0)
    val_count = Column(Integer, default=0)
    directory_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    frames = relationship("ExtractedFrame", back_populates="dataset")
    training_runs = relationship("TrainingRun", back_populates="dataset")


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    model_name = Column(String, nullable=False)
    base_model = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, training, completed, failed
    epochs = Column(Integer, nullable=False)
    batch_size = Column(Integer, nullable=False)
    image_size = Column(Integer, nullable=False)
    current_epoch = Column(Integer, default=0)
    best_map50 = Column(Float, nullable=True)
    best_map50_95 = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    weights_path = Column(String, nullable=True)
    training_time_sec = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    config_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    dataset = relationship("Dataset", back_populates="training_runs")


class PitStopAnalytics(Base):
    __tablename__ = "pit_stop_analytics"

    id = Column(Integer, primary_key=True, index=True)
    pit_stop_id = Column(Integer, ForeignKey("pit_stops.id", ondelete="CASCADE"), nullable=False)

    # Timing
    car_first_seen_sec = Column(Float, nullable=True)
    car_last_seen_sec = Column(Float, nullable=True)
    total_stop_duration_sec = Column(Float, nullable=True)
    stationary_start_sec = Column(Float, nullable=True)
    stationary_end_sec = Column(Float, nullable=True)
    stationary_duration_sec = Column(Float, nullable=True)

    # Crew
    max_crew_count = Column(Integer, nullable=True)
    avg_crew_count = Column(Float, nullable=True)
    crew_convergence_frame = Column(Integer, nullable=True)

    # Equipment
    jack_detected = Column(Boolean, default=False)
    wheel_gun_detected = Column(Boolean, default=False)
    tire_change_detected = Column(Boolean, default=False)

    # Scoring
    efficiency_score = Column(Float, nullable=True)

    # Phases (JSON text - list of phase dicts)
    phases_json = Column(Text, nullable=True)

    # Meta
    model_name = Column(String, nullable=False, default="default")
    class_mapping_used = Column(String, nullable=True)
    analysis_version = Column(String, default="1.0")
    created_at = Column(DateTime, default=datetime.utcnow)

    pit_stop = relationship("PitStop")
