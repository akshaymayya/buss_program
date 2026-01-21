"use client";

import React, { useState, useEffect } from 'react';
import FleetManager from '../../components/FleetManager';
import OfficeManager from '../../components/OfficeManager';
import DigitalPresence from '../../components/DigitalPresence';

const ManagementPage = () => {
    const [activeTab, setActiveTab] = useState('fleet');
    const [fleetCount, setFleetCount] = useState<number | null>(null);

    useEffect(() => {
        // Fetch fleet count for tab badge
        fetch('http://localhost:8000/api/fleet/stats')
            .then(res => res.json())
            .then(data => setFleetCount(data.total))
            .catch(() => setFleetCount(null));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <a href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-2 transition-colors">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </a>
                    <h1 className="text-3xl font-bold text-gray-900">Business Hub</h1>
                    <p className="text-gray-500 mt-1">Manage your fleet, offices, and digital presence.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                        Switch Account
                    </button>
                    <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                        AT
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
                <div className="border-b border-gray-100 flex overflow-x-auto">
                    <TabButton
                        label="My Fleet"
                        isActive={activeTab === 'fleet'}
                        onClick={() => setActiveTab('fleet')}
                        icon={<BusIcon />}
                        count={fleetCount}
                    />
                    <TabButton
                        label="Office Network"
                        isActive={activeTab === 'offices'}
                        onClick={() => setActiveTab('offices')}
                        icon={<BuildingIcon />}
                        count={2}
                    />
                    <TabButton
                        label="Digital Presence"
                        isActive={activeTab === 'digital'}
                        onClick={() => setActiveTab('digital')}
                        icon={<GlobeIcon />}
                    />
                    <TabButton
                        label="Company Profile"
                        isActive={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
                        icon={<UserIcon />}
                    />
                </div>

                <div className="p-6 md:p-8">
                    {activeTab === 'fleet' && <FleetManager />}

                    {activeTab === 'offices' && <OfficeManager />}

                    {activeTab === 'digital' && <DigitalPresence />}

                    {activeTab === 'profile' && (
                        <div className="text-center py-20">
                            <h3 className="text-xl font-semibold text-gray-800">Company Profile</h3>
                            <p className="text-gray-500 mt-2">Manage employee access and company details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ label, isActive, onClick, icon, count }: any) => (
    <button
        onClick={onClick}
        className={`px-6 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive
            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
    >
        {icon}
        {label}
        {count && <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>{count}</span>}
    </button>
);

// Icons (Simple SVG placeholders)
const BusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
const BuildingIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const GlobeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>;
const UserIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

export default ManagementPage;
