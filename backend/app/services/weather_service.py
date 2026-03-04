"""Weather service using Open-Meteo API (free, no auth)."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

# Climate normals: typical weather by latitude band for races without forecast data
_CLIMATE_DEFAULTS = {
    "tropical": {"temperature": 30, "rain_probability": 40, "humidity": 80},
    "subtropical": {"temperature": 28, "rain_probability": 25, "humidity": 65},
    "temperate": {"temperature": 20, "rain_probability": 35, "humidity": 60},
    "desert": {"temperature": 32, "rain_probability": 5, "humidity": 30},
}


def _get_climate_zone(lat: float) -> str:
    abs_lat = abs(lat)
    if abs_lat < 15:
        return "tropical"
    if abs_lat < 30:
        return "desert" if abs_lat > 20 else "subtropical"
    return "temperate"


async def fetch_race_weather(
    lat: float, lon: float, race_date: str
) -> dict:
    """Fetch weather for a race location/date.

    Returns dict with: condition, temperature, rain_probability, wind_speed, humidity, source
    """
    try:
        race_dt = date.fromisoformat(race_date)
    except (ValueError, TypeError):
        return _climate_normal(lat)

    today = date.today()
    days_until = (race_dt - today).days

    if days_until < 0:
        # Past race: try historical API
        return await _fetch_historical(lat, lon, race_dt)
    elif days_until <= 16:
        # Within forecast window
        return await _fetch_forecast(lat, lon, race_dt)
    else:
        # Too far ahead: use climate normals
        return _climate_normal(lat)


async def _fetch_forecast(lat: float, lon: float, race_dt: date) -> dict:
    """Fetch from Open-Meteo forecast API."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,precipitation_probability_max,windspeed_10m_max,relative_humidity_2m_mean",
        "start_date": race_dt.isoformat(),
        "end_date": race_dt.isoformat(),
        "timezone": "auto",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        daily = data.get("daily", {})
        temp = _safe_first(daily.get("temperature_2m_max"))
        rain_prob = _safe_first(daily.get("precipitation_probability_max"))
        wind = _safe_first(daily.get("windspeed_10m_max"))
        humidity = _safe_first(daily.get("relative_humidity_2m_mean"))

        condition = _determine_condition(rain_prob)
        return {
            "condition": condition,
            "temperature": temp,
            "rain_probability": rain_prob,
            "wind_speed": wind,
            "humidity": humidity,
            "source": "forecast",
        }
    except Exception as e:
        logger.warning(f"Forecast fetch failed: {e}")
        return _climate_normal(lat)


async def _fetch_historical(lat: float, lon: float, race_dt: date) -> dict:
    """Fetch from Open-Meteo historical archive API."""
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,precipitation_sum,windspeed_10m_max,relative_humidity_2m_mean",
        "start_date": race_dt.isoformat(),
        "end_date": race_dt.isoformat(),
        "timezone": "auto",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        daily = data.get("daily", {})
        temp = _safe_first(daily.get("temperature_2m_max"))
        precip = _safe_first(daily.get("precipitation_sum"))
        wind = _safe_first(daily.get("windspeed_10m_max"))
        humidity = _safe_first(daily.get("relative_humidity_2m_mean"))

        rain_prob = min(100, (precip or 0) * 20)  # rough estimate
        condition = "wet" if (precip or 0) > 1.0 else "dry"
        return {
            "condition": condition,
            "temperature": temp,
            "rain_probability": rain_prob,
            "wind_speed": wind,
            "humidity": humidity,
            "source": "historical",
        }
    except Exception as e:
        logger.warning(f"Historical fetch failed: {e}")
        return _climate_normal(lat)


def _climate_normal(lat: float) -> dict:
    """Return climate-based defaults when APIs unavailable."""
    zone = _get_climate_zone(lat)
    defaults = _CLIMATE_DEFAULTS[zone]
    condition = "wet" if defaults["rain_probability"] > 35 else "dry"
    return {
        "condition": condition,
        "temperature": defaults["temperature"],
        "rain_probability": defaults["rain_probability"],
        "wind_speed": 15.0,
        "humidity": defaults["humidity"],
        "source": "climate_normal",
    }


def _determine_condition(rain_probability: float | None) -> str:
    if rain_probability is None:
        return "dry"
    if rain_probability >= 60:
        return "wet"
    if rain_probability >= 30:
        return "mixed"
    return "dry"


def _safe_first(lst: list | None) -> float | None:
    if lst and len(lst) > 0:
        return lst[0]
    return None
