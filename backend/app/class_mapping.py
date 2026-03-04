"""COCO ↔ F1 class name mapping for analytics that work with both model types."""

# Map COCO class names to their F1 equivalents
COCO_TO_F1 = {
    "person": "pit_crew",
    "car": "f1_car",
    "truck": "f1_car",
    "bus": "f1_car",
    "sports ball": "tire",
}

F1_TO_COCO = {
    "pit_crew": ["person"],
    "f1_car": ["car", "truck", "bus"],
    "tire": ["sports ball"],
    "jack": [],
    "wheel_gun": [],
}

# All names that should be treated as each role
CAR_NAMES = {"f1_car", "car", "truck", "bus"}
CREW_NAMES = {"pit_crew", "person"}
TIRE_NAMES = {"tire", "sports ball"}
JACK_NAMES = {"jack"}
WHEEL_GUN_NAMES = {"wheel_gun"}


def normalize_class(name: str) -> str:
    """Convert a COCO class name to its F1 equivalent, or return as-is."""
    return COCO_TO_F1.get(name, name)


def is_car(class_name: str) -> bool:
    return class_name in CAR_NAMES


def is_crew(class_name: str) -> bool:
    return class_name in CREW_NAMES


def is_tire(class_name: str) -> bool:
    return class_name in TIRE_NAMES


def is_jack(class_name: str) -> bool:
    return class_name in JACK_NAMES


def is_wheel_gun(class_name: str) -> bool:
    return class_name in WHEEL_GUN_NAMES


def detect_mapping_type(class_names: set[str]) -> str:
    """Detect whether detections use COCO or F1 custom class names.

    Returns 'coco', 'f1_custom', or 'mixed'.
    """
    coco_names = set(COCO_TO_F1.keys())
    f1_names = set(F1_TO_COCO.keys())

    has_coco = bool(class_names & coco_names)
    has_f1 = bool(class_names & f1_names)

    if has_coco and not has_f1:
        return "coco"
    if has_f1 and not has_coco:
        return "f1_custom"
    if has_coco and has_f1:
        return "mixed"
    return "unknown"
