import requests
import json
from datetime import date, timedelta

BASE_URL = "http://127.0.0.1:8000"

def test_full_lifecycle():
    print("=== Testing MeFleet Driver & Helper Management Lifecycle ===")

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
    print(f"3. Smart Recommendation OK: Top driver is {top_driver['employee']['name']} (Score: {top_driver['score']}, Reasons: {top_driver['reasons']})")

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
    print("   Verified: Driver E9 is Assigned, operational location is still Manipal (never assumed before arrival)")

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
    arrival_data = arrival_res.json()
    print("7. Arrival Verification OK:", arrival_data['message'])

    # 8. Verify location is NOW Bangalore and status is Resting
    res_e9_arrived = requests.get(f"{BASE_URL}/api/employees/E9").json()
    assert res_e9_arrived['current_location'] == "Bangalore", f"Location should be Bangalore, got {res_e9_arrived['current_location']}"
    assert res_e9_arrived['status'] == "Resting"
    print(f"8. Verified Location Update: Anand Poojary's current location is now {res_e9_arrived['current_location']} (Status: {res_e9_arrived['status']})")

    # 9. Verify Location History audit trail
    history_res = requests.get(f"{BASE_URL}/api/employees/E9/history")
    assert history_res.status_code == 200
    hist = history_res.json()
    assert len(hist['location_history']) >= 2
    latest_loc = hist['location_history'][0]
    assert latest_loc['new_location'] == "Bangalore"
    assert latest_loc['old_location'] == "Manipal"
    print(f"9. Location History Audit OK: '{latest_loc['old_location']}' → '{latest_loc['new_location']}' logged with reason '{latest_loc['reason']}'")

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
    
    # Anand Poojary (E9) should now be in the Bangalore recommended list!
    bangalore_e9 = next((d for d in rec_next['drivers'] if d['employee']['id'] == 'E9'), None)
    assert bangalore_e9 is not None, "E9 should appear in Bangalore driver recommendations"
    assert bangalore_e9['location_match'] is True, "E9 should now have location_match=True for Bangalore!"
    assert bangalore_e9['is_recommended'] is True
    print(f"11. Next Assignment Rule Verified: E9 naturally recommended for trip starting from Bangalore! (Score: {bangalore_e9['score']}, Reasons: {bangalore_e9['reasons']})")

    # 12. Manual Override Test with Audit
    override_res = requests.post(f"{BASE_URL}/api/employees/E9/override", json={
        "new_location": "Bangalore",
        "new_status": "Available",
        "reason": "Routine depot audit confirmation",
        "authorized_by": "Director of Operations"
    })
    assert override_res.status_code == 200
    print("12. Manual Override with Audit Log OK")

    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_lifecycle()
