"""
Fleet AI Advisor - Lightweight AI-like Intelligence Engine
Provides smart recommendations for bus fleet operations without requiring heavy ML libraries.
Uses rule-based logic, pattern matching, and heuristics to simulate intelligent decision-making.
"""

from datetime import date, timedelta
import random
from typing import List, Dict, Optional

class FleetAIAdvisor:
    """
    A lightweight 'AI' advisor that provides intelligent recommendations for fleet operations.
    Uses deterministic rules + weighted scoring instead of ML models.
    """
    
    def __init__(self):
        # Knowledge base of route patterns
        self.route_difficulty = {
            "ghat": 1.5,      # Mountainous roads
            "highway": 0.8,   # Easy highway
            "city": 1.2,      # City traffic
            "rural": 1.0      # Standard rural
        }
        
        # Bus type suitability scores
        self.bus_suitability = {
            "Multi-Axle Volvo": {"long": 95, "medium": 85, "short": 70, "comfort": 95, "fuel_efficiency": 60},
            "Sleeper AC": {"long": 90, "medium": 80, "short": 60, "comfort": 90, "fuel_efficiency": 65},
            "Semi-Sleeper": {"long": 80, "medium": 90, "short": 75, "comfort": 75, "fuel_efficiency": 75},
            "Non-AC Seater": {"long": 50, "medium": 75, "short": 95, "comfort": 50, "fuel_efficiency": 90},
        }
        
        # Day of week patterns (0=Monday, 6=Sunday)
        self.weekday_demand = {
            0: 0.7,  # Monday - low
            1: 0.75, # Tuesday
            2: 0.8,  # Wednesday
            3: 0.85, # Thursday
            4: 1.0,  # Friday - high
            5: 0.9,  # Saturday
            6: 1.0   # Sunday - high
        }
    
    def recommend_bus_for_route(self, buses: List[Dict], distance_km: float, expected_profit: float, route_type: str = "highway") -> Dict:
        """
        Recommends the best bus from available fleet for a given route.
        Uses weighted scoring based on distance, profit potential, and bus type.
        """
        if not buses:
            return None
            
        available_buses = [b for b in buses if b.get("status") == "Available"]
        if not available_buses:
            return {"recommendation": None, "reason": "No available buses in fleet"}
        
        # Determine trip category
        if distance_km > 300:
            trip_type = "long"
        elif distance_km > 150:
            trip_type = "medium"
        else:
            trip_type = "short"
        
        # Score each bus
        scored_buses = []
        for bus in available_buses:
            bus_type = bus.get("type", "Non-AC Seater")
            scores = self.bus_suitability.get(bus_type, {"long": 50, "medium": 50, "short": 50, "comfort": 50, "fuel_efficiency": 50})
            
            # Calculate composite score
            distance_score = scores.get(trip_type, 50)
            
            # High profit routes should prefer comfort
            if expected_profit > 8000:
                comfort_weight = 0.4
                efficiency_weight = 0.2
            else:
                comfort_weight = 0.2
                efficiency_weight = 0.4
            
            composite_score = (
                distance_score * 0.4 +
                scores["comfort"] * comfort_weight +
                scores["fuel_efficiency"] * efficiency_weight
            )
            
            scored_buses.append({
                "bus": bus,
                "score": composite_score,
                "reason": f"Best for {trip_type} distance routes" if distance_score > 80 else "Good balance of comfort and efficiency"
            })
        
        # Sort by score and return best
        scored_buses.sort(key=lambda x: x["score"], reverse=True)
        best = scored_buses[0]
        
        return {
            "recommendation": best["bus"],
            "score": round(best["score"], 1),
            "reason": best["reason"],
            "alternatives": [s["bus"] for s in scored_buses[1:3]] if len(scored_buses) > 1 else []
        }
    
    def predict_demand(self, source: str, destination: str, travel_date: date, city_events: Dict) -> Dict:
        """
        Predicts demand level for a route using rule-based patterns.
        Returns demand score (0-100) and contributing factors.
        """
        factors = []
        base_demand = 50
        
        # 1. Day of week factor
        day_multiplier = self.weekday_demand.get(travel_date.weekday(), 0.8)
        if day_multiplier > 0.9:
            factors.append("Weekend/Friday travel surge")
        base_demand *= day_multiplier
        
        # 2. Seasonal events for destination
        dest_events = city_events.get(destination, {})
        if dest_events:
            peak_months = dest_events.get("peak_months", [])
            if travel_date.month in peak_months:
                base_demand += 30
                factors.append(f"Peak season: {dest_events.get('reason', 'High demand period')}")
            
            # Special events
            if "event" in dest_events:
                event_month = dest_events.get("event_month", travel_date.month)
                if travel_date.month == event_month:
                    base_demand += 25
                    factors.append(f"Special event: {dest_events['event']}")
        
        # 3. Advance booking intelligence
        days_until_travel = (travel_date - date.today()).days
        if days_until_travel <= 2:
            factors.append("Last-minute booking window")
            base_demand *= 0.9  # Slightly lower as most seats may be filled
        elif days_until_travel <= 7:
            factors.append("Prime booking window")
            base_demand *= 1.1
        
        # Normalize score
        demand_score = min(100, max(0, base_demand))
        
        # Determine level
        if demand_score >= 80:
            level = "EXTREME"
        elif demand_score >= 60:
            level = "HIGH"
        elif demand_score >= 40:
            level = "MODERATE"
        else:
            level = "LOW"
        
        return {
            "score": round(demand_score),
            "level": level,
            "factors": factors if factors else ["Standard daily commute patterns"],
            "confidence": 0.85 if factors else 0.6
        }
    
    def suggest_optimal_schedule(self, buses: List[Dict], planned_routes: List[Dict]) -> List[Dict]:
        """
        Suggests an optimal schedule based on bus availability and route patterns.
        Returns a list of scheduling suggestions.
        """
        suggestions = []
        
        # Check for underutilized buses
        available = [b for b in buses if b.get("status") == "Available"]
        if len(available) > len(buses) * 0.6:
            suggestions.append({
                "type": "utilization_warning",
                "message": f"{len(available)} of {len(buses)} buses are idle. Consider exploring new routes.",
                "priority": "medium"
            })
        
        # Check for maintenance due
        today = date.today()
        for bus in buses:
            last_maint = bus.get("last_maintenance_date")
            if last_maint:
                try:
                    last_date = date.fromisoformat(last_maint)
                    days_since = (today - last_date).days
                    if days_since > 30:
                        suggestions.append({
                            "type": "maintenance_alert",
                            "message": f"{bus.get('plate_number')} needs service ({days_since} days since last maintenance)",
                            "priority": "high",
                            "bus_id": bus.get("id")
                        })
                except:
                    pass
        
        return suggestions
    
    def calculate_trip_risk(self, weather: str, road_condition: str, driver_experience_years: int = 5) -> Dict:
        """
        Calculates risk score for a trip based on various factors.
        """
        risk_score = 0
        risk_factors = []
        
        # Weather risk
        weather_risks = {
            "Rain": 25,
            "Thunderstorm": 40,
            "Fog": 35,
            "Mist": 20,
            "Clear": 0,
            "Clouds": 5
        }
        weather_risk = weather_risks.get(weather, 10)
        risk_score += weather_risk
        if weather_risk > 20:
            risk_factors.append(f"Weather condition: {weather}")
        
        # Road condition risk
        if "slippery" in road_condition.lower():
            risk_score += 20
            risk_factors.append("Slippery road conditions")
        if "closure" in road_condition.lower():
            risk_score += 15
            risk_factors.append("Road closures/diversions")
        if "visibility" in road_condition.lower():
            risk_score += 25
            risk_factors.append("Low visibility warning")
        
        # Driver experience factor
        if driver_experience_years < 2:
            risk_score += 15
            risk_factors.append("Less experienced driver assigned")
        elif driver_experience_years >= 5:
            risk_score -= 10  # Experienced driver reduces risk
        
        # Normalize
        risk_score = max(0, min(100, risk_score))
        
        if risk_score >= 50:
            level = "HIGH"
            recommendation = "Consider postponing or assigning most experienced driver"
        elif risk_score >= 25:
            level = "MODERATE"
            recommendation = "Proceed with caution, ensure driver is briefed"
        else:
            level = "LOW"
            recommendation = "Safe to proceed"
        
        return {
            "score": risk_score,
            "level": level,
            "factors": risk_factors if risk_factors else ["No significant risk factors"],
            "recommendation": recommendation
        }

# Singleton instance for use across the application
fleet_advisor = FleetAIAdvisor()
