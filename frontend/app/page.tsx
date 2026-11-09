"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RedditNavShell from '../components/RedditNavShell';
import RouteAnalyzer from '../components/RouteAnalyzer';
import FleetGrid from '../components/FleetGrid';
import ActiveTrips from '../components/ActiveTrips';
import TripAssignmentModal from '../components/TripAssignmentModal';

export default function Home() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center font-mono text-xs text-gray-400">
                Loading MeFleet dispatch console...
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'overview';

    const [activeTab, setActiveTab] = useState<'overview' | 'analyzer' | 'transit' | 'fleet'>(
        initialTab === 'transit' ? 'transit' :
        initialTab === 'analyzer' ? 'analyzer' :
        initialTab === 'fleet' ? 'fleet' : 'overview'
    );

    const [timeRange, setTimeRange] = useState('Today');
    const [quickDispatchOpen, setQuickDispatchOpen] = useState(false);

    // Live Metrics State
    const [fleetStats, setFleetStats] = useState<any>(null);
    const [activeTrips, setActiveTrips] = useState<any[]>([]);
    const [crewStats, setCrewStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'transit') setActiveTab('transit');
        else if (tab === 'analyzer') setActiveTab('analyzer');
        else if (tab === 'fleet') setActiveTab('fleet');
        else if (tab === 'overview') setActiveTab('overview');
    }, [searchParams]);

    useEffect(() => {
        fetchOverviewData();
    }, []);

    const fetchOverviewData = async () => {
        setLoadingStats(true);
        try {
            const [fStatsRes, tripsRes, cStatsRes] = await Promise.all([
                fetch('http://localhost:8000/api/fleet/stats'),
                fetch('http://localhost:8000/api/trips/active'),
                fetch('http://localhost:8000/api/employees/stats')
            ]);

            if (fStatsRes.ok) setFleetStats(await fStatsRes.json());
            if (tripsRes.ok) setActiveTrips(await tripsRes.json());
            if (cStatsRes.ok) setCrewStats(await cStatsRes.json());
        } catch (e) {
            console.error("Failed to load dashboard overview telemetry", e);
        } finally {
            setLoadingStats(false);
        }
    };

    const getNavId = () => {
        switch (activeTab) {
            case 'transit': return 'active-trips';
            case 'analyzer': return 'corridor-eval';
            case 'fleet': return 'fleet-readiness';
            default: return 'insights';
        }
    };

    return (
        <RedditNavShell activeNav={getNavId()} onQuickDispatch={() => setQuickDispatchOpen(true)}>
            {/* 1. PAGE HEADER (Directly modeled after Reddit "Insights" page) */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                            Corridor Insights
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Regional highway corridor demand, transit telemetry, and fleet operations overview.
                        </p>
                    </div>

                    {/* Time Range Filter Pill (Reddit style) */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="relative inline-block text-left">
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="appearance-none bg-white border border-gray-200 hover:border-gray-300 text-xs font-semibold text-gray-700 py-1.5 pl-3 pr-8 rounded-full shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                            >
                                <option value="Today">Today (Live)</option>
                                <option value="Last 7 Days">Last 7 Days</option>
                                <option value="This Month">This Month</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-navigation Underline Tabs (Exact Reddit style from reference) */}
                <div className="border-b border-gray-200 flex space-x-6 sm:space-x-8 text-sm">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer ${
                            activeTab === 'overview'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Activity Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('analyzer')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer ${
                            activeTab === 'analyzer'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Corridor Evaluator
                    </button>
                    <button
                        onClick={() => setActiveTab('transit')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'transit'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <span>Active Transit</span>
                        {activeTrips.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                                {activeTrips.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('fleet')}
                        className={`pb-3 font-semibold transition relative whitespace-nowrap cursor-pointer ${
                            activeTab === 'fleet'
                                ? 'text-gray-900 border-b-2 border-emerald-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Fleet Capacity
                    </button>
                </div>
            </div>

            {/* 2. TAB 1: ACTIVITY OVERVIEW (Reddit-style Minimalist Hierarchy) */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-900">Overview</h2>
                        <span className="text-xs font-mono text-gray-400">
                            Telemetry sync: real-time
                        </span>
                    </div>

                    {/* REDDIT 3-COLUMN METRICS STRIP WITH VERTICAL DIVIDERS */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-150 gap-6 md:gap-0">
                            {/* Metric 1: Transit & Fleet */}
                            <div className="md:px-6 first:pl-0 space-y-2">
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h8m-8 4h8m-8 4h4m6 4v-4a2 2 0 00-2-2H8a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tracking-tight">
                                        {activeTrips.length}{" "}
                                        <span className="text-base font-normal text-gray-600 font-sans">
                                            {activeTrips.length === 1 ? 'vehicle' : 'vehicles'}
                                        </span>
                                    </div>
                                    <div className="text-xs font-semibold text-emerald-800 mt-0.5">
                                        in active transit
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Fleet vehicles currently navigating dispatched corridors. Need to inspect?{" "}
                                    <button
                                        onClick={() => setActiveTab('transit')}
                                        className="text-emerald-700 font-medium hover:underline cursor-pointer"
                                    >
                                        View transit log
                                    </button>
                                </p>
                            </div>

                            {/* Metric 2: Crew Operational Status */}
                            <div className="pt-6 md:pt-0 md:px-6 space-y-2">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tracking-tight">
                                        {crewStats?.available ?? 7}{" "}
                                        <span className="text-base font-normal text-gray-600 font-sans">
                                            crew members
                                        </span>
                                    </div>
                                    <div className="text-xs font-semibold text-blue-800 mt-0.5">
                                        rested & available
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Drivers and helpers physically present at starting hubs with verified rest cooldowns.{" "}
                                    <a
                                        href="/management?tab=crew"
                                        className="text-blue-700 font-medium hover:underline"
                                    >
                                        Manage roster
                                    </a>
                                </p>
                            </div>

                            {/* Metric 3: Profitability & Highway Margins */}
                            <div className="pt-6 md:pt-0 md:px-6 last:pr-0 space-y-2">
                                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tracking-tight">
                                        ₹14,250{" "}
                                        <span className="text-base font-normal text-gray-600 font-sans">
                                            avg margin
                                        </span>
                                    </div>
                                    <div className="text-xs font-semibold text-purple-800 mt-0.5">
                                        per single-way run
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Projected net return per corridor run after highway tolls and diesel consumption.{" "}
                                    <button
                                        onClick={() => setActiveTab('analyzer')}
                                        className="text-purple-700 font-medium hover:underline cursor-pointer"
                                    >
                                        Calculate route
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* REDDIT "TEAM ACTIVITY" STYLE TABLE CONTAINER */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Fleet activity and transit status
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Real-time progress breakdown across deployed vehicles and corridor routes.
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveTab('transit')}
                                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 self-start sm:self-auto"
                            >
                                View all active logs →
                            </button>
                        </div>

                        {/* Table matching Reddit's structure */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 font-medium">
                                        <th className="py-2.5 px-3 w-10">#</th>
                                        <th className="py-2.5 px-3">Vehicle & Corridor</th>
                                        <th className="py-2.5 px-3 w-32 font-mono">Assigned / Seats</th>
                                        <th className="py-2.5 px-3 min-w-[240px]">
                                            Breakdown by operational phase
                                        </th>
                                        <th className="py-2.5 px-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {activeTrips.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-400">
                                                No active transit trips currently on route.{" "}
                                                <button
                                                    onClick={() => setQuickDispatchOpen(true)}
                                                    className="text-emerald-600 font-semibold hover:underline cursor-pointer ml-1"
                                                >
                                                    Assign a trip now
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        activeTrips.map((trip, idx) => (
                                            <tr key={trip.id} className="hover:bg-gray-50/60 transition group">
                                                {/* Rank # */}
                                                <td className="py-3.5 px-3 font-semibold text-gray-500 font-mono">
                                                    {idx + 1}
                                                </td>

                                                {/* Vehicle & Route */}
                                                <td className="py-3.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-gray-900">
                                                            {trip.bus_plate || trip.bus_id}
                                                        </span>
                                                        <span className="text-gray-400">·</span>
                                                        <span className="font-medium text-gray-700">
                                                            {trip.route_source} → {trip.route_destination}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                        Driver: {trip.driver_name || trip.driver_id} · Departs {trip.departure_time}
                                                    </div>
                                                </td>

                                                {/* Seats / Capacity */}
                                                <td className="py-3.5 px-3 font-mono tabular-nums text-gray-600">
                                                    {trip.bus_type || 'Express'} (40 seats)
                                                </td>

                                                {/* Segmented Status Progress Bar (Exact visual feature from Reddit screenshot) */}
                                                <td className="py-3.5 px-3">
                                                    <div className="space-y-1">
                                                        <div className="h-3 w-full bg-gray-100 rounded-sm overflow-hidden flex">
                                                            {/* Origin Boarding (Indigo) */}
                                                            <div
                                                                className="h-full bg-indigo-600 transition-all"
                                                                style={{ width: trip.status === 'Scheduled' ? '40%' : '15%' }}
                                                                title="Origin boarding"
                                                            />
                                                            {/* Highway Cruising (Emerald) */}
                                                            <div
                                                                className="h-full bg-emerald-500 transition-all"
                                                                style={{ width: trip.status === 'En Route' ? '55%' : '10%' }}
                                                                title="Highway cruising"
                                                            />
                                                            {/* Terminal Deboarding (Slate) */}
                                                            <div
                                                                className="h-full bg-slate-500 transition-all"
                                                                style={{ width: '15%' }}
                                                                title="Terminal deboarding"
                                                            />
                                                            {/* Rest Buffer (Amber) */}
                                                            <div
                                                                className="h-full bg-amber-400 transition-all"
                                                                style={{ width: '15%' }}
                                                                title="Rest cooldown buffer"
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                                                            <span>Depot: {trip.route_source}</span>
                                                            <span className="text-emerald-700 font-semibold">{trip.status}</span>
                                                            <span>Terminal: {trip.route_destination}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Action */}
                                                <td className="py-3.5 px-3 text-right">
                                                    <button
                                                        onClick={() => setActiveTab('transit')}
                                                        className="text-xs px-2.5 py-1 text-gray-700 hover:text-emerald-700 font-medium hover:bg-gray-100 rounded transition cursor-pointer"
                                                    >
                                                        Details →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Regional Network Quick Links */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900">Station Hubs</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            </div>
                            <p className="text-xs text-gray-500">
                                4 operational hubs in Bangalore, Manipal, Mangalore, and Mysore.
                            </p>
                            <a
                                href="/management?tab=offices"
                                className="text-xs font-semibold text-emerald-700 hover:underline block pt-1"
                            >
                                Station details →
                            </a>
                        </div>

                        <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900">Smart Crew Matching</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 font-semibold">
                                    Dynamic
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">
                                Assign verified drivers & helpers based on verified rest and origin location.
                            </p>
                            <a
                                href="/management?tab=dispatch"
                                className="text-xs font-semibold text-emerald-700 hover:underline block pt-1"
                            >
                                Open dispatch board →
                            </a>
                        </div>

                        <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900">OTA & Booking Sync</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 font-semibold">
                                    Live
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">
                                Real-time seat inventory distribution synced with redBus network.
                            </p>
                            <a
                                href="/management?tab=digital"
                                className="text-xs font-semibold text-emerald-700 hover:underline block pt-1"
                            >
                                Channel settings →
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. TAB 2: CORRIDOR EVALUATOR (Progressive Disclosure) */}
            {activeTab === 'analyzer' && (
                <div className="space-y-4">
                    <RouteAnalyzer />
                </div>
            )}

            {/* 4. TAB 3: ACTIVE TRANSIT (Progressive Disclosure) */}
            {activeTab === 'transit' && (
                <div className="space-y-4">
                    <ActiveTrips />
                </div>
            )}

            {/* 5. TAB 4: FLEET CAPACITY (Progressive Disclosure) */}
            {activeTab === 'fleet' && (
                <div className="space-y-4">
                    <FleetGrid />
                </div>
            )}

            {/* Quick Dispatch Modal */}
            <TripAssignmentModal
                isOpen={quickDispatchOpen}
                onClose={() => {
                    setQuickDispatchOpen(false);
                    fetchOverviewData();
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
