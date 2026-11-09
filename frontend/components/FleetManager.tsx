"use client";

import React, { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

interface Bus {
    id: string;
    plate_number: string;
    type: string;
    capacity: number;
    status: string;
}

const FleetManager = () => {
    const [fleet, setFleet] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // New Bus State
    const [newBus, setNewBus] = useState<Partial<Bus>>({
        plate_number: '',
        type: 'Standard',
        capacity: 40,
        status: 'Available'
    });

    useEffect(() => {
        fetchFleet();
    }, []);

    const fetchFleet = async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl('/api/fleet/'));
            if (res.ok) {
                const data = await res.json();
                setFleet(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBus = async () => {
        if (!newBus.plate_number || !newBus.type) return;

        try {
            const res = await fetch(apiUrl('/api/fleet/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBus)
            });

            if (res.ok) {
                setShowAddForm(false);
                setNewBus({ plate_number: '', type: 'Standard', capacity: 40, status: 'Available' });
                fetchFleet(); // Refresh list
            }
        } catch (err) {
            console.error("Failed to add bus", err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this bus?")) return;
        try {
            await fetch(apiUrl(`/api/fleet/${id}`), { method: 'DELETE' });
            fetchFleet();
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(apiUrl(`/api/fleet/${id}/status?status=${newStatus}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                // Optimistic update or refresh
                setFleet(prev => prev.map(bus =>
                    bus.id === id ? { ...bus, status: newStatus } : bus
                ));
            }
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };


    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-900">Registered fleet</h2>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums bg-gray-100 text-gray-700">
                        {fleet.length}
                    </span>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition shadow-sm"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add vehicle
                </button>
            </div>

            {showAddForm && (
                <div className="p-4 bg-gray-50/70 rounded-lg border border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-900 mb-3">Add new vehicle</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">Plate number</label>
                            <input
                                type="text"
                                placeholder="KA-01-AB-1234"
                                className="w-full px-2.5 py-1.5 border border-gray-200 text-gray-900 font-mono text-xs rounded-md placeholder-gray-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white"
                                value={newBus.plate_number}
                                onChange={e => setNewBus({ ...newBus, plate_number: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">Vehicle type</label>
                            <select
                                className="w-full px-2.5 py-1.5 border border-gray-200 text-gray-900 text-xs rounded-md focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white"
                                value={newBus.type}
                                onChange={e => setNewBus({ ...newBus, type: e.target.value })}
                            >
                                <option>Standard</option>
                                <option>Sleeper AC</option>
                                <option>Semi-Sleeper</option>
                                <option>Multi-Axle Volvo</option>
                                <option>Mercedes Benz</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">Seating capacity</label>
                            <input
                                type="number"
                                placeholder="40"
                                className="w-full px-2.5 py-1.5 border border-gray-200 text-gray-900 font-mono text-xs rounded-md placeholder-gray-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white"
                                value={newBus.capacity}
                                onChange={e => setNewBus({ ...newBus, capacity: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleAddBus}
                                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition"
                            >
                                Save vehicle
                            </button>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-md transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-medium">
                            <th className="py-2.5 px-3">Plate number</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Capacity</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {loading ? (
                            <tr><td colSpan={5} className="py-8 text-center text-gray-400 font-mono text-xs">Loading fleet data...</td></tr>
                        ) : fleet.length === 0 ? (
                            <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-xs">No vehicles registered yet.</td></tr>
                        ) : fleet.map(bus => (
                            <tr key={bus.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="py-3 px-3 font-mono font-semibold text-gray-900">{bus.plate_number}</td>
                                <td className="py-3 px-3 text-gray-700">{bus.type}</td>
                                <td className="py-3 px-3 font-mono tabular-nums text-gray-600">{bus.capacity} seats</td>
                                <td className="py-3 px-3">
                                    <select
                                        value={bus.status}
                                        onChange={(e) => handleStatusUpdate(bus.id, e.target.value)}
                                        className={`px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer outline-none transition ${
                                            bus.status === 'Available'
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : bus.status === 'On Route'
                                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}
                                    >
                                        <option value="Available">Available</option>
                                        <option value="On Route">On Route</option>
                                        <option value="Maintenance">Maintenance</option>
                                    </select>
                                </td>
                                <td className="py-3 px-3 text-right">
                                    <button
                                        onClick={() => handleDelete(bus.id)}
                                        className="text-gray-400 hover:text-rose-600 transition text-xs opacity-0 group-hover:opacity-100"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FleetManager;
