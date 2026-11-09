"use client";

import React, { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

export interface Employee {
    id: string;
    name: string;
    role: 'Driver' | 'Helper';
    phone: string;
    email?: string;
    licence_number?: string;
    licence_type?: string;
    licence_expiry?: string;
    is_licence_verified?: boolean;
    current_location: string;
    status: 'Available' | 'Assigned' | 'En Route' | 'On Duty' | 'Resting' | 'On Leave' | 'Unavailable';
    joined_date: string;
    total_duty_hours?: number;
    max_daily_duty_hours?: number;
    min_rest_hours?: number;
    last_trip_completed_at?: string;
    rest_ends_at?: string;
    previous_trip?: string;
    upcoming_trips_count?: number;
}

interface StatsData {
    total: number;
    total_drivers: number;
    total_helpers: number;
    status_counts: Record<string, number>;
    location_summary: {
        city: string;
        available_drivers: number;
        available_helpers: number;
        total_crew: number;
    }[];
}

interface HistoryData {
    employee_id: string;
    name: string;
    role: string;
    current_location: string;
    location_history: {
        id: number;
        old_location: string | null;
        new_location: string;
        reason: string;
        updated_by: string;
        timestamp: string;
    }[];
    trip_history: {
        id: number;
        trip_id: string;
        role: string;
        route: string;
        departure_time: string | null;
        arrival_time: string | null;
        duty_hours: number;
        status: string;
        timestamp: string;
    }[];
}

const DriverHelperManager: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedRole, setSelectedRole] = useState<'All' | 'Driver' | 'Helper'>('All');
    const [selectedStatus, setSelectedStatus] = useState<string>('All');
    const [selectedLocation, setSelectedLocation] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showOverrideModal, setShowOverrideModal] = useState<Employee | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState<Employee | null>(null);
    const [historyData, setHistoryData] = useState<HistoryData | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Add Form State
    const [newEmp, setNewEmp] = useState({
        name: '',
        role: 'Driver',
        phone: '',
        email: '',
        licence_number: '',
        licence_type: 'Heavy Commercial Vehicle (HCV)',
        licence_expiry: '',
        current_location: 'Bangalore'
    });
    const [submittingAdd, setSubmittingAdd] = useState(false);

    // Override Form State
    const [overrideLoc, setOverrideLoc] = useState('');
    const [overrideStatus, setOverrideStatus] = useState('');
    const [overrideReason, setOverrideReason] = useState('');
    const [overrideStaff, setOverrideStaff] = useState('Operations Manager');
    const [submittingOverride, setSubmittingOverride] = useState(false);

    useEffect(() => {
        fetchData();
    }, [selectedRole, selectedStatus, selectedLocation]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedRole !== 'All') params.append('role', selectedRole);
            if (selectedStatus !== 'All') params.append('status', selectedStatus);
            if (selectedLocation !== 'All') params.append('location', selectedLocation);
            if (searchQuery.trim()) params.append('search', searchQuery.trim());

            const [empRes, statsRes] = await Promise.all([
                fetch(apiUrl(`/api/employees/?${params.toString()}`)),
                fetch(apiUrl('/api/employees/stats'))
            ]);

            if (empRes.ok) setEmployees(await empRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (e) {
            console.error("Failed to load employee data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData();
    };

    const handleOpenHistory = async (emp: Employee) => {
        setShowHistoryModal(emp);
        setHistoryLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/employees/${emp.id}/history`));
            if (res.ok) {
                setHistoryData(await res.json());
            }
        } catch (err) {
            console.error("Failed to fetch history", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleOpenOverride = (emp: Employee) => {
        setShowOverrideModal(emp);
        setOverrideLoc(emp.current_location);
        setOverrideStatus(emp.status);
        setOverrideReason('');
        setOverrideStaff('Operations Manager');
    };

    const handleClearRest = async (empId: string) => {
        try {
            const res = await fetch(apiUrl(`/api/employees/${empId}/complete-rest`), {
                method: 'POST'
            });
            if (res.ok) {
                fetchData();
            }
        } catch (e) {
            console.error("Failed to clear rest", e);
        }
    };

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmp.name || !newEmp.phone || !newEmp.current_location) {
            alert("Name, phone and stationed location are required");
            return;
        }
        if (newEmp.role === 'Driver' && !newEmp.licence_number) {
            alert("Commercial driver licence number is mandatory");
            return;
        }

        setSubmittingAdd(true);
        try {
            const res = await fetch(apiUrl('/api/employees/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEmp)
            });
            if (res.ok) {
                setShowAddModal(false);
                setNewEmp({
                    name: '',
                    role: 'Driver',
                    phone: '',
                    email: '',
                    licence_number: '',
                    licence_type: 'Heavy Commercial Vehicle (HCV)',
                    licence_expiry: '',
                    current_location: 'Bangalore'
                });
                fetchData();
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to add employee");
            }
        } catch (e) {
            console.error(e);
            alert("Error adding employee");
        } finally {
            setSubmittingAdd(false);
        }
    };

    const handleOverrideSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showOverrideModal) return;
        if (!overrideReason || overrideReason.trim().length < 4) {
            alert("A valid justification reason is required for audit compliance");
            return;
        }

        setSubmittingOverride(true);
        try {
            const res = await fetch(apiUrl(`/api/employees/${showOverrideModal.id}/override`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    new_location: overrideLoc,
                    new_status: overrideStatus,
                    reason: overrideReason,
                    authorized_by: overrideStaff
                })
            });

            if (res.ok) {
                setShowOverrideModal(null);
                fetchData();
            } else {
                const err = await res.json();
                alert(err.detail || "Override failed");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to submit override");
        } finally {
            setSubmittingOverride(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Available':
                return 'bg-emerald-50 text-emerald-800 border-emerald-200';
            case 'Assigned':
                return 'bg-blue-50 text-blue-800 border-blue-200';
            case 'En Route':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'On Duty':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'Resting':
                return 'bg-amber-50 text-amber-800 border-amber-200';
            case 'On Leave':
            case 'Unavailable':
            default:
                return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* KPI Metrics Strip (Reddit style with subtle vertical dividers) */}
            {stats && (
                <div className="bg-gray-50/60 border border-gray-200/80 rounded-xl p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-gray-200/70 gap-4 lg:gap-0">
                        <div className="lg:px-4 first:pl-0 space-y-0.5">
                            <span className="text-[11px] font-semibold text-gray-500 block">Total crew</span>
                            <span className="text-xl font-bold text-gray-900 font-mono tabular-nums block">
                                {stats.total}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block">
                                {stats.total_drivers} drivers · {stats.total_helpers} helpers
                            </span>
                        </div>

                        <div className="pt-4 lg:pt-0 lg:px-4 space-y-0.5">
                            <span className="text-[11px] font-semibold text-gray-500 block">Available</span>
                            <span className="text-xl font-bold text-emerald-700 font-mono tabular-nums block">
                                {stats.status_counts['Available'] || 0}
                            </span>
                            <span className="text-[10px] text-emerald-600/80 font-mono block">Ready for assignment</span>
                        </div>

                        <div className="pt-4 lg:pt-0 lg:px-4 space-y-0.5">
                            <span className="text-[11px] font-semibold text-gray-500 block">Assigned</span>
                            <span className="text-xl font-bold text-blue-700 font-mono tabular-nums block">
                                {stats.status_counts['Assigned'] || 0}
                            </span>
                            <span className="text-[10px] text-blue-600/80 font-mono block">Scheduled dispatches</span>
                        </div>

                        <div className="pt-4 lg:pt-0 lg:px-4 space-y-0.5">
                            <span className="text-[11px] font-semibold text-gray-500 block">En route</span>
                            <span className="text-xl font-bold text-gray-900 font-mono tabular-nums block">
                                {stats.status_counts['En Route'] || 0}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block">Highway transit</span>
                        </div>

                        <div className="pt-4 lg:pt-0 lg:px-4 space-y-0.5">
                            <span className="text-[11px] font-semibold text-gray-500 block">Mandatory rest</span>
                            <span className="text-xl font-bold text-amber-700 font-mono tabular-nums block">
                                {stats.status_counts['Resting'] || 0}
                            </span>
                            <span className="text-[10px] text-amber-600/80 font-mono block">Post-trip cooldown</span>
                        </div>

                        <div className="pt-4 lg:pt-0 lg:px-4 last:pr-0 space-y-0.5">
                            <span className="text-[11px] font-semibold text-gray-500 block">Offline</span>
                            <span className="text-xl font-bold text-gray-500 font-mono tabular-nums block">
                                {(stats.status_counts['On Leave'] || 0) + (stats.status_counts['Unavailable'] || 0)}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block">On leave / resting</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Hub-Wise Availability Selector */}
            {stats && stats.location_summary && (
                <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-3">
                        <div>
                            <h3 className="font-semibold text-xs text-gray-900 tracking-tight">Hub stationing</h3>
                            <span className="text-[11px] text-gray-500">Filter crew by physically verified depot</span>
                        </div>
                        {selectedLocation !== 'All' && (
                            <button
                                onClick={() => setSelectedLocation('All')}
                                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
                            >
                                Clear filter ({selectedLocation})
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {stats.location_summary.map((loc) => {
                            const isSelected = selectedLocation.toLowerCase() === loc.city.toLowerCase();
                            return (
                                <button
                                    key={loc.city}
                                    onClick={() => setSelectedLocation(isSelected ? 'All' : loc.city)}
                                    className={`text-left p-3 rounded-lg border text-xs transition-colors cursor-pointer ${isSelected
                                        ? 'bg-emerald-50/50 border-emerald-600'
                                        : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">{loc.city}</span>
                                        <span className="font-mono text-[10px] text-gray-500 bg-white px-1.5 py-0.2 rounded border border-gray-200">
                                            {loc.total_crew}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 text-[11px] font-mono text-gray-500 flex justify-between">
                                        <span>{loc.available_drivers} drivers</span>
                                        <span>{loc.available_helpers} helpers</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Controls Bar */}
            <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-gray-900 tracking-tight">Crew directory</span>
                        <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {employees.length} members
                        </span>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                        + Add crew member
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
                    {/* Role Filter */}
                    <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Role</label>
                        <div className="flex rounded border border-gray-200 p-0.5 bg-gray-50 text-xs">
                            {(['All', 'Driver', 'Helper'] as const).map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setSelectedRole(r)}
                                    className={`flex-1 py-1 font-medium rounded transition ${selectedRole === r
                                        ? 'bg-white text-gray-900 font-semibold shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    {r}s
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:border-emerald-600"
                        >
                            <option value="All">All statuses</option>
                            <option value="Available">Available</option>
                            <option value="Assigned">Assigned</option>
                            <option value="En Route">En route</option>
                            <option value="On Duty">On duty</option>
                            <option value="Resting">Resting</option>
                            <option value="On Leave">On leave</option>
                            <option value="Unavailable">Unavailable</option>
                        </select>
                    </div>

                    {/* Location Filter */}
                    <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Operational hub</label>
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:border-emerald-600"
                        >
                            <option value="All">All stations</option>
                            {stats?.location_summary.map((l) => (
                                <option key={l.city} value={l.city}>{l.city} ({l.total_crew})</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Search</label>
                        <form onSubmit={handleSearchSubmit}>
                            <input
                                type="text"
                                placeholder="Name, ID or license..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:border-emerald-600"
                            />
                        </form>
                    </div>
                </div>
            </div>

            {/* Crew Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-gray-200/80 animate-pulse space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                        </div>
                    ))}
                </div>
            ) : employees.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center border border-gray-200 text-xs text-gray-500">
                    No crew members matching current filter
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employees.map((emp) => (
                        <div
                            key={emp.id}
                            className="bg-white border border-gray-200/90 hover:border-gray-300 rounded-xl p-4 shadow-xs flex flex-col justify-between transition-colors"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-xs text-gray-900">{emp.name}</span>
                                            <span className="font-mono text-[10px] text-gray-400">{emp.id}</span>
                                        </div>
                                        <span className="text-[11px] font-mono text-gray-500 mt-0.5 block">
                                            {emp.role} · {emp.phone}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${getStatusStyle(emp.status)}`}>
                                        {emp.status}
                                    </span>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-gray-100 text-xs space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-gray-500">Stationed depot:</span>
                                        <span className="font-medium text-gray-900">{emp.current_location}</span>
                                    </div>

                                    {emp.role === 'Driver' && emp.licence_number && (
                                        <div className="flex items-center justify-between font-mono text-[11px]">
                                            <span className="text-gray-500">License:</span>
                                            <span className="text-gray-700">{emp.licence_number}</span>
                                        </div>
                                    )}

                                    {emp.previous_trip && (
                                        <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-100 truncate">
                                            Last trip: <span className="text-gray-800">{emp.previous_trip}</span>
                                        </div>
                                    )}

                                    {emp.status === 'Resting' && emp.rest_ends_at && (
                                        <div className="p-2 bg-amber-50/70 border border-amber-200/70 rounded text-[11px] text-amber-900 flex items-center justify-between mt-1">
                                            <span>Rest clears: {new Date(emp.rest_ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <button
                                                onClick={() => handleClearRest(emp.id)}
                                                className="text-[10px] font-medium text-amber-900 hover:underline cursor-pointer"
                                            >
                                                Clear rest
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                                <button
                                    onClick={() => handleOpenHistory(emp)}
                                    className="text-[11px] text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
                                >
                                    View history
                                </button>
                                <button
                                    onClick={() => handleOpenOverride(emp)}
                                    className="text-[11px] text-gray-600 hover:text-gray-900 font-medium px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer"
                                >
                                    Override
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Employee Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-gray-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-gray-900 tracking-tight">Register crew member</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-700 text-sm font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateEmployee} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newEmp.name}
                                        onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={newEmp.role}
                                        onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value as any })}
                                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                                    >
                                        <option value="Driver">Commercial Driver</option>
                                        <option value="Helper">Trip Helper</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        required
                                        value={newEmp.phone}
                                        onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Stationed hub</label>
                                    <input
                                        type="text"
                                        required
                                        value={newEmp.current_location}
                                        onChange={(e) => setNewEmp({ ...newEmp, current_location: e.target.value })}
                                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                            </div>

                            {newEmp.role === 'Driver' && (
                                <div className="space-y-3 pt-2 border-t border-gray-100">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">License number</label>
                                            <input
                                                type="text"
                                                required
                                                value={newEmp.licence_number}
                                                onChange={(e) => setNewEmp({ ...newEmp, licence_number: e.target.value })}
                                                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">License expiry</label>
                                            <input
                                                type="date"
                                                value={newEmp.licence_expiry}
                                                onChange={(e) => setNewEmp({ ...newEmp, licence_expiry: e.target.value })}
                                                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingAdd}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                                >
                                    {submittingAdd ? 'Saving...' : 'Register'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manual Override Modal */}
            {showOverrideModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-gray-200 p-6 space-y-4">
                        <div>
                            <h3 className="font-semibold text-sm text-gray-900 tracking-tight">Manual location or status correction</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Logged to audit trail for {showOverrideModal.name} ({showOverrideModal.id})
                            </p>
                        </div>

                        <form onSubmit={handleOverrideSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">New stationed hub</label>
                                <input
                                    type="text"
                                    value={overrideLoc}
                                    onChange={(e) => setOverrideLoc(e.target.value)}
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">New availability status</label>
                                <select
                                    value={overrideStatus}
                                    onChange={(e) => setOverrideStatus(e.target.value)}
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                                >
                                    <option value="Available">Available</option>
                                    <option value="Assigned">Assigned</option>
                                    <option value="En Route">En route</option>
                                    <option value="On Duty">On duty</option>
                                    <option value="Resting">Resting</option>
                                    <option value="On Leave">On leave</option>
                                    <option value="Unavailable">Unavailable</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Authorized staff identifier</label>
                                <input
                                    type="text"
                                    required
                                    value={overrideStaff}
                                    onChange={(e) => setOverrideStaff(e.target.value)}
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Audit justification reason</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    placeholder="Explain the reason for this manual adjustment..."
                                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowOverrideModal(null)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingOverride}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                                >
                                    {submittingOverride ? 'Saving...' : 'Apply override'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-xl max-h-[80vh] shadow-xl border border-gray-200 p-6 flex flex-col space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="font-semibold text-sm text-gray-900 tracking-tight">
                                    {showHistoryModal.name} — Operational audit trail
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {showHistoryModal.role} · Current station: {showHistoryModal.current_location}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(null)}
                                className="text-gray-400 hover:text-gray-700 text-sm font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="overflow-y-auto space-y-4 text-xs pr-1">
                            {historyLoading ? (
                                <p className="text-gray-400">Loading audit history...</p>
                            ) : !historyData ? (
                                <p className="text-gray-400">No records found</p>
                            ) : (
                                <>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-xs mb-2">Verified location transitions</h4>
                                        <div className="border-l border-gray-200 ml-2 space-y-3 py-1">
                                            {historyData.location_history.map((lh) => (
                                                <div key={lh.id} className="relative pl-4">
                                                    <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-emerald-600"></div>
                                                    <div className="text-gray-900 font-medium">
                                                        {lh.old_location ? `${lh.old_location} → ` : 'Initial: '}
                                                        <span className="font-semibold">{lh.new_location}</span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">{lh.reason}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                        {new Date(lh.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} · By {lh.updated_by}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-xs mb-2">Completed trips</h4>
                                        {historyData.trip_history.length === 0 ? (
                                            <p className="text-gray-400 text-[11px]">No completed trips on record</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {historyData.trip_history.map((th) => (
                                                    <div key={th.id} className="p-2.5 rounded border border-gray-100 bg-gray-50/60 flex items-center justify-between">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{th.route}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono">
                                                                Trip {th.trip_id} · {th.duty_hours}h duty
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-gray-500">Completed</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setShowHistoryModal(null)}
                                className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverHelperManager;
