from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from ..models.schemas import Bus
from ..db.database import get_db_connection, immediate_transaction
import json
import uuid
from datetime import date, datetime

router = APIRouter()

# Request model for trip assignment
class TripAssignRequest(BaseModel):
    route: str  # e.g., "Bangalore → Mysore"
    travel_date: str
    driver_id: Optional[str] = None
    helper_ids: Optional[List[str]] = None

def row_to_bus(row) -> Bus:
    """Helper to convert a SQLite row into a validated Bus schema."""
    d = dict(row)
    if d.get('assigned_helper_ids'):
        try:
            d['assigned_helper_ids'] = json.loads(d['assigned_helper_ids']) if isinstance(d['assigned_helper_ids'], str) else d['assigned_helper_ids']
        except Exception:
            d['assigned_helper_ids'] = []
    else:
        d['assigned_helper_ids'] = None
    return Bus(**d)

@router.get("/", response_model=List[Bus])
def get_fleet(status: Optional[str] = Query(None, description="Filter by status")):
    """Get all buses in the fleet from SQLite, optionally filtered by status."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if status:
        cursor.execute("SELECT * FROM buses WHERE LOWER(status) = LOWER(?) ORDER BY id ASC", (status.strip(),))
    else:
        cursor.execute("SELECT * FROM buses ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [row_to_bus(r) for r in rows]

@router.get("/stats")
def get_fleet_stats():
    """Get fleet statistics directly from SQLite for dashboard metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM buses")
    rows = cursor.fetchall()
    conn.close()

    buses = [row_to_bus(r) for r in rows]
    total = len(buses)
    available = len([b for b in buses if b.status == "Available"])
    on_route = len([b for b in buses if b.status == "On Route"])
    maintenance = len([b for b in buses if b.status == "Maintenance"])
    
    # Check for maintenance warnings (buses not serviced in 30+ days)
    today = date.today()
    needs_service = []
    for bus in buses:
        if bus.last_maintenance_date:
            try:
                last_date = date.fromisoformat(bus.last_maintenance_date)
                days_since = (today - last_date).days
                if days_since > 30:
                    needs_service.append({"id": bus.id, "plate": bus.plate_number, "days_since": days_since})
            except Exception:
                pass
    
    return {
        "total": total,
        "available": available,
        "on_route": on_route,
        "maintenance": maintenance,
        "needs_service_warning": needs_service
    }

@router.post("/", response_model=Bus)
def add_bus(bus: Bus):
    """Add a new bus to the SQLite database."""
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        if not bus.id:
            cursor.execute("SELECT COUNT(*) FROM buses")
            count = cursor.fetchone()[0]
            bus.id = f"B{count + 1}"
        if not bus.last_maintenance_date:
            bus.last_maintenance_date = date.today().isoformat()
        
        # Check duplicate plate
        cursor.execute("SELECT id FROM buses WHERE plate_number = ?", (bus.plate_number,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Bus with plate {bus.plate_number} already exists")

        now_str = datetime.now().isoformat()
        helpers_json = json.dumps(bus.assigned_helper_ids) if bus.assigned_helper_ids else None

        cursor.execute("""
            INSERT INTO buses (
                id, plate_number, type, capacity, status,
                assigned_route, assigned_date, assigned_driver_id,
                assigned_helper_ids, last_maintenance_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            bus.id, bus.plate_number, bus.type, bus.capacity, bus.status,
            bus.assigned_route, bus.assigned_date, bus.assigned_driver_id,
            helpers_json, bus.last_maintenance_date, now_str
        ))
    conn.close()
    return bus

@router.delete("/{bus_id}")
def remove_bus(bus_id: str):
    """Remove a bus from the fleet SQLite database."""
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        cursor.execute("SELECT id, status FROM buses WHERE id = ?", (bus_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bus not found")
        if row['status'] == "On Route":
            raise HTTPException(status_code=400, detail="Cannot remove a bus that is currently On Route")
        
        cursor.execute("DELETE FROM buses WHERE id = ?", (bus_id,))
    conn.close()
    return {"message": "Bus removed successfully"}

@router.put("/{bus_id}/status")
def update_status(bus_id: str, status: str):
    """Update bus status in SQLite (Available/On Route/Maintenance)."""
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        cursor.execute("SELECT * FROM buses WHERE id = ?", (bus_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bus not found")

        if status == "Available":
            cursor.execute("""
                UPDATE buses
                SET status = ?, assigned_route = NULL, assigned_date = NULL,
                    assigned_driver_id = NULL, assigned_helper_ids = NULL
                WHERE id = ?
            """, (status, bus_id))
        else:
            cursor.execute("UPDATE buses SET status = ? WHERE id = ?", (status, bus_id))

        cursor.execute("SELECT * FROM buses WHERE id = ?", (bus_id,))
        updated_row = cursor.fetchone()
    conn.close()
    return row_to_bus(updated_row)

@router.put("/{bus_id}/assign-trip")
def assign_trip(bus_id: str, request: TripAssignRequest):
    """Assign a trip to a bus in SQLite - automatically sets status to 'On Route'."""
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        cursor.execute("SELECT * FROM buses WHERE id = ?", (bus_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bus not found")
        
        if row['status'] == "Maintenance":
            raise HTTPException(status_code=400, detail="Cannot assign trip to a bus under maintenance")
        if row['status'] == "On Route":
            raise HTTPException(status_code=400, detail="Bus is already on a route. Cancel existing trip first.")
        
        helpers_json = json.dumps(request.helper_ids) if request.helper_ids else None
        cursor.execute("""
            UPDATE buses 
            SET status = 'On Route', assigned_route = ?, assigned_date = ?,
                assigned_driver_id = ?, assigned_helper_ids = ?
            WHERE id = ?
        """, (request.route, request.travel_date, request.driver_id, helpers_json, bus_id))

        cursor.execute("SELECT * FROM buses WHERE id = ?", (bus_id,))
        updated_row = cursor.fetchone()
    conn.close()
    bus_obj = row_to_bus(updated_row)
    return {"status": "success", "message": f"Bus {bus_obj.plate_number} assigned to route: {request.route}", "bus": bus_obj}

@router.put("/{bus_id}/cancel-trip")
def cancel_trip(bus_id: str):
    """Cancel an active trip and revert bus to Available status in SQLite."""
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        cursor.execute("SELECT * FROM buses WHERE id = ?", (bus_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bus not found")
        
        if row['status'] != "On Route":
            raise HTTPException(status_code=400, detail="Bus is not currently on a route")
        
        old_route = row['assigned_route']
        cursor.execute("""
            UPDATE buses
            SET status = 'Available', assigned_route = NULL, assigned_date = NULL,
                assigned_driver_id = NULL, assigned_helper_ids = NULL
            WHERE id = ?
        """, (bus_id,))
    conn.close()
    return {"status": "success", "message": "Trip cancelled. Bus now available.", "cancelled_route": old_route}

@router.put("/{bus_id}/maintenance")
def send_to_maintenance(bus_id: str):
    """Send a bus to maintenance in SQLite."""
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        cursor.execute("SELECT * FROM buses WHERE id = ?", (bus_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bus not found")
        if row['status'] == "On Route":
            raise HTTPException(status_code=400, detail="Cannot send to maintenance while on route. Cancel trip first.")
        
        today_str = date.today().isoformat()
        cursor.execute("""
            UPDATE buses SET status = 'Maintenance', last_maintenance_date = ? WHERE id = ?
        """, (today_str, bus_id))

        cursor.execute("SELECT * FROM buses WHERE id = ?", (bus_id,))
        updated_row = cursor.fetchone()
    conn.close()
    bus_obj = row_to_bus(updated_row)
    return {"status": "success", "message": f"Bus {bus_obj.plate_number} sent to maintenance", "bus": bus_obj}

@router.put("/{bus_id}/complete-maintenance")
def complete_maintenance(bus_id: str):
    """Mark maintenance as complete and set bus to Available in SQLite."""
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        cursor.execute("SELECT * FROM buses WHERE id = ?", (bus_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bus not found")
        if row['status'] != "Maintenance":
            raise HTTPException(status_code=400, detail="Bus is not under maintenance")
        
        today_str = date.today().isoformat()
        cursor.execute("""
            UPDATE buses SET status = 'Available', last_maintenance_date = ? WHERE id = ?
        """, (today_str, bus_id))

        cursor.execute("SELECT * FROM buses WHERE id = ?", (bus_id,))
        updated_row = cursor.fetchone()
    conn.close()
    bus_obj = row_to_bus(updated_row)
    return {"status": "success", "message": "Maintenance complete. Bus now available.", "bus": bus_obj}
