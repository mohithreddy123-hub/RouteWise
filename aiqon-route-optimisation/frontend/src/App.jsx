import React, { useState, useEffect, useRef } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom'
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
  MoonIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

import Dashboard from './Dashboard'
import ShipmentAnalysis from './ShipmentAnalysis'
import ShipmentsPage from './ShipmentsPage'
import InteractiveMapPage from './InteractiveMapPage'
import WeatherScenariosPage from './WeatherScenariosPage'
import ReportsPage from './ReportsPage'
import AssistantPage from './AssistantPage'
import NotFoundPage from './NotFoundPage'
import { getShipments, getPorts } from './api'

function LeftSidebar() {
  const location = useLocation()
  const p = location.pathname

  const navItems = [
    { label: 'Dashboard', path: '/', icon: Squares2X2Icon, active: p === '/' },
    { label: 'Shipments', path: '/shipments', icon: CubeIcon, active: p === '/shipments' },
    {
      label: 'Route Optimisation',
      path: '/optimisation',
      icon: ArrowsRightLeftIcon,
      active: p === '/optimisation' || (p.startsWith('/shipments/') && p !== '/shipments'),
    },
    { label: 'Interactive Map', path: '/map', icon: GlobeAltIcon, active: p === '/map' },
    { label: 'Weather Scenarios', path: '/weather', icon: CloudIcon, active: p === '/weather' },
    { label: 'Reports', path: '/reports', icon: DocumentChartBarIcon, active: p === '/reports' },
    {
      label: 'AI Assistant',
      path: '/assistant',
      icon: SparklesIcon,
      active: p === '/assistant',
      badge: 'New',
    },
  ]

  return (
    <aside className="w-56 xl:w-60 shrink-0 bg-[#0B1120] border-r border-slate-800/80 flex flex-col justify-between p-4 h-full select-none z-30">
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
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [allShipments, setAllShipments] = useState([])
  const [allPorts, setAllPorts] = useState([])

  // Notifications State
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Cyclone Remal Alert',
      desc: 'Severe weather advisory active across Bay of Bengal & Malacca Strait.',
      time: '12m ago',
      type: 'warning',
      unread: true,
    },
    {
      id: 2,
      title: 'Shipment AIQ-2026-003 Delayed',
      desc: 'Transshipment dwell at Singapore port exceeds threshold (delay risk: 31%).',
      time: '45m ago',
      type: 'delay',
      unread: true,
    },
    {
      id: 3,
      title: 'Planner Review Action',
      desc: 'Shipment AIQ-2026-001 has evaluated recommendations pending approval.',
      time: '2h ago',
      type: 'review',
      unread: true,
    },
  ])

  // Profile Popover State
  const [profileOpen, setProfileOpen] = useState(false)

  // Theme State
  const [themeDark, setThemeDark] = useState(true)

  // Load shipments & ports for global search
  useEffect(() => {
    async function loadSearchData() {
      try {
        const [shps, prts] = await Promise.all([
          getShipments().catch(() => []),
          getPorts().catch(() => []),
        ])
        setAllShipments(Array.isArray(shps) ? shps : shps?.shipments || [])
        setAllPorts(Array.isArray(prts) ? prts : [])
      } catch (e) {
        console.warn('Search data load error:', e)
      }
    }
    loadSearchData()
  }, [])

  // Filter search results
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) {
      setSearchResults([])
      return
    }

    const matchedShps = allShipments
      .filter(
        (s) =>
          (s.id || '').toLowerCase().includes(q) ||
          (s.reference_number || '').toLowerCase().includes(q) ||
          (s.origin_port_id || '').toLowerCase().includes(q) ||
          (s.destination_port_id || '').toLowerCase().includes(q) ||
          (s.cargo_type || '').toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((s) => ({
        type: 'shipment',
        title: `${s.reference_number || s.id}: ${s.origin_port_id} → ${s.destination_port_id}`,
        sub: `${s.cargo_type} · ${s.status || 'Under Review'}`,
        path: `/shipments/${s.id}`,
      }))

    const matchedPorts = allPorts
      .filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.id || '').toLowerCase().includes(q) ||
          (p.city || '').toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((p) => ({
        type: 'port',
        title: `${p.name} (${p.id})`,
        sub: `${p.city}, ${p.country}`,
        path: `/map`,
      }))

    setSearchResults([...matchedShps, ...matchedPorts])
  }, [searchTerm, allShipments, allPorts])

  const unreadCount = notifications.filter((n) => n.unread).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const handleDismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <header className="h-14 shrink-0 bg-[#0B1120] border-b border-slate-800/80 px-5 flex items-center justify-between relative z-40">
      {/* Global Search Input with Dynamic Live Dropdown */}
      <div className="relative w-80 max-w-md">
        <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          placeholder="Search shipments, ports, or routes..."
          className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Global Search Results Dropdown */}
        {searchFocused && searchTerm && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0B1120] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden py-1 z-50">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Search Results ({searchResults.length})
            </div>
            {searchResults.map((r, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  navigate(r.path)
                  setSearchFocused(false)
                  setSearchTerm('')
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/70 flex items-center justify-between transition border-t border-slate-800/50"
              >
                <div>
                  <div className="font-semibold text-slate-200">{r.title}</div>
                  <div className="text-[10px] text-slate-400">{r.sub}</div>
                </div>
                <ArrowRightIcon className="w-3 h-3 text-slate-500" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: Theme, Notifications, Planner Profile */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={() => setThemeDark(!themeDark)}
          title="Toggle Tactical Theme"
          className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
        >
          {themeDark ? <SunIcon className="w-4 h-4 text-amber-400" /> : <MoonIcon className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* Bell Notifications with Red Badge */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen)
              setProfileOpen(false)
            }}
            title="Operational Notifications"
            className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center relative transition"
          >
            <BellIcon className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0B1120]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#0B1120] border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="font-bold text-xs text-white flex items-center gap-1.5">
                  <span>Operational Alerts</span>
                  <span className="text-[10px] text-slate-400 font-normal">({notifications.length})</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">No active alerts</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 rounded-xl border text-xs transition relative ${
                        n.unread
                          ? 'bg-blue-950/20 border-blue-900/40 text-slate-200'
                          : 'bg-slate-900/40 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-white">{n.title}</span>
                        <button
                          onClick={() => handleDismissNotification(n.id)}
                          className="text-slate-500 hover:text-slate-300"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{n.desc}</p>
                      <div className="text-[9px] text-slate-500 font-mono mt-1">{n.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill: PL Planner */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen)
              setNotificationsOpen(false)
            }}
            className="flex items-center gap-2 pl-2 border-l border-slate-800 hover:opacity-80 transition"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow">
              PL
            </div>
            <span className="text-xs font-medium text-slate-200 hidden sm:inline">
              Planner
            </span>
            <ChevronDownIcon className="w-3 h-3 text-slate-500" />
          </button>

          {/* Profile Menu Popover */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#0B1120] border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 space-y-2 text-xs">
              <div className="border-b border-slate-800 pb-2">
                <div className="font-bold text-white text-xs">Alex Mercer</div>
                <div className="text-[10px] text-blue-400 font-medium">Lead Freight Planner</div>
                <div className="text-[10px] text-slate-400 mt-1">Operational Hub: Global Freight Dispatch</div>
              </div>

              <div className="space-y-1 text-slate-300">
                <Link
                  to="/reports"
                  onClick={() => setProfileOpen(false)}
                  className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800/60 block text-[11px]"
                >
                  📊 Compliance & Performance Audits
                </Link>
                <Link
                  to="/assistant"
                  onClick={() => setProfileOpen(false)}
                  className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800/60 block text-[11px]"
                >
                  ⚡ GenAI Logistics Copilot
                </Link>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <button
                  onClick={() => {
                    localStorage.clear()
                    window.location.reload()
                  }}
                  className="w-full text-left text-[11px] text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-950/20"
                >
                  🔄 Reset Session & Reload Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
        {/* Left Navigation Sidebar */}
        <LeftSidebar />

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Header Bar */}
          <TopHeader />

          {/* Active Route Workspace */}
          <main className="flex-1 flex overflow-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/shipments" element={<ShipmentsPage />} />
              <Route path="/shipments/:id" element={<ShipmentAnalysis />} />
              <Route path="/optimisation" element={<ShipmentAnalysis />} />
              <Route path="/map" element={<InteractiveMapPage />} />
              <Route path="/weather" element={<WeatherScenariosPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
