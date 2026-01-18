from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import date

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

class Employee(BaseModel):
    id: str
    name: str
    role: str # Driver, Helper
    phone: str
    joined_date: str
    current_location: str # City Name
    status: str = "Active"

class TripAssignment(BaseModel):
    route_source: str
    route_destination: str
    bus_id: str
    driver_id: str
    helper_1_id: str
    helper_2_id: str
    travel_date: str

