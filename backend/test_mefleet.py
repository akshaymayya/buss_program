import requests
import json
import concurrent.futures
from datetime import date, timedelta
from app.services.intelligence import CorridorFeasibilityCalculator, RouteGISAdapter

BASE_URL = "http://127.0.0.1:8000"

def test_full_lifecycle():
    print("--- [Suite 1] Testing Driver & Helper Management Lifecycle ---")

    # Reset E9 and E10 to Manipal for idempotent testing
    requests.post(f"{BASE_URL}/api/employees/E9/override", json={
        "new_location": "Manipal",
        "new_status": "Available",
        "reason": "Test setup reset",
        "authorized_by": "Test Harness"
    })
    requests.post(f"{BASE_URL}/api/employees/E10/override", json={
        "new_location": "Manipal",
        "new_status": "Available",
        "reason": "Test setup reset",
        "authorized_by": "Test Harness"
    })
    # Reset Bus B1 to Available
    requests.put(f"{BASE_URL}/api/fleet/B1/status?status=Available")

    # 1. Check Stats
    res = requests.get(f"{BASE_URL}/api/employees/stats")
    assert res.status_code == 200, f"Stats failed: {res.text}"
    stats = res.json()
    print("1. Employee Stats OK:", stats['total'], "employees across", len(stats['location_summary']), "locations")

    # 2. Check Employees in Manipal
    res = requests.get(f"{BASE_URL}/api/employees/?location=Manipal")
    assert res.status_code == 200
    manipal_crew = res.json()
    driver_e9 = next((e for e in manipal_crew if e['id'] == 'E9'), None)
    helper_e10 = next((e for e in manipal_crew if e['id'] == 'E10'), None)
    assert driver_e9 is not None, "Driver E9 should be in Manipal"
    assert helper_e10 is not None, "Helper E10 should be in Manipal"
    assert driver_e9['current_location'] == "Manipal"
    print("2. Verified initial location: Anand Poojary (E9) and Praveen Rai (E10) are in Manipal")

    # 3. Smart Recommendations for Manipal -> Bangalore
    rec_payload = {
        "source": "Manipal",
        "destination": "Bangalore",
        "travel_date": str(date.today()),
        "departure_time": "09:00",
        "bus_type": "Multi-Axle Volvo"
    }
    res = requests.post(f"{BASE_URL}/api/employees/smart-recommendations", json=rec_payload)
    assert res.status_code == 200, f"Recommendations failed: {res.text}"
    rec_data = res.json()
    top_driver = rec_data['drivers'][0]
    assert top_driver['employee']['id'] == 'E9', f"Top driver for Manipal should be E9, got {top_driver['employee']['id']}"
    assert top_driver['location_match'] is True
    print(f"3. Smart Recommendation OK: Top driver is {top_driver['employee']['name']}")

    # 4. Assign Trip Manipal -> Bangalore
    assign_payload = {
        "route_source": "Manipal",
        "route_destination": "Bangalore",
        "travel_date": str(date.today()),
        "departure_time": "09:00",
        "bus_id": "B1",
        "driver_id": "E9",
        "helper_1_id": "E10",
        "notes": "Express Coastal Route",
        "authorized_by": "Fleet Chief Controller"
    }
    res = requests.post(f"{BASE_URL}/api/employees/assign", json=assign_payload)
    assert res.status_code == 200, f"Assignment failed: {res.text}"
    assign_res = res.json()
    trip_id = assign_res['trip_id']
    print(f"4. Trip Assigned OK: Trip ID {trip_id}")

    # Verify status is 'Assigned' and location is STILL Manipal before departure/arrival!
    res_e9 = requests.get(f"{BASE_URL}/api/employees/E9").json()
    assert res_e9['status'] == "Assigned"
    assert res_e9['current_location'] == "Manipal", "Location MUST remain Manipal before arrival!"
    
    # Verify Bus B1 is now On Route in SQLite
    res_b1 = requests.get(f"{BASE_URL}/api/fleet/").json()
    b1_data = next((b for b in res_b1 if b['id'] == 'B1'), None)
    assert b1_data is not None and b1_data['status'] == "On Route", "Bus B1 must be marked On Route in SQLite"
    print("   Verified: Driver E9 is Assigned, operational location is still Manipal; Bus B1 is On Route")

    # 5. Prevent Overlapping Assignment test
    overlap_payload = {
        "route_source": "Manipal",
        "route_destination": "Goa",
        "travel_date": str(date.today()),
        "departure_time": "14:00",
        "bus_id": "B2",
        "driver_id": "E9",
        "helper_1_id": "E10",
        "authorized_by": "Staff"
    }
    overlap_res = requests.post(f"{BASE_URL}/api/employees/assign", json=overlap_payload)
    assert overlap_res.status_code == 400, "Should reject overlapping trip for assigned employee"
    print("5. Overlapping trip prevention OK: Correctly blocked double-booking of E9")

    # 6. Depart Trip
    depart_res = requests.post(f"{BASE_URL}/api/trips/{trip_id}/depart", json={"verified_by": "Manipal Station Master"})
    assert depart_res.status_code == 200, f"Depart failed: {depart_res.text}"
    res_e9_depart = requests.get(f"{BASE_URL}/api/employees/E9").json()
    assert res_e9_depart['status'] == "En Route"
    assert res_e9_depart['current_location'] == "Manipal", "Location during transit remains departure station until verified arrival"
    print("6. Trip Departure OK: Driver E9 status transitioned to 'En Route'")

    # 7. Verified Arrival at Bangalore
    arrival_res = requests.post(f"{BASE_URL}/api/trips/{trip_id}/verify-arrival", json={
        "verified_by": "Bangalore Kalasipalyam Supervisor",
        "notes": "Bus arrived on time, vehicle inspected, all passengers deboarded safely.",
        "trigger_rest": True,
        "rest_hours": 8.0
    })
    assert arrival_res.status_code == 200, f"Arrival verification failed: {arrival_res.text}"
    print("7. Arrival Verification OK: Confirmed at Bangalore destination")

    # 8. Verify location is NOW Bangalore and status is Resting
    res_e9_arrived = requests.get(f"{BASE_URL}/api/employees/E9").json()
    assert res_e9_arrived['current_location'] == "Bangalore", f"Location should be Bangalore, got {res_e9_arrived['current_location']}"
    assert res_e9_arrived['status'] == "Resting"

    # Verify Bus B1 returned to Available in SQLite
    res_b1_after = requests.get(f"{BASE_URL}/api/fleet/").json()
    b1_after = next((b for b in res_b1_after if b['id'] == 'B1'), None)
    assert b1_after is not None and b1_after['status'] == "Available", "Bus B1 must return to Available in SQLite"
    print(f"8. Verified Location Update: Anand Poojary is now at {res_e9_arrived['current_location']} (Status: Resting), Bus B1 released")

    # 9. Verify Location History audit trail
    history_res = requests.get(f"{BASE_URL}/api/employees/E9/history")
    assert history_res.status_code == 200
    hist = history_res.json()
    assert len(hist['location_history']) >= 2
    latest_loc = hist['location_history'][0]
    assert latest_loc['new_location'] == "Bangalore"
    print(f"9. Location History Audit OK: '{latest_loc['old_location']}' → '{latest_loc['new_location']}' logged")

    # 10. Complete Rest Period
    rest_clear_res = requests.post(f"{BASE_URL}/api/employees/E9/complete-rest")
    assert rest_clear_res.status_code == 200
    res_e9_ready = requests.get(f"{BASE_URL}/api/employees/E9").json()
    assert res_e9_ready['status'] == "Available"
    print("10. Rest Completion OK: Anand Poojary is now Available in Bangalore")

    # 11. Next Trip Recommendation: From Bangalore!
    rec_next = requests.post(f"{BASE_URL}/api/employees/smart-recommendations", json={
        "source": "Bangalore",
        "destination": "Mangalore",
        "travel_date": str(date.today() + timedelta(days=1)),
        "departure_time": "07:00"
    }).json()
    
    bangalore_e9 = next((d for d in rec_next['drivers'] if d['employee']['id'] == 'E9'), None)
    assert bangalore_e9 is not None, "E9 should appear in Bangalore driver recommendations"
    assert bangalore_e9['location_match'] is True, "E9 should now have location_match=True for Bangalore!"
    print("11. Next Assignment Rule Verified: E9 naturally recommended for trip starting from Bangalore")

    # 12. Manual Override Test with Audit
    override_res = requests.post(f"{BASE_URL}/api/employees/E9/override", json={
        "new_location": "Bangalore",
        "new_status": "Available",
        "reason": "Routine depot audit confirmation",
        "authorized_by": "Director of Operations"
    })
    assert override_res.status_code == 200
    print("12. Manual Override with Audit Log OK")


def test_sqlite_fleet_persistence():
    print("\n--- [Suite 2] Testing SQLite Fleet Persistence & Lifecycle ---")
    
    # 1. Fetch fleet from SQLite
    res = requests.get(f"{BASE_URL}/api/fleet/")
    assert res.status_code == 200
    fleet = res.json()
    assert len(fleet) >= 4, f"Expected at least 4 seeded vehicles, got {len(fleet)}"
    print(f"1. Fleet Persistence: Verified {len(fleet)} buses persisted in SQLite")

    # 2. Add temporary test vehicle
    test_bus = {
        "plate_number": "KA-04-TEST-9999",
        "type": "AC Sleeper 2+1",
        "capacity": 36,
        "status": "Available"
    }
    add_res = requests.post(f"{BASE_URL}/api/fleet/", json=test_bus)
    assert add_res.status_code == 200, f"Failed to add bus: {add_res.text}"
    created_bus = add_res.json()
    bus_id = created_bus['id']
    print(f"2. Add Bus OK: Created vehicle {bus_id} ({test_bus['plate_number']})")

    # 3. Send to Maintenance in SQLite
    maint_res = requests.put(f"{BASE_URL}/api/fleet/{bus_id}/maintenance")
    assert maint_res.status_code == 200
    assert maint_res.json()['bus']['status'] == "Maintenance"
    print(f"3. Maintenance Transition OK: Bus {bus_id} marked as Maintenance")

    # 4. Complete Maintenance in SQLite
    comp_res = requests.put(f"{BASE_URL}/api/fleet/{bus_id}/complete-maintenance")
    assert comp_res.status_code == 200
    assert comp_res.json()['bus']['status'] == "Available"
    print(f"4. Complete Maintenance OK: Bus {bus_id} restored to Available")

    # 5. Remove Bus from SQLite
    del_res = requests.delete(f"{BASE_URL}/api/fleet/{bus_id}")
    assert del_res.status_code == 200
    print(f"5. Delete Bus OK: Bus {bus_id} deleted successfully from SQLite")


def test_bus_conflict_rejection():
    print("\n--- [Suite 3] Testing Vehicle Conflict & Maintenance Rejections ---")
    
    # Bus B3 is currently in Maintenance in seed data
    assign_payload = {
        "route_source": "Bangalore",
        "route_destination": "Mysore",
        "travel_date": str(date.today() + timedelta(days=2)),
        "departure_time": "10:00",
        "bus_id": "B3",
        "driver_id": "E1",
        "helper_1_id": "E4",
        "authorized_by": "Test Suite"
    }
    res = requests.post(f"{BASE_URL}/api/employees/assign", json=assign_payload)
    assert res.status_code == 400, "Should reject assignment of a bus under maintenance"
    print("1. Bus Maintenance Conflict: Correctly rejected assignment of Bus B3 (under maintenance)")


def test_concurrent_dispatch_handling():
    print("\n--- [Suite 4] Testing SQLite Concurrency & Immediate Locking ---")
    
    # Prepare two identical dispatch requests targeting the same vehicle (B2) simultaneously
    payload_a = {
        "route_source": "Bangalore",
        "route_destination": "Mysore",
        "travel_date": str(date.today() + timedelta(days=5)),
        "departure_time": "11:00",
        "bus_id": "B2",
        "driver_id": "E1",
        "helper_1_id": "E4",
        "authorized_by": "Dispatcher A"
    }
    payload_b = {
        "route_source": "Bangalore",
        "route_destination": "Mysore",
        "travel_date": str(date.today() + timedelta(days=5)),
        "departure_time": "11:00",
        "bus_id": "B2",
        "driver_id": "E2",
        "helper_1_id": "E5",
        "authorized_by": "Dispatcher B"
    }

    # Reset Bus B2 and crew
    requests.put(f"{BASE_URL}/api/fleet/B2/status?status=Available")

    def submit_dispatch(payload):
        return requests.post(f"{BASE_URL}/api/employees/assign", json=payload)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f_a = executor.submit(submit_dispatch, payload_a)
        f_b = executor.submit(submit_dispatch, payload_b)
        res_a = f_a.result()
        res_b = f_b.result()

    # Exactly one must succeed (200), and the other must be rejected (400) because bus B2 is locked and marked On Route!
    statuses = [res_a.status_code, res_b.status_code]
    assert 200 in statuses, f"Expected one dispatch to succeed, got {statuses}"
    assert 400 in statuses, f"Expected one dispatch to be rejected, got {statuses}"
    print(f"1. Immediate Locking Concurrency OK: Rapid parallel requests safely resolved to {statuses} (1 accepted, 1 conflict rejected)")

    # Clean up test assignment
    trip_id = res_a.json()['trip_id'] if res_a.status_code == 200 else res_b.json()['trip_id']
    requests.post(f"{BASE_URL}/api/trips/{trip_id}/cancel")
    print("2. Concurrency cleanup completed successfully")


def test_deterministic_route_calculator():
    print("\n--- [Suite 5] Testing Deterministic Calculator & GIS Adapter ---")
    
    calc = CorridorFeasibilityCalculator()
    
    # 1. Deterministic distance fallback
    dist = calc.get_fallback_distance("Bangalore", "Mysore")
    assert dist == 150.0, f"Expected 150.0, got {dist}"
    print("1. Deterministic Distance: Bangalore -> Mysore = 150.0 km")

    # 2. Demand calculations
    d_score, reasons = calc.calculate_demand("Mysore", date(2026, 10, 15)) # Dasara month
    assert d_score >= 90, f"Expected Dasara surge >= 90, got {d_score}"
    assert any("Dasara" in r for r in reasons)
    print(f"2. Deterministic Demand: Mysore in October scored {d_score} ({reasons})")

    # 3. Profitability calculations
    econ = calc.calculate_profitability(distance_km=150.0, demand_score=70, fuel_price=100.0, mileage=4.0)
    # fuel_cost = (150/4) * 100 = 37.5 * 100 = 3750.0
    assert econ['fuel_cost'] == 3750.0
    # revenue at score 70: base ticket 1000 * 40 seats * 0.7 occupancy = 28000.0
    assert econ['estimated_revenue'] == 28000.0
    # fixed cost = 3000, total = 6750, profit = 21250.0
    assert econ['profit'] == 21250.0
    assert econ['recommendation'] == "HIGHLY RECOMMENDED (High Demand)"
    print(f"3. Pure Economics Calculation: Revenue={econ['estimated_revenue']}, Profit={econ['profit']} ({econ['recommendation']})")

    # 4. GIS Adapter Fallback Resilience
    adapter = RouteGISAdapter(ors_api_key=None, weather_api_key=None)
    assert adapter.get_coordinates("AnyCity") is None
    assert adapter.get_real_route_data("CityA", "CityB") is None
    assert adapter.get_weather_data("CityA") is None
    print("4. GIS Adapter Resilient Fallback: Clean None returns without network or keys")


if __name__ == "__main__":
    print("================================================================")
    print("       MeFleet Automated Verification & Regression Suite        ")
    print("================================================================\n")
    test_full_lifecycle()
    test_sqlite_fleet_persistence()
    test_bus_conflict_rejection()
    test_concurrent_dispatch_handling()
    test_deterministic_route_calculator()
    print("\n================================================================")
    print("   ALL REGRESSION, PERSISTENCE & CONCURRENCY TESTS PASSED!       ")
    print("================================================================\n")
