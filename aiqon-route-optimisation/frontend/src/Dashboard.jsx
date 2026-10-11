import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { getShipments, getShipmentStats } from './api'
import { formatCurrency, formatDays, getRiskBadgeClass, getRiskColorHex } from './utils'

export default function Dashboard() {
  const [shipments, setShipments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const [shipmentList, statsData] = await Promise.all([
          getShipments(),
          getShipmentStats(),
        ])
        setShipments(shipmentList)
        setStats(statsData)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        setError('Unable to connect to the backend server. Make sure the API server is running on port 8000.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.origin_port_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.destination_port_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.cargo_type?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'ALL' ||
      s.recommendation_status?.toUpperCase() === statusFilter.toUpperCase()

    const matchesPriority =
      priorityFilter === 'ALL' ||
      s.priority?.toUpperCase() === priorityFilter.toUpperCase()

    return matchesSearch && matchesStatus && matchesPriority
  })

  // Prepare chart data
  const riskData = [
    { name: 'Low Risk', value: 0, color: '#10b981' },
    { name: 'Moderate Risk', value: 0, color: '#f59e0b' },
    { name: 'High Risk', value: 0, color: '#ef4444' },
  ]

  shipments.forEach((s) => {
    (s.routes || []).forEach((r) => {
      const risk = (r.overall_risk_label || 'Low').toLowerCase()
      if (risk.includes('high')) riskData[2].value += 1
      else if (risk.includes('mod') || risk.includes('med')) riskData[1].value += 1
      else riskData[0].value += 1
    })
  })

  const cargoBreakdown = shipments.reduce((acc, s) => {
    const cargo = s.cargo_type || 'General'
    acc[cargo] = (acc[cargo] || 0) + 1
    return acc
  }, {})

  const cargoChartData = Object.entries(cargoBreakdown).map(([name, count]) => ({
    name: name.length > 12 ? name.substring(0, 10) + '...' : name,
    shipments: count,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Disclaimer / Provenance Banner */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/10">
        <div className="flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="text-amber-400 font-semibold text-sm">
              Demonstration Environment · Synthetic Logistics Dataset
            </div>
            <div className="text-slate-400 text-xs mt-0.5">
              Shipment schedules, port congestion, weather conditions, and risk indexes are synthetic samples designed to validate multi-factor route scoring and planner decision workflows.
            </div>
          </div>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono whitespace-nowrap border border-slate-700">
          FastAPI + SQLite Engine
        </span>
      </div>

      {/* Top Header & Refresh */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Logistics Planner Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time shipment inventory, AI-assisted route recommendations, and risk surveillance.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-950/50 border border-rose-600/40 text-rose-200 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="text-xs bg-rose-800 hover:bg-rose-700 text-white px-3 py-1 rounded transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Active Shipments
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? '—' : stats?.total_shipments ?? shipments.length}
          </div>
          <div className="mt-1 text-xs text-blue-400">
            {stats?.routes_count ?? '68'} evaluated route paths
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Pending Planner Review
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {loading ? '—' : stats?.pending_count ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Awaiting decision confirmation
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Approved Recommendations
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {loading ? '—' : stats?.approved_count ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Validated by logistics planner
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Weather Disruptions
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {loading ? '—' : stats?.high_risk_count ?? 0}
          </div>
          <div className="mt-1 text-xs text-rose-300/80">
            Active high-risk storm corridors
          </div>
        </div>
      </div>

      {/* Analytics Row: Risk Distribution & Cargo Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Distribution Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">
            Global Route Risk Profile
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Distribution across delay, weather, and congestion factors
          </p>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-around text-xs mt-2 pt-2 border-t border-slate-800">
            {riskData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-slate-300 font-medium">{d.value}</span>
                <span className="text-slate-500">{d.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cargo Type Breakdown Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">
            Cargo Distribution Overview
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Shipment volume segmented by commodities
          </p>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cargoChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="shipments" fill="#026fc7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Shipment Inventory Table & Search Filter */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Table Filters Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/40">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by ID, port, or cargo type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="RECOMMENDED">Recommended</option>
              <option value="APPROVED">Approved</option>
              <option value="OVERRIDDEN">Overridden</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="STANDARD">Standard</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Shipment ID</th>
                <th className="px-4 py-3.5">Corridor (Origin → Dest)</th>
                <th className="px-4 py-3.5">Cargo Details</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Routes</th>
                <th className="px-4 py-3.5">Review Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                    <div>Loading shipments...</div>
                  </td>
                </tr>
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                    No shipments match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => {
                  const routesCount = (s.routes || []).length
                  const isHighPriority = s.priority?.toLowerCase() === 'high'

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-blue-400 whitespace-nowrap">
                        {s.id}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <span>{s.origin_port_id}</span>
                          <span className="text-slate-500">→</span>
                          <span>{s.destination_port_id}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Required by: {s.target_delivery_days ? `${s.target_delivery_days}d` : 'Standard'}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-slate-200">{s.cargo_type || 'General Cargo'}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {s.weight_tons ? `${s.weight_tons} tons` : '—'}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isHighPriority
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {s.priority || 'Standard'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-400">
                        {routesCount} {routesCount === 1 ? 'option' : 'options'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            s.recommendation_status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : s.recommendation_status === 'OVERRIDDEN'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {s.recommendation_status || 'PENDING'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Link
                          to={`/shipments/${s.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-medium transition-all"
                        >
                          <span>Analyze Routes</span>
                          <span className="text-xs">→</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 px-4">
          <div>
            Showing <span className="font-semibold text-slate-300">{filteredShipments.length}</span> of{' '}
            <span className="font-semibold text-slate-300">{shipments.length}</span> shipments
          </div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </div>
  )
}
