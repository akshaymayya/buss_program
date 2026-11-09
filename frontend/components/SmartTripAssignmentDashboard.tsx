"use client";

import React, { useState, useEffect } from 'react';
import SearchableSelect from './SearchableSelect';
import { INDIAN_CITIES } from '../data/cities';
import { apiUrl } from '../lib/api';

interface Bus {
    id: string;
    plate_number: string;
    type: string;
    capacity: number;
    status: string;
}

interface RecommendationItem {
    employee: {
        id: string;
        name: string;
        role: string;
        phone: string;
        licence_number?: string;
        licence_type?: string;
        current_location: string;
        status: string;
        previous_trip?: string;
    };
    score: number;
    is_recommended: boolean;
    is_eligible: boolean;
    location_match: boolean;
    repositioning_needed: boolean;
    repositioning_distance_km?: number;
    repositioning_note?: string;
    rest_status: string;
    reasons: string[];
    warnings: string[];
}

interface SmartRecommendationsResponse {
    source: string;
    destination: string;
    travel_date: string;
    departure_time: string;
    drivers: RecommendationItem[];
    helpers: RecommendationItem[];
    available_drivers_at_source_count: number;
    available_helpers_at_source_count: number;
}

interface SmartTripAssignmentDashboardProps {
    onAssignmentSuccess?: () => void;
}

const SmartTripAssignmentDashboard: React.FC<SmartTripAssignmentDashboardProps> = ({ onAssignmentSuccess }) => {
    // Form fields
    const [source, setSource] = useState('Bangalore');
    const [destination, setDestination] = useState('Mangalore');
    const [travelDate, setTravelDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [departureTime, setDepartureTime] = useState('08:00');
    const [selectedBus, setSelectedBus] = useState('');
    const [buses, setBuses] = useState<Bus[]>([]);

    // Recommendations state
    const [recommendations, setRecommendations] = useState<SmartRecommendationsResponse | null>(null);
    const [loadingRecs, setLoadingRecs] = useState(false);

    // Selected Crew
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [selectedHelper1Id, setSelectedHelper1Id] = useState('');
    const [selectedHelper2Id, setSelectedHelper2Id] = useState('');
    const [notes, setNotes] = useState('');
    const [authorizedBy, setAuthorizedBy] = useState('Dispatch Controller');
    const [assigning, setAssigning] = useState(false);
    const [assignmentSuccessMsg, setAssignmentSuccessMsg] = useState<string | null>(null);

    // Tab filter for crew selection
    const [driverFilterTab, setDriverFilterTab] = useState<'recommended' | 'all'>('recommended');

    useEffect(() => {
        fetchBuses();
    }, []);

    useEffect(() => {
        if (source && destination) {
            fetchSmartRecommendations();
        }
    }, [source, destination, travelDate, departureTime]);

    const fetchBuses = async () => {
        try {
            const res = await fetch(apiUrl('/api/fleet/'));
            if (res.ok) {
                const data: Bus[] = await res.json();
                setBuses(data);
                const availableBus = data.find(b => b.status === 'Available');
                if (availableBus) setSelectedBus(availableBus.id);
            }
        } catch (e) {
            console.error("Failed to load buses", e);
        }
    };

    const fetchSmartRecommendations = async () => {
        setLoadingRecs(true);
        try {
            const res = await fetch(apiUrl('/api/employees/smart-recommendations'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source,
                    destination,
                    travel_date: travelDate,
                    departure_time: departureTime
                })
            });
            if (res.ok) {
                const data: SmartRecommendationsResponse = await res.json();
                setRecommendations(data);

                const topDriver = data.drivers.find(d => d.is_eligible && d.location_match);
                if (topDriver) setSelectedDriverId(topDriver.employee.id);

                const eligibleHelpers = data.helpers.filter(h => h.is_eligible && h.location_match);
                if (eligibleHelpers.length > 0) setSelectedHelper1Id(eligibleHelpers[0].employee.id);
                if (eligibleHelpers.length > 1) setSelectedHelper2Id(eligibleHelpers[1].employee.id);
            }
        } catch (e) {
            console.error("Failed to fetch recommendations", e);
        } finally {
            setLoadingRecs(false);
        }
    };

    const handleAssignTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBus) {
            alert("Please select a fleet vehicle");
            return;
        }
        if (!selectedDriverId) {
            alert("Please select a commercial driver");
            return;
        }
        if (!selectedHelper1Id) {
            alert("Please select at least one primary helper");
            return;
        }

        setAssigning(true);
        setAssignmentSuccessMsg(null);
        try {
            const res = await fetch(apiUrl('/api/employees/assign'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    route_source: source,
                    route_destination: destination,
                    travel_date: travelDate,
                    departure_time: departureTime,
                    bus_id: selectedBus,
                    driver_id: selectedDriverId,
                    helper_1_id: selectedHelper1Id,
                    helper_2_id: selectedHelper2Id || null,
                    notes: notes,
                    authorized_by: authorizedBy
                })
            });

            const data = await res.json();
            if (res.ok) {
                setAssignmentSuccessMsg(`Trip scheduled. Assigned crew stationed at ${source} until verified arrival at ${destination}.`);
                fetchBuses();
                fetchSmartRecommendations();
                if (onAssignmentSuccess) onAssignmentSuccess();
            } else {
                alert(data.detail || "Assignment validation failed");
            }
        } catch (err) {
            console.error(err);
            alert("Error scheduling trip");
        } finally {
            setAssigning(false);
        }
    };

    const selectedDriver = recommendations?.drivers.find(d => d.employee.id === selectedDriverId);
    const selectedHelper1 = recommendations?.helpers.find(h => h.employee.id === selectedHelper1Id);
    const selectedHelper2 = recommendations?.helpers.find(h => h.employee.id === selectedHelper2Id);
    const chosenBus = buses.find(b => b.id === selectedBus);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-900 tracking-tight">Smart trip assignment</h2>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                        Intelligent driver and helper allocation based on operational physical stationing, rest periods, and corridor familiarity.
                    </p>
                </div>
                {recommendations && (
                    <div className="text-right text-xs font-mono text-gray-500 bg-white px-3 py-2 rounded-lg border border-gray-200">
                        <span className="block font-semibold text-gray-900">Hub {source}</span>
                        <span>{recommendations.available_drivers_at_source_count} drivers · {recommendations.available_helpers_at_source_count} helpers ready</span>
                    </div>
                )}
            </div>

            {assignmentSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center justify-between">
                    <span>{assignmentSuccessMsg}</span>
                    <button
                        onClick={() => setAssignmentSuccessMsg(null)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Step 1: Corridor & Schedule */}
            <div className="bg-white rounded-xl p-5 border border-gray-200/90 shadow-xs space-y-4">
                <h3 className="text-xs font-semibold text-gray-900 tracking-tight">1. Corridor and schedule</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <SearchableSelect
                            label="Departure hub"
                            options={INDIAN_CITIES}
                            value={source}
                            onChange={(val) => setSource(val)}
                            placeholder="Select origin..."
                        />
                    </div>
                    <div>
                        <SearchableSelect
                            label="Destination terminal"
                            options={INDIAN_CITIES}
                            value={destination}
                            onChange={(val) => setDestination(val)}
                            placeholder="Select destination..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Departure date</label>
                        <input
                            type="date"
                            value={travelDate}
                            onChange={(e) => setTravelDate(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 h-[38px]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Departure time</label>
                        <input
                            type="time"
                            value={departureTime}
                            onChange={(e) => setDepartureTime(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 h-[38px]"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle assignment</label>
                        <select
                            value={selectedBus}
                            onChange={(e) => setSelectedBus(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                        >
                            <option value="">Select bus from fleet...</option>
                            {buses.map((b) => (
                                <option key={b.id} value={b.id} disabled={b.status === 'Maintenance'}>
                                    {b.plate_number} ({b.type}, {b.capacity} seats) — {b.status}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Authorized dispatcher</label>
                        <input
                            type="text"
                            value={authorizedBy}
                            onChange={(e) => setAuthorizedBy(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                    </div>
                </div>
            </div>

            {/* Step 2: Driver & Helper Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Driver Section */}
                <div className="bg-white rounded-xl p-5 border border-gray-200/90 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-gray-900 tracking-tight">2. Commercial driver</h3>
                            <div className="flex rounded border border-gray-200 p-0.5 bg-gray-50 text-[11px]">
                                <button
                                    type="button"
                                    onClick={() => setDriverFilterTab('recommended')}
                                    className={`px-2 py-0.5 font-medium rounded transition ${driverFilterTab === 'recommended' ? 'bg-white text-gray-900 font-semibold shadow-xs' : 'text-gray-500'}`}
                                >
                                    In hub ({source})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDriverFilterTab('all')}
                                    className={`px-2 py-0.5 font-medium rounded transition ${driverFilterTab === 'all' ? 'bg-white text-gray-900 font-semibold shadow-xs' : 'text-gray-500'}`}
                                >
                                    All drivers
                                </button>
                            </div>
                        </div>

                        {loadingRecs ? (
                            <div className="py-12 text-center text-xs text-gray-400 font-mono">
                                Evaluating physical location and rest logs...
                            </div>
                        ) : !recommendations || recommendations.drivers.length === 0 ? (
                            <p className="text-xs text-gray-400">No driver data</p>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {recommendations.drivers
                                    .filter(d => driverFilterTab === 'all' || d.location_match)
                                    .map((d) => {
                                        const isSelected = selectedDriverId === d.employee.id;
                                        return (
                                            <div
                                                key={d.employee.id}
                                                onClick={() => d.is_eligible && setSelectedDriverId(d.employee.id)}
                                                className={`p-3 rounded-lg border text-xs transition-colors cursor-pointer ${isSelected
                                                    ? 'border-emerald-600 bg-emerald-50/40'
                                                    : d.is_eligible
                                                        ? 'border-gray-200 bg-white hover:border-gray-300'
                                                        : 'border-gray-100 bg-gray-50/60 opacity-60 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <div>
                                                        <span className="font-semibold text-gray-900">{d.employee.name}</span>
                                                        <span className="text-[11px] font-mono text-gray-500 ml-1.5">{d.employee.phone}</span>
                                                    </div>
                                                    <span className="text-[11px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.2 rounded">
                                                        {d.score}% match
                                                    </span>
                                                </div>

                                                <div className="text-[11px] text-gray-500 font-mono mt-1 flex items-center justify-between">
                                                    <span>
                                                        {d.location_match ? `Stationed at ${source}` : `In ${d.employee.current_location}`}
                                                    </span>
                                                    <span>{d.rest_status}</span>
                                                </div>

                                                {d.warnings.length > 0 && (
                                                    <div className="mt-1.5 text-[11px] text-amber-800">
                                                        {d.warnings[0]}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>

                    {selectedDriver && (
                        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-700 flex justify-between items-center">
                            <span>Selected: <strong>{selectedDriver.employee.name}</strong></span>
                            <span className="text-emerald-700 font-medium font-mono">Assigned</span>
                        </div>
                    )}
                </div>

                {/* Helper Section */}
                <div className="bg-white rounded-xl p-5 border border-gray-200/90 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-gray-900 tracking-tight">3. Trip helpers</h3>
                            <span className="text-[11px] font-mono text-gray-500">1 mandatory, 1 optional</span>
                        </div>

                        {loadingRecs ? (
                            <div className="py-12 text-center text-xs text-gray-400 font-mono">
                                Loading helper recommendations...
                            </div>
                        ) : !recommendations ? (
                            <p className="text-xs text-gray-400">No helper data</p>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Primary helper</label>
                                    <select
                                        value={selectedHelper1Id}
                                        onChange={(e) => setSelectedHelper1Id(e.target.value)}
                                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                                    >
                                        <option value="">Select helper...</option>
                                        {recommendations.helpers
                                            .filter(h => h.employee.id !== selectedHelper2Id)
                                            .map((h) => (
                                                <option key={h.employee.id} value={h.employee.id} disabled={!h.is_eligible}>
                                                    {h.employee.name} — Located in {h.employee.current_location} ({h.score}%) {!h.location_match ? '(Repositioning)' : ''}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Secondary helper (optional)</label>
                                    <select
                                        value={selectedHelper2Id}
                                        onChange={(e) => setSelectedHelper2Id(e.target.value)}
                                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                                    >
                                        <option value="">None</option>
                                        {recommendations.helpers
                                            .filter(h => h.employee.id !== selectedHelper1Id)
                                            .map((h) => (
                                                <option key={h.employee.id} value={h.employee.id} disabled={!h.is_eligible}>
                                                    {h.employee.name} — Located in {h.employee.current_location} ({h.score}%) {!h.location_match ? '(Repositioning)' : ''}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Trip notes</label>
                                    <input
                                        type="text"
                                        placeholder="Special passenger notes, route instructions..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 font-mono">
                        Helpers selected: {selectedHelper1 ? selectedHelper1.employee.name : 'None'} {selectedHelper2 ? `, ${selectedHelper2.employee.name}` : ''}
                    </div>
                </div>
            </div>

            {/* Summary & Confirm Bar */}
            <div className="bg-white rounded-xl p-5 border border-gray-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs space-y-1">
                    <div className="font-semibold text-gray-900 text-sm">
                        {source} <span className="text-gray-400">→</span> {destination}
                    </div>
                    <div className="text-gray-500 font-mono text-[11px]">
                        Depart: {travelDate} @ {departureTime} · Bus: {chosenBus?.plate_number || 'Unselected'} · Driver: {selectedDriver?.employee.name || 'Unselected'}
                    </div>
                </div>

                <button
                    onClick={handleAssignTrip}
                    disabled={!selectedBus || !selectedDriverId || !selectedHelper1Id || assigning}
                    className={`px-5 py-2.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap ${(!selectedBus || !selectedDriverId || !selectedHelper1Id || assigning)
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                        }`}
                >
                    {assigning ? 'Dispatching...' : 'Confirm assignment and notify crew'}
                </button>
            </div>
        </div>
    );
};

export default SmartTripAssignmentDashboard;
