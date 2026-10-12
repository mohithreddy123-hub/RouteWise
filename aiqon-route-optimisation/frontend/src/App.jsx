import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import {
  Squares2X2Icon,
  CubeIcon,
  ArrowsRightLeftIcon,
  GlobeAltIcon,
  CloudIcon,
  DocumentChartBarIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  BellIcon,
  SunIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import Dashboard from './Dashboard'
import ShipmentAnalysis from './ShipmentAnalysis'

function LeftSidebar() {
  const location = useLocation()
  const isDashboard = location.pathname === '/'

  const navItems = [
    { label: 'Dashboard', path: '/', icon: Squares2X2Icon, active: isDashboard },
    { label: 'Shipments', path: '/shipments/SHP-001', icon: CubeIcon, active: false },
    { label: 'Route Optimisation', path: '/shipments/SHP-001', icon: ArrowsRightLeftIcon, active: false },
    { label: 'Interactive Map', path: '/', icon: GlobeAltIcon, active: false },
    { label: 'Weather Scenarios', path: '/shipments/SHP-001', icon: CloudIcon, active: false },
    { label: 'Reports', path: '/', icon: DocumentChartBarIcon, active: false },
    {
      label: 'AI Assistant',
      path: '/',
      icon: SparklesIcon,
      active: false,
      badge: 'New',
    },
  ]

  return (
    <aside className="w-56 xl:w-60 shrink-0 bg-[#0B1120] border-r border-slate-800/80 flex flex-col justify-between p-4 h-full select-none">
      {/* RouteWise Branding matching reference image */}
      <div>
        <Link to="/" className="flex items-center gap-3 mb-6 px-1 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-base group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-white text-base leading-tight tracking-tight flex items-center gap-1">
              RouteWise
            </div>
            <div className="text-[10px] text-slate-400 tracking-wide">
              Global Freight Intelligence
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  item.active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${item.active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Promo Card matching reference image */}
      <div className="mt-auto bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-3.5 relative overflow-hidden shadow-lg">
        {/* Glowing Holographic Globe */}
        <div className="w-full h-20 rounded-xl bg-gradient-to-tr from-blue-900/40 via-cyan-900/20 to-blue-600/20 flex items-center justify-center relative overflow-hidden mb-2.5 border border-blue-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent animate-pulse" />
          <svg
            className="w-12 h-12 text-cyan-400/80 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            <path d="M2 12h20" />
          </svg>
        </div>

        <div className="text-xs font-semibold text-white tracking-tight">
          AI-Powered
          <br />
          Global Logistics
        </div>
        <div className="text-[10px] text-slate-400 mt-1 leading-snug space-y-0.5">
          <div>Smarter routes.</div>
          <div>Safer shipments.</div>
          <div>More resilient supply chains.</div>
        </div>
      </div>
    </aside>
  )
}

function TopHeader() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <header className="h-14 shrink-0 bg-[#0B1120] border-b border-slate-800/80 px-5 flex items-center justify-between">
      {/* Search Input matching reference image */}
      <div className="relative w-80 max-w-md">
        <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search shipments, ports, or routes..."
          className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
        />
      </div>

      {/* Right Controls matching reference image */}
      <div className="flex items-center gap-3">
        {/* Sun/Moon Theme Button */}
        <button
          title="Toggle Light/Dark"
          className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
        >
          <SunIcon className="w-4 h-4" />
        </button>

        {/* Bell Notifications with Red Badge '3' */}
        <button
          title="Notifications"
          className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center relative transition"
        >
          <BellIcon className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0B1120]">
            3
          </span>
        </button>

        {/* User Profile Pill: PL Planner */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow">
            PL
          </div>
          <span className="text-xs font-medium text-slate-200 hidden sm:inline">
            Planner
          </span>
          <ChevronDownIcon className="w-3 h-3 text-slate-500" />
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
        {/* Left-side Navigation Sidebar */}
        <LeftSidebar />

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Header Bar */}
          <TopHeader />

          {/* Active View Route */}
          <main className="flex-1 flex overflow-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/shipments/:id" element={<ShipmentAnalysis />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
