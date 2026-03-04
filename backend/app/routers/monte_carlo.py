"""Monte Carlo specific endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import MonteCarloData, SimulationRun
from ..schemas import MonteCarloDriverResponse, MonteCarloResultResponse

router = APIRouter(prefix="/api/monte-carlo", tags=["monte_carlo"])


@router.get("/{run_id}", response_model=MonteCarloResultResponse)
async def get_monte_carlo_results(run_id: int, db: AsyncSession = Depends(get_db)):
    # Verify run exists and is monte_carlo type
    run_result = await db.execute(
        select(SimulationRun).where(SimulationRun.id == run_id)
    )
    run = run_result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Simulation not found")
    if run.sim_type != "monte_carlo":
        raise HTTPException(400, "Not a Monte Carlo simulation")
    if run.status != "completed":
        raise HTTPException(400, f"Simulation status is '{run.status}', not completed")

    # Get MC data
    result = await db.execute(
        select(MonteCarloData)
        .where(MonteCarloData.run_id == run_id)
        .order_by(MonteCarloData.avg_position)
    )
    mc_data = result.scalars().all()

    drivers = []
    for d in mc_data:
        # Convert position_distribution keys to ints
        pos_dist = {}
        if d.position_distribution:
            for k, v in d.position_distribution.items():
                pos_dist[int(k)] = v

        drivers.append(MonteCarloDriverResponse(
            driver_name=d.driver_name,
            team=d.team,
            win_pct=d.win_pct,
            podium_pct=d.podium_pct,
            top5_pct=d.top5_pct,
            top10_pct=d.top10_pct,
            dnf_pct=d.dnf_pct,
            avg_position=d.avg_position,
            avg_gap=d.avg_gap,
            best_position=d.best_position,
            worst_position=d.worst_position,
            position_distribution=pos_dist,
        ))

    return MonteCarloResultResponse(
        run_id=run_id,
        num_simulations=run.num_simulations,
        drivers=drivers,
    )
