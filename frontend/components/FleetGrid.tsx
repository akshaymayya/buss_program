"use client";

import React, { useState, useEffect } from 'react';

interface Bus {
    id: string;
    plate_number: string;
    type: string;
    capacity: number;
    status: string;
    assigned_route?: string;
    assigned_date?: string;
    last_maintenance_date?: string;
}

interface FleetStats {
    total: number;
    available: number;
    on_route: number;
    maintenance: number;
    needs_service_warning: { id: string; plate: string; days_since: number }[];
}

const FleetGrid = () => {
    const [buses, setBuses] = useState<Bus[]>([]);
    const [stats, setStats] = useState<FleetStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchFleet();
    }, []);

    const fetchFleet = async () => {
        setLoading(true);
        try {
            const [fleetRes, statsRes] = await Promise.all([
                fetch('http://localhost:8000/api/fleet/'),
                fetch('http://localhost:8000/api/fleet/stats')
            ]);
            if (fleetRes.ok) setBuses(await fleetRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (err) {
            console.error("Failed to fetch fleet", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelTrip = async (busId: string) => {
        if (!confirm("Cancel this trip? The bus will become available.")) return;
        setActionLoading(busId);
        try {
            const res = await fetch(`http://localhost:8000/api/fleet/${busId}/cancel-trip`, {
                method: 'PUT'
            });
            if (res.ok) {
                fetchFleet();
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to cancel trip");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendToMaintenance = async (busId: string) => {
        if (!confirm("Send this bus to maintenance?")) return;
        setActionLoading(busId);
        try {
            const res = await fetch(`http://localhost:8000/api/fleet/${busId}/maintenance`, {
                method: 'PUT'
            });
            if (res.ok) {
                fetchFleet();
            } else {
                const data = await res.json();
                alert(data.detail || "Failed");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCompleteMaintenance = async (busId: string) => {
        setActionLoading(busId);
        try {
            const res = await fetch(`http://localhost:8000/api/fleet/${busId}/complete-maintenance`, {
                method: 'PUT'
            });
            if (res.ok) fetchFleet();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'Available': 'bg-emerald-100 text-emerald-700',
            'On Route': 'bg-blue-100 text-blue-700',
            'Maintenance': 'bg-amber-100 text-amber-700'
        };
        return styles[status] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                    <h2 className="text-lg font-bold text-gray-800">Fleet Status</h2>
                </div>
                <a href="/management" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                    Manage Fleet →
                </a>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <span className="block text-2xl font-bold text-gray-800">{stats?.total || 0}</span>
                    <span className="text-xs text-gray-500 font-medium">Total</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg text-center">
                    <span className="block text-2xl font-bold text-emerald-600">{stats?.available || 0}</span>
                    <span className="text-xs text-gray-500 font-medium">Available</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <span className="block text-2xl font-bold text-blue-600">{stats?.on_route || 0}</span>
                    <span className="text-xs text-gray-500 font-medium">On Route</span>
                </div>
            </div>

            {/* Maintenance Warning */}
            {stats?.needs_service_warning && stats.needs_service_warning.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Maintenance Alert</p>
                    {stats.needs_service_warning.map(w => (
                        <p key={w.id} className="text-xs text-amber-600">
                            {w.plate} - {w.days_since} days since last service
                        </p>
                    ))}
                </div>
            )}

            {/* Bus List */}
            <div className="space-y-2">
                {buses.map((bus) => (
                    <div
                        key={bus.id}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{bus.plate_number}</p>
                                <p className="text-xs text-gray-500">{bus.type} • {bus.capacity} seats</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(bus.status)}`}>
                                    {bus.status}
                                </span>
                            </div>
                        </div>

                        {/* Assignment Info */}
                        {bus.assigned_route && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-blue-600 font-medium">📍 {bus.assigned_route}</p>
                                <p className="text-xs text-gray-400">{bus.assigned_date}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {bus.status === 'On Route' && (
                                <button
                                    onClick={() => handleCancelTrip(bus.id)}
                                    disabled={actionLoading === bus.id}
                                    className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                >
                                    {actionLoading === bus.id ? '...' : 'Cancel Trip'}
                                </button>
                            )}
                            {bus.status === 'Available' && (
                                <button
                                    onClick={() => handleSendToMaintenance(bus.id)}
                                    disabled={actionLoading === bus.id}
                                    className="text-xs px-2 py-1 bg-amber-100 text-amber-600 rounded hover:bg-amber-200 transition-colors"
                                >
                                    Send to Maintenance
                                </button>
                            )}
                            {bus.status === 'Maintenance' && (
                                <button
                                    onClick={() => handleCompleteMaintenance(bus.id)}
                                    disabled={actionLoading === bus.id}
                                    className="text-xs px-2 py-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200 transition-colors"
                                >
                                    Mark Complete
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FleetGrid;
