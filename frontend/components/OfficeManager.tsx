"use client";

import React, { useState } from 'react';

type OfficeType = 'Head Office' | 'Branch' | 'Booking Point';

interface Office {
    id: number;
    city: string;
    address?: string;
    contact: string;
    type: OfficeType;
    isPhysical: boolean;
    isOnline: boolean;
}

const OfficeManager = () => {
    const [offices, setOffices] = useState<Office[]>([
        { id: 1, city: "Bangalore", address: "Kalasipalyam Main Road", contact: "+91 9988776655", type: "Head Office", isPhysical: true, isOnline: true },
        { id: 2, city: "Mangalore", address: "PVS Circle", contact: "+91 9988776644", type: "Branch", isPhysical: true, isOnline: false },
    ]);

    const [view, setView] = useState<'list' | 'select-type' | 'form'>('list');
    const [selectedStructure, setSelectedStructure] = useState({ physical: false, online: false });

    // Form State
    const [newOffice, setNewOffice] = useState<Partial<Office>>({
        city: "",
        address: "",
        contact: "",
        type: "Branch"
    });

    const handleStartAdd = () => {
        setView('select-type');
        setSelectedStructure({ physical: false, online: false });
    };

    const handleTypeSelection = () => {
        if (!selectedStructure.physical && !selectedStructure.online) {
            alert("Please select at least one office type (Physical or Online).");
            return;
        }
        setView('form');
    };

    const handleSave = () => {
        if (!newOffice.city || !newOffice.contact) {
            alert("City and Contact number are required.");
            return;
        }

        const officeToAdd: Office = {
            id: Date.now(),
            city: newOffice.city!,
            address: selectedStructure.physical ? newOffice.address : "Virtual Office",
            contact: newOffice.contact!,
            type: newOffice.type as OfficeType || "Branch",
            isPhysical: selectedStructure.physical,
            isOnline: selectedStructure.online
        };

        setOffices([...offices, officeToAdd]);
        setView('list');
        setNewOffice({ city: "", address: "", contact: "", type: "Branch" });
    };

    return (
        <div className="space-y-4 min-h-[400px]">

            {/* LIST VIEW */}
            {view === 'list' && (
                <>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">Office network</h3>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums bg-gray-100 text-gray-700">
                                {offices.length}
                            </span>
                        </div>
                        <button
                            onClick={handleStartAdd}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add location
                        </button>
                    </div>

                    {offices.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-xs text-gray-500">No regional offices configured yet.</p>
                            <button onClick={handleStartAdd} className="mt-2 text-xs text-emerald-600 font-medium hover:underline">
                                Add your first location
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {offices.map(office => (
                                <div key={office.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-semibold text-gray-900">{office.city}</h4>
                                                {office.isOnline && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        Online
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {office.isPhysical ? office.address : <span className="text-gray-400">Virtual / online point</span>}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                                            office.type === 'Head Office' 
                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {office.type}
                                        </span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-xs font-mono tabular-nums text-gray-600">
                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        {office.contact}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* STEP 1: TYPE SELECTION */}
            {view === 'select-type' && (
                <div className="max-w-xl mx-auto py-6">
                    <div className="text-center mb-6">
                        <h3 className="text-base font-semibold text-gray-900">Select office capability</h3>
                        <p className="text-xs text-gray-500 mt-1">Configure whether this location operates physical counters, online booking, or both.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                        {/* Physical Card */}
                        <div
                            onClick={() => setSelectedStructure({ ...selectedStructure, physical: !selectedStructure.physical })}
                            className={`cursor-pointer p-4 rounded-lg border transition text-left flex flex-col justify-between gap-3 ${
                                selectedStructure.physical 
                                    ? 'border-emerald-600 bg-emerald-50/20' 
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${selectedStructure.physical ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={selectedStructure.physical} 
                                    readOnly 
                                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" 
                                />
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-gray-900">Physical hub</h4>
                                <p className="text-[11px] text-gray-500 mt-0.5">Physical counter where passengers can board, drop luggage, or purchase tickets.</p>
                            </div>
                        </div>

                        {/* Online Card */}
                        <div
                            onClick={() => setSelectedStructure({ ...selectedStructure, online: !selectedStructure.online })}
                            className={`cursor-pointer p-4 rounded-lg border transition text-left flex flex-col justify-between gap-3 ${
                                selectedStructure.online 
                                    ? 'border-emerald-600 bg-emerald-50/20' 
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${selectedStructure.online ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={selectedStructure.online} 
                                    readOnly 
                                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" 
                                />
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-gray-900">Online point</h4>
                                <p className="text-[11px] text-gray-500 mt-0.5">Appears on web search and allows OTA ticket issuance for this sector.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button 
                            onClick={() => setView('list')} 
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleTypeSelection}
                            disabled={!selectedStructure.physical && !selectedStructure.online}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium text-white transition shadow-sm ${
                                (selectedStructure.physical || selectedStructure.online) 
                                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                                    : 'bg-gray-300 cursor-not-allowed'
                            }`}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: DETAILS FORM */}
            {view === 'form' && (
                <div className="max-w-xl mx-auto bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Enter location details</h3>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                                <input
                                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none text-gray-900 placeholder-gray-400"
                                    placeholder="e.g. Mumbai"
                                    value={newOffice.city}
                                    onChange={e => setNewOffice({ ...newOffice, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Location type</label>
                                <select
                                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none text-gray-900 bg-white"
                                    value={newOffice.type}
                                    onChange={e => setNewOffice({ ...newOffice, type: e.target.value as any })}
                                >
                                    <option>Branch</option>
                                    <option>Head Office</option>
                                    <option>Booking Point</option>
                                </select>
                            </div>
                        </div>

                        {selectedStructure.physical && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Physical address</label>
                                <textarea
                                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none text-gray-900 placeholder-gray-400 h-20"
                                    placeholder="Street, terminal, landmark..."
                                    value={newOffice.address}
                                    onChange={e => setNewOffice({ ...newOffice, address: e.target.value })}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                {selectedStructure.physical ? "Contact telephone" : "Support / booking line"}
                            </label>
                            <input
                                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none text-gray-900 placeholder-gray-400"
                                placeholder="+91 9988776655"
                                value={newOffice.contact}
                                onChange={e => setNewOffice({ ...newOffice, contact: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button 
                            onClick={() => setView('select-type')} 
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-md transition"
                        >
                            Back
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition shadow-sm"
                        >
                            Save location
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default OfficeManager;
