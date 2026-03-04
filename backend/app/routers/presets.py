"""Preset data endpoints for drivers, teams, and tracks."""

from fastapi import APIRouter

from ..constants import PRESET_DRIVERS, PRESET_TRACKS, TEAM_COLORS
from ..schemas import PresetDriverResponse, PresetTrackResponse

router = APIRouter(prefix="/api/presets", tags=["presets"])


@router.get("/drivers", response_model=list[PresetDriverResponse])
async def get_preset_drivers():
    return [PresetDriverResponse(**d) for d in PRESET_DRIVERS]


@router.get("/tracks", response_model=list[PresetTrackResponse])
async def get_preset_tracks():
    return [
        PresetTrackResponse(
            name=t["name"],
            country=t["country"],
            total_laps=t["total_laps"],
            base_lap_time=t["base_lap_time"],
        )
        for t in PRESET_TRACKS
    ]


@router.get("/team-colors")
async def get_team_colors():
    return TEAM_COLORS
