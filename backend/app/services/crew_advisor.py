"""
MeFleet Intelligent Crew Advisor
Implements smart recommendations for drivers and helpers based on:
- Operational physical location
- Availability and overlapping trip checks
- Rest period enforcement and working hour limits
- Driver qualifications and licence validity
- Historical corridor experience and route continuity
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple, Any
from ..db.database import get_db_connection
from ..models.schemas import Employee, RecommendationItem, SmartRecommendationsResponse

# Distance heuristic matrix for major operating hubs (in km)
CITY_DISTANCES: Dict[Tuple[str, str], float] = {
    ("manipal", "mangalore"): 65.0,
    ("mangalore", "manipal"): 65.0,
    ("manipal", "bangalore"): 400.0,
    ("bangalore", "manipal"): 400.0,
    ("bangalore", "mysore"): 145.0,
    ("mysore", "bangalore"): 145.0,
    ("bangalore", "mangalore"): 350.0,
    ("mangalore", "bangalore"): 350.0,
    ("bangalore", "tumkur"): 70.0,
    ("tumkur", "bangalore"): 70.0,
    ("bangalore", "hubli"): 410.0,
    ("hubli", "bangalore"): 410.0,
    ("mangalore", "mysore"): 255.0,
    ("mysore", "mangalore"): 255.0,
    ("bangalore", "tirupati"): 250.0,
    ("tirupati", "bangalore"): 250.0,
    ("bangalore", "dharmasthala"): 305.0,
    ("dharmasthala", "bangalore"): 305.0,
    ("mangalore", "dharmasthala"): 75.0,
    ("dharmasthala", "mangalore"): 75.0,
    ("manipal", "dharmasthala"): 105.0,
    ("dharmasthala", "manipal"): 105.0,
    ("manipal", "goa"): 290.0,
    ("goa", "manipal"): 290.0,
}

def estimate_repositioning(current_city: str, target_city: str) -> Tuple[float, float]:
    """
    Returns (distance_km, estimated_hours) between two cities.
    """
    c1, c2 = current_city.strip().lower(), target_city.strip().lower()
    if c1 == c2:
        return 0.0, 0.0
    
    dist = CITY_DISTANCES.get((c1, c2), 250.0)
    # Average transfer speed 50 km/h
    hours = round(dist / 50.0, 1)
    return dist, hours

class CrewAdvisor:
    """Intelligent recommendation engine for drivers and helpers."""

    def get_recommendations(
        self,
        source: str,
        destination: str,
        travel_date_str: str,
        departure_time_str: str = "08:00",
        bus_type: str = "Standard"
    ) -> SmartRecommendationsResponse:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Parse proposed departure datetime
        try:
            dep_dt = datetime.fromisoformat(f"{travel_date_str}T{departure_time_str}:00")
        except Exception:
            dep_dt = datetime.now() + timedelta(hours=2)

        cursor.execute("SELECT * FROM employees")
        rows = cursor.fetchall()
        
        drivers_rec: List[RecommendationItem] = []
        helpers_rec: List[RecommendationItem] = []

        available_drivers_at_source = 0
        available_helpers_at_source = 0

        for row in rows:
            emp_dict = dict(row)
            
            # Count upcoming trips
            cursor.execute(
                "SELECT COUNT(*) FROM trip_assignments WHERE (driver_id = ? OR helper_ids LIKE ?) AND status IN ('Scheduled', 'En Route')",
                (emp_dict['id'], f"%{emp_dict['id']}%")
            )
            emp_dict['upcoming_trips_count'] = cursor.fetchone()[0]

            # Fetch previous trip from history
            cursor.execute(
                "SELECT route, arrival_time FROM employee_trip_history WHERE employee_id = ? ORDER BY id DESC LIMIT 1",
                (emp_dict['id'],)
            )
            prev_row = cursor.fetchone()
            if prev_row:
                emp_dict['previous_trip'] = f"{prev_row['route']} ({prev_row['arrival_time'] or 'Recent'})"
            else:
                emp_dict['previous_trip'] = "None on record"

            employee_obj = Employee(**emp_dict)
            
            rec_item = self._score_employee(
                employee=employee_obj,
                source=source,
                destination=destination,
                proposed_departure=dep_dt,
                cursor=cursor
            )

            if employee_obj.role == "Driver":
                drivers_rec.append(rec_item)
                if rec_item.location_match and employee_obj.status == "Available":
                    available_drivers_at_source += 1
            else:
                helpers_rec.append(rec_item)
                if rec_item.location_match and employee_obj.status == "Available":
                    available_helpers_at_source += 1

        conn.close()

        # Sort: eligible first, then by score descending
        drivers_rec.sort(key=lambda x: (x.is_eligible, x.location_match, x.score), reverse=True)
        helpers_rec.sort(key=lambda x: (x.is_eligible, x.location_match, x.score), reverse=True)

        return SmartRecommendationsResponse(
            source=source,
            destination=destination,
            travel_date=travel_date_str,
            departure_time=departure_time_str,
            drivers=drivers_rec,
            helpers=helpers_rec,
            available_drivers_at_source_count=available_drivers_at_source,
            available_helpers_at_source_count=available_helpers_at_source
        )

    def _score_employee(
        self,
        employee: Employee,
        source: str,
        destination: str,
        proposed_departure: datetime,
        cursor: Any
    ) -> RecommendationItem:
        score = 0.0
        reasons: List[str] = []
        warnings: List[str] = []
        is_eligible = True
        location_match = (employee.current_location.strip().lower() == source.strip().lower())
        repositioning_needed = False
        repositioning_dist = None
        repositioning_note = None

        # 1. Location Matching (Crucial constraint)
        if location_match:
            score += 40.0
            reasons.append(f"Physically present at starting hub ({employee.current_location})")
        else:
            repositioning_needed = True
            dist, hrs = estimate_repositioning(employee.current_location, source)
            repositioning_dist = dist
            repositioning_note = f"Stationed in {employee.current_location}. Requires ~{dist} km ({hrs}h) repositioning to {source}."
            warnings.append(repositioning_note)
            score += max(0.0, 20.0 - (dist * 0.05))

        # 2. Availability & Status Checking
        now = datetime.now()
        rest_status = "Available"

        if employee.status == "Available":
            score += 25.0
            reasons.append("Currently marked Available for assignment")
            rest_status = "Fully Rested & Available"
        elif employee.status == "Resting":
            if employee.rest_ends_at:
                try:
                    rest_end_dt = datetime.fromisoformat(employee.rest_ends_at)
                    if proposed_departure >= rest_end_dt:
                        score += 20.0
                        reasons.append(f"Rest completes before departure (Ready at {rest_end_dt.strftime('%H:%M')})")
                        rest_status = f"Resting (clears at {rest_end_dt.strftime('%H:%M')})"
                    else:
                        is_eligible = False
                        warnings.append(f"Mandatory rest period in progress until {rest_end_dt.strftime('%d-%b %H:%M')}")
                        rest_status = f"Mandatory Rest Active until {rest_end_dt.strftime('%H:%M')}"
                except Exception:
                    warnings.append("Rest period end time unspecified")
                    rest_status = "Resting"
            else:
                score += 10.0
                warnings.append("Currently in resting cooldown; verify fatigue before dispatch")
                rest_status = "Resting"
        elif employee.status in ("Assigned", "En Route", "On Duty"):
            # Check for overlapping scheduled or active trips
            cursor.execute("""
                SELECT route_source, route_destination, travel_date, departure_time, status
                FROM trip_assignments
                WHERE (driver_id = ? OR helper_ids LIKE ?) AND status IN ('Scheduled', 'En Route')
            """, (employee.id, f"%{employee.id}%"))
            active_trips = cursor.fetchall()
            if active_trips:
                is_eligible = False
                trip_desc = f"{active_trips[0]['route_source']} → {active_trips[0]['route_destination']} on {active_trips[0]['travel_date']}"
                warnings.append(f"Overlapping conflict: Already {employee.status.lower()} on {trip_desc}")
                rest_status = f"Engaged: {employee.status}"
            else:
                warnings.append(f"Status is {employee.status}; requires status clearance")
                rest_status = employee.status
        elif employee.status in ("On Leave", "Unavailable"):
            is_eligible = False
            warnings.append(f"Employee is currently {employee.status}")
            rest_status = employee.status

        # 3. Qualifications & Licence Validation (for Drivers)
        if employee.role == "Driver":
            if not employee.licence_number:
                is_eligible = False
                warnings.append("No driving licence registered")
            else:
                reasons.append(f"Licence verified: {employee.licence_type or 'Commercial'}")
                score += 15.0

            if employee.licence_expiry:
                try:
                    expiry_date = date.fromisoformat(employee.licence_expiry)
                    if expiry_date < date.today():
                        is_eligible = False
                        warnings.append(f"Driving licence expired on {employee.licence_expiry}")
                    elif (expiry_date - date.today()).days < 30:
                        warnings.append(f"Licence expiring soon ({employee.licence_expiry})")
                        score += 5.0
                    else:
                        score += 10.0
                except Exception:
                    pass

        # 4. Route Continuity & Corridor Experience
        # If previous trip brought them to source hub
        cursor.execute("""
            SELECT route, arrival_time FROM employee_trip_history
            WHERE employee_id = ? ORDER BY id DESC LIMIT 1
        """, (employee.id,))
        last_trip = cursor.fetchone()
        if last_trip:
            last_route = last_trip['route']
            # If last route ended at current source (e.g., Manipal → Bangalore, and source is Bangalore)
            if "→" in last_route:
                parts = last_route.split("→")
                if len(parts) == 2 and parts[1].strip().lower() == source.strip().lower():
                    score += 15.0
                    reasons.append(f"Optimal return trip chain: Arrived in {source} via {last_route.strip()}")

        # Corridor familiarity
        corridor_str = f"%{source}%{destination}%"
        cursor.execute("""
            SELECT COUNT(*) FROM employee_trip_history
            WHERE employee_id = ? AND route LIKE ?
        """, (employee.id, corridor_str))
        corridor_count = cursor.fetchone()[0]
        if corridor_count > 0:
            score += 10.0
            reasons.append(f"Corridor experience: Completed {corridor_count} previous trip(s) on this route")

        # 5. Duty Hour Balances
        if (employee.total_duty_hours or 0.0) < 300:
            score += 5.0
            reasons.append("Balanced monthly duty hours")

        # Final Score clamp
        final_score = round(max(5.0, min(99.0, score)), 1)
        if not is_eligible:
            final_score = min(final_score, 35.0)

        is_recommended = is_eligible and location_match and final_score >= 60.0

        return RecommendationItem(
            employee=employee,
            score=final_score,
            is_recommended=is_recommended,
            is_eligible=is_eligible,
            location_match=location_match,
            repositioning_needed=repositioning_needed,
            repositioning_distance_km=repositioning_dist,
            repositioning_note=repositioning_note,
            rest_status=rest_status,
            reasons=reasons if reasons else ["General crew member"],
            warnings=warnings
        )

crew_advisor = CrewAdvisor()

