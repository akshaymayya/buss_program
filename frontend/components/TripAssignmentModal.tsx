"use client";

import React, { useState, useEffect } from 'react';

interface TripAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    routeDetails: {
        source: string;
        destination: string;
        date: string;
        recommendedBus?: { id: string; name: string };
    };
}

interface RecommendationItem {
    employee: {
        id: string;
        name: string;
        role: string;
        phone: string;
        licence_number?: string;
        current_location: string;
        status: string;
    };
    score: number;
    is_recommended: boolean;
    is_eligible: boolean;
    location_match: boolean;
    rest_status: string;
    reasons: string[];
    warnings: string[];
}

const TripAssignmentModal: React.FC<TripAssignmentModalProps> = ({ isOpen, onClose, routeDetails }) => {
    const [drivers, setDrivers] = useState<RecommendationItem[]>([]);
    const [helpers, setHelpers] = useState<RecommendationItem[]>([]);
    const [buses, setBuses] = useState<any[]>([]);

    // Selection state
    const [selectedBus, setSelectedBus] = useState(routeDetails.recommendedBus?.id || '');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedHelper1, setSelectedHelper1] = useState('');
    const [selectedHelper2, setSelectedHelper2] = useState('');
    const [departureTime, setDepartureTime] = useState('08:00');
    const [loading, setLoading] = useState(false);
    const [fetchingRecs, setFetchingRecs] = useState(false);

    useEffect(() => {
        if (isOpen && routeDetails.source) {
            fetchSmartRecommendations();
            fetchBuses();
        }
    }, [isOpen, routeDetails.source, routeDetails.destination]);

    const fetchBuses = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/fleet/');
            if (res.ok) {
                const fleet = await res.json();
                setBuses(fleet);
                if (!selectedBus && fleet.length > 0) {
                    const avail = fleet.find((b: any) => b.status === 'Available');
                    if (avail) setSelectedBus(avail.id);
                }
            }
        } catch (e) {
            console.error("Failed to fetch fleet", e);
        }
    };

    const fetchSmartRecommendations = async () => {
        setFetchingRecs(true);
        try {
            const res = await fetch('http://localhost:8000/api/employees/smart-recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: routeDetails.source,
                    destination: routeDetails.destination,
                    travel_date: routeDetails.date,
                    departure_time: departureTime
                })
            });

            if (res.ok) {
                const data = await res.json();
                setDrivers(data.drivers || []);
                setHelpers(data.helpers || []);

                const topD = data.drivers?.find((d: RecommendationItem) => d.is_eligible && d.location_match);
                if (topD) setSelectedDriver(topD.employee.id);

                const eligH = data.helpers?.filter((h: RecommendationItem) => h.is_eligible && h.location_match) || [];
                if (eligH.length > 0) setSelectedHelper1(eligH[0].employee.id);
                if (eligH.length > 1) setSelectedHelper2(eligH[1].employee.id);
            }
        } catch (e) {
            console.error("Failed to fetch crew", e);
        } finally {
            setFetchingRecs(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedBus || !selectedDriver || !selectedHelper1) {
            alert("Please select vehicle, driver and primary helper");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/employees/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    route_source: routeDetails.source,
                    route_destination: routeDetails.destination,
                    travel_date: routeDetails.date,
                    departure_time: departureTime,
                    bus_id: selectedBus,
                    driver_id: selectedDriver,
                    helper_1_id: selectedHelper1,
                    helper_2_id: selectedHelper2 || null,
                    notes: "Dispatched from corridor evaluation"
                })
            });

            const data = await res.json();
            if (res.ok) {
                onClose();
            } else {
                alert(data.detail || "Assignment failed");
            }
        } catch (e) {
            console.error(e);
            alert("Network error assigning trip");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const availableDriversAtSource = drivers.filter(d => d.location_match && d.is_eligible);

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col md:flex-row border border-gray-200">
                {/* Left Panel: Summary */}
                <div className="md:w-5/12 bg-gray-50 border-r border-gray-200 p-6 flex flex-col justify-between">
                    <div>
                        <div className="mb-4">
                            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Dispatch allocation
                            </span>
                            <h3 className="font-semibold text-base text-gray-900 mt-2">
                                {routeDetails.source} → {routeDetails.destination}
                            </h3>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                                Date: {routeDetails.date}
                            </p>
                        </div>

                        <div className="space-y-3 text-xs text-gray-600">
                            <div className="p-3 bg-white rounded-lg border border-gray-200/80 space-y-1">
                                <span className="font-semibold text-gray-900 block text-[11px]">Stationing rule</span>
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    Crew operational location remains stationed at {routeDetails.source} until verified arrival at {routeDetails.destination}.
                                </p>
                            </div>

                            <div className="text-[11px] text-gray-500 space-y-1 font-mono">
                                <div>Driver: 1 commercial required</div>
                                <div>Helpers: 1-2 attendants required</div>
                            </div>
                        </div>
                    </div>

                    <div className="text-[11px] text-gray-400 font-mono pt-4 border-t border-gray-200/60 mt-4">
                        MeFleet Dispatch
                    </div>
                </div>

                {/* Right Panel: Form */}
                <div className="md:w-7/12 p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <h4 className="font-semibold text-xs text-gray-900 tracking-tight">Crew and vehicle</h4>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-sm font-bold cursor-pointer">✕</button>
                        </div>

                        {/* Bus & Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Fleet vehicle</label>
                                <select
                                    value={selectedBus}
                                    onChange={(e) => setSelectedBus(e.target.value)}
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                                >
                                    <option value="">Select bus...</option>
                                    {buses.map((b) => (
                                        <option key={b.id} value={b.id} disabled={b.status === 'Maintenance'}>
                                            {b.plate_number} ({b.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Departure time</label>
                                <input
                                    type="time"
                                    value={departureTime}
                                    onChange={(e) => setDepartureTime(e.target.value)}
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                />
                            </div>
                        </div>

                        {/* Driver selection */}
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <label className="block text-xs font-medium text-gray-700">Driver (in {routeDetails.source})</label>
                                <span className="text-[11px] font-mono text-gray-400">
                                    {availableDriversAtSource.length} ready
                                </span>
                            </div>

                            {fetchingRecs ? (
                                <p className="text-xs text-gray-400 py-3 font-mono">Loading recommendations...</p>
                            ) : (
                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                    {drivers.map(drv => (
                                        <div
                                            key={drv.employee.id}
                                            onClick={() => drv.is_eligible && setSelectedDriver(drv.employee.id)}
                                            className={`p-2.5 rounded-lg border text-xs cursor-pointer flex justify-between items-center transition-colors ${selectedDriver === drv.employee.id
                                                ? 'border-emerald-600 bg-emerald-50/50'
                                                : drv.is_eligible
                                                    ? 'border-gray-200 bg-white hover:border-gray-300'
                                                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                                }`}
                                        >
                                            <div>
                                                <span className="font-medium text-gray-900">{drv.employee.name}</span>
                                                <span className="text-[11px] font-mono text-gray-400 ml-1.5">{drv.employee.current_location}</span>
                                            </div>
                                            <span className="text-[11px] font-mono text-gray-600">{drv.score}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Helper selection */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Primary helper</label>
                                <select
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                                    value={selectedHelper1}
                                    onChange={(e) => setSelectedHelper1(e.target.value)}
                                >
                                    <option value="">Select helper...</option>
                                    {helpers.filter(h => h.employee.id !== selectedHelper2).map(h => (
                                        <option key={h.employee.id} value={h.employee.id} disabled={!h.is_eligible}>
                                            {h.employee.name} ({h.employee.current_location})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">Secondary helper</label>
                                <select
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                                    value={selectedHelper2}
                                    onChange={(e) => setSelectedHelper2(e.target.value)}
                                >
                                    <option value="">None</option>
                                    {helpers.filter(h => h.employee.id !== selectedHelper1).map(h => (
                                        <option key={h.employee.id} value={h.employee.id} disabled={!h.is_eligible}>
                                            {h.employee.name} ({h.employee.current_location})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={!selectedBus || !selectedDriver || !selectedHelper1 || loading}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer ${(!selectedBus || !selectedDriver || !selectedHelper1 || loading)
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                                }`}
                        >
                            {loading ? 'Dispatching...' : 'Confirm assignment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripAssignmentModal;
