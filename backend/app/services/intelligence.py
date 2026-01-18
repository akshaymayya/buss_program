import random
import requests
from datetime import date, timedelta

class IntelligenceEngine:
    def __init__(self):
        self.api_key = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU2YjYzOTljZTlkNTQ5ZjdhY2NlNGU0YTZkNTZkYjUxIiwiaCI6Im11cm11cjY0In0="
        self.weather_api_key = "09d290f6836b0c3ec1afe7dd11f503da"
        # Database of "City Specialties" and events
        self.city_events = {
            "Gokarna": {"peak_months": [11, 12, 1, 2], "reason": "Beach Season & Temple Visits"},
            "Mysore": {"peak_months": [9, 10], "event": "Dasara", "reason": "Dasara Festival & Palace Visits"},
            "Bangalore": {"peak_days": [4, 5, 6], "reason": "Weekend Techie Travel"}, # Fri, Sat, Sun
            "Tirupati": {"peak_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "reason": "Pilgrimage (Always High)"},
            "Mangalore": {"peak_months": [5, 6, 12], "reason": "Holidays & Homecoming"},
            "Dharmasthala": {"peak_months": [10, 11, 12], "reason": "Laksha Deepotsava & Pilgrimage"}
        }

    def get_coordinates(self, city_name):
        """Fetches lat,lon for a city using OpenRouteService Geocoding"""
        try:
            headers = {'Authorization': self.api_key}
            url = f"https://api.openrouteservice.org/geocode/search?text={city_name}, India"
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data['features']:
                    # ORS returns [lon, lat]
                    return data['features'][0]['geometry']['coordinates']
        except Exception as e:
            print(f"Geocoding Warning: {e}")
        return None

    def get_real_route_data(self, source, destination):
        """Fetches real distance and duration from OpenRouteService"""
        try:
            start_coords = self.get_coordinates(source)
            end_coords = self.get_coordinates(destination)
            
            if not start_coords or not end_coords:
                return None

            headers = {
                'Authorization': self.api_key,
                'Content-Type': 'application/json'
            }
            body = {
                "coordinates": [start_coords, end_coords]
            }
            url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
            
            response = requests.post(url, json=body, headers=headers)
            if response.status_code == 200:
                data = response.json()
                # GeoJSON structure: features[0].properties.summary... features[0].geometry.coordinates
                feature = data['features'][0]
                summary = feature['properties']['summary']
                geometry = feature['geometry']['coordinates'] # [[lon, lat], ...]
                
                return {
                    "distance_km": summary['distance'] / 1000,
                    "duration_hrs": summary['duration'] / 3600,
                    "geometry": geometry
                }
        except Exception as e:
            print(f"Routing Warning: {e}")
        return None

    def get_fuel_price(self, city):
        """
        Fetches fuel price. 
        Currently uses 'Intelligent Simulation' (Base price +/- daily fluctuation)
        until a valid API key is provided.
        """
        # Base prices for major cities (approximate)
        base_prices = {
            "Bangalore": 102.50,
            "Mangalore": 101.00,
            "Mysore": 101.80,
            "Gokarna": 103.00,
            "Tirupati": 110.00, # Andhra Pradesh plays different taxes
        }
        
        price = base_prices.get(city, 100.00)
        
        # Add random daily fluctuation (-2 to +2 rupees)
        variance = random.uniform(-2.0, 2.0)
        return round(price + variance, 2)

    def get_weather_data(self, city):
        """Fetches real-time weather from OpenWeatherMap"""
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={self.weather_api_key}&units=metric"
            response = requests.get(url)
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
        except Exception as e:
            print(f"Weather API Error: {e}")
        return None

    def analyze_route(self, source: str, destination: str, travel_date: date):
        # 1. Determine Base Demand
        demand_score = 50 # Base score out of 100
        reasons = []

        # 2. Seasonality & Event Check
        dest_info = self.city_events.get(destination)
        if dest_info:
            if "peak_months" in dest_info and travel_date.month in dest_info["peak_months"]:
                demand_score += 30
                reasons.append(f"Peak Season for {destination} ({dest_info['reason']})")
            if "event" in dest_info and dest_info["event"] == "Dasara" and travel_date.month == 10:
                 demand_score += 40
                 reasons.append("Dasara Festival Rush!")

        # 3. Weekend Logic (Friday=4, Saturday=5, Sunday=6)
        day_of_week = travel_date.weekday()
        if day_of_week in [4, 6]: # Fri, Sun
            demand_score += 20
            reasons.append("Weekend Travel Surge")
        
        # 4. Route Specifics (Real vs Simulated)
        real_data = self.get_real_route_data(source, destination)
        route_geometry = None
        
        if real_data:
            distance = real_data['distance_km']
            route_geometry = real_data.get('geometry') # Get the full path
            reasons.append(f"Real-World Data: {round(distance)}km")
        else:
            reasons.append("Simulated Route Data (API fallback)")
            base_distances = {
                ("Mangalore", "Bangalore"): 350,
                ("Bangalore", "Mysore"): 150,
                ("Bangalore", "Gokarna"): 490,
            }
            distance = base_distances.get((source, destination)) or base_distances.get((destination, source)) or 300 
        
        # 5. Get Fuel Price (Real or Simulated)
        fuel_price = self.get_fuel_price(source)
        
        mileage = 4 # km per liter for a bus
        fuel_cost = (distance / mileage) * fuel_price

        # 6. Traffic & Road Conditions (Simulated based on context)
        # Note: ORS doesn't provide real-time traffic in the free tier usually, so we simulate context
        traffic_status = "Clear"
        road_condition = "Good"
        
        # 7. Weather Impact (Real-time)
        weather = self.get_weather_data(destination)
        weather_report = "Clear Skies"
        
        if weather:
            weather_report = weather["summary"]
            if weather["condition"] in ["Rain", "Thunderstorm", "Drizzle"]:
                road_condition = "Slippery Roads (Rain Alert)"
                traffic_status = "Slow Moving"
                distance += 10 # Detours or slow driving
            elif weather["condition"] in ["Mist", "Fog"]:
                road_condition = "Low Visibility Warning"
                
        if demand_score > 80:
            traffic_status = "Heavy Traffic (Holiday Rush)"
            fuel_cost *= 1.2 # Idling burns more fuel
        
        # Random "Real-time" road closure event
        if random.random() < 0.1: # 10% chance of road work
            road_condition = "Partial Closure near Hassan - Take diversion via Arsikere"
            distance += 40
        
        # 6. Profitability Calculation
        # Ticket price dynamic pricing
        base_ticket_price = 800
        if demand_score > 80: base_ticket_price = 1200
        elif demand_score > 60: base_ticket_price = 1000
        
        full_load_revenue = 40 * base_ticket_price # 40 seats
        occupancy_rate = min(demand_score / 100, 1.0)
        estimated_revenue = full_load_revenue * occupancy_rate
        
        total_cost = fuel_cost + 2000 + 1000 # + Driver Bata + Tolls
        profit = estimated_revenue - total_cost

        # 7. Final Recommendation
        recommendation = "NEUTRAL"
        if profit > 10000:
            recommendation = "HIGHLY RECOMMENDED (High Demand)"
        elif profit > 5000:
            recommendation = "RECOMMENDED"
        elif profit < 0:
            recommendation = "AVOID (Loss Making)"

        # 8. Smart Bus Recommendation
        fleet = self._get_mock_fleet()
        best_bus = self._recommend_bus_for_route(fleet, distance, demand_score, profit)

        return {
            "source": source,
            "destination": destination,
            "travel_date": travel_date,
            "demand_level": "EXTREME" if demand_score > 85 else "HIGH" if demand_score > 60 else "MODERATE",
            "reason": " + ".join(reasons) if reasons else "Normal Daily Commute",
            "road_conditions": road_condition,
            "fuel_consumption_est": round(distance/mileage, 1),
            "estimated_revenue": round(estimated_revenue, 2),
            "estimated_cost": round(total_cost, 2),
            "estimated_profit": round(profit, 2),
            "recommendation": recommendation,
            "alternative_routes": ["Via Mysore", "Via NH75"] if distance > 300 else ["Direct Route"],
            "traffic_status": traffic_status,
            "weather_report": weather_report,
            "source_coords": self.get_coordinates(source),
            "destination_coords": self.get_coordinates(destination),
            "route_geometry": route_geometry,
            "recommended_bus": best_bus
        }

    def _get_mock_fleet(self):
        """Simulate the user's current fleet for recommendation"""
        return [
            {"id": "B1", "name": "Volvo 9600 Multi-Axle", "type": "Luxury Sleeper", "capacity": 40, "mileage": 3.5, "suitable_for": "long"},
            {"id": "B2", "name": "Leyland Viking AC", "type": "Semi-Sleeper", "capacity": 45, "mileage": 4.5, "suitable_for": "medium"},
            {"id": "B3", "name": "Tata Starbus", "type": "Non-AC Seater", "capacity": 50, "mileage": 5.5, "suitable_for": "short"},
            {"id": "B4", "name": "BharatBenz Glider", "type": "Luxury Seater", "capacity": 35, "mileage": 4.0, "suitable_for": "medium"},
        ]

    def _recommend_bus_for_route(self, fleet, distance_km, demand_score, estimated_profit):
        """
        Intelligent logic to pick the best bus from the fleet.
        """
        # Logic: 
        # 1. Long Distance (>300km) + High Profit -> Use Luxury Sleeper (Comfort + Revenue)
        # 2. Short Distance (<150km) -> Use Non-AC Seater (Efficiency)
        # 3. Medium -> Semi-Sleeper
        
        recommended = None
        
        if distance_km > 300:
            if estimated_profit > 8000:
                # Prioritize Luxury for high profit long routes
                recommended = next((b for b in fleet if b['type'] == "Luxury Sleeper"), None)
            else:
                # Efficiency for lower profit long routes
                recommended = next((b for b in fleet if b['type'] == "Semi-Sleeper"), None)
        elif distance_km < 150:
             recommended = next((b for b in fleet if b['type'] == "Non-AC Seater"), None)
        
        # Fallback
        if not recommended:
             recommended = fleet[1] # Default to Leyland
             
        return recommended
