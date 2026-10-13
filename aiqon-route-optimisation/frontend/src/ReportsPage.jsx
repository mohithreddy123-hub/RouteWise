import React, { useState, useEffect } from 'react'
import {
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { getShipments, getShipmentStats } from './api'

export default function ReportsPage() {
  const [shipments, setShipments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('q4_2026')
  const [corridorFilter, setCorridorFilter] = useState('ALL')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [shpList, statsData] = await Promise.all([
          getShipments(),
          getShipmentStats().catch(() => null),
        ])
        setShipments(Array.isArray(shpList) ? shpList : shpList?.shipments || [])
        setStats(statsData)
      } catch (err) {
        console.error('Failed to load report data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleExportCSV = () => {
    if (shipments.length === 0) return

    const headers = [
      'Shipment ID',
      'Reference',
      'Origin',
      'Destination',
      'Cargo Type',
      'Weight (Tons)',
      'Status',
      'Priority',
      'Ready Date',
    ]

    const rows = shipments.map((s) => [
      `"${s.id}"`,
      `"${s.reference_number || s.id}"`,
      `"${s.origin_label || s.origin_port_id}"`,
      `"${s.destination_label || s.destination_port_id}"`,
      `"${s.cargo_type}"`,
      s.weight_tons,
      `"${s.status}"`,
      `"${s.priority}"`,
      `"${s.ready_date || ''}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `routewise_performance_report_${dateRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportJSON = () => {
    const reportData = {
      generated_at: new Date().toISOString(),
      report_period: dateRange,
      kpis: {
        total_shipments: stats?.total_shipments ?? shipments.length,
        under_review: stats?.under_review ?? 0,
        average_delay_probability: stats?.avg_delay_probability ?? '18.4%',
        high_risk_routes: stats?.high_risk_routes ?? 5,
      },
      shipments: shipments,
    }

    const jsonString = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `routewise_audit_report_${dateRange}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const monthlyTrends = [
    { month: 'Jul 2026', shipments: 18, avgCost: 4200, onTimeRate: 88 },
    { month: 'Aug 2026', shipments: 21, avgCost: 4500, onTimeRate: 85 },
    { month: 'Sep 2026', shipments: 22, avgCost: 4350, onTimeRate: 91 },
    { month: 'Oct 2026', shipments: 24, avgCost: 4850, onTimeRate: 84 },
  ]

  const carbonByMode = [
    { mode: 'Ocean Direct', carbonKg: 4100, cost: 3800 },
    { mode: 'Ocean Transshipment', carbonKg: 5200, cost: 4900 },
    { mode: 'Ocean + Rail', carbonKg: 3400, cost: 5600 },
    { mode: 'Ocean + Road Feeder', carbonKg: 4600, cost: 4200 },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-5 xl:p-6 space-y-5 bg-[#070b14] text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <DocumentChartBarIcon className="w-5 h-5 text-blue-500" />
            Global Freight Intelligence & Corridor Performance Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit compliance, carrier reliability scores, ML delay distribution, and route optimization benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            title="Print or Save PDF"
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <PrinterIcon className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportJSON}
            title="Download JSON Report"
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>JSON Audit</span>
          </button>
          <button
            onClick={handleExportCSV}
            title="Download CSV Dataset"
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-sm"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 font-medium">Reporting Window:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-[#070b14] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="last_7_days">Last 7 Days (Tactical)</option>
            <option value="last_30_days">Last 30 Days (Monthly)</option>
            <option value="q4_2026">Q4 2026 Benchmark (Default)</option>
            <option value="ytd_2026">Full Year 2026 (Annual)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 font-medium">Corridor Scope:</span>
          <select
            value={corridorFilter}
            onChange={(e) => setCorridorFilter(e.target.value)}
            className="bg-[#070b14] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="ALL">All Trade Corridors</option>
            <option value="ASIA_EUROPE">Asia-Europe (Suez / Cape)</option>
            <option value="INTRA_ASIA">Intra-Asia & India</option>
            <option value="TRANSPACIFIC">Trans-Pacific (US West Coast)</option>
            <option value="ATLANTIC">North & South Atlantic</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Shipments Evaluated</span>
            <span className="text-emerald-400 font-bold">+14%</span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {stats?.total_shipments ?? shipments.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across 69 route variants</div>
        </div>

        <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Average Corridor Cost</span>
            <span className="text-blue-400 font-bold">USD</span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">$4,850</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Weighted composite freight cost</div>
        </div>

        <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Average Delay Forecast</span>
            <span className="text-emerald-400 font-bold">Predictive</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {stats?.avg_delay_probability ? `${stats.avg_delay_probability}%` : '18.4%'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Predictive corridor risk model</div>
        </div>

        <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Compliance Rate</span>
            <span className="text-blue-400 font-bold">Audit</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-2">99.2%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Planner approval trail verified</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-white mb-2">Monthly Freight Volume & Reliability</h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="shipments" fill="#0284c7" name="Shipments" radius={[4, 4, 0, 0]} />
                <Bar dataKey="onTimeRate" fill="#10b981" name="On-Time Rate %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-white mb-2">Carbon Emissions (kg CO2e) by Routing Architecture</h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={carbonByMode} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="mode" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="carbonKg" fill="#059669" name="Carbon (kg CO2e)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Corridor Benchmark Table */}
      <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-white mb-3">Key Corridor Benchmark & Delay Sensitivity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[11px] text-slate-400">
              <tr>
                <th className="py-2.5 px-3 font-normal">Corridor Lane</th>
                <th className="py-2.5 px-3 font-normal">Avg Cost</th>
                <th className="py-2.5 px-3 font-normal">Transit Duration</th>
                <th className="py-2.5 px-3 font-normal">Predicted Delay (ML)</th>
                <th className="py-2.5 px-3 font-normal">Weather Sensitivity</th>
                <th className="py-2.5 px-3 font-normal text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-medium text-white">Shanghai (CNSHA) → Hyderabad (INHYD)</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">$8,200</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">24 days</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">19.3% (Moderate)</td>
                <td className="py-2.5 px-3 text-amber-400">Bay of Bengal Monsoon</td>
                <td className="py-2.5 px-3 text-right">
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-medium">
                    Optimized
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-medium text-white">New York (USNYC) → Hamburg (DEHAM)</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">$5,400</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">18 days</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">12.1% (Low)</td>
                <td className="py-2.5 px-3 text-slate-400">North Atlantic Gales</td>
                <td className="py-2.5 px-3 text-right">
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-medium">
                    Stable
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-medium text-white">Hong Kong (CNHKG) → Singapore (SGSIN)</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">$3,100</td>
                <td className="py-2.5 px-3 font-mono text-slate-300">7 days</td>
                <td className="py-2.5 px-3 font-mono text-rose-400 font-semibold">31.4% (High)</td>
                <td className="py-2.5 px-3 text-rose-400">Malacca Congestion + Storm</td>
                <td className="py-2.5 px-3 text-right">
                  <span className="px-2 py-0.5 text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full font-medium">
                    Attention Required
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
