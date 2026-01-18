from fastapi import APIRouter, Depends
from app.models.schemas import RouteRequest, RouteAnalysis
from app.services.intelligence import IntelligenceEngine

router = APIRouter()
engine = IntelligenceEngine()

@router.post("/analyze", response_model=RouteAnalysis)
async def analyze_route_profitability(request: RouteRequest):
    """
    Analyzes a potential bus route execution based on real-time factors,
    seasonality, and historical data patterns.
    """
    result = engine.analyze_route(
        request.source, 
        request.destination, 
        request.travel_date
    )
    return result
