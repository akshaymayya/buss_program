"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import SearchableSelect from './SearchableSelect';
import { INDIAN_CITIES } from '../data/cities';
import TripAssignmentModal from './TripAssignmentModal';

interface AnalysisResult {
    source: string;
    destination: string;
    travel_date: string;
    demand_level: string;
    reason: string;
    road_conditions: string;
    fuel_consumption_est: number;
    estimated_revenue: number;
    estimated_cost: number;
    estimated_profit: number;
    recommendation: string;
    alternative_routes: string[];
    traffic_status: string;
    weather_report?: string;
    source_coords?: number[];
    destination_coords?: number[];
    route_geometry?: number[][];
    recommended_bus?: {
        id: string;
        name: string;
        type: string;
        capacity: number;
    };
}

const RouteAnalyzer = () => {
    const [source, setSource] = useState('Bangalore');
    const [destination, setDestination] = useState('Mysore');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);

    // Dynamic import for Leaflet map to avoid SSR issues
    const LiveMap = dynamic(() => import('./LiveMap'), {
        ssr: false,
        loading: () => <div className="h-64 flex items-center justify-center bg-gray-100 rounded-xl">Loading Map...</div>
    });

    // Ensure destination is never the same as source
    React.useEffect(() => {
        if (source === destination) {
            setDestination(''); // Reset destination if it conflicts
        }
    }, [source, destination]);

    const handleAnalyze = async () => {
        if (!source || !destination) {
            alert("Please select both Source and Destination cities.");
            return;
        }
        if (source === destination) {
            alert("Source and Destination cannot be the same!");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/routes/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source,
                    destination,
                    travel_date: date,
                    bus_type: "Standard"
                }),
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-2 border-l-4 border-indigo-600">Route Intelligence Engine</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <SearchableSelect
                        label="Source City"
                        options={INDIAN_CITIES}
                        value={source}
                        onChange={setSource}
                        placeholder="Search start point..."
                    />
                </div>
                <div>
                    <SearchableSelect
                        label="Destination City"
                        options={INDIAN_CITIES}
                        value={destination}
                        onChange={setDestination}
                        placeholder="Search destination..."
                        excludeValue={source}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Travel</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-[42px]"
                    />
                </div>
            </div>

            <button
                onClick={handleAnalyze}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}
            >
                {loading ? 'Analyzing Real-Time Data...' : 'Analyze Route Profitability'}
            </button>

            {result && (
                <div className="mt-8 animate-fade-in-up">
                    <div className={`p-4 rounded-lg mb-6 text-center ${result.recommendation.includes('HIGHLY')
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : result.recommendation.includes('AVOID')
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        }`}>
                        <h3 className="text-2xl font-bold">{result.recommendation}</h3>
                        <p className="mt-1 opacity-80">{result.reason}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultCard label="Estimated Profit" value={`₹${result.estimated_profit.toLocaleString()}`} valueColor="text-green-600" />
                        <ResultCard label="Fuel Cost" value={`₹${result.estimated_cost.toLocaleString()}`} />
                        <ResultCard label="Demand Level" value={result.demand_level} valueColor={result.demand_level === 'EXTREME' ? 'text-purple-600' : 'text-gray-800'} />
                        <ResultCard label="Traffic Status" value={result.traffic_status} />
                        <ResultCard label="Weather Alert" value={result.weather_report || "Clear"} valueColor="text-blue-500" />
                    </div>

                    {/* Smart Fleet Recommendation */}
                    {result.recommended_bus && (
                        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Recommended Fleet Vehicle</h4>
                                <p className="text-lg font-bold text-indigo-900">{result.recommended_bus.name}</p>
                                <p className="text-sm text-indigo-700">{result.recommended_bus.type} • {result.recommended_bus.capacity} Seats</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="hidden md:block">
                                    <span className="px-4 py-2 bg-white text-indigo-600 font-semibold rounded-full text-sm shadow-sm">
                                        Best Match
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowAssignmentModal(true)}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md animate-pulse"
                                >
                                    Start Route Operation &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-700 mb-2">Detailed Insights</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex justify-between">
                                <span>Road Conditions:</span>
                                <span className="font-medium text-gray-900">{result.road_conditions}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Alternative Routes:</span>
                                <span className="font-medium text-gray-900">{result.alternative_routes.join(", ")}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Est. Fuel Consumption:</span>
                                <span className="font-medium text-gray-900">{result.fuel_consumption_est} Liters</span>
                            </li>
                        </ul>
                    </div>

                    {/* Map Section */}
                    <div className="mt-8 h-96 w-full relative z-0">
                        <LiveMap
                            sourceCoords={result.source_coords}
                            destCoords={result.destination_coords}
                            routeGeometry={result.route_geometry}
                        />
                    </div>
                </div>
            )}

            <TripAssignmentModal
                isOpen={showAssignmentModal}
                onClose={() => setShowAssignmentModal(false)}
                routeDetails={{
                    source: source,
                    destination: destination,
                    date: date,
                    recommendedBus: result?.recommended_bus
                }}
            />
        </div>
    );
};

const ResultCard = ({ label, value, valueColor = "text-gray-900" }: { label: string, value: string | number, valueColor?: string }) => (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col items-center justify-center">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <span className={`text-xl font-bold mt-1 ${valueColor}`}>{value}</span>
    </div>
);

export default RouteAnalyzer;
