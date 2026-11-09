"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RedditNavShell from '../../components/RedditNavShell';
import FleetManager from '../../components/FleetManager';
import OfficeManager from '../../components/OfficeManager';
import DigitalPresence from '../../components/DigitalPresence';
import DriverHelperManager from '../../components/DriverHelperManager';
import SmartTripAssignmentDashboard from '../../components/SmartTripAssignmentDashboard';
import TripAssignmentModal from '../../components/TripAssignmentModal';

export default function ManagementPageWrapper() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center font-mono text-xs text-gray-400">
                Loading operations console...
            </div>
        }>
            <ManagementPage />
        </Suspense>
    );
}

function ManagementPage() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'crew';

    const [activeTab, setActiveTab] = useState(initialTab);
    const [fleetCount, setFleetCount] = useState<number | null>(null);
    const [crewCount, setCrewCount] = useState<number | null>(null);
    const [quickDispatchOpen, setQuickDispatchOpen] = useState(false);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        fetchCounts();
    }, []);

    const fetchCounts = () => {
        fetch('http://localhost:8000/api/fleet/stats')
            .then(res => res.json())
            .then(data => setFleetCount(data.total))
            .catch(() => setFleetCount(null));

        fetch('http://localhost:8000/api/employees/stats')
            .then(res => res.json())
            .then(data => setCrewCount(data.total))
            .catch(() => setCrewCount(null));
    };

    const getActiveNavId = () => {
        switch (activeTab) {
            case 'crew': return 'crew';
            case 'dispatch': return 'smart-dispatch';
            case 'fleet': return 'fleet-inventory';
            case 'offices': return 'stations';
            case 'digital': return 'digital';
            case 'profile': return 'company';
            default: return 'crew';
        }
    };

    return (
        <RedditNavShell activeNav={getActiveNavId()} onQuickDispatch={() => setQuickDispatchOpen(true)}>
            {/* Header section (Reddit style) */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                            Operations Management
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Dispatch allocation, driver & helper operational tracking, and regional hub infrastructure.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs text-gray-400">
                        <span>Depot: Bangalore HQ</span>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold">CMP-001</span>
                    </div>
                </div>

                {/* Sub-navigation Underline Tabs (Exact Reddit style) */}
                <div className="border-b border-gray-200 flex space-x-6 sm:space-x-8 text-sm overflow-x-auto pb-px">
                    <button
                        onClick={() => setActiveTab('crew')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'crew'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <span>Drivers & helpers</span>
                        {crewCount !== null && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-gray-100 text-gray-700">
                                {crewCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('dispatch')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'dispatch'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <span>Smart trip assignment</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-blue-50 text-blue-700">
                            AI
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('fleet')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'fleet'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <span>Fleet inventory</span>
                        {fleetCount !== null && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-gray-100 text-gray-700">
                                {fleetCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('offices')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'offices'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <span>Station network</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-gray-100 text-gray-700">
                            4
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('digital')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'digital'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <span>OTA channels</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer ${
                            activeTab === 'profile'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Company profile
                    </button>
                </div>
            </div>

            {/* Main Content Pane */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs p-5 sm:p-6">
                {activeTab === 'crew' && <DriverHelperManager />}

                {activeTab === 'dispatch' && (
                    <SmartTripAssignmentDashboard onAssignmentSuccess={fetchCounts} />
                )}

                {activeTab === 'fleet' && <FleetManager />}

                {activeTab === 'offices' && <OfficeManager />}

                {activeTab === 'digital' && <DigitalPresence />}

                {activeTab === 'profile' && (
                    <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-mono font-bold text-sm text-emerald-800 mx-auto">
                            MF
                        </div>
                        <h3 className="font-bold text-sm text-gray-900">MeFleet Operations Tenant</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Company ID CMP-001 (Akshat Travels) with active multi-station dispatch isolation, verified rest logs, and authorized staff audit trails.
                        </p>
                        <div className="pt-2 flex justify-center gap-2 text-xs font-mono text-gray-400">
                            <span>Corridor sync: Online</span>
                            <span>·</span>
                            <span>GPS Telemetry: Active</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Dispatch Modal */}
            <TripAssignmentModal
                isOpen={quickDispatchOpen}
                onClose={() => {
                    setQuickDispatchOpen(false);
                    fetchCounts();
                }}
                routeDetails={{
                    source: "Bangalore",
                    destination: "Mysore",
                    date: new Date().toISOString().split('T')[0]
                }}
            />
        </RedditNavShell>
    );
}
