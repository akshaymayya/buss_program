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
        <div className="space-y-6 animate-fade-in-up min-h-[400px]">

            {/* LIST VIEW */}
            {view === 'list' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Office Network ({offices.length})</h3>
                        <button
                            onClick={handleStartAdd}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
                        >
                            + Add New Office
                        </button>
                    </div>

                    {offices.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                            <p className="text-gray-500">No offices found. Add your first branch!</p>
                            <button onClick={handleStartAdd} className="mt-4 text-indigo-600 font-bold hover:underline">Add Now</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {offices.map(office => (
                                <div key={office.id} className="p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition relative group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-900">{office.city}</h4>
                                                {office.isOnline && <span className="w-2 h-2 bg-green-500 rounded-full" title="Online Active"></span>}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">{office.isPhysical ? office.address : <span className="italic text-gray-400">Online Only Point</span>}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full ${office.type === 'Head Office' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {office.type}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
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
                <div className="max-w-2xl mx-auto py-8">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-800">What kind of office is this?</h3>
                        <p className="text-gray-500 mt-2">Select all that apply to this new location.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Physical Card */}
                        <div
                            onClick={() => setSelectedStructure({ ...selectedStructure, physical: !selectedStructure.physical })}
                            className={`cursor-pointer p-6 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-4 ${selectedStructure.physical ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${selectedStructure.physical ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                🏢
                            </div>
                            <div>
                                <h4 className={`font-bold ${selectedStructure.physical ? 'text-indigo-900' : 'text-gray-700'}`}>Physical Office</h4>
                                <p className="text-sm text-gray-500 mt-1">A real location where passengers can visit, book tickets, and board buses.</p>
                            </div>
                            <input type="checkbox" checked={selectedStructure.physical} readOnly className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                        </div>

                        {/* Online Card */}
                        <div
                            onClick={() => setSelectedStructure({ ...selectedStructure, online: !selectedStructure.online })}
                            className={`cursor-pointer p-6 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-4 ${selectedStructure.online ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-200'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${selectedStructure.online ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                🌐
                            </div>
                            <div>
                                <h4 className={`font-bold ${selectedStructure.online ? 'text-green-900' : 'text-gray-700'}`}>Online Booking Point</h4>
                                <p className="text-sm text-gray-500 mt-1">Accepts online bookings and appears on your website/app for this city.</p>
                            </div>
                            <input type="checkbox" checked={selectedStructure.online} readOnly className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                        </div>
                    </div>

                    <div className="flex justify-center gap-3">
                        <button onClick={() => setView('list')} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button
                            onClick={handleTypeSelection}
                            className={`px-8 py-2 rounded-lg font-bold text-white transition-all shadow-lg ${(selectedStructure.physical || selectedStructure.online) ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'
                                }`}
                        >
                            Continue &rarr;
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: DETAILS FORM */}
            {view === 'form' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Enter Office Details</h3>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Mumbai"
                                    value={newOffice.city}
                                    onChange={e => setNewOffice({ ...newOffice, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Office Type</label>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none"
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
                            <div className="animate-fade-in">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                                <textarea
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                                    placeholder="Full street address, landmark..."
                                    value={newOffice.address}
                                    onChange={e => setNewOffice({ ...newOffice, address: e.target.value })}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {selectedStructure.physical ? "Contact Number" : "Support/Booking Number"}
                            </label>
                            <input
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="+91..."
                                value={newOffice.contact}
                                onChange={e => setNewOffice({ ...newOffice, contact: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button onClick={() => setView('select-type')} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg">Back</button>
                        <button onClick={handleSave} className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md">
                            Save Office
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default OfficeManager;
