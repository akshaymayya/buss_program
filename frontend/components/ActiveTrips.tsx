"use client";

import React, { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

interface ActiveTrip {
    id: string;
    bus_id: string;
    bus_plate?: string;
    bus_type?: string;
    route_source: string;
    route_destination: string;
    travel_date: string;
    departure_time: string;
    driver_id: string;
    driver_name?: string;
    driver_phone?: string;
    helper_ids: string[];
    helper_names?: string[];
    status: string; // Scheduled, En Route, Completed, Cancelled
    created_at: string;
}

const ActiveTrips = () => {
    const [trips, setTrips] = useState<ActiveTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifyingTrip, setVerifyingTrip] = useState<ActiveTrip | null>(null);
    const [verifiedBy, setVerifiedBy] = useState('Terminal Supervisor');
    const [arrivalNotes, setArrivalNotes] = useState('Passengers deboarded safely. Inspection cleared.');
    const [submittingVerification, setSubmittingVerification] = useState(false);

    useEffect(() => {
        fetchActiveTrips();
        const interval = setInterval(fetchActiveTrips, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchActiveTrips = async () => {
        try {
            const res = await fetch(apiUrl('/api/trips/active'));
            if (res.ok) {
                const data = await res.json();
                setTrips(data);
            } else {
                const fRes = await fetch(apiUrl('/api/fleet/?status=On%20Route'));
                if (fRes.ok) {
                    const buses = await fRes.json();
                    const mapped = buses.map((bus: any) => ({
                        id: `TRIP-${bus.id}`,
                        bus_id: bus.id,
                        bus_plate: bus.plate_number,
                        route_source: bus.assigned_route?.split('→')[0]?.trim() || 'Origin',
                        route_destination: bus.assigned_route?.split('→')[1]?.trim() || 'Destination',
                        travel_date: bus.assigned_date || 'Today',
                        departure_time: '08:00',
                        driver_id: bus.assigned_driver_id || 'E1',
                        driver_name: 'Assigned Driver',
                        helper_ids: bus.assigned_helper_ids || [],
                        status: 'En Route',
                        created_at: new Date().toISOString()
                    }));
                    setTrips(mapped);
                }
            }
        } catch (err) {
            console.error("Failed to fetch active trips", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDepartTrip = async (tripId: string) => {
        try {
            const res = await fetch(apiUrl(`/api/trips/${tripId}/depart`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verified_by: 'Depot Dispatcher' })
            });
            if (res.ok) {
                fetchActiveTrips();
            }
        } catch (e) {
            console.error("Failed to mark departure", e);
        }
    };

    const handleConfirmArrival = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verifyingTrip) return;
        setSubmittingVerification(true);
        try {
            const res = await fetch(apiUrl(`/api/trips/${verifyingTrip.id}/verify-arrival`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    verified_by: verifiedBy,
                    notes: arrivalNotes,
                    trigger_rest: true,
                    rest_hours: 8.0
                })
            });

            if (res.ok) {
                const data = await res.json();
                setVerifyingTrip(null);
                fetchActiveTrips();
            } else {
                const err = await res.json();
                alert(err.detail || "Arrival verification failed");
            }
        } catch (e) {
            console.error(e);
            alert("Error verifying arrival");
        } finally {
            setSubmittingVerification(false);
        }
    };

    const handleCancelTrip = async (tripId: string) => {
        if (!confirm("Cancel this trip? Crew and bus will return to available status at their current hub.")) return;
        try {
            const res = await fetch(apiUrl(`/api/trips/${tripId}/cancel`), {
                method: 'POST'
            });
            if (res.ok) {
                fetchActiveTrips();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-xs animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                    {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div>
                    <h3 className="font-bold text-sm text-gray-900 tracking-tight">Active transit logs</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Real-time highway departures, en route telemetry, and arrival confirmations.</p>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                    {trips.length} active on route
                </span>
            </div>

            {trips.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <p className="text-xs text-gray-500">No active trips on route</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Assigned dispatches will appear here</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {trips.map((trip) => {
                        const isScheduled = trip.status === 'Scheduled';
                        return (
                            <div
                                key={trip.id}
                                className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-semibold text-xs text-gray-900">
                                                {trip.bus_plate || trip.bus_id}
                                            </span>
                                            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded border ${isScheduled
                                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                }`}>
                                                {trip.status}
                                            </span>
                                        </div>

                                        <div className="text-xs font-medium text-gray-800 mt-1 flex items-center gap-1.5">
                                            <span>{trip.route_source}</span>
                                            <span className="text-gray-400">→</span>
                                            <span>{trip.route_destination}</span>
                                        </div>

                                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                                            Depart {trip.departure_time} · Driver: {trip.driver_name || trip.driver_id}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 items-end shrink-0">
                                        {isScheduled ? (
                                            <button
                                                onClick={() => handleDepartTrip(trip.id)}
                                                className="text-[11px] px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors cursor-pointer"
                                            >
                                                Start trip
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setVerifyingTrip(trip)}
                                                className="text-[11px] px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded transition-colors cursor-pointer"
                                            >
                                                Verify arrival
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleCancelTrip(trip.id)}
                                            className="text-[10px] text-gray-400 hover:text-red-600 font-medium cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Quiet Verification Modal */}
            {verifyingTrip && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-gray-200 p-6 space-y-4">
                        <div>
                            <h3 className="font-semibold text-sm text-gray-900 tracking-tight">Verify terminal arrival</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Operational locations of assigned crew will update to {verifyingTrip.route_destination}
                            </p>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
                            <div className="font-medium text-gray-900">
                                Corridor: {verifyingTrip.route_source} → {verifyingTrip.route_destination}
                            </div>
                            <div className="text-gray-600 font-mono text-[11px]">
                                Vehicle: {verifyingTrip.bus_plate} · Driver: {verifyingTrip.driver_name}
                            </div>
                        </div>

                        <form onSubmit={handleConfirmArrival} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Authorized staff name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={verifiedBy}
                                    onChange={(e) => setVerifiedBy(e.target.value)}
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Arrival and vehicle condition notes
                                </label>
                                <textarea
                                    rows={2}
                                    value={arrivalNotes}
                                    onChange={(e) => setArrivalNotes(e.target.value)}
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setVerifyingTrip(null)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingVerification}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                                >
                                    {submittingVerification ? 'Confirming...' : 'Confirm arrival'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveTrips;
