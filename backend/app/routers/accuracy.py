"""Accuracy API — import actual results, compute prediction accuracy."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import (
    AccuracyRecord,
    ActualResult,
    PredictionResult,
    RacePrediction,
    RaceWeekend,
)
from ..schemas import AccuracyOut, ActualResultCreate

router = APIRouter(prefix="/api/accuracy", tags=["accuracy"])


@router.post("/import/{race_weekend_id}")
async def import_actual_results(
    race_weekend_id: int,
    data: ActualResultCreate,
    db: AsyncSession = Depends(get_db),
):
    """Import actual race/qualifying results and compute accuracy."""
    rw_result = await db.execute(
        select(RaceWeekend).where(RaceWeekend.id == race_weekend_id)
    )
    rw = rw_result.scalar_one_or_none()
    if not rw:
        raise HTTPException(404, "Race weekend not found")

    # Store actual results
    for entry in data.results:
        db.add(ActualResult(
            race_weekend_id=race_weekend_id,
            result_type=data.result_type,
            driver_name=entry["driver_name"],
            actual_position=entry["actual_position"],
            is_dnf=entry.get("is_dnf", False),
        ))

    # Find the most recent prediction of matching type
    pred_result = await db.execute(
        select(RacePrediction).where(
            RacePrediction.race_weekend_id == race_weekend_id,
            RacePrediction.prediction_type == data.result_type,
            RacePrediction.status == "completed",
        ).order_by(RacePrediction.created_at.desc())
    )
    prediction = pred_result.scalar_one_or_none()

    accuracy_data = None
    if prediction:
        # Get prediction results
        pr_result = await db.execute(
            select(PredictionResult).where(
                PredictionResult.prediction_id == prediction.id
            )
        )
        pred_results = {r.driver_name: r.predicted_position for r in pr_result.scalars().all()}

        # Compute accuracy metrics
        actual_map = {e["driver_name"]: e["actual_position"] for e in data.results}
        mae, top3_acc, winner_correct, kendall = _compute_accuracy(pred_results, actual_map)

        accuracy_record = AccuracyRecord(
            race_weekend_id=race_weekend_id,
            prediction_id=prediction.id,
            mae=mae,
            top3_accuracy=top3_acc,
            winner_correct=winner_correct,
            kendall_tau=kendall,
        )
        db.add(accuracy_record)
        accuracy_data = {
            "mae": mae,
            "top3_accuracy": top3_acc,
            "winner_correct": winner_correct,
            "kendall_tau": kendall,
        }

    rw.status = "completed"
    await db.commit()

    return {"message": "Results imported", "accuracy": accuracy_data}


def _compute_accuracy(
    predicted: dict[str, float],
    actual: dict[str, int],
) -> tuple[float, float, bool, float]:
    """Compute MAE, top-3 accuracy, winner correct, Kendall tau."""
    common = set(predicted.keys()) & set(actual.keys())
    if not common:
        return 0.0, 0.0, False, 0.0

    # MAE
    errors = [abs(predicted[d] - actual[d]) for d in common]
    mae = sum(errors) / len(errors)

    # Top 3 accuracy: how many of predicted top 3 are in actual top 3
    pred_top3 = sorted(common, key=lambda d: predicted[d])[:3]
    actual_top3 = sorted(common, key=lambda d: actual[d])[:3]
    top3_overlap = len(set(pred_top3) & set(actual_top3))
    top3_acc = top3_overlap / 3 * 100

    # Winner correct
    pred_winner = min(common, key=lambda d: predicted[d])
    actual_winner = min(common, key=lambda d: actual[d])
    winner_correct = pred_winner == actual_winner

    # Kendall tau (simplified)
    concordant = 0
    discordant = 0
    drivers = list(common)
    for i in range(len(drivers)):
        for j in range(i + 1, len(drivers)):
            d1, d2 = drivers[i], drivers[j]
            pred_order = predicted[d1] - predicted[d2]
            actual_order = actual[d1] - actual[d2]
            if pred_order * actual_order > 0:
                concordant += 1
            elif pred_order * actual_order < 0:
                discordant += 1

    n_pairs = concordant + discordant
    kendall = (concordant - discordant) / n_pairs if n_pairs > 0 else 0.0

    return round(mae, 2), round(top3_acc, 1), winner_correct, round(kendall, 3)


@router.get("/{race_weekend_id}", response_model=list[AccuracyOut])
async def get_accuracy(
    race_weekend_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AccuracyRecord).where(
            AccuracyRecord.race_weekend_id == race_weekend_id
        )
    )
    records = result.scalars().all()
    if not records:
        raise HTTPException(404, "No accuracy records found")
    return records


@router.get("/season/{year}")
async def get_season_accuracy(
    year: int,
    db: AsyncSession = Depends(get_db),
):
    """Aggregate accuracy across a season."""
    from ..models import Season

    season_result = await db.execute(select(Season).where(Season.year == year))
    season = season_result.scalar_one_or_none()
    if not season:
        raise HTTPException(404, f"Season {year} not found")

    rw_result = await db.execute(
        select(RaceWeekend).where(RaceWeekend.season_id == season.id)
    )
    weekends = rw_result.scalars().all()
    rw_ids = [rw.id for rw in weekends]

    if not rw_ids:
        return {"races_scored": 0, "avg_mae": 0, "avg_top3_accuracy": 0, "winner_pct": 0}

    acc_result = await db.execute(
        select(AccuracyRecord).where(AccuracyRecord.race_weekend_id.in_(rw_ids))
    )
    records = acc_result.scalars().all()

    if not records:
        return {"races_scored": 0, "avg_mae": 0, "avg_top3_accuracy": 0, "winner_pct": 0}

    return {
        "races_scored": len(records),
        "avg_mae": round(sum(r.mae for r in records) / len(records), 2),
        "avg_top3_accuracy": round(sum(r.top3_accuracy for r in records) / len(records), 1),
        "winner_pct": round(sum(1 for r in records if r.winner_correct) / len(records) * 100, 1),
        "avg_kendall_tau": round(sum(r.kendall_tau for r in records) / len(records), 3),
    }
