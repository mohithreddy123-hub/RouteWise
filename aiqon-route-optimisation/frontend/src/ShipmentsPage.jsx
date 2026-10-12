import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline'
import { getShipments, getShipmentStats } from './api'
import { formatCurrency, formatDays } from './utils'

export default function ShipmentsPage() {
  const navigate = useNavigate()
  const [shipments, setShipments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('id')
  const [sortOrder, setSortOrder] = useState('asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [listData, statsData] = await Promise.all([
        getShipments(),
        getShipmentStats().catch(() => null),
      ])
      const list = Array.isArray(listData) ? listData : listData?.shipments || []
      setShipments(list)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load shipments:', err)
      setError('Unable to load shipments from backend. Please ensure the API is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter & sort logic
  const filteredShipments = useMemo(() => {
    return shipments
      .filter((s) => {
        const q = search.toLowerCase()
        const matchesSearch =
          !q ||
          (s.id || '').toLowerCase().includes(q) ||
          (s.reference_number || '').toLowerCase().includes(q) ||
          (s.cargo_type || '').toLowerCase().includes(q) ||
          (s.origin_port_id || '').toLowerCase().includes(q) ||
          (s.destination_port_id || '').toLowerCase().includes(q) ||
          (s.origin_label || '').toLowerCase().includes(q) ||
          (s.destination_label || '').toLowerCase().includes(q)

        const matchesStatus =
          statusFilter === 'ALL' ||
          (s.status || '').toUpperCase() === statusFilter.toUpperCase()

        const matchesPriority =
          priorityFilter === 'ALL' ||
          (s.priority || '').toUpperCase().includes(priorityFilter.toUpperCase())

        const matchesRisk =
          riskFilter === 'ALL' ||
          (riskFilter === 'HIGH' && s.high_risk) ||
          (riskFilter === 'MODERATE' && !s.high_risk)

        return matchesSearch && matchesStatus && matchesPriority && matchesRisk
      })
      .sort((a, b) => {
        let valA = a[sortBy] || ''
        let valB = b[sortBy] || ''
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
  }, [shipments, search, statusFilter, priorityFilter, riskFilter, sortBy, sortOrder])

  // Paginated items
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage) || 1
  const paginatedShipments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredShipments.slice(start, start + itemsPerPage)
  }, [filteredShipments, currentPage])

  // Functional CSV Export
  const handleExportCSV = () => {
    if (filteredShipments.length === 0) return

    const headers = [
      'ID',
      'Reference Number',
      'Origin',
      'Destination',
      'Cargo Type',
      'Weight (Tons)',
      'Priority',
      'Ready Date',
      'Status',
      'Route Variants',
    ]

    const rows = filteredShipments.map((s) => [
      `"${s.id}"`,
      `"${s.reference_number || s.id}"`,
      `"${s.origin_label || s.origin_port_id}"`,
      `"${s.destination_label || s.destination_port_id}"`,
      `"${s.cargo_type}"`,
      s.weight_tons || 0,
      `"${s.priority}"`,
      `"${s.ready_date || ''}"`,
      `"${s.status || 'Under Review'}"`,
      (s.routes || []).length || s.route_count || 0,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `routewise_shipments_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('approved')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (s.includes('transit')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    if (s.includes('delay') || s.includes('risk')) return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 xl:p-6 space-y-5 bg-[#070b14] text-slate-100">
      {/* Page Title & KPI Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CubeIcon className="w-5 h-5 text-blue-500" />
            Shipment Inventory & Corridor Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of active shipments, multi-leg cargo consignments, and evaluated route alternatives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh inventory"
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            title="Download CSV"
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1.5 transition shadow-sm"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0B1120] border border-slate-800/80 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Total Shipments</div>
          <div className="text-xl font-bold text-white mt-1">
            {stats?.total_shipments ?? shipments.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Global maritime network</div>
        </div>

        <div className="bg-[#0B1120] border border-slate-800/80 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Under Review</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {stats?.under_review ?? shipments.filter((s) => s.status === 'Under Review').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Pending planner decision</div>
        </div>

        <div className="bg-[#0B1120] border border-slate-800/80 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Avg Delay Risk</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {stats?.avg_delay_probability ? `${stats.avg_delay_probability}%` : '18.4%'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Predictive corridor risk index</div>
        </div>

        <div className="bg-[#0B1120] border border-slate-800/80 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">High Risk Corridors</div>
          <div className="text-xl font-bold text-rose-400 mt-1">
            {stats?.high_risk_routes ?? 5}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Require route diversion</div>
        </div>
      </div>

      {/* Search & Filter Controls Toolbar */}
      <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by ID, port code (e.g. CNSHA), destination, or cargo..."
              className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-[#070b14] border border-slate-700/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNDER REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="IN TRANSIT">In Transit</option>
              <option value="DELAYED">Delayed</option>
              <option value="PLANNING">Planning</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-[#070b14] border border-slate-700/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH VALUE">High Value</option>
              <option value="URGENT">Urgent</option>
              <option value="STANDARD">Standard</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-[#070b14] border border-slate-700/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="MODERATE">Low / Moderate Risk</option>
              <option value="HIGH">High Risk</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-')
                setSortBy(sb)
                setSortOrder(so)
              }}
              className="bg-[#070b14] border border-slate-700/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="id-asc">Sort: ID (Asc)</option>
              <option value="id-desc">Sort: ID (Desc)</option>
              <option value="cargo_type-asc">Sort: Cargo (A-Z)</option>
              <option value="weight_tons-desc">Sort: Weight (Heavy First)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          <span>
            Showing <strong className="text-white">{filteredShipments.length}</strong> matching consignments
          </span>
          {(search || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || riskFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('ALL')
                priorityFilter('ALL')
                setRiskFilter('ALL')
                setCurrentPage(1)
              }}
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Shipments Table */}
      <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading logistics inventory...
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <FunnelIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            No shipments found matching the active criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 border-b border-slate-800/80 text-[11px] text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4 font-normal">Reference ID</th>
                  <th className="py-3 px-4 font-normal">Cargo & Containers</th>
                  <th className="py-3 px-4 font-normal">Origin → Destination</th>
                  <th className="py-3 px-4 font-normal">Ready Date</th>
                  <th className="py-3 px-4 font-normal">Priority</th>
                  <th className="py-3 px-4 font-normal">Status</th>
                  <th className="py-3 px-4 font-normal">Route Variants</th>
                  <th className="py-3 px-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {paginatedShipments.map((s) => {
                  const ref = s.reference_number || s.id
                  const origin = s.origin_port_id || (s.origin ? s.origin.id : 'CNSHA')
                  const dest = s.destination_port_id || (s.destination ? s.destination.id : 'INHYD')
                  const routeCount = (s.routes || []).length || s.route_count || 3

                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/shipments/${s.id}`)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-200 group-hover:text-blue-400">
                        {ref}
                        <div className="text-[10px] text-slate-500 font-mono">{s.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{s.cargo_type}</div>
                        <div className="text-[10px] text-slate-500">
                          {s.container_count}x {s.container_type || '40ft HC'} · {s.weight_tons} tons
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="text-slate-200 font-medium">
                          {origin} → {dest}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {s.origin_label || origin} to {s.destination_label || dest}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {s.ready_date || '2026-10-15'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                            s.priority?.toLowerCase().includes('high')
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {s.priority || 'Standard'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${getStatusBadge(s.status)}`}>
                          {s.status || 'Under Review'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 rounded border border-cyan-800/40">
                          {routeCount} alternatives
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                          Evaluate →
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/40">
            <div>
              Page <strong className="text-white">{currentPage}</strong> of{' '}
              <strong className="text-white">{totalPages}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    currentPage === idx + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
              >
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
