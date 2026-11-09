from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import json
from datetime import datetime, date, timedelta

from ..models.schemas import (
    TripDetails, TripDepartureRequest, TripArrivalVerificationRequest
)
from ..db.database import get_db_connection, immediate_transaction

router = APIRouter()

@router.get("/active", response_model=List[TripDetails])
def get_active_and_scheduled_trips(status: Optional[str] = None):
    """
    Returns active, scheduled, or all trips with enriched crew and vehicle details from SQLite.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM trip_assignments WHERE 1=1"
    params = []
    if status:
        query += " AND LOWER(status) = LOWER(?)"
        params.append(status.strip())
    else:
        query += " AND status IN ('Scheduled', 'En Route')"

    query += " ORDER BY travel_date DESC, departure_time DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()

    trips = []
    for r in rows:
        d = dict(r)
        
        # Driver details
        cursor.execute("SELECT name, phone FROM employees WHERE id = ?", (d['driver_id'],))
        driver_row = cursor.fetchone()
        d['driver_name'] = driver_row['name'] if driver_row else "Unknown Driver"
        d['driver_phone'] = driver_row['phone'] if driver_row else ""

        # Helper details
        try:
            h_ids = json.loads(d['helper_ids']) if isinstance(d['helper_ids'], str) else d['helper_ids']
        except Exception:
            h_ids = []
        d['helper_ids'] = h_ids
        
        h_names = []
        for hid in h_ids:
            cursor.execute("SELECT name FROM employees WHERE id = ?", (hid,))
            h_row = cursor.fetchone()
            if h_row:
                h_names.append(h_row['name'])
        d['helper_names'] = h_names

        # Bus plate from SQLite buses table
        cursor.execute("SELECT plate_number, type FROM buses WHERE id = ?", (d['bus_id'],))
        bus_row = cursor.fetchone()
        if bus_row:
            d['bus_plate'] = bus_row['plate_number']
            d['bus_type'] = bus_row['type']
        else:
            d['bus_plate'] = d['bus_id']
            d['bus_type'] = "Bus"

        trips.append(TripDetails(**d))

    conn.close()
    return trips

@router.post("/{trip_id}/depart")
def mark_trip_departed(trip_id: str, req: TripDepartureRequest):
    """
    Transitions trip status to 'En Route'.
    Updates driver and helper statuses to 'En Route'.
    Operational location remains at the departure hub until verified arrival (mandatory invariant).
    """
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        cursor.execute("SELECT * FROM trip_assignments WHERE id = ?", (trip_id,))
        trip = cursor.fetchone()
        if not trip:
            raise HTTPException(status_code=404, detail=f"Trip {trip_id} not found")

        if trip['status'] != "Scheduled":
            raise HTTPException(status_code=400, detail=f"Trip is already '{trip['status']}'")

        now_str = req.actual_departure_time or datetime.now().isoformat()

        # Update trip status
        cursor.execute("""
            UPDATE trip_assignments 
            SET status = 'En Route', verified_departure_at = ?, notes = COALESCE(notes || '; ', '') || ?
            WHERE id = ?
        """, (now_str, f"Departure verified by {req.verified_by}", trip_id))

        # Helper IDs
        try:
            h_ids = json.loads(trip['helper_ids']) if isinstance(trip['helper_ids'], str) else trip['helper_ids']
        except Exception:
            h_ids = []
        crew_ids = [trip['driver_id']] + h_ids

        # Update crew statuses to 'En Route'
        cursor.execute(f"""
            UPDATE employees 
            SET status = 'En Route' 
            WHERE id IN ({','.join(['?']*len(crew_ids))})
        """, crew_ids)

        # Audit log
        cursor.execute("""
            INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
            VALUES (?, 'TRIP_DEPARTED', 'TRIP', ?, ?, ?, 'CMP-001')
        """, (now_str, trip_id, req.verified_by, f"Trip {trip['route_source']} → {trip['route_destination']} departed. Crew en route."))

    conn.close()

    return {
        "status": "success",
        "message": f"Trip {trip_id} departed. Crew status changed to 'En Route'. Destination: {trip['route_destination']}.",
        "trip_id": trip_id
    }

@router.post("/{trip_id}/verify-arrival")
def verify_trip_arrival(trip_id: str, req: TripArrivalVerificationRequest):
    """
    CRITICAL OPERATION: Authorized staff confirms vehicle & crew arrival at destination.
    1. Sets trip status to 'Completed'.
    2. Dynamically updates operational location of Driver and Helpers to Destination City!
    3. Records new location in employee_locations audit trail.
    4. Computes duty hours and adds to employee_trip_history.
    5. Applies mandatory rest period (defaults to 8 hours), setting status to 'Resting'.
    6. Reverts bus to 'Available' in SQLite.
    """
    if not req.verified_by or len(req.verified_by.strip()) < 2:
        raise HTTPException(status_code=400, detail="Authorized staff identifier (verified_by) is required")

    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        cursor.execute("SELECT * FROM trip_assignments WHERE id = ?", (trip_id,))
        trip = cursor.fetchone()
        if not trip:
            raise HTTPException(status_code=404, detail=f"Trip {trip_id} not found")

        if trip['status'] not in ("Scheduled", "En Route"):
            raise HTTPException(status_code=400, detail=f"Trip is already marked as '{trip['status']}'")

        now_dt = datetime.now()
        now_str = req.actual_arrival_time or now_dt.isoformat()
        dest_city = trip['route_destination']
        src_city = trip['route_source']
        route_str = f"{src_city} → {dest_city}"

        # Calculate approximate duty hours
        dep_time_str = trip['verified_departure_at'] or f"{trip['travel_date']}T{trip['departure_time']}:00"
        try:
            dep_dt = datetime.fromisoformat(dep_time_str)
            duty_hours = round(max(1.0, (now_dt - dep_dt).total_seconds() / 3600.0), 1)
        except Exception:
            duty_hours = 6.0  # standard fallback

        # Update trip record
        cursor.execute("""
            UPDATE trip_assignments 
            SET status = 'Completed', verified_arrival_at = ?, verified_by = ?,
                notes = COALESCE(notes || '; ', '') || ?
            WHERE id = ?
        """, (now_str, req.verified_by, f"Arrival confirmed at {dest_city} by {req.verified_by}. Notes: {req.notes or 'None'}", trip_id))

        # Parse crew
        try:
            h_ids = json.loads(trip['helper_ids']) if isinstance(trip['helper_ids'], str) else trip['helper_ids']
        except Exception:
            h_ids = []
        crew_ids = [trip['driver_id']] + h_ids

        # Rest period calculation
        rest_hours = req.rest_hours or 8.0
        rest_ends_at = (now_dt + timedelta(hours=rest_hours)).isoformat() if req.trigger_rest else None
        new_status = "Resting" if req.trigger_rest else "Available"

        # Update each crew member:
        # - Update current_location to Destination!
        # - Set status to Resting / Available
        # - Record in employee_locations
        # - Record in employee_trip_history
        for cid in crew_ids:
            cursor.execute("SELECT current_location, role, total_duty_hours FROM employees WHERE id = ?", (cid,))
            emp_data = cursor.fetchone()
            old_loc = emp_data['current_location']
            new_total_duty = (emp_data['total_duty_hours'] or 0.0) + duty_hours

            cursor.execute("""
                UPDATE employees 
                SET current_location = ?,
                    status = ?,
                    last_trip_completed_at = ?,
                    rest_ends_at = ?,
                    total_duty_hours = ?
                WHERE id = ?
            """, (dest_city, new_status, now_str, rest_ends_at, new_total_duty, cid))

            # Log location transition
            cursor.execute("""
                INSERT INTO employee_locations (employee_id, old_location, new_location, reason, trip_id, updated_by, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (cid, old_loc, dest_city, f"Verified Trip Arrival ({route_str})", trip_id, req.verified_by, now_str))

            # Log trip history
            cursor.execute("""
                INSERT INTO employee_trip_history (employee_id, trip_id, role, route, departure_time, arrival_time, duty_hours, status, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', ?)
            """, (cid, trip_id, emp_data['role'], route_str, dep_time_str, now_str, duty_hours, now_str))

        # Audit log
        cursor.execute("""
            INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
            VALUES (?, 'TRIP_VERIFIED_ARRIVAL', 'TRIP', ?, ?, ?, 'CMP-001')
        """, (now_str, trip_id, req.verified_by, f"Trip {route_str} verified arrived at {dest_city}. Crew operational location updated to {dest_city}. Next assignment will start from {dest_city}."))

        # Update Bus status back to Available in SQLite
        cursor.execute("""
            UPDATE buses
            SET status = 'Available', assigned_route = NULL, assigned_date = NULL,
                assigned_driver_id = NULL, assigned_helper_ids = NULL
            WHERE id = ?
        """, (trip['bus_id'],))

    conn.close()

    return {
        "status": "success",
        "trip_id": trip_id,
        "message": f"Arrival verified at {dest_city}! Driver & helpers are now officially located at {dest_city}. Rest period initiated until {rest_ends_at[:16] if rest_ends_at else 'N/A'}.",
        "new_operational_location": dest_city,
        "next_eligible_starting_hub": dest_city,
        "crew_status": new_status,
        "rest_ends_at": rest_ends_at
    }

@router.post("/{trip_id}/cancel")
def cancel_trip(trip_id: str, authorized_by: str = Query("Management Staff"), reason: str = Query("Operational Change")):
    """
    Cancels a scheduled or active trip.
    Reverts crew back to 'Available' at their current physical location (does NOT move them to destination).
    Reverts bus back to 'Available' in SQLite.
    """
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        cursor.execute("SELECT * FROM trip_assignments WHERE id = ?", (trip_id,))
        trip = cursor.fetchone()
        if not trip:
            raise HTTPException(status_code=404, detail=f"Trip {trip_id} not found")

        if trip['status'] == "Completed":
            raise HTTPException(status_code=400, detail="Cannot cancel an already completed trip")

        now_str = datetime.now().isoformat()

        cursor.execute("""
            UPDATE trip_assignments 
            SET status = 'Cancelled', notes = COALESCE(notes || '; ', '') || ?
            WHERE id = ?
        """, (f"Cancelled by {authorized_by}. Reason: {reason}", trip_id))

        try:
            h_ids = json.loads(trip['helper_ids']) if isinstance(trip['helper_ids'], str) else trip['helper_ids']
        except Exception:
            h_ids = []
        crew_ids = [trip['driver_id']] + h_ids

        # Revert crew back to Available
        cursor.execute(f"""
            UPDATE employees 
            SET status = 'Available' 
            WHERE id IN ({','.join(['?']*len(crew_ids))})
        """, crew_ids)

        # Audit log
        cursor.execute("""
            INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
            VALUES (?, 'TRIP_CANCELLED', 'TRIP', ?, ?, ?, 'CMP-001')
        """, (now_str, trip_id, authorized_by, f"Cancelled trip {trip['route_source']} → {trip['route_destination']}. Reason: {reason}. Crew restored to Available at their respective current locations."))

        # Free bus in SQLite
        cursor.execute("""
            UPDATE buses
            SET status = 'Available', assigned_route = NULL, assigned_date = NULL,
                assigned_driver_id = NULL, assigned_helper_ids = NULL
            WHERE id = ?
        """, (trip['bus_id'],))

    conn.close()

    return {
        "status": "success",
        "trip_id": trip_id,
        "message": f"Trip {trip_id} cancelled. Crew and bus released to 'Available' status."
    }
