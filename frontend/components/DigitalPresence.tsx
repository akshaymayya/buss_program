"use client";

import React, { useState } from 'react';

const DigitalPresence = () => {
    const [websiteRoutes, setWebsiteRoutes] = useState([
        { id: 1, route: "Bangalore - Mysore", visible: true },
        { id: 2, route: "Mangalore - Bangalore", visible: true },
        { id: 3, route: "Gokarna - Bangalore", visible: false },
    ]);

    const [redBusStatus, setRedBusStatus] = useState("Connected");

    const toggleRoute = (id: number) => {
        setWebsiteRoutes(routes =>
            routes.map(r => r.id === id ? { ...r, visible: !r.visible } : r)
        );
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Website Management Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Your Website Management</h3>
                        <p className="text-gray-500 text-sm">Control which routes are visible on your public booking site.</p>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wide">
                        Live
                    </div>
                </div>

                <div className="space-y-4">
                    {websiteRoutes.map(route => (
                        <div key={route.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${route.visible ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <span className={route.visible ? 'text-gray-900 font-medium' : 'text-gray-400'}>{route.route}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={route.visible} onChange={() => toggleRoute(route.id)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    ))}
                </div>
                <button className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-800">
                    + Add New Route to Website
                </button>
            </div>

            {/* RedBus Partnership Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-red-600">redBus Partnership</h3>
                        <p className="text-gray-500 text-sm">Manage your inventory distribution on RedBus.</p>
                    </div>
                    <img src="https://st.redbus.in/Images/rdc/rdc-redbus-logo.svg" alt="redbus" className="h-8" />
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex-1 p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                        <span className="block text-xs text-red-400 uppercase font-semibold">Connection Status</span>
                        <span className="block text-xl font-bold text-red-700 mt-1">{redBusStatus}</span>
                    </div>
                    <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                        <span className="block text-xs text-gray-500 uppercase font-semibold">Daily Bookings</span>
                        <span className="block text-xl font-bold text-gray-900 mt-1">128</span>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                        Sync Inventory
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                        Manage Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DigitalPresence;
