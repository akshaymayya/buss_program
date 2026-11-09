from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date

# Existing Route schemas
class RouteRequest(BaseModel):
    source: str
    destination: str
    travel_date: date
    bus_type: str = "Standard" # Standard, Sleeper, Volvo

class Bus(BaseModel):
    id: Optional[str] = None
    plate_number: str
    type: str
    capacity: int
    status: str # Available, On Route, Maintenance
    assigned_route: Optional[str] = None  # e.g., "Bangalore → Mysore"
    assigned_date: Optional[str] = None   # ISO date string
    assigned_driver_id: Optional[str] = None
    assigned_helper_ids: Optional[List[str]] = None
    last_maintenance_date: Optional[str] = None

class RouteAnalysis(BaseModel):
    source: str
    destination: str
    travel_date: date
    demand_level: str # Low, Medium, High, Extreme
    reason: str
    road_conditions: str
    fuel_consumption_est: float
    estimated_revenue: float
    estimated_cost: float
    estimated_profit: float
    recommendation: str # "HIGHLY RECOMMENDED", "MODERATE", "AVOID"
    alternative_routes: List[str]
    traffic_status: str
    weather_report: Optional[str] = "Clear"
    source_coords: Optional[List[float]] = None
    destination_coords: Optional[List[float]] = None
    route_geometry: Optional[List[List[float]]] = None
    recommended_bus: Optional[Dict] = None

class OwnerProfile(BaseModel):
    id: str
    name: str = "Bus Owner"
    company_name: str
    fleet_size: int
    employee_count: int
    offices: List[str]

# --- Enhanced MeFleet Driver & Helper Schemas ---

class Employee(BaseModel):
    id: str
    name: str
    role: str # Driver, Helper
    phone: str
    email: Optional[str] = None
    licence_number: Optional[str] = None
    licence_type: Optional[str] = "Heavy Commercial Vehicle (HCV)"
    licence_expiry: Optional[str] = None
    is_licence_verified: Optional[bool] = True
    current_location: str # Operational location (city/depot)
    status: str = "Available" # Available, Assigned, En Route, On Duty, Resting, On Leave, Unavailable
    joined_date: str
    total_duty_hours: Optional[float] = 0.0
    max_daily_duty_hours: Optional[float] = 10.0
    min_rest_hours: Optional[float] = 8.0
    last_trip_completed_at: Optional[str] = None
    rest_ends_at: Optional[str] = None
    company_id: Optional[str] = "CMP-001"
    previous_trip: Optional[str] = None
    upcoming_trips_count: Optional[int] = 0

class EmployeeCreate(BaseModel):
    name: str
    role: str # Driver, Helper
    phone: str
    email: Optional[str] = None
    licence_number: Optional[str] = None
    licence_type: Optional[str] = "Heavy Commercial Vehicle (HCV)"
    licence_expiry: Optional[str] = None
    current_location: str
    joined_date: Optional[str] = None
    max_daily_duty_hours: Optional[float] = 10.0
    min_rest_hours: Optional[float] = 8.0

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    licence_number: Optional[str] = None
    licence_type: Optional[str] = None
    licence_expiry: Optional[str] = None
    current_location: Optional[str] = None
    status: Optional[str] = None
    max_daily_duty_hours: Optional[float] = None
    min_rest_hours: Optional[float] = None

class EmployeeOverrideRequest(BaseModel):
    new_location: Optional[str] = None
    new_status: Optional[str] = None
    reason: str
    authorized_by: str = "Management Staff"

class TripAssignment(BaseModel):
    route_source: str
    route_destination: str
    bus_id: str
    driver_id: str
    helper_1_id: str
    helper_2_id: Optional[str] = None
    travel_date: str
    departure_time: Optional[str] = "08:00"
    notes: Optional[str] = None
    authorized_by: Optional[str] = "Management Staff"

class TripDetails(BaseModel):
    id: str
    bus_id: str
    bus_plate: Optional[str] = None
    bus_type: Optional[str] = None
    route_source: str
    route_destination: str
    travel_date: str
    departure_time: str
    driver_id: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    helper_ids: List[str]
    helper_names: Optional[List[str]] = []
    status: str # Scheduled, En Route, Completed, Cancelled
    verified_departure_at: Optional[str] = None
    verified_arrival_at: Optional[str] = None
    verified_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

class TripDepartureRequest(BaseModel):
    verified_by: str = "Depot Manager"
    actual_departure_time: Optional[str] = None
    notes: Optional[str] = None

class TripArrivalVerificationRequest(BaseModel):
    verified_by: str = "Destination Staff"
    actual_arrival_time: Optional[str] = None
    notes: Optional[str] = None
    trigger_rest: bool = True
    rest_hours: Optional[float] = 8.0

class SmartRecommendationRequest(BaseModel):
    source: str
    destination: str
    travel_date: str
    departure_time: Optional[str] = "08:00"
    bus_type: Optional[str] = "Standard"

class RecommendationItem(BaseModel):
    employee: Employee
    score: float # 0 - 100
    is_recommended: bool
    is_eligible: bool
    location_match: bool
    repositioning_needed: bool
    repositioning_distance_km: Optional[float] = None
    repositioning_note: Optional[str] = None
    rest_status: str
    reasons: List[str]
    warnings: List[str]

class SmartRecommendationsResponse(BaseModel):
    source: str
    destination: str
    travel_date: str
    departure_time: str
    drivers: List[RecommendationItem]
    helpers: List[RecommendationItem]
    available_drivers_at_source_count: int
    available_helpers_at_source_count: int

class EmployeeLocationHistory(BaseModel):
    id: int
    employee_id: str
    old_location: Optional[str] = None
    new_location: str
    reason: str
    trip_id: Optional[str] = None
    updated_by: str
    timestamp: str

class EmployeeTripHistory(BaseModel):
    id: int
    employee_id: str
    trip_id: str
    role: str
    route: str
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    duty_hours: float
    status: str
    timestamp: str

class AuditLog(BaseModel):
    id: int
    timestamp: str
    action: str
    entity_type: str
    entity_id: str
    user_role: str
    details: str
    company_id: str
