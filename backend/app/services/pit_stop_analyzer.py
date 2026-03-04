"""Core analytics engine: turns raw detections into pit stop intelligence."""

import json
import logging
from collections import defaultdict

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..class_mapping import (
    detect_mapping_type,
    is_car,
    is_crew,
    is_jack,
    is_tire,
    is_wheel_gun,
)
from ..models import Detection, PitStopAnalytics

logger = logging.getLogger(__name__)


def analyze_pit_stop(db: Session, pit_stop_id: int, model_name: str = "default") -> PitStopAnalytics:
    """Run full pit stop analysis on existing detections and return a PitStopAnalytics record."""

    # Delete previous analytics for this pit_stop + model
    db.query(PitStopAnalytics).filter(
        PitStopAnalytics.pit_stop_id == pit_stop_id,
        PitStopAnalytics.model_name == model_name,
    ).delete()
    db.flush()

    # Fetch all detections for this pit stop + model, ordered by frame
    detections = (
        db.query(Detection)
        .filter(Detection.pit_stop_id == pit_stop_id, Detection.model_name == model_name)
        .order_by(Detection.frame_number)
        .all()
    )

    if not detections:
        analytics = PitStopAnalytics(
            pit_stop_id=pit_stop_id,
            model_name=model_name,
            class_mapping_used="none",
            phases_json="[]",
        )
        db.add(analytics)
        db.commit()
        return analytics

    # Detect class mapping type
    class_names = {d.class_name for d in detections}
    mapping_type = detect_mapping_type(class_names)

    # Build per-frame feature vectors
    frames = _build_frame_features(detections)
    frame_numbers = sorted(frames.keys())

    # Car timing
    car_timing = _compute_car_timing(frames, frame_numbers)

    # Crew stats
    crew_stats = _compute_crew_stats(frames, frame_numbers)

    # Equipment flags
    equipment = _compute_equipment_flags(frames)

    # Stationary detection
    stationary = _compute_stationary_period(frames, frame_numbers)

    # Efficiency scoring — use stationary duration if available, else total stop duration
    scored_duration = stationary["stationary_duration_sec"] or car_timing["total_stop_duration_sec"]
    efficiency_score = _compute_efficiency_score(scored_duration)

    # Phase detection
    phases = _detect_phases(frames, frame_numbers, car_timing, stationary, equipment)

    analytics = PitStopAnalytics(
        pit_stop_id=pit_stop_id,
        model_name=model_name,
        class_mapping_used=mapping_type,
        # Timing
        car_first_seen_sec=car_timing["car_first_seen_sec"],
        car_last_seen_sec=car_timing["car_last_seen_sec"],
        total_stop_duration_sec=car_timing["total_stop_duration_sec"],
        stationary_start_sec=stationary["stationary_start_sec"],
        stationary_end_sec=stationary["stationary_end_sec"],
        stationary_duration_sec=stationary["stationary_duration_sec"],
        # Crew
        max_crew_count=crew_stats["max_crew_count"],
        avg_crew_count=crew_stats["avg_crew_count"],
        crew_convergence_frame=crew_stats["crew_convergence_frame"],
        # Equipment
        jack_detected=equipment["jack_detected"],
        wheel_gun_detected=equipment["wheel_gun_detected"],
        tire_change_detected=equipment["tire_change_detected"],
        # Scoring
        efficiency_score=efficiency_score,
        # Phases
        phases_json=json.dumps(phases),
    )
    db.add(analytics)
    db.commit()
    db.refresh(analytics)
    return analytics


def _build_frame_features(detections: list[Detection]) -> dict:
    """Group detections into per-frame feature dicts."""
    frames: dict[int, dict] = {}
    for det in detections:
        fn = det.frame_number
        if fn not in frames:
            frames[fn] = {
                "timestamp_sec": det.timestamp_sec,
                "has_car": False,
                "car_bboxes": [],
                "crew_count": 0,
                "tire_count": 0,
                "has_jack": False,
                "has_wheel_gun": False,
                "crew_positions": [],
                "car_center": None,
            }
        f = frames[fn]
        if is_car(det.class_name):
            f["has_car"] = True
            cx = det.bbox_x + det.bbox_w / 2
            cy = det.bbox_y + det.bbox_h / 2
            f["car_bboxes"].append({
                "cx": cx, "cy": cy,
                "w": det.bbox_w, "h": det.bbox_h,
                "x": det.bbox_x, "y": det.bbox_y,
            })
            # Use largest car bbox as the car center
            if f["car_center"] is None or det.bbox_w * det.bbox_h > f["car_center"]["area"]:
                f["car_center"] = {"cx": cx, "cy": cy, "w": det.bbox_w, "h": det.bbox_h, "area": det.bbox_w * det.bbox_h}
        elif is_crew(det.class_name):
            f["crew_count"] += 1
            f["crew_positions"].append((det.bbox_x + det.bbox_w / 2, det.bbox_y + det.bbox_h / 2))
        elif is_tire(det.class_name):
            f["tire_count"] += 1
        elif is_jack(det.class_name):
            f["has_jack"] = True
        elif is_wheel_gun(det.class_name):
            f["has_wheel_gun"] = True
    return frames


def _compute_car_timing(frames: dict, frame_numbers: list[int]) -> dict:
    """Find first/last car appearance and total stop duration."""
    car_first = None
    car_last = None
    for fn in frame_numbers:
        if frames[fn]["has_car"]:
            ts = frames[fn]["timestamp_sec"]
            if car_first is None:
                car_first = ts
            car_last = ts

    duration = None
    if car_first is not None and car_last is not None:
        duration = round(car_last - car_first, 3)

    return {
        "car_first_seen_sec": car_first,
        "car_last_seen_sec": car_last,
        "total_stop_duration_sec": duration,
    }


def _compute_stationary_period(frames: dict, frame_numbers: list[int]) -> dict:
    """Find the longest period where the car is roughly stationary.

    Stationary = car center moves less than 5% of car bbox dimension between frames.
    """
    car_frames = [fn for fn in frame_numbers if frames[fn]["has_car"] and frames[fn]["car_center"]]

    if len(car_frames) < 2:
        return {"stationary_start_sec": None, "stationary_end_sec": None, "stationary_duration_sec": None}

    # Build list of (frame_number, is_stationary_transition)
    stationary_runs: list[list[int]] = []
    current_run: list[int] = [car_frames[0]]

    for i in range(1, len(car_frames)):
        prev_fn = car_frames[i - 1]
        curr_fn = car_frames[i]
        prev_c = frames[prev_fn]["car_center"]
        curr_c = frames[curr_fn]["car_center"]

        # Threshold: 5% of average bbox dimension
        avg_dim = (prev_c["w"] + prev_c["h"] + curr_c["w"] + curr_c["h"]) / 4
        threshold = avg_dim * 0.05
        dx = abs(curr_c["cx"] - prev_c["cx"])
        dy = abs(curr_c["cy"] - prev_c["cy"])
        dist = (dx**2 + dy**2) ** 0.5

        if dist < threshold:
            current_run.append(curr_fn)
        else:
            if len(current_run) >= 2:
                stationary_runs.append(current_run)
            current_run = [curr_fn]

    if len(current_run) >= 2:
        stationary_runs.append(current_run)

    if not stationary_runs:
        return {"stationary_start_sec": None, "stationary_end_sec": None, "stationary_duration_sec": None}

    # Pick longest run
    longest = max(stationary_runs, key=len)
    start_sec = frames[longest[0]]["timestamp_sec"]
    end_sec = frames[longest[-1]]["timestamp_sec"]

    return {
        "stationary_start_sec": round(start_sec, 3),
        "stationary_end_sec": round(end_sec, 3),
        "stationary_duration_sec": round(end_sec - start_sec, 3),
    }


def _compute_crew_stats(frames: dict, frame_numbers: list[int]) -> dict:
    """Compute crew statistics across frames."""
    crew_counts = [frames[fn]["crew_count"] for fn in frame_numbers]
    if not crew_counts or max(crew_counts) == 0:
        return {"max_crew_count": 0, "avg_crew_count": 0.0, "crew_convergence_frame": None}

    max_crew = max(crew_counts)
    avg_crew = round(sum(crew_counts) / len(crew_counts), 2)

    # Convergence: frame where crew is most concentrated around the car
    # Use the frame with max crew that also has a car
    convergence_frame = None
    best_score = -1
    for fn in frame_numbers:
        f = frames[fn]
        if f["has_car"] and f["car_center"] and f["crew_count"] > 0:
            # Score = crew_count (higher is better, more concentrated)
            # Could also weight by proximity, but crew_count is a good proxy
            if f["crew_count"] > best_score:
                best_score = f["crew_count"]
                convergence_frame = fn

    return {
        "max_crew_count": max_crew,
        "avg_crew_count": avg_crew,
        "crew_convergence_frame": convergence_frame,
    }


def _compute_equipment_flags(frames: dict) -> dict:
    """Check for equipment presence across all frames."""
    jack_detected = any(f["has_jack"] for f in frames.values())
    wheel_gun_detected = any(f["has_wheel_gun"] for f in frames.values())
    # Tire change = at least one frame with 2+ tires
    tire_change_detected = any(f["tire_count"] >= 2 for f in frames.values())

    return {
        "jack_detected": jack_detected,
        "wheel_gun_detected": wheel_gun_detected,
        "tire_change_detected": tire_change_detected,
    }


def _compute_efficiency_score(duration_sec: float | None) -> float | None:
    """Piecewise linear efficiency score based on stop duration.

    <=2.5s → 100, 3.5s → 80, 5s → 50, 8s → 20, >8s tapers to 5.
    """
    if duration_sec is None or duration_sec <= 0:
        return None

    d = duration_sec
    if d <= 2.5:
        return 100.0
    elif d <= 3.5:
        return round(100 - (d - 2.5) * 20, 1)  # 100→80
    elif d <= 5.0:
        return round(80 - (d - 3.5) * 20, 1)  # 80→50
    elif d <= 8.0:
        return round(50 - (d - 5.0) * 10, 1)  # 50→20
    elif d <= 15.0:
        return round(20 - (d - 8.0) * (15.0 / 7.0), 1)  # 20→~5
    else:
        return 5.0


def _detect_phases(
    frames: dict,
    frame_numbers: list[int],
    car_timing: dict,
    stationary: dict,
    equipment: dict,
) -> list[dict]:
    """Detect pit stop phases using a state-machine on per-frame features."""
    if car_timing["car_first_seen_sec"] is None:
        return []

    phases = []
    car_first = car_timing["car_first_seen_sec"]
    car_last = car_timing["car_last_seen_sec"]

    # Collect frame ranges for each phase signal
    car_frames = [(fn, frames[fn]) for fn in frame_numbers if frames[fn]["has_car"]]
    if not car_frames:
        return []

    # Phase 1: Car Arrival — from first car sighting to when crew starts appearing
    arrival_end = car_first
    for fn, f in car_frames:
        if f["crew_count"] >= 2:
            arrival_end = f["timestamp_sec"]
            break
        arrival_end = f["timestamp_sec"]

    if arrival_end > car_first:
        crew_counts = [frames[fn]["crew_count"] for fn in frame_numbers
                       if car_first <= frames[fn]["timestamp_sec"] <= arrival_end]
        phases.append({
            "name": "car_arrival",
            "start_sec": round(car_first, 3),
            "end_sec": round(arrival_end, 3),
            "duration_sec": round(arrival_end - car_first, 3),
            "confidence": 0.9,
            "crew_count_avg": round(sum(crew_counts) / max(len(crew_counts), 1), 1),
            "notes": "Car enters pit box",
        })

    # Phase 2: Jacking — frames where jack is detected
    if equipment["jack_detected"]:
        jack_frames = [fn for fn in frame_numbers if frames[fn]["has_jack"]]
        if jack_frames:
            j_start = frames[jack_frames[0]]["timestamp_sec"]
            j_end = frames[jack_frames[-1]]["timestamp_sec"]
            crew_counts = [frames[fn]["crew_count"] for fn in jack_frames]
            phases.append({
                "name": "jacking",
                "start_sec": round(j_start, 3),
                "end_sec": round(j_end, 3),
                "duration_sec": round(j_end - j_start, 3),
                "confidence": 0.85,
                "crew_count_avg": round(sum(crew_counts) / max(len(crew_counts), 1), 1),
                "notes": "Car raised on jacks",
            })

    # Phase 3: Tire Change — frames where 2+ tires visible
    tire_frames = [fn for fn in frame_numbers if frames[fn]["tire_count"] >= 2]
    if tire_frames:
        t_start = frames[tire_frames[0]]["timestamp_sec"]
        t_end = frames[tire_frames[-1]]["timestamp_sec"]
        crew_counts = [frames[fn]["crew_count"] for fn in tire_frames]
        phases.append({
            "name": "tire_change",
            "start_sec": round(t_start, 3),
            "end_sec": round(t_end, 3),
            "duration_sec": round(max(t_end - t_start, 0), 3),
            "confidence": 0.8,
            "crew_count_avg": round(sum(crew_counts) / max(len(crew_counts), 1), 1),
            "notes": "Tires being changed",
        })

    # Phase 4: Release — jack gone but car still present (after last jack frame)
    if equipment["jack_detected"]:
        jack_frames_set = set(fn for fn in frame_numbers if frames[fn]["has_jack"])
        last_jack_fn = max(jack_frames_set) if jack_frames_set else None
        if last_jack_fn is not None:
            release_frames = [fn for fn in frame_numbers
                              if fn > last_jack_fn and frames[fn]["has_car"] and not frames[fn]["has_jack"]]
            if release_frames:
                r_start = frames[release_frames[0]]["timestamp_sec"]
                r_end = frames[release_frames[-1]]["timestamp_sec"]
                crew_counts = [frames[fn]["crew_count"] for fn in release_frames]
                phases.append({
                    "name": "release",
                    "start_sec": round(r_start, 3),
                    "end_sec": round(r_end, 3),
                    "duration_sec": round(r_end - r_start, 3),
                    "confidence": 0.7,
                    "crew_count_avg": round(sum(crew_counts) / max(len(crew_counts), 1), 1),
                    "notes": "Car lowered, preparing to leave",
                })

    # Phase 5: Car Departure — last few frames with car
    if len(car_frames) >= 2:
        # Last 20% of car frames or frames after release
        departure_start_idx = max(0, int(len(car_frames) * 0.8))
        departure_frames = car_frames[departure_start_idx:]
        d_start = departure_frames[0][1]["timestamp_sec"]
        d_end = departure_frames[-1][1]["timestamp_sec"]
        if d_end > d_start:
            crew_counts = [f["crew_count"] for _, f in departure_frames]
            phases.append({
                "name": "car_departure",
                "start_sec": round(d_start, 3),
                "end_sec": round(d_end, 3),
                "duration_sec": round(d_end - d_start, 3),
                "confidence": 0.75,
                "crew_count_avg": round(sum(crew_counts) / max(len(crew_counts), 1), 1),
                "notes": "Car exits pit box",
            })

    # If no specific phases were detected, create a single "pit_stop" phase
    if not phases and car_first is not None and car_last is not None:
        all_crew = [frames[fn]["crew_count"] for fn in frame_numbers]
        phases.append({
            "name": "pit_stop",
            "start_sec": round(car_first, 3),
            "end_sec": round(car_last, 3),
            "duration_sec": round(car_last - car_first, 3),
            "confidence": 0.6,
            "crew_count_avg": round(sum(all_crew) / max(len(all_crew), 1), 1),
            "notes": "Full pit stop (phases not distinguishable)",
        })

    # Sort phases by start time
    phases.sort(key=lambda p: p["start_sec"])
    return phases
