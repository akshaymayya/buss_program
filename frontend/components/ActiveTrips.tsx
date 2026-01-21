"use client";

import React, { useState, useEffect } from 'react';

interface ActiveTrip {
    busId: string;
    plateNumber: string;
    route: string;
    date: string;
    driverId?: string;
}

const ActiveTrips = () => {
    const [trips, setTrips] = useState<ActiveTrip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActiveTrips();
        // Poll every 30 seconds for real-time updates
        const interval = setInterval(fetchActiveTrips, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchActiveTrips = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/fleet/?status=On%20Route');
            if (res.ok) {
                const buses = await res.json();
                const activeTrips = buses.map((bus: any) => ({
                    busId: bus.id,
                    plateNumber: bus.plate_number,
                    route: bus.assigned_route || 'Unknown Route',
                    date: bus.assigned_date || 'Today',
                    driverId: bus.assigned_driver_id
                }));
                setTrips(activeTrips);
            }
        } catch (err) {
            console.error("Failed to fetch active trips", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkComplete = async (busId: string) => {
        try {
            const res = await fetch(`http://localhost:8000/api/fleet/${busId}/cancel-trip`, {
                method: 'PUT'
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
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                    {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="font-bold text-gray-800">Active Trips</h3>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                    {trips.length} on route
                </span>
            </div>

            {trips.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">No active trips right now</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {trips.map((trip) => (
                        <div
                            key={trip.busId}
                            className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">{trip.plateNumber}</p>
                                    <p className="text-xs text-blue-600 font-medium mt-0.5">📍 {trip.route}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{trip.date}</p>
                                </div>
                                <button
                                    onClick={() => handleMarkComplete(trip.busId)}
                                    className="text-xs px-3 py-1.5 bg-white text-emerald-600 font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors"
                                >
                                    Complete ✓
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActiveTrips;
