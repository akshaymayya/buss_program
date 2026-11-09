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
        if (!confirm("Cancel this trip? The vehicle will be released to available status.")) return;
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
        if (!confirm("Send this vehicle to maintenance depot?")) return;
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
        switch (status) {
            case 'Available':
                return 'bg-emerald-50 text-emerald-800 border border-emerald-200/70';
            case 'On Route':
                return 'bg-blue-50 text-blue-800 border border-blue-200/70';
            case 'Maintenance':
                return 'bg-amber-50 text-amber-800 border border-amber-200/70';
            default:
                return 'bg-gray-50 text-gray-700 border border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-xs animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200/90 shadow-xs">
            {/* Header */}
            <div className="flex justify-between items-baseline mb-4">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Fleet capacity</h2>
                    <span className="text-[11px] text-gray-400 font-mono">Current vehicle readiness</span>
                </div>
                <a
                    href="/management"
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                    Manage fleet →
                </a>
            </div>

            {/* Stats Row (Reddit style with subtle vertical dividers) */}
            <div className="grid grid-cols-3 divide-x divide-gray-150 py-3 mb-4 bg-gray-50/60 rounded-xl border border-gray-200/80">
                <div className="px-4 text-center">
                    <span className="block text-2xl font-bold text-gray-900 font-mono tabular-nums">{stats?.total || 0}</span>
                    <span className="text-[11px] text-gray-500 font-medium">Total fleet</span>
                </div>
                <div className="px-4 text-center">
                    <span className="block text-2xl font-bold text-emerald-700 font-mono tabular-nums">{stats?.available || 0}</span>
                    <span className="text-[11px] text-gray-500 font-medium">Available</span>
                </div>
                <div className="px-4 text-center">
                    <span className="block text-2xl font-bold text-blue-700 font-mono tabular-nums">{stats?.on_route || 0}</span>
                    <span className="text-[11px] text-gray-500 font-medium">In transit</span>
                </div>
            </div>

            {/* Maintenance Warning */}
            {stats?.needs_service_warning && stats.needs_service_warning.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs text-amber-900 space-y-1">
                    <span className="font-semibold block text-[11px]">Inspection due (30+ days)</span>
                    {stats.needs_service_warning.map(w => (
                        <div key={w.id} className="text-[11px] text-amber-800 flex justify-between font-mono">
                            <span>{w.plate}</span>
                            <span>{w.days_since}d since service</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Bus List */}
            <div className="space-y-2">
                {buses.map((bus) => (
                    <div
                        key={bus.id}
                        className="p-3 rounded-lg border border-gray-200/70 bg-gray-50/40 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <span className="font-mono font-semibold text-xs text-gray-900 block truncate">
                                    {bus.plate_number}
                                </span>
                                <span className="text-[11px] text-gray-500 block truncate">
                                    {bus.type} · {bus.capacity} seats
                                </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${getStatusBadge(bus.status)}`}>
                                {bus.status}
                            </span>
                        </div>

                        {bus.assigned_route && (
                            <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-center justify-between text-[11px]">
                                <span className="text-gray-700 font-medium truncate">{bus.assigned_route}</span>
                                <span className="text-gray-400 font-mono ml-2 shrink-0">{bus.assigned_date}</span>
                            </div>
                        )}

                        {/* Quiet Action Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-gray-200/40 flex justify-end gap-1.5">
                            {bus.status === 'On Route' && (
                                <button
                                    onClick={() => handleCancelTrip(bus.id)}
                                    disabled={actionLoading === bus.id}
                                    className="text-[11px] px-2.5 py-1 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded border border-gray-200 transition-colors cursor-pointer"
                                >
                                    {actionLoading === bus.id ? 'Cancelling...' : 'Cancel trip'}
                                </button>
                            )}
                            {bus.status === 'Available' && (
                                <button
                                    onClick={() => handleSendToMaintenance(bus.id)}
                                    disabled={actionLoading === bus.id}
                                    className="text-[11px] px-2.5 py-1 text-gray-600 hover:text-amber-800 hover:bg-amber-50 rounded border border-gray-200 transition-colors cursor-pointer"
                                >
                                    Service check
                                </button>
                            )}
                            {bus.status === 'Maintenance' && (
                                <button
                                    onClick={() => handleCompleteMaintenance(bus.id)}
                                    disabled={actionLoading === bus.id}
                                    className="text-[11px] px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors cursor-pointer font-medium"
                                >
                                    Mark inspected
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
