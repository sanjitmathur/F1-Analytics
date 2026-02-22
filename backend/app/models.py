from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
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

    pit_stop = relationship("PitStop", back_populates="detections")


class DetectionSummary(Base):
    __tablename__ = "detection_summaries"

    id = Column(Integer, primary_key=True, index=True)
    pit_stop_id = Column(Integer, ForeignKey("pit_stops.id", ondelete="CASCADE"), nullable=False)
    class_name = Column(String, nullable=False)
    total_count = Column(Integer, nullable=False)
    avg_confidence = Column(Float, nullable=False)
    min_confidence = Column(Float, nullable=False)
    max_confidence = Column(Float, nullable=False)
    first_seen_sec = Column(Float, nullable=False)
    last_seen_sec = Column(Float, nullable=False)

    pit_stop = relationship("PitStop", back_populates="summaries")
