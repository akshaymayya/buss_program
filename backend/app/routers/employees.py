from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional, Dict, Any
import json
import uuid
from datetime import datetime, date, timedelta

from ..models.schemas import (
    Employee, EmployeeCreate, EmployeeUpdate, EmployeeOverrideRequest,
    TripAssignment, SmartRecommendationRequest, SmartRecommendationsResponse,
    EmployeeLocationHistory, EmployeeTripHistory, AuditLog
)
from ..db.database import get_db_connection, immediate_transaction
from ..services.crew_advisor import crew_advisor

router = APIRouter()

def _row_to_employee(row, cursor) -> Employee:
    """Helper to convert database row into Employee schema with computed trip context."""
    d = dict(row)
    emp_id = d['id']
    
    # Check upcoming trips
    cursor.execute("""
        SELECT COUNT(*) FROM trip_assignments 
        WHERE (driver_id = ? OR helper_ids LIKE ?) 
          AND status IN ('Scheduled', 'En Route')
    """, (emp_id, f"%{emp_id}%"))
    d['upcoming_trips_count'] = cursor.fetchone()[0]

    # Get most recent previous trip
    cursor.execute("""
        SELECT route, arrival_time FROM employee_trip_history 
        WHERE employee_id = ? 
        ORDER BY id DESC LIMIT 1
    """, (emp_id,))
    prev = cursor.fetchone()
    if prev:
        d['previous_trip'] = f"{prev['route']} ({prev['arrival_time'] or 'Completed'})"
    else:
        d['previous_trip'] = None

    return Employee(**d)

@router.get("/", response_model=List[Employee])
def get_employees(
    location: Optional[str] = Query(None, description="Filter by operational city"),
    role: Optional[str] = Query(None, description="Filter by Driver or Helper"),
    status: Optional[str] = Query(None, description="Filter by status: Available, Assigned, En Route, Resting, etc."),
    search: Optional[str] = Query(None, description="Search by name, phone, or ID")
):
    """
    Returns employees with dynamic operational locations and availability.
    Supports filtering by current verified location, role, status, and text search.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM employees WHERE 1=1"
    params = []

    if location:
        query += " AND LOWER(current_location) = LOWER(?)"
        params.append(location.strip())

    if role:
        query += " AND LOWER(role) = LOWER(?)"
        params.append(role.strip())

    if status:
        query += " AND LOWER(status) = LOWER(?)"
        params.append(status.strip())

    if search:
        search_pattern = f"%{search.strip()}%"
        query += " AND (name LIKE ? OR phone LIKE ? OR id LIKE ? OR licence_number LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    query += " ORDER BY role ASC, name ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    employees = [_row_to_employee(r, cursor) for r in rows]
    conn.close()
    return employees

@router.get("/stats")
def get_employee_stats():
    """
    Returns aggregate stats: totals by role, count by status,
    and city-wise available drivers/helpers.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM employees")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM employees WHERE role = 'Driver'")
    total_drivers = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM employees WHERE role = 'Helper'")
    total_helpers = cursor.fetchone()[0]

    # Status counts
    cursor.execute("SELECT status, COUNT(*) FROM employees GROUP BY status")
    status_counts = {r[0]: r[1] for r in cursor.fetchall()}
    for s in ["Available", "Assigned", "En Route", "On Duty", "Resting", "On Leave", "Unavailable"]:
        status_counts.setdefault(s, 0)

    # City-wise breakdown of available crew
    cursor.execute("""
        SELECT current_location, 
               SUM(CASE WHEN role = 'Driver' AND status = 'Available' THEN 1 ELSE 0 END) as avail_drivers,
               SUM(CASE WHEN role = 'Helper' AND status = 'Available' THEN 1 ELSE 0 END) as avail_helpers,
               COUNT(*) as total_crew
        FROM employees
        GROUP BY current_location
        ORDER BY total_crew DESC
    """)
    locations = [
        {
            "city": r["current_location"],
            "available_drivers": r["avail_drivers"],
            "available_helpers": r["avail_helpers"],
            "total_crew": r["total_crew"]
        }
        for r in cursor.fetchall()
    ]

    conn.close()
    return {
        "total": total,
        "total_drivers": total_drivers,
        "total_helpers": total_helpers,
        "status_counts": status_counts,
        "location_summary": locations
    }

@router.get("/locations")
def get_location_breakdown():
    """Returns available drivers and helpers grouped by operational location."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT current_location, role, status, COUNT(*) as count
        FROM employees
        GROUP BY current_location, role, status
    """)
    rows = cursor.fetchall()
    breakdown: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        loc = r['current_location']
        if loc not in breakdown:
            breakdown[loc] = {"drivers_available": 0, "helpers_available": 0, "total": 0}
        breakdown[loc]["total"] += r['count']
        if r['status'] == "Available":
            if r['role'] == "Driver":
                breakdown[loc]["drivers_available"] += r['count']
            elif r['role'] == "Helper":
                breakdown[loc]["helpers_available"] += r['count']

    conn.close()
    return breakdown

@router.get("/audit-logs", response_model=List[AuditLog])
def get_audit_logs(limit: int = 50):
    """Returns chronological audit log entries."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    logs = [AuditLog(**dict(r)) for r in rows]
    conn.close()
    return logs

@router.get("/{employee_id}", response_model=Employee)
def get_employee_by_id(employee_id: str):
    """Fetches details for a single employee."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
    emp = _row_to_employee(row, cursor)
    conn.close()
    return emp

@router.post("/", response_model=Employee)
def create_employee(data: EmployeeCreate):
    """Adds a new driver or helper with operational location and licence verification."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Generate new ID
    cursor.execute("SELECT id FROM employees WHERE role = ? ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC LIMIT 1", (data.role,))
    last_row = cursor.fetchone()
    if last_row and last_row[0][1:].isdigit():
        new_num = int(last_row[0][1:]) + 1
        new_id = f"E{new_num}"
    else:
        cursor.execute("SELECT COUNT(*) FROM employees")
        new_id = f"E{cursor.fetchone()[0] + 1}"

    now_str = datetime.now().isoformat()
    joined = data.joined_date or date.today().isoformat()

    # Drivers require commercial license check
    is_verified = 1 if data.role == "Helper" or (data.licence_number and len(data.licence_number) > 3) else 0

    cursor.execute("""
        INSERT INTO employees (
            id, name, role, phone, email, licence_number, licence_type, licence_expiry,
            is_licence_verified, current_location, status, joined_date, total_duty_hours,
            max_daily_duty_hours, min_rest_hours, company_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?, 0.0, ?, ?, 'CMP-001', ?)
    """, (
        new_id, data.name, data.role, data.phone, data.email,
        data.licence_number, data.licence_type, data.licence_expiry,
        is_verified, data.current_location, joined,
        data.max_daily_duty_hours or 10.0, data.min_rest_hours or 8.0,
        now_str
    ))

    # Record initial location history
    cursor.execute("""
        INSERT INTO employee_locations (employee_id, old_location, new_location, reason, trip_id, updated_by, timestamp)
        VALUES (?, NULL, ?, 'Initial Staff Onboarding', NULL, 'Management Staff', ?)
    """, (new_id, data.current_location, now_str))

    # Audit log
    cursor.execute("""
        INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
        VALUES (?, 'EMPLOYEE_CREATED', 'EMPLOYEE', ?, 'Management Staff', ?, 'CMP-001')
    """, (now_str, new_id, f"Added {data.role} {data.name} stationed at {data.current_location}"))

    conn.commit()

    cursor.execute("SELECT * FROM employees WHERE id = ?", (new_id,))
    created_row = cursor.fetchone()
    emp = _row_to_employee(created_row, cursor)
    conn.close()
    return emp

@router.put("/{employee_id}", response_model=Employee)
def update_employee(employee_id: str, data: EmployeeUpdate):
    """Updates employee profile attributes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")

    updates = []
    params = []
    for field, val in data.model_dump(exclude_unset=True).items():
        if val is not None:
            updates.append(f"{field} = ?")
            params.append(val)

    if updates:
        params.append(employee_id)
        cursor.execute(f"UPDATE employees SET {', '.join(updates)} WHERE id = ?", params)
        
        # Log audit
        now_str = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
            VALUES (?, 'EMPLOYEE_UPDATED', 'EMPLOYEE', ?, 'Management Staff', ?, 'CMP-001')
        """, (now_str, employee_id, f"Updated attributes: {', '.join(data.model_dump(exclude_unset=True).keys())}"))
        conn.commit()

    cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    updated_row = cursor.fetchone()
    emp = _row_to_employee(updated_row, cursor)
    conn.close()
    return emp

@router.delete("/{employee_id}")
def delete_employee(employee_id: str):
    """Removes an employee if not currently engaged on an active trip."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT status, name FROM employees WHERE id = ?", (employee_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")

    if row['status'] in ('Assigned', 'En Route', 'On Duty'):
        conn.close()
        raise HTTPException(status_code=400, detail=f"Cannot remove employee while status is '{row['status']}'. Cancel trip first.")

    now_str = datetime.now().isoformat()
    cursor.execute("DELETE FROM employees WHERE id = ?", (employee_id,))
    cursor.execute("""
        INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
        VALUES (?, 'EMPLOYEE_DELETED', 'EMPLOYEE', ?, 'Management Staff', ?, 'CMP-001')
    """, (now_str, employee_id, f"Deleted employee {row['name']}"))

    conn.commit()
    conn.close()
    return {"message": f"Employee {employee_id} removed successfully"}

@router.post("/{employee_id}/override", response_model=Employee)
def override_employee_status_or_location(employee_id: str, req: EmployeeOverrideRequest):
    """
    Authorized Manual Correction with Audit Log.
    Allows management to adjust operational location or status with mandatory justification reason.
    """
    if not req.reason or len(req.reason.strip()) < 4:
        raise HTTPException(status_code=400, detail="A valid justification reason is required for manual override")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")

    old_loc = row['current_location']
    old_status = row['status']
    now_str = datetime.now().isoformat()

    updates = []
    params = []
    audit_notes = []

    if req.new_location and req.new_location.strip() != old_loc:
        new_loc = req.new_location.strip()
        updates.append("current_location = ?")
        params.append(new_loc)
        audit_notes.append(f"Location changed: '{old_loc}' → '{new_loc}'")
        
        # Log to employee_locations
        cursor.execute("""
            INSERT INTO employee_locations (employee_id, old_location, new_location, reason, trip_id, updated_by, timestamp)
            VALUES (?, ?, ?, ?, NULL, ?, ?)
        """, (employee_id, old_loc, new_loc, f"Manual Override: {req.reason}", req.authorized_by, now_str))

    if req.new_status and req.new_status.strip() != old_status:
        new_stat = req.new_status.strip()
        updates.append("status = ?")
        params.append(new_stat)
        audit_notes.append(f"Status changed: '{old_status}' → '{new_stat}'")

        if new_stat == "Resting":
            rest_end = (datetime.now() + timedelta(hours=row['min_rest_hours'] or 8.0)).isoformat()
            updates.append("rest_ends_at = ?")
            params.append(rest_end)
        elif new_stat == "Available":
            updates.append("rest_ends_at = NULL")

    if not updates:
        emp = _row_to_employee(row, cursor)
        conn.close()
        return emp

    params.append(employee_id)
    cursor.execute(f"UPDATE employees SET {', '.join(updates)} WHERE id = ?", params)

    # Log to audit trail
    cursor.execute("""
        INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
        VALUES (?, 'LOCATION_STATUS_OVERRIDE', 'EMPLOYEE', ?, ?, ?, 'CMP-001')
    """, (now_str, employee_id, req.authorized_by, f"{'; '.join(audit_notes)}. Reason: {req.reason}"))

    conn.commit()

    cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    updated_row = cursor.fetchone()
    emp = _row_to_employee(updated_row, cursor)
    conn.close()
    return emp

@router.get("/{employee_id}/history")
def get_employee_history(employee_id: str):
    """
    Returns complete location tracking history and past trip history for the employee.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    emp_row = cursor.fetchone()
    if not emp_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")

    cursor.execute("""
        SELECT * FROM employee_locations 
        WHERE employee_id = ? 
        ORDER BY id DESC
    """, (employee_id,))
    locations = [EmployeeLocationHistory(**dict(r)) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT * FROM employee_trip_history 
        WHERE employee_id = ? 
        ORDER BY id DESC
    """, (employee_id,))
    trips = [EmployeeTripHistory(**dict(r)) for r in cursor.fetchall()]

    conn.close()
    return {
        "employee_id": employee_id,
        "name": emp_row["name"],
        "role": emp_row["role"],
        "current_location": emp_row["current_location"],
        "location_history": locations,
        "trip_history": trips
    }

@router.post("/{employee_id}/complete-rest", response_model=Employee)
def complete_rest_period(employee_id: str):
    """Marks rest period satisfied and restores employee status to Available."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")

    now_str = datetime.now().isoformat()
    cursor.execute("""
        UPDATE employees 
        SET status = 'Available', rest_ends_at = NULL 
        WHERE id = ?
    """, (employee_id,))

    cursor.execute("""
        INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
        VALUES (?, 'REST_COMPLETED', 'EMPLOYEE', ?, 'Management Staff', 'Rest period cleared. Employee marked Available.', 'CMP-001')
    """, (now_str, employee_id))

    conn.commit()

    cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    emp = _row_to_employee(cursor.fetchone(), cursor)
    conn.close()
    return emp

@router.post("/smart-recommendations", response_model=SmartRecommendationsResponse)
def get_smart_recommendations(req: SmartRecommendationRequest):
    """
    Intelligent recommendation endpoint.
    Evaluates physical location, rest periods, licence status, and corridor experience
    to return scored drivers and helpers for the requested route.
    """
    return crew_advisor.get_recommendations(
        source=req.source,
        destination=req.destination,
        travel_date_str=req.travel_date,
        departure_time_str=req.departure_time or "08:00",
        bus_type=req.bus_type or "Standard"
    )

@router.post("/assign")
def assign_trip(assignment: TripAssignment):
    """
    Assigns a trip with strict validation inside an immediate ACID transaction:
    1. Validates bus existence and availability in SQLite (rejects Maintenance / On Route)
    2. Validates driver licence
    3. Validates crew existence and availability
    4. Prevents overlapping assignments
    5. Respects rest periods
    6. Confirms crew starting location (location remains at source until verified arrival)
    7. Sets employee status to 'Assigned'
    8. Sets bus status to 'On Route' in SQLite with trip metadata
    """
    conn = get_db_connection()
    with immediate_transaction(conn) as cursor:
        # Verify Bus in SQLite
        cursor.execute("SELECT id, plate_number, status FROM buses WHERE id = ?", (assignment.bus_id,))
        bus_row = cursor.fetchone()
        if not bus_row:
            raise HTTPException(status_code=400, detail=f"Bus {assignment.bus_id} not found in fleet database")

        if bus_row['status'] == "Maintenance":
            raise HTTPException(status_code=400, detail=f"Cannot assign trip: Bus {bus_row['plate_number']} is under maintenance")
        if bus_row['status'] == "On Route":
            raise HTTPException(status_code=400, detail=f"Cannot assign trip: Bus {bus_row['plate_number']} is already assigned and On Route")

        # Verify driver exists
        cursor.execute("SELECT * FROM employees WHERE id = ?", (assignment.driver_id,))
        driver_row = cursor.fetchone()
        if not driver_row:
            raise HTTPException(status_code=400, detail=f"Driver {assignment.driver_id} not found")

        if driver_row['role'] != "Driver":
            raise HTTPException(status_code=400, detail=f"Employee {assignment.driver_id} is not registered as a Driver")

        # Check driver licence expiry
        if driver_row['licence_expiry']:
            try:
                if date.fromisoformat(driver_row['licence_expiry']) < date.today():
                    raise HTTPException(status_code=400, detail=f"Driver {driver_row['name']} has an expired licence ({driver_row['licence_expiry']})")
            except Exception:
                pass

        # Check helper 1
        cursor.execute("SELECT * FROM employees WHERE id = ?", (assignment.helper_1_id,))
        h1_row = cursor.fetchone()
        if not h1_row:
            raise HTTPException(status_code=400, detail=f"Helper {assignment.helper_1_id} not found")

        helper_ids = [assignment.helper_1_id]
        if assignment.helper_2_id and assignment.helper_2_id.strip():
            cursor.execute("SELECT * FROM employees WHERE id = ?", (assignment.helper_2_id,))
            h2_row = cursor.fetchone()
            if not h2_row:
                raise HTTPException(status_code=400, detail=f"Helper {assignment.helper_2_id} not found")
            helper_ids.append(assignment.helper_2_id)

        all_crew_ids = [assignment.driver_id] + helper_ids

        # Prevent overlapping assignments
        for cid in all_crew_ids:
            cursor.execute("""
                SELECT id, route_source, route_destination, travel_date, status 
                FROM trip_assignments 
                WHERE (driver_id = ? OR helper_ids LIKE ?) 
                  AND status IN ('Scheduled', 'En Route')
                  AND travel_date = ?
            """, (cid, f"%{cid}%", assignment.travel_date))
            overlap = cursor.fetchone()
            if overlap:
                cursor.execute("SELECT name FROM employees WHERE id = ?", (cid,))
                cname = cursor.fetchone()[0]
                raise HTTPException(
                    status_code=400, 
                    detail=f"Overlapping assignment conflict: {cname} is already assigned to trip {overlap['route_source']} → {overlap['route_destination']} on {assignment.travel_date}"
                )

        # Check rest period
        for cid in all_crew_ids:
            cursor.execute("SELECT name, status, rest_ends_at FROM employees WHERE id = ?", (cid,))
            emp_st = cursor.fetchone()
            if emp_st['status'] == "Resting" and emp_st['rest_ends_at']:
                try:
                    rest_end = datetime.fromisoformat(emp_st['rest_ends_at'])
                    dep_dt = datetime.fromisoformat(f"{assignment.travel_date}T{assignment.departure_time or '08:00'}:00")
                    if dep_dt < rest_end:
                        raise HTTPException(
                            status_code=400,
                            detail=f"{emp_st['name']} is in mandatory rest until {rest_end.strftime('%d-%b %H:%M')}. Assignment rejected."
                        )
                except Exception:
                    pass

        # Generate Trip ID
        trip_id = f"TRIP-{uuid.uuid4().hex[:6].upper()}"
        now_str = datetime.now().isoformat()
        route_str = f"{assignment.route_source} → {assignment.route_destination}"

        # Insert trip assignment into SQLite
        cursor.execute("""
            INSERT INTO trip_assignments (
                id, company_id, bus_id, route_source, route_destination,
                travel_date, departure_time, driver_id, helper_ids, status,
                notes, created_at
            ) VALUES (?, 'CMP-001', ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?)
        """, (
            trip_id, assignment.bus_id, assignment.route_source, assignment.route_destination,
            assignment.travel_date, assignment.departure_time or "08:00",
            assignment.driver_id, json.dumps(helper_ids),
            assignment.notes or f"Created by {assignment.authorized_by or 'Management'}",
            now_str
        ))

        # Update employee status to 'Assigned'
        # IMPORTANT RULE: Location stays at SOURCE until arrival is officially verified!
        cursor.execute(f"""
            UPDATE employees 
            SET status = 'Assigned'
            WHERE id IN ({','.join(['?']*len(all_crew_ids))})
        """, all_crew_ids)

        # Update Bus status to 'On Route' in SQLite
        cursor.execute("""
            UPDATE buses
            SET status = 'On Route', assigned_route = ?, assigned_date = ?,
                assigned_driver_id = ?, assigned_helper_ids = ?
            WHERE id = ?
        """, (route_str, assignment.travel_date, assignment.driver_id, json.dumps(helper_ids), assignment.bus_id))

        # Audit log
        cursor.execute("""
            INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_role, details, company_id)
            VALUES (?, 'TRIP_ASSIGNED', 'TRIP', ?, ?, ?, 'CMP-001')
        """, (
            now_str, trip_id, assignment.authorized_by or 'Management Staff',
            f"Assigned trip {route_str} on {assignment.travel_date} to Driver {driver_row['name']} (Bus {bus_row['plate_number']})"
        ))

    conn.close()

    return {
        "status": "success",
        "trip_id": trip_id,
        "message": f"Trip {trip_id} successfully assigned! Driver and Helpers set to 'Assigned' at {assignment.route_source}. Awaiting dispatch.",
        "route": route_str,
        "bus_id": assignment.bus_id,
        "bus_plate": bus_row['plate_number'],
        "driver": driver_row['name'],
        "starting_location": assignment.route_source,
        "destination": assignment.route_destination
    }
