"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface RedditNavShellProps {
    children: React.ReactNode;
    activeNav?: string;
    onQuickDispatch?: () => void;
}

export default function RedditNavShell({ children, activeNav, onQuickDispatch }: RedditNavShellProps) {
    const pathname = usePathname();
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [depotMenuOpen, setDepotMenuOpen] = useState(false);
    const [currentDepot, setCurrentDepot] = useState('Bangalore HQ (Karnataka)');

    // Grouped nav structure modeled after Reddit's mod tools sidebar
    const navSections = [
        {
            title: "OVERVIEW",
            items: [
                {
                    id: "insights",
                    label: "Corridor Insights",
                    href: "/",
                    active: pathname === "/" && (!activeNav || activeNav === "overview" || activeNav === "insights"),
                    badge: null,
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    )
                },
                {
                    id: "active-trips",
                    label: "Active Transit Log",
                    href: "/?tab=transit",
                    active: activeNav === "active-trips",
                    badge: "LIVE",
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                },
                {
                    id: "corridor-eval",
                    label: "Corridor Feasibility",
                    href: "/?tab=analyzer",
                    active: activeNav === "corridor-eval",
                    badge: null,
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                    )
                },
                {
                    id: "stations",
                    label: "Station Hubs",
                    href: "/management?tab=offices",
                    active: activeNav === "stations",
                    badge: "4 Hubs",
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    )
                }
            ]
        },
        {
            title: "DISPATCH & OPERATIONS",
            items: [
                {
                    id: "smart-dispatch",
                    label: "Smart Trip Assignment",
                    href: "/management?tab=dispatch",
                    active: activeNav === "smart-dispatch",
                    badge: "AI MATCH",
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    )
                },
                {
                    id: "fleet-readiness",
                    label: "Fleet Capacity",
                    href: "/?tab=fleet",
                    active: activeNav === "fleet-readiness",
                    badge: null,
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h8m-8 4h8m-8 4h4m6 4v-4a2 2 0 00-2-2H8a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2z" />
                        </svg>
                    )
                },
                {
                    id: "fleet-inventory",
                    label: "Fleet Management",
                    href: "/management?tab=fleet",
                    active: activeNav === "fleet-inventory",
                    badge: null,
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    )
                }
            ]
        },
        {
            title: "CREW & PERSONNEL",
            items: [
                {
                    id: "crew",
                    label: "Drivers & Helpers",
                    href: "/management?tab=crew",
                    active: activeNav === "crew",
                    badge: null,
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    )
                }
            ]
        },
        {
            title: "SETTINGS & CHANNELS",
            items: [
                {
                    id: "digital",
                    label: "OTA & Booking Channels",
                    href: "/management?tab=digital",
                    active: activeNav === "digital",
                    badge: "redBus",
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                    )
                },
                {
                    id: "company",
                    label: "Depot Settings",
                    href: "/management?tab=profile",
                    active: activeNav === "company",
                    badge: null,
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    )
                }
            ]
        }
    ];

    // Filter items based on sidebar search
    const filteredSections = navSections.map(section => ({
        ...section,
        items: section.items.filter(item =>
            item.label.toLowerCase().includes(sidebarSearch.toLowerCase())
        )
    })).filter(section => section.items.length > 0);

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#111827] flex flex-col font-sans antialiased">
            {/* 1. REDDIT-INSPIRED TOP GLOBAL BAR */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40 h-13 px-3 sm:px-5 flex items-center justify-between gap-3">
                {/* Brand + Mobile Menu Button */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100"
                        aria-label="Toggle navigation"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs group-hover:bg-emerald-700 transition">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M4 16c0 1.1.9 2 2 2h1v2c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-2h4v2c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-2h1c1.1 0 2-.9 2-2V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" />
                            </svg>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="font-bold text-base tracking-tight text-gray-900">MeFleet</span>
                            <span className="hidden sm:inline-block text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 font-mono">
                                DISPATCH
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Central Capsule Search Bar (Exact Reddit reference visual) */}
                <div className="flex-1 max-w-xl mx-2 hidden sm:block">
                    <div className="relative flex items-center w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Find routes, fleet vehicles, drivers, or hub telemetry..."
                            className="w-full pl-9 pr-24 py-1.5 bg-gray-50/80 hover:bg-gray-100/70 focus:bg-white text-xs text-gray-900 border border-gray-200 rounded-full focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        />
                        <div className="absolute right-1.5 inset-y-1.5 flex items-center">
                            <button
                                onClick={onQuickDispatch || (() => window.location.href = '/management?tab=dispatch')}
                                className="px-2.5 py-0.5 bg-white border border-gray-200 hover:border-gray-300 text-[11px] font-semibold text-gray-700 hover:text-emerald-700 rounded-full shadow-2xs transition cursor-pointer flex items-center gap-1"
                            >
                                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Dispatch</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Action Icons & Profile (Reddit style) */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Live Network Badge */}
                    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-gray-600 font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Corridor link: active</span>
                    </div>

                    {/* Quick Trip Pill Button */}
                    <button
                        onClick={onQuickDispatch || (() => window.location.href = '/management?tab=dispatch')}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>New assignment</span>
                    </button>

                    {/* Notification bell with count badge */}
                    <div className="relative">
                        <button className="p-1.5 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </button>
                        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center font-mono">
                            3
                        </span>
                    </div>

                    <div className="h-5 w-px bg-gray-200 hidden sm:block" />

                    {/* Profile avatar / Depot pill */}
                    <div className="flex items-center gap-2 pl-1 cursor-pointer">
                        <div className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                            AT
                        </div>
                        <div className="hidden xl:block text-left">
                            <span className="block text-xs font-semibold text-gray-900 leading-tight">Akshat Travels</span>
                            <span className="block text-[10px] text-gray-400 font-mono">Bangalore Hub</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. BODY SHELL: PERSISTENT SIDEBAR + WORKSPACE */}
            <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
                {/* Backdrop for mobile */}
                {mobileOpen && (
                    <div
                        className="fixed inset-0 bg-black/30 z-30 md:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                )}

                {/* LEFT SIDEBAR NAVIGATION (Reddit Mod Tools structure) */}
                <aside className={`
                    fixed md:sticky top-13 inset-y-0 left-0 z-30
                    w-64 bg-white border-r border-gray-200/90
                    flex flex-col h-[calc(100vh-52px)]
                    transition-transform duration-200 ease-in-out
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    {/* Top of Sidebar: Mode exit + Community/Tenant selector (Reddit style) */}
                    <div className="p-3 border-b border-gray-100 space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <Link
                                href={pathname === "/management" ? "/" : "/management"}
                                className="inline-flex items-center gap-1.5 hover:text-gray-900 transition font-medium"
                            >
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span>{pathname === "/management" ? "Exit management" : "Operations hub"}</span>
                            </Link>
                        </div>

                        {/* Tenant / Depot Switcher dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setDepotMenuOpen(!depotMenuOpen)}
                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-200/70 transition text-left"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                                        MF
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block text-xs font-bold text-gray-900 truncate">
                                            r/akshat-travels
                                        </span>
                                        <span className="block text-[10px] text-gray-400 font-mono truncate">
                                            {currentDepot}
                                        </span>
                                    </div>
                                </div>
                                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${depotMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {depotMenuOpen && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-xs divide-y divide-gray-50">
                                    {['Bangalore HQ (Karnataka)', 'Manipal Coastal Hub', 'Mangalore Port Terminal', 'Mysore Heritage Depot'].map((depot) => (
                                        <button
                                            key={depot}
                                            onClick={() => {
                                                setCurrentDepot(depot);
                                                setDepotMenuOpen(false);
                                            }}
                                            className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition flex items-center justify-between ${
                                                currentDepot === depot ? 'text-emerald-700 font-semibold bg-emerald-50/50' : 'text-gray-700'
                                            }`}
                                        >
                                            <span>{depot}</span>
                                            {currentDepot === depot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Search tools pill (Exact Reddit reference visual) */}
                        <div className="relative pt-1">
                            <input
                                type="text"
                                placeholder="Search tools..."
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-100/80 hover:bg-gray-100 focus:bg-white text-xs text-gray-900 border border-transparent focus:border-emerald-600 rounded-full focus:outline-none transition"
                            />
                            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Sidebar Nav Items */}
                    <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
                        {filteredSections.map((section, idx) => (
                            <div key={idx}>
                                <span className="block px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {section.title}
                                </span>
                                <nav className="space-y-0.5">
                                    {section.items.map((item) => {
                                        return (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                onClick={() => setMobileOpen(false)}
                                                className={`
                                                    group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition relative
                                                    ${item.active
                                                        ? 'bg-gray-100 text-gray-900 font-semibold'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                    }
                                                `}
                                            >
                                                {/* Left Accent Indicator Dot (Reddit style for active item) */}
                                                {item.active && (
                                                    <span className="absolute left-1 w-1.5 h-3.5 rounded-full bg-emerald-600" />
                                                )}

                                                <div className="flex items-center gap-2.5 pl-1">
                                                    <span className={`${item.active ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                                        {item.icon}
                                                    </span>
                                                    <span>{item.label}</span>
                                                </div>

                                                {item.badge && (
                                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                                                        item.badge === 'LIVE'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : item.badge === 'AI MATCH'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-200/70 text-gray-700'
                                                    }`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Metadata */}
                    <div className="p-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between font-mono">
                        <span>v2.4 Dispatch Core</span>
                        <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Online
                        </span>
                    </div>
                </aside>

                {/* 3. MAIN WORKSPACE */}
                <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 md:py-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

