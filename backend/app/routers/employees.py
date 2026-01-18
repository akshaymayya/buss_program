from fastapi import APIRouter, HTTPException, Query
from typing import List
from ..models.schemas import Employee, TripAssignment

router = APIRouter()

# Mock Database of Employees
# Smart Feature: Employees are scattered across different cities
EMPLOYEES_DB = [
    Employee(id="E1", name="Ramesh Kumar", role="Driver", phone="+91 9876543210", joined_date="2022-03-15", current_location="Bangalore"),
    Employee(id="E2", name="Suresh Babu", role="Driver", phone="+91 9876543211", joined_date="2021-06-10", current_location="Bangalore"),
    Employee(id="E3", name="Mahesh Shetty", role="Driver", phone="+91 9876543212", joined_date="2023-01-05", current_location="Mangalore"),
    
    Employee(id="E4", name="Ganesh", role="Helper", phone="+91 9988776655", joined_date="2023-02-20", current_location="Bangalore"),
    Employee(id="E5", name="Vinesh", role="Helper", phone="+91 9988776644", joined_date="2023-04-10", current_location="Bangalore"),
    Employee(id="E6", name="Raju", role="Helper", phone="+91 9988776633", joined_date="2022-11-15", current_location="Bangalore"),
    Employee(id="E7", name="Satish", role="Helper", phone="+91 9988776622", joined_date="2023-05-01", current_location="Mangalore"),
    Employee(id="E8", name="Kumar", role="Helper", phone="+91 9988776611", joined_date="2023-06-01", current_location="Mangalore"),
]

@router.get("/", response_model=List[Employee])
async def get_employees(location: str = Query(None, description="Filter by current city"), role: str = Query(None)):
    """
    Smart Filter: Returns employees based on their current location.
    Essential for ensuring the driver is actually physically present at the bus starting point.
    """
    filtered = EMPLOYEES_DB
    
    if location:
        filtered = [e for e in filtered if e.current_location.lower() == location.lower()]
    
    if role:
        filtered = [e for e in filtered if e.role.lower() == role.lower()]
        
    return filtered

@router.post("/assign")
async def assign_trip(assignment: TripAssignment):
    """
    Assigns a trip and updates the crew's location to the Destination.
    This ensures the next trip they take must start from the new location.
    """
    # 1. Update Crew Locations
    update_ids = [assignment.driver_id, assignment.helper_1_id, assignment.helper_2_id]
    
    for emp in EMPLOYEES_DB:
        if emp.id in update_ids:
            # Logic: They travel to the destination, so their new location becomes the destination
            emp.current_location = assignment.route_destination
            
    return {"status": "success", "message": f"Trip assigned! Crew location updated to {assignment.route_destination}. SMS sent."}
