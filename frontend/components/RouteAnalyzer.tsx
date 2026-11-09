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
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);

    // Dynamic import for Leaflet map to avoid SSR issues
    const LiveMap = dynamic(() => import('./LiveMap'), {
        ssr: false,
        loading: () => (
            <div className="h-72 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-400 font-mono">
                Loading highway telemetry map...
            </div>
        )
    });

    React.useEffect(() => {
        if (source === destination) {
            setDestination('');
        }
    }, [source, destination]);

    const handleAnalyze = async () => {
        if (!source || !destination) {
            alert("Please select both origin and destination cities.");
            return;
        }
        if (source === destination) {
            alert("Origin and destination cannot be identical.");
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
        <div className="bg-white p-6 rounded-xl border border-gray-200/90 shadow-xs">
            <div className="mb-5">
                <h2 className="text-base font-semibold text-gray-900 tracking-tight">Corridor evaluation</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    Select departure hub and terminal to compute expected revenue, road state and fuel burn
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <SearchableSelect
                        label="Origin hub"
                        options={INDIAN_CITIES}
                        value={source}
                        onChange={setSource}
                        placeholder="Search origin..."
                    />
                </div>
                <div>
                    <SearchableSelect
                        label="Destination hub"
                        options={INDIAN_CITIES}
                        value={destination}
                        onChange={setDestination}
                        placeholder="Search destination..."
                        excludeValue={source}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Travel date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 h-[38px]"
                    />
                </div>
            </div>

            <button
                onClick={handleAnalyze}
                disabled={loading}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer ${loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                    }`}
            >
                {loading ? 'Evaluating road telemetry and pricing...' : 'Calculate corridor feasibility'}
            </button>

            {result && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-5">
                    {/* Quiet Recommendation Summary */}
                    <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <div>
                                <span className="text-xs font-semibold text-gray-900">
                                    {result.recommendation === "HIGHLY RECOMMENDED" ? "High profitability window" : result.recommendation}
                                </span>
                                <span className="text-xs text-gray-500 block sm:inline sm:ml-2">
                                    {result.reason}
                                </span>
                            </div>
                        </div>
                        <span className="text-[11px] font-mono text-gray-500 self-start sm:self-auto">
                            Demand: {result.demand_level.toLowerCase()}
                        </span>
                    </div>

                    {/* Telemetry Metric Cards (Reddit style with subtle vertical dividers) */}
                    <div className="bg-gray-50/60 border border-gray-200/80 rounded-xl p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/70 gap-4 sm:gap-0">
                            <div className="sm:px-4 first:pl-0">
                                <span className="text-[11px] font-semibold text-gray-500 block">Est. net profit</span>
                                <span className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-0.5 block">
                                    ₹{Math.round(result.estimated_profit).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">After tolls & diesel</span>
                            </div>
                            <div className="sm:px-4 pt-4 sm:pt-0">
                                <span className="text-[11px] font-semibold text-gray-500 block">Operating cost</span>
                                <span className="text-xl font-bold text-gray-900 font-mono tabular-nums mt-0.5 block">
                                    ₹{Math.round(result.estimated_cost).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Fuel & tyre wear</span>
                            </div>
                            <div className="sm:px-4 pt-4 sm:pt-0">
                                <span className="text-[11px] font-semibold text-gray-500 block">Diesel burn</span>
                                <span className="text-xl font-bold text-gray-900 font-mono tabular-nums mt-0.5 block">
                                    {result.fuel_consumption_est} L
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Highway average</span>
                            </div>
                            <div className="sm:px-4 pt-4 sm:pt-0 last:pr-0">
                                <span className="text-[11px] font-semibold text-gray-500 block">Road status</span>
                                <span className="text-sm font-bold text-gray-900 mt-0.5 block truncate">
                                    {result.traffic_status}
                                </span>
                                <span className="text-[10px] text-gray-400 mt-0.5 block truncate">
                                    {result.weather_report || "Clear conditions"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Recommended Fleet Vehicle */}
                    {result.recommended_bus && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[11px] font-medium text-emerald-700 font-mono block">
                                    Suggested fleet assignment
                                </span>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                    <span className="font-semibold text-sm text-gray-900">{result.recommended_bus.name}</span>
                                    <span className="text-xs text-gray-500">· {result.recommended_bus.type}</span>
                                    <span className="text-xs text-gray-500 font-mono">({result.recommended_bus.capacity} seats)</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowAssignmentModal(true)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
                            >
                                Assign crew and dispatch →
                            </button>
                        </div>
                    )}

                    {/* Telemetry Geometry Map */}
                    <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 h-72 w-full relative z-0">
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

export default RouteAnalyzer;
