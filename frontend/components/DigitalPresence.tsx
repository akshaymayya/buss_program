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
        <div className="space-y-6">
            {/* Website Management Section */}
            <div className="bg-white p-5 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Online booking routes</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Control route visibility on the public booking portal.</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Live
                    </span>
                </div>

                <div className="space-y-2">
                    {websiteRoutes.map(route => (
                        <div key={route.id} className="flex items-center justify-between p-3 bg-gray-50/60 rounded-md border border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <span className={`w-2 h-2 rounded-full ${route.visible ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                <span className={`text-xs ${route.visible ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{route.route}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={route.visible} onChange={() => toggleRoute(route.id)} className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                    <button className="text-xs text-emerald-600 font-medium hover:text-emerald-700 inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add route to online booking
                    </button>
                </div>
            </div>

            {/* RedBus Partnership Section */}
            <div className="bg-white p-5 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">redBus OTA integration</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Inventory sync and ticket distribution on redBus aggregator network.</p>
                    </div>
                    <img src="https://st.redbus.in/Images/rdc/rdc-redbus-logo.svg" alt="redbus" className="h-6 opacity-90" />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-gray-50/70 rounded-md border border-gray-100">
                        <span className="block text-[11px] text-gray-500 font-medium">Connection status</span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-semibold text-gray-900">{redBusStatus}</span>
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50/70 rounded-md border border-gray-100">
                        <span className="block text-[11px] text-gray-500 font-medium">Daily bookings</span>
                        <span className="block text-xs font-mono font-semibold tabular-nums text-gray-900 mt-1">128 tickets</span>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-xs font-medium transition">
                        Sync inventory
                    </button>
                    <button className="px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-xs font-medium transition">
                        Configure integration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DigitalPresence;
