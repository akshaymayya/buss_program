from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from ..models.schemas import Bus
import uuid
from datetime import date

router = APIRouter()

# Request model for trip assignment
class TripAssignRequest(BaseModel):
    route: str  # e.g., "Bangalore → Mysore"
    travel_date: str
    driver_id: Optional[str] = None
    helper_ids: Optional[List[str]] = None

# In-memory storage for demonstration (Persists until server restart)
# Pre-seeding with 4 buses (matching owner's actual fleet)
FLEET_DB: List[Bus] = [
    Bus(id="B1", plate_number="KA-19-AB-1234", type="Multi-Axle Volvo", capacity=40, status="Available", last_maintenance_date="2025-12-15"),
    Bus(id="B2", plate_number="KA-01-F-9999", type="Non-AC Seater", capacity=50, status="Available", last_maintenance_date="2025-11-20"),
    Bus(id="B3", plate_number="KA-51-Z-5678", type="Sleeper AC", capacity=30, status="Maintenance", last_maintenance_date="2026-01-10"),
    Bus(id="B4", plate_number="KA-19-XY-4567", type="Semi-Sleeper", capacity=45, status="Available", last_maintenance_date="2025-10-05"),
]

@router.get("/", response_model=List[Bus])
def get_fleet(status: Optional[str] = Query(None, description="Filter by status")):
    """Get all buses in the fleet, optionally filtered by status"""
    if status:
        return [b for b in FLEET_DB if b.status.lower() == status.lower()]
    return FLEET_DB

@router.get("/stats")
def get_fleet_stats():
    """Get fleet statistics for dashboard"""
    total = len(FLEET_DB)
    available = len([b for b in FLEET_DB if b.status == "Available"])
    on_route = len([b for b in FLEET_DB if b.status == "On Route"])
    maintenance = len([b for b in FLEET_DB if b.status == "Maintenance"])
    
    # Check for maintenance warnings (buses not serviced in 30+ days)
    today = date.today()
    needs_service = []
    for bus in FLEET_DB:
        if bus.last_maintenance_date:
            last_date = date.fromisoformat(bus.last_maintenance_date)
            days_since = (today - last_date).days
            if days_since > 30:
                needs_service.append({"id": bus.id, "plate": bus.plate_number, "days_since": days_since})
    
    return {
        "total": total,
        "available": available,
        "on_route": on_route,
        "maintenance": maintenance,
        "needs_service_warning": needs_service
    }

@router.post("/", response_model=Bus)
def add_bus(bus: Bus):
    """Add a new bus to the fleet"""
    if not bus.id:
        bus.id = f"B{len(FLEET_DB) + 1}"
    if not bus.last_maintenance_date:
        bus.last_maintenance_date = date.today().isoformat()
    FLEET_DB.append(bus)
    return bus

@router.delete("/{bus_id}")
def remove_bus(bus_id: str):
    """Remove a bus from the fleet"""
    global FLEET_DB
    FLEET_DB = [b for b in FLEET_DB if b.id != bus_id]
    return {"message": "Bus removed successfully"}

@router.put("/{bus_id}/status")
def update_status(bus_id: str, status: str):
    """Update bus status (Available/On Route/Maintenance)"""
    for bus in FLEET_DB:
        if bus.id == bus_id:
            bus.status = status
            # Clear assignment if setting to Available
            if status == "Available":
                bus.assigned_route = None
                bus.assigned_date = None
                bus.assigned_driver_id = None
                bus.assigned_helper_ids = None
            return bus
    raise HTTPException(status_code=404, detail="Bus not found")

@router.put("/{bus_id}/assign-trip")
def assign_trip(bus_id: str, request: TripAssignRequest):
    """Assign a trip to a bus - automatically sets status to 'On Route'"""
    for bus in FLEET_DB:
        if bus.id == bus_id:
            if bus.status == "Maintenance":
                raise HTTPException(status_code=400, detail="Cannot assign trip to a bus under maintenance")
            if bus.status == "On Route":
                raise HTTPException(status_code=400, detail="Bus is already on a route. Cancel existing trip first.")
            
            bus.status = "On Route"
            bus.assigned_route = request.route
            bus.assigned_date = request.travel_date
            bus.assigned_driver_id = request.driver_id
            bus.assigned_helper_ids = request.helper_ids
            return {"status": "success", "message": f"Bus {bus.plate_number} assigned to route: {request.route}", "bus": bus}
    raise HTTPException(status_code=404, detail="Bus not found")

@router.put("/{bus_id}/cancel-trip")
def cancel_trip(bus_id: str):
    """Cancel an active trip and revert bus to Available status"""
    for bus in FLEET_DB:
        if bus.id == bus_id:
            if bus.status != "On Route":
                raise HTTPException(status_code=400, detail="Bus is not currently on a route")
            
            old_route = bus.assigned_route
            bus.status = "Available"
            bus.assigned_route = None
            bus.assigned_date = None
            bus.assigned_driver_id = None
            bus.assigned_helper_ids = None
            return {"status": "success", "message": f"Trip cancelled. Bus now available.", "cancelled_route": old_route}
    raise HTTPException(status_code=404, detail="Bus not found")

@router.put("/{bus_id}/maintenance")
def send_to_maintenance(bus_id: str):
    """Send a bus to maintenance"""
    for bus in FLEET_DB:
        if bus.id == bus_id:
            if bus.status == "On Route":
                raise HTTPException(status_code=400, detail="Cannot send to maintenance while on route. Cancel trip first.")
            bus.status = "Maintenance"
            bus.last_maintenance_date = date.today().isoformat()
            return {"status": "success", "message": f"Bus {bus.plate_number} sent to maintenance", "bus": bus}
    raise HTTPException(status_code=404, detail="Bus not found")

@router.put("/{bus_id}/complete-maintenance")
def complete_maintenance(bus_id: str):
    """Mark maintenance as complete and set bus to Available"""
    for bus in FLEET_DB:
        if bus.id == bus_id:
            if bus.status != "Maintenance":
                raise HTTPException(status_code=400, detail="Bus is not under maintenance")
            bus.status = "Available"
            bus.last_maintenance_date = date.today().isoformat()
            return {"status": "success", "message": f"Maintenance complete. Bus now available.", "bus": bus}
    raise HTTPException(status_code=404, detail="Bus not found")

