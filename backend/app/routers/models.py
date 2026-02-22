from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..config import settings
from ..schemas import ModelInfo, ActiveModelRequest, LoadModelRequest
from ..services.yolo_detector import detector

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("", response_model=list[ModelInfo])
async def list_models():
    """List all loaded models plus any trained models on disk."""
    loaded = detector.list_models()
    result = []

    # Add loaded models
    for m in loaded:
        result.append(ModelInfo(
            name=m["name"],
            path=m["path"],
            type=m["type"],
        ))

    # Scan for trained models on disk that aren't loaded
    loaded_names = {m["name"] for m in loaded}
    models_dir = Path(settings.MODELS_DIR)
    if models_dir.exists():
        for model_dir in models_dir.iterdir():
            if model_dir.is_dir():
                best_pt = model_dir / "train" / "weights" / "best.pt"
                if best_pt.exists() and model_dir.name not in loaded_names:
                    result.append(ModelInfo(
                        name=model_dir.name,
                        path=str(best_pt),
                        type="custom",
                    ))

    return result


@router.get("/active")
async def get_active_model():
    return {
        "name": detector.get_active_model_name(),
        "type": next(
            (m["type"] for m in detector.list_models() if m["name"] == detector.get_active_model_name()),
            "unknown",
        ),
    }


@router.post("/active")
async def set_active_model(body: ActiveModelRequest):
    try:
        detector.set_active_model(body.model_name)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"message": f"Active model set to '{body.model_name}'"}


@router.post("/load")
async def load_model(body: LoadModelRequest):
    """Load a trained model into memory."""
    weights_path = Path(body.weights_path)
    if not weights_path.exists():
        # Try as relative to MODELS_DIR
        weights_path = Path(settings.MODELS_DIR) / body.name / "train" / "weights" / "best.pt"
        if not weights_path.exists():
            raise HTTPException(404, "Model weights file not found")

    detector.load_model(body.name, str(weights_path))
    return {"message": f"Model '{body.name}' loaded"}
