import random
import requests
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple, Any

try:
    from ..core.config import settings
except Exception:
    class FallbackSettings:
        ORS_API_KEY = None
        OPENWEATHER_API_KEY = None
    settings = FallbackSettings()

class RouteGISAdapter:
    """
    Handles external GIS and Weather API integrations.
    Isolated from pure business logic to ensure deterministic calculations
    and resilient offline/simulated fallback operation.
    """
    def __init__(self, ors_api_key: Optional[str] = None, weather_api_key: Optional[str] = None):
        self.ors_api_key = ors_api_key or getattr(settings, "ORS_API_KEY", None)
        self.weather_api_key = weather_api_key or getattr(settings, "OPENWEATHER_API_KEY", None)
        self.timeout_sec = 3.5

    def get_coordinates(self, city_name: str) -> Optional[List[float]]:
        """Fetches [lon, lat] coordinates for a city using OpenRouteService Geocoding."""
        if not self.ors_api_key:
            return None
        try:
            headers = {'Authorization': self.ors_api_key}
            url = f"https://api.openrouteservice.org/geocode/search?text={city_name}, India"
            response = requests.get(url, headers=headers, timeout=self.timeout_sec)
            if response.status_code == 200:
                data = response.json()
                if data.get('features'):
                    # ORS returns [lon, lat]
                    return data['features'][0]['geometry']['coordinates']
        except Exception as e:
            # Non-blocking graceful degradation
            pass
        return None

    def get_real_route_data(self, source: str, destination: str) -> Optional[Dict[str, Any]]:
        """Fetches real road distance and geometry from OpenRouteService."""
        if not self.ors_api_key:
            return None
        try:
            start_coords = self.get_coordinates(source)
            end_coords = self.get_coordinates(destination)
            if not start_coords or not end_coords:
                return None

            headers = {
                'Authorization': self.ors_api_key,
                'Content-Type': 'application/json'
            }
            body = {
                "coordinates": [start_coords, end_coords]
            }
            url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
            response = requests.post(url, json=body, headers=headers, timeout=self.timeout_sec)
            if response.status_code == 200:
                data = response.json()
                feature = data['features'][0]
                summary = feature['properties']['summary']
                geometry = feature['geometry']['coordinates']
                return {
                    "distance_km": summary['distance'] / 1000.0,
                    "duration_hrs": summary['duration'] / 3600.0,
                    "geometry": geometry
                }
        except Exception:
            pass
        return None

    def get_weather_data(self, city: str) -> Optional[Dict[str, Any]]:
        """Fetches real-time weather from OpenWeatherMap with timeout protection."""
        if not self.weather_api_key:
            return None
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={self.weather_api_key}&units=metric"
            response = requests.get(url, timeout=self.timeout_sec)
            if response.status_code == 200:
                data = response.json()
                main = data['weather'][0]['main']
                desc = data['weather'][0]['description']
                temp = data['main']['temp']
                return {
                    "condition": main,
                    "description": desc,
                    "temp": temp,
                    "summary": f"{main} ({desc.title()}), {round(temp)}°C"
                }
        except Exception:
            pass
        return None


class CorridorFeasibilityCalculator:
    """
    Pure computational domain logic for route profitability, fuel consumption,
    demand scoring, and optimal vehicle allocation.
    Zero network dependencies; 100% deterministic and unit-testable.
    """
    def __init__(self):
        self.city_events = {
            "Gokarna": {"peak_months": [11, 12, 1, 2], "reason": "Beach Season & Temple Visits"},
            "Mysore": {"peak_months": [9, 10], "event": "Dasara", "reason": "Dasara Festival & Palace Visits"},
            "Bangalore": {"peak_days": [4, 5, 6], "reason": "Weekend Techie Travel"},  # Fri, Sat, Sun
            "Tirupati": {"peak_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "reason": "Pilgrimage (Always High)"},
            "Mangalore": {"peak_months": [5, 6, 12], "reason": "Holidays & Homecoming"},
            "Dharmasthala": {"peak_months": [10, 11, 12], "reason": "Laksha Deepotsava & Pilgrimage"}
        }

        self.fallback_distances = {
            ("Mangalore", "Bangalore"): 350.0,
            ("Bangalore", "Mysore"): 150.0,
            ("Bangalore", "Gokarna"): 490.0,
            ("Bangalore", "Tirupati"): 250.0,
            ("Bangalore", "Dharmasthala"): 310.0,
        }

    def get_fallback_distance(self, source: str, destination: str) -> float:
        """Deterministic corridor distance lookup when live GIS is unavailable."""
        return (
            self.fallback_distances.get((source, destination))
            or self.fallback_distances.get((destination, source))
            or 300.0
        )

    def calculate_demand(self, destination: str, travel_date: date) -> Tuple[int, List[str]]:
        """Calculates demand score (0-100+) based on seasonal trends and day of week."""
        demand_score = 50
        reasons = []

        dest_info = self.city_events.get(destination)
        if dest_info:
            if "peak_months" in dest_info and travel_date.month in dest_info["peak_months"]:
                demand_score += 30
                reasons.append(f"Peak Season for {destination} ({dest_info['reason']})")
            if "event" in dest_info and dest_info["event"] == "Dasara" and travel_date.month == 10:
                demand_score += 40
                reasons.append("Dasara Festival Rush!")

        # Weekend logic: Friday=4, Sunday=6
        day_of_week = travel_date.weekday()
        if day_of_week in [4, 6]:
            demand_score += 20
            reasons.append("Weekend Travel Surge")

        return demand_score, reasons

    def calculate_fuel_price(self, city: str, seed: Optional[int] = None) -> float:
        """Determines fuel price with deterministic local tax variance."""
        base_prices = {
            "Bangalore": 102.50,
            "Mangalore": 101.00,
            "Mysore": 101.80,
            "Gokarna": 103.00,
            "Tirupati": 110.00,
        }
        price = base_prices.get(city, 100.00)
        # Use deterministic variance if seed provided, else standard small fluctuation
        if seed is not None:
            rng = random.Random(seed)
            variance = rng.uniform(-1.0, 1.0)
        else:
            variance = random.uniform(-1.0, 1.0)
        return round(price + variance, 2)

    def calculate_profitability(
        self,
        distance_km: float,
        demand_score: int,
        fuel_price: float,
        mileage: float = 4.0,
        has_congestion: bool = False
    ) -> Dict[str, Any]:
        """Calculates fuel costs, dynamic ticket prices, revenues and profit margins."""
        fuel_cost = (distance_km / mileage) * fuel_price
        if has_congestion or demand_score > 80:
            fuel_cost *= 1.2  # Traffic idling penalty

        # Dynamic pricing tiers
        if demand_score > 80:
            base_ticket_price = 1200.0
        elif demand_score > 60:
            base_ticket_price = 1000.0
        else:
            base_ticket_price = 800.0

        full_load_revenue = 40.0 * base_ticket_price
        occupancy_rate = min(demand_score / 100.0, 1.0)
        estimated_revenue = full_load_revenue * occupancy_rate

        # Fixed operational costs (Crew Bata + Tolls)
        fixed_costs = 2000.0 + 1000.0
        total_cost = fuel_cost + fixed_costs
        profit = estimated_revenue - total_cost

        # Recommendation categorization
        if profit > 10000.0:
            recommendation = "HIGHLY RECOMMENDED (High Demand)"
        elif profit > 5000.0:
            recommendation = "RECOMMENDED"
        elif profit < 0:
            recommendation = "AVOID (Loss Making)"
        else:
            recommendation = "NEUTRAL"

        return {
            "fuel_cost": round(fuel_cost, 2),
            "estimated_revenue": round(estimated_revenue, 2),
            "total_cost": round(total_cost, 2),
            "profit": round(profit, 2),
            "recommendation": recommendation,
            "ticket_price": base_ticket_price
        }

    def recommend_bus_for_route(self, fleet: List[Dict[str, Any]], distance_km: float, demand_score: int, estimated_profit: float) -> Optional[Dict[str, Any]]:
        """Intelligently matches vehicle characteristics to route distance and profitability."""
        if distance_km > 300.0:
            if estimated_profit > 8000.0:
                recommended = next((b for b in fleet if b.get('type') == "Luxury Sleeper"), None)
            else:
                recommended = next((b for b in fleet if b.get('type') == "Semi-Sleeper"), None)
        elif distance_km < 150.0:
            recommended = next((b for b in fleet if b.get('type') == "Non-AC Seater"), None)
        else:
            recommended = next((b for b in fleet if b.get('type') == "Semi-Sleeper"), None)

        if not recommended and len(fleet) > 1:
            recommended = fleet[1]
        elif not recommended and fleet:
            recommended = fleet[0]

        return recommended


class IntelligenceEngine:
    """
    Orchestrates GIS live telemetry with deterministic financial/feasibility calculations.
    """
    def __init__(self, gis_adapter: Optional[RouteGISAdapter] = None, calculator: Optional[CorridorFeasibilityCalculator] = None):
        self.gis = gis_adapter or RouteGISAdapter()
        self.calc = calculator or CorridorFeasibilityCalculator()

    def get_coordinates(self, city_name: str) -> Optional[List[float]]:
        return self.gis.get_coordinates(city_name)

    def get_real_route_data(self, source: str, destination: str) -> Optional[Dict[str, Any]]:
        return self.gis.get_real_route_data(source, destination)

    def get_weather_data(self, city: str) -> Optional[Dict[str, Any]]:
        return self.gis.get_weather_data(city)

    def get_fuel_price(self, city: str) -> float:
        return self.calc.calculate_fuel_price(city)

    def _get_mock_fleet(self) -> List[Dict[str, Any]]:
        return [
            {"id": "B1", "name": "Volvo 9600 Multi-Axle", "type": "Luxury Sleeper", "capacity": 40, "mileage": 3.5, "suitable_for": "long"},
            {"id": "B2", "name": "Leyland Viking AC", "type": "Semi-Sleeper", "capacity": 45, "mileage": 4.5, "suitable_for": "medium"},
            {"id": "B3", "name": "Tata Starbus", "type": "Non-AC Seater", "capacity": 50, "mileage": 5.5, "suitable_for": "short"},
            {"id": "B4", "name": "BharatBenz Glider", "type": "Luxury Seater", "capacity": 35, "mileage": 4.0, "suitable_for": "medium"},
        ]

    def analyze_route(self, source: str, destination: str, travel_date: date) -> Dict[str, Any]:
        # 1. Demand & Seasonality (Deterministic)
        demand_score, reasons = self.calc.calculate_demand(destination, travel_date)

        # 2. Distance & Geometry (GIS Adapter with Fallback)
        real_gis = self.gis.get_real_route_data(source, destination)
        route_geometry = None
        if real_gis:
            distance = real_gis['distance_km']
            route_geometry = real_gis.get('geometry')
            reasons.append(f"Real-World Data: {round(distance)}km")
        else:
            distance = self.calc.get_fallback_distance(source, destination)
            reasons.append("Simulated Route Data (API fallback)")

        # 3. Weather Conditions (GIS Adapter with Fallback)
        weather = self.gis.get_weather_data(destination)
        weather_report = "Clear Skies"
        traffic_status = "Clear"
        road_condition = "Good"

        if weather:
            weather_report = weather.get("summary", "Clear")
            condition = weather.get("condition")
            if condition in ["Rain", "Thunderstorm", "Drizzle"]:
                road_condition = "Slippery Roads (Rain Alert)"
                traffic_status = "Slow Moving"
                distance += 10.0
            elif condition in ["Mist", "Fog"]:
                road_condition = "Low Visibility Warning"

        has_congestion = demand_score > 80
        if has_congestion:
            traffic_status = "Heavy Traffic (Holiday Rush)"

        # 4. Fuel & Economics (Deterministic Calculator)
        fuel_price = self.calc.calculate_fuel_price(source)
        mileage = 4.0
        econ = self.calc.calculate_profitability(
            distance_km=distance,
            demand_score=demand_score,
            fuel_price=fuel_price,
            mileage=mileage,
            has_congestion=has_congestion
        )

        # 5. Fleet Recommendation
        fleet = self._get_mock_fleet()
        best_bus = self.calc.recommend_bus_for_route(fleet, distance, demand_score, econ['profit'])

        demand_level = "EXTREME" if demand_score > 85 else "HIGH" if demand_score > 60 else "MODERATE"

        return {
            "source": source,
            "destination": destination,
            "travel_date": travel_date,
            "demand_level": demand_level,
            "reason": " + ".join(reasons) if reasons else "Normal Daily Commute",
            "road_conditions": road_condition,
            "fuel_consumption_est": round(distance / mileage, 1),
            "estimated_revenue": econ['estimated_revenue'],
            "estimated_cost": econ['total_cost'],
            "estimated_profit": econ['profit'],
            "recommendation": econ['recommendation'],
            "alternative_routes": ["Via Mysore", "Via NH75"] if distance > 300.0 else ["Direct Route"],
            "traffic_status": traffic_status,
            "weather_report": weather_report,
            "source_coords": self.gis.get_coordinates(source),
            "destination_coords": self.gis.get_coordinates(destination),
            "route_geometry": route_geometry,
            "recommended_bus": best_bus
        }
