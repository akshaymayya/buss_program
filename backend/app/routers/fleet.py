from fastapi import APIRouter, HTTPException
from typing import List
from ..models.schemas import Bus
import uuid

router = APIRouter()

# In-memory storage for demonstration (Persists until server restart)
# Pre-seeding with some data
FLEET_DB: List[Bus] = [
    Bus(id="B1", plate_number="KA-19-AB-1234", type="Multi-Axle Volvo", capacity=40, status="Available"),
    Bus(id="B2", plate_number="KA-01-F-9999", type="Non-AC Seater", capacity=50, status="On Route"),
    Bus(id="B3", plate_number="KA-51-Z-5678", type="Sleeper AC", capacity=30, status="Maintenance"),
]

@router.get("/", response_model=List[Bus])
async def get_fleet():
    """Get all buses in the fleet"""
    return FLEET_DB

@router.post("/", response_model=Bus)
async def add_bus(bus: Bus):
    """Add a new bus to the fleet"""
    # Generate ID if not provided (though Schema expects it, frontend might send empty)
    if not bus.id:
        bus.id = str(uuid.uuid4())[:8]
    
    FLEET_DB.append(bus)
    return bus

@router.delete("/{bus_id}")
async def remove_bus(bus_id: str):
    """Remove a bus from the fleet"""
    global FLEET_DB
    FLEET_DB = [b for b in FLEET_DB if b.id != bus_id]
    return {"message": "Bus removed successfully"}

@router.put("/{bus_id}/status")
async def update_status(bus_id: str, status: str):
    """Update bus status (Available/On Route/Maintenance)"""
    for bus in FLEET_DB:
        if bus.id == bus_id:
            bus.status = status
            return bus
    raise HTTPException(status_code=404, detail="Bus not found")
