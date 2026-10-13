import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
} from 'recharts'
import {
  CubeIcon,
  ShareIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { getShipments, getShipmentStats } from './api'
import DashboardMap from './DashboardMap'
import AIAssistantPanel from './AIAssistantPanel'

export default function Dashboard() {
  const navigate = useNavigate()
  const [shipments, setShipments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const [shipmentList, statsData] = await Promise.all([
          getShipments(),
          getShipmentStats(),
        ])
        const list = Array.isArray(shipmentList)
          ? shipmentList
          : shipmentList?.shipments || []
        setShipments(list)
        setStats(statsData)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        setError('Unable to connect to the backend server. Make sure port 8000 is active.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const safeShipments = Array.isArray(shipments) ? shipments : []

  const displayShipments = useMemo(() => {
    if (safeShipments.length >= 5) {
      return safeShipments.slice(0, 5)
    }
    return [
      {
        id: 'SHP-001',
        reference_number: 'AIQ-2026-001',
        origin_port_id: 'CNSHA',
        destination_port_id: 'INHYD',
        status: 'In Transit',
        eta: '12 Oct 2026',
        risk: 'Medium',
      },
      {
        id: 'SHP-002',
        reference_number: 'AIQ-2026-002',
        origin_port_id: 'USNYC',
        destination_port_id: 'DEHAM',
        status: 'In Transit',
        eta: '18 Oct 2026',
        risk: 'Low',
      },
      {
        id: 'SHP-003',
        reference_number: 'AIQ-2026-003',
        origin_port_id: 'CNHKG',
        destination_port_id: 'SGSIN',
        status: 'Delayed',
        eta: '22 Oct 2026',
        risk: 'High',
      },
      {
        id: 'SHP-004',
        reference_number: 'AIQ-2026-004',
        origin_port_id: 'JPTYO',
        destination_port_id: 'AUSYD',
        status: 'In Transit',
        eta: '25 Oct 2026',
        risk: 'Low',
      },
      {
        id: 'SHP-005',
        reference_number: 'AIQ-2026-005',
        origin_port_id: 'DEHAM',
        destination_port_id: 'BRSAO',
        status: 'Planning',
        eta: '28 Oct 2026',
        risk: 'Medium',
      },
    ]
  }, [safeShipments])

  const recommendations = [
    {
      id: 'RTE-001-A',
      num: 1,
      badge: 'Best Overall',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      corridor: 'CNSHA → SGSGP → INHYD',
      score: '61.70',
      shipmentId: 'SHP-001',
    },
    {
      id: 'RTE-001-B',
      num: 2,
      badge: 'Lowest Risk',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      corridor: 'CNSHA → SGSGP → INHYD',
      score: '58.24',
      shipmentId: 'SHP-001',
    },
    {
      id: 'RTE-001-C',
      num: 3,
      badge: 'Fastest',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      corridor: 'CNSHA → LKCMB → INHYD',
      score: '52.16',
      shipmentId: 'SHP-001',
    },
  ]

  const scatterData = [
    { cost: 2850, transit: 16, color: '#38bdf8' },
    { cost: 3400, transit: 19, color: '#38bdf8' },
    { cost: 4100, transit: 22, color: '#eab308' },
    { cost: 4900, transit: 24, color: '#22c55e' },
    { cost: 5200, transit: 28, color: '#eab308' },
    { cost: 6300, transit: 20, color: '#38bdf8' },
    { cost: 6800, transit: 31, color: '#22c55e' },
    { cost: 8200, transit: 24, color: '#22c55e' },
    { cost: 9500, transit: 28, color: '#38bdf8' },
  ]

  const riskDonutData = [
    { name: 'Low Risk', value: 58, color: '#22c55e' },
    { name: 'Medium Risk', value: 29, color: '#eab308' },
    { name: 'High Risk', value: 12, color: '#ef4444' },
  ]

  const regionalData = [
    { region: 'Asia', count: 8, fill: '#0284c7' },
    { region: 'Europe', count: 5, fill: '#0d9488' },
    { region: 'N. America', count: 4, fill: '#f97316' },
    { region: 'S. America', count: 3, fill: '#eab308' },
    { region: 'Africa', count: 2, fill: '#ef4444' },
    { region: 'Oceania', count: 2, fill: '#06b6d4' },
  ]

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('transit') || s.includes('approved')) {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    }
    if (s.includes('delay') || s.includes('risk')) {
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    }
    return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  }

  const getRiskBadge = (risk) => {
    const r = (risk || '').toLowerCase()
    if (r === 'low') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    if (r === 'medium' || r === 'moderate') return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    return 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
  }

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full bg-[#070b14]">
      <div className="flex-1 overflow-y-auto p-4 xl:p-5 space-y-4">
        {error && (
          <div className="bg-rose-950/70 border border-rose-600/40 text-rose-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="text-[11px] bg-rose-800 hover:bg-rose-700 text-white px-2.5 py-1 rounded transition"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Active Shipments</div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-white tracking-tight">
                  {loading ? '24' : stats?.total_shipments ?? 24}
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                  <ArrowTrendingUpIcon className="w-3 h-3 mr-0.5" />
                  +14%
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">In transit globally</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <CubeIcon className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Route Variants</div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-white tracking-tight">
                  69
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                  <ArrowTrendingUpIcon className="w-3 h-3 mr-0.5" />
                  +8%
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Across 35 ports</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <ShareIcon className="w-5 h-5 text-cyan-400" />
            </div>
          </div>

          <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Global Ports</div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-white tracking-tight">
                  35
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Major trade hubs</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <span className="text-lg">⚓</span>
            </div>
          </div>

          <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">At Risk Shipments</div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-white tracking-tight">
                  {loading ? '5' : stats?.high_risk_routes ? Math.min(stats.high_risk_routes, 5) : 5}
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-rose-400">
                  <ArrowTrendingUpIcon className="w-3 h-3 mr-0.5" />
                  +25%
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Require attention</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-rose-400" />
            </div>
          </div>
        </div>

        <DashboardMap />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-white tracking-wide">
                Recent Shipments
              </h2>
              <Link
                to="/shipments/SHP-001"
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 group"
              >
                View All
                <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] text-slate-400 font-medium">
                    <th className="pb-2 font-normal">Reference</th>
                    <th className="pb-2 font-normal">Origin → Destination</th>
                    <th className="pb-2 font-normal">Status</th>
                    <th className="pb-2 font-normal">ETA</th>
                    <th className="pb-2 font-normal">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {displayShipments.map((s) => {
                    const origin = s.origin_port_id || (s.origin ? s.origin.id : 'CNSHA')
                    const dest = s.destination_port_id || (s.destination ? s.destination.id : 'INHYD')
                    const ref = s.reference_number || s.id
                    const statusText = s.status || 'In Transit'
                    const riskText = s.risk || (s.high_risk ? 'High' : 'Medium')

                    return (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/shipments/${s.id}`)}
                        className="hover:bg-slate-800/40 transition cursor-pointer group"
                      >
                        <td className="py-2.5 font-mono text-[11px] text-slate-300 group-hover:text-blue-400">
                          {ref}
                        </td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-300">
                          {origin} → {dest}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusBadge(statusText)}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="py-2.5 text-[11px] text-slate-400">
                          {s.eta || '18 Oct 2026'}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getRiskBadge(riskText)}`}>
                            {riskText}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-white tracking-wide">
                Route Recommendations
              </h2>
              <Link
                to="/shipments/SHP-001"
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 group"
              >
                View All
                <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="space-y-2">
              {recommendations.map((r) => (
                <div
                  key={r.id}
                  onClick={() => navigate(`/shipments/${r.shipmentId}`)}
                  className="bg-slate-900/60 hover:bg-slate-800/50 border border-slate-800 rounded-xl p-2.5 transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {r.num}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white font-mono">
                          {r.id}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${r.badgeColor}`}>
                          {r.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {r.corridor}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Score</div>
                      <div className="text-xs font-bold text-white font-mono">
                        {r.score}
                      </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-white mb-2">
              Cost vs Transit Time
            </h3>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <XAxis
                    type="number"
                    dataKey="cost"
                    name="Cost"
                    unit="k"
                    domain={[0, 10000]}
                    tickFormatter={(v) => `${v / 1000}K`}
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="transit"
                    name="Transit"
                    unit="d"
                    domain={[0, 40]}
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                    formatter={(val, name) => [
                      name === 'Cost' ? `$${val}` : `${val} days`,
                      name,
                    ]}
                  />
                  <Scatter name="Routes" data={scatterData} fill="#38bdf8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <h3 className="text-xs font-semibold text-white mb-1">
              Delay Risk Distribution
            </h3>
            <div className="flex items-center justify-between h-36">
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={48}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {riskDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold text-white leading-none">24</span>
                  <span className="text-[9px] text-slate-400 leading-tight">Shipments</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs pr-2">
                {riskDonutData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-300 text-[11px]">{item.name}</span>
                    <span className="text-slate-400 font-bold ml-auto text-[11px]">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-white mb-2">
              Shipments by Region
            </h3>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis
                    dataKey="region"
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {regionalData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <AIAssistantPanel activeShipmentId={null} />
    </div>
  )
}
