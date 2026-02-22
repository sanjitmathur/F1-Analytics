F1_CLASSES = [
    "pit_crew",
    "tire",
    "jack",
    "f1_car",
    "pit_box",
    "wheel_gun",
    "helmet",
]

F1_CLASS_TO_ID = {name: idx for idx, name in enumerate(F1_CLASSES)}
F1_ID_TO_CLASS = {idx: name for idx, name in enumerate(F1_CLASSES)}
