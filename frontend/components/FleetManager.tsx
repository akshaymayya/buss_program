"use client";

import React, { useState, useEffect } from 'react';

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
            const res = await fetch('http://localhost:8000/api/fleet/');
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
            const res = await fetch('http://localhost:8000/api/fleet/', {
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
            await fetch(`http://localhost:8000/api/fleet/${id}`, { method: 'DELETE' });
            fetchFleet();
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`http://localhost:8000/api/fleet/${id}/status?status=${newStatus}`, {
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
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">My Fleet ({fleet.length})</h2>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition"
                >
                    + Add New Bus
                </button>
            </div>

            {showAddForm && (
                <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200 animate-fade-in-up">
                    <h3 className="font-semibold text-gray-800 mb-4">Add New Vehicle</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Plate Number (e.g. KA-01-AB-1234)"
                            className="p-2 border border-gray-300 text-gray-900 rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newBus.plate_number}
                            onChange={e => setNewBus({ ...newBus, plate_number: e.target.value })}
                        />
                        <select
                            className="p-2 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newBus.type}
                            onChange={e => setNewBus({ ...newBus, type: e.target.value })}
                        >
                            <option>Standard</option>
                            <option>Sleeper AC</option>
                            <option>Semi-Sleeper</option>
                            <option>Multi-Axle Volvo</option>
                            <option>Mercedes Benz</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Capacity"
                            className="p-2 border border-gray-300 text-gray-900 rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newBus.capacity}
                            onChange={e => setNewBus({ ...newBus, capacity: parseInt(e.target.value) })}
                        />
                        <div className="flex gap-2">
                            <button onClick={handleAddBus} className="flex-1 bg-green-600 text-white rounded-lg hover:bg-green-700">Save</button>
                            <button onClick={() => setShowAddForm(false)} className="px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-sm text-gray-500 border-b border-gray-100">
                            <th className="py-3 font-medium">Plate Number</th>
                            <th className="py-3 font-medium">Type</th>
                            <th className="py-3 font-medium">Capacity</th>
                            <th className="py-3 font-medium">Status</th>
                            <th className="py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {loading ? (
                            <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading fleet data...</td></tr>
                        ) : fleet.map(bus => (
                            <tr key={bus.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                <td className="py-4 font-semibold text-gray-900">{bus.plate_number}</td>
                                <td className="py-4">{bus.type}</td>
                                <td className="py-4">{bus.capacity} Seats</td>
                                <td className="py-4">
                                    <select
                                        value={bus.status}
                                        onChange={(e) => handleStatusUpdate(bus.id, e.target.value)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border-0 cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 transition-all ${bus.status === 'Available' ? 'bg-green-100 text-green-700 ring-green-200' :
                                            bus.status === 'On Route' ? 'bg-blue-100 text-blue-700 ring-blue-200' :
                                                'bg-red-100 text-red-700 ring-red-200'
                                            }`}
                                    >
                                        <option value="Available">Available</option>
                                        <option value="On Route">On Route</option>
                                        <option value="Maintenance">Maintenance</option>
                                    </select>
                                </td>
                                <td className="py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(bus.id)}
                                        className="text-red-500 hover:text-red-700 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
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
