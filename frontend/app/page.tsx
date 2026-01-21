"use client";

import RouteAnalyzer from '../components/RouteAnalyzer';
import FleetGrid from '../components/FleetGrid';
import ActiveTrips from '../components/ActiveTrips';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">F</div>
            <span className="font-bold text-lg tracking-tight text-gray-900">Fleet<span className="text-indigo-600">Master</span> <span className="text-xs font-semibold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-1">AI</span></span>
          </div>
          <a href="/management" className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Akshat Travels</p>
              <p className="text-xs text-gray-400">Premium Fleet</p>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              AT
            </div>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time fleet intelligence and operations.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Route Analyzer (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <RouteAnalyzer />
          </div>

          {/* Right Column: Fleet Status & Active Trips (1/3 width) */}
          <div className="space-y-6">
            <FleetGrid />
            <ActiveTrips />

            {/* Quick Actions Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-5 text-white shadow-md">
              <h3 className="font-bold text-sm mb-3 opacity-90">Office Network</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white/10 p-2.5 rounded-lg">
                  <span className="text-xs font-medium">Bangalore HQ</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                </div>
                <div className="flex justify-between items-center bg-white/10 p-2.5 rounded-lg">
                  <span className="text-xs font-medium">Mangalore Branch</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                </div>
              </div>
              <a href="/management" className="block w-full text-center mt-4 py-2 bg-white text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors">
                Manage →
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

