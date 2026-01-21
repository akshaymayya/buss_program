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

interface Employee {
    id: string;
    name: string;
    role: string;
    phone: string;
    current_location: string;
    joined_date: string;
}

const TripAssignmentModal: React.FC<TripAssignmentModalProps> = ({ isOpen, onClose, routeDetails }) => {
    const [step, setStep] = useState(1);
    const [drivers, setDrivers] = useState<Employee[]>([]);
    const [helpers, setHelpers] = useState<Employee[]>([]);

    // Selection state
    const [selectedBus, setSelectedBus] = useState(routeDetails.recommendedBus?.id || '');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedHelper1, setSelectedHelper1] = useState('');
    const [selectedHelper2, setSelectedHelper2] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && routeDetails.source) {
            fetchEmployees();
        }
    }, [isOpen, routeDetails.source]);

    const fetchEmployees = async () => {
        try {
            // Smart Filter: Only fetch employees at the Source City
            const [dRes, hRes] = await Promise.all([
                fetch(`http://localhost:8000/api/employees?role=Driver&location=${routeDetails.source}`),
                fetch(`http://localhost:8000/api/employees?role=Helper&location=${routeDetails.source}`)
            ]);

            if (dRes.ok) setDrivers(await dRes.json());
            else setDrivers([]);

            if (hRes.ok) setHelpers(await hRes.json());
            else setHelpers([]);

        } catch (e) {
            console.error("Failed to fetch crew", e);
            setDrivers([]);
            setHelpers([]);
        }
    };

    const handleAssign = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/employees/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    route_source: routeDetails.source,
                    route_destination: routeDetails.destination,
                    travel_date: routeDetails.date,
                    bus_id: selectedBus,
                    driver_id: selectedDriver,
                    helper_1_id: selectedHelper1,
                    helper_2_id: selectedHelper2
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                alert(`SUCCESS: ${data.message}\nDriver and Helpers have been notified via SMS.`);
                onClose();
            }
        } catch (e) {
            console.error(e);
            alert("Assignment failed!");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row">

                {/* Left Panel: Summary */}
                <div className="md:w-1/3 bg-indigo-900 text-white p-8 flex flex-col justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Trip Assignment</h2>
                        <div className="space-y-6">
                            <div>
                                <p className="text-indigo-300 text-xs font-bold uppercase">Route</p>
                                <p className="text-xl font-bold">{routeDetails.source} <span className="text-indigo-400">→</span> {routeDetails.destination}</p>
                                <p className="text-sm text-indigo-200 mt-1">{routeDetails.date}</p>
                            </div>
                            <div>
                                <p className="text-indigo-300 text-xs font-bold uppercase">Required Crew</p>
                                <ul className="text-sm space-y-2 mt-2">
                                    <li className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${selectedDriver ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                        1 x Main Driver
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${selectedHelper1 && selectedHelper2 ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                        2 x Trip Helpers
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8">
                        <p className="text-xs text-indigo-400">System Logic</p>
                        <p className="text-xs italic mt-1 opacity-70">Showing only employees currently present in <strong>{routeDetails.source}</strong>.</p>
                    </div>
                </div>

                {/* Right Panel: Form */}
                <div className="md:w-2/3 p-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Select Crew & Vehicle</h3>

                    <div className="space-y-6">
                        {/* Bus Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Assign Vehicle</label>
                            <select
                                value={selectedBus}
                                onChange={(e) => setSelectedBus(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value={routeDetails.recommendedBus?.id}>
                                    {routeDetails.recommendedBus?.name} (Recommended)
                                </option>
                                <option value="B2">KA-01-F-9999 (Non-AC Seater)</option>
                                <option value="B3">KA-51-Z-5678 (Sleeper AC)</option>
                            </select>
                        </div>

                        {/* Driver Selection Grid */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Select Driver</label>
                            {drivers.length === 0 ? (
                                <p className="text-red-500 text-sm">No drivers found in {routeDetails.source}.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {drivers.map(drv => (
                                        <div
                                            key={drv.id}
                                            onClick={() => setSelectedDriver(drv.id)}
                                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedDriver === drv.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}
                                        >
                                            <p className="font-bold text-gray-800">{drv.name}</p>
                                            <p className="text-xs text-gray-500">{drv.phone}</p>
                                            <p className="text-xs text-gray-400 mt-1">Joined: {drv.joined_date}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Helpers Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Helper 1</label>
                                <select
                                    className="w-full p-3 border border-gray-300 rounded-lg"
                                    value={selectedHelper1}
                                    onChange={(e) => setSelectedHelper1(e.target.value)}
                                >
                                    <option value="">Select Helper</option>
                                    {helpers.filter(h => h.id !== selectedHelper2).map(h => (
                                        <option key={h.id} value={h.id}>{h.name} ({h.phone})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Helper 2</label>
                                <select
                                    className="w-full p-3 border border-gray-300 rounded-lg"
                                    value={selectedHelper2}
                                    onChange={(e) => setSelectedHelper2(e.target.value)}
                                >
                                    <option value="">Select Helper</option>
                                    {helpers.filter(h => h.id !== selectedHelper1).map(h => (
                                        <option key={h.id} value={h.id}>{h.name} ({h.phone})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button
                            onClick={handleAssign}
                            disabled={!selectedDriver || !selectedHelper1 || !selectedHelper2 || loading}
                            className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg ${(!selectedDriver || !selectedHelper1 || !selectedHelper2) ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 transform hover:-translate-y-1 transition'
                                }`}
                        >
                            {loading ? 'Sending SMS...' : 'Confirm & Notify Crew'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripAssignmentModal;
