import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CloudIcon,
  SunIcon,
  BoltIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { getWeatherStatus, reassessWeather, getShipments } from './api'
import { PREFERENCE_PRESETS } from './utils'


export default function WeatherScenariosPage() {
  const [scenarioMeta, setScenarioMeta] = useState(null)
  const [activeScenario, setActiveScenario] = useState('normal')
  const [selectedShipmentId, setSelectedShipmentId] = useState('SHP-001')
  const [simulationResult, setSimulationResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [shipments, setShipments] = useState([])

  useEffect(() => {
    async function init() {
      try {
        const [meta, shpList] = await Promise.all([
          getWeatherStatus().catch(() => null),
          getShipments().catch(() => []),
        ])
        setScenarioMeta(meta)
        const list = Array.isArray(shpList) ? shpList : shpList?.shipments || []
        setShipments(list)
      } catch (e) {
        console.warn('Weather status error:', e)
      }
    }
    init()
  }, [])

  const runSimulation = async (scenario, shipmentId) => {
    setActiveScenario(scenario)
    setLoading(true)
    try {
      const res = await reassessWeather({
        shipment_id: shipmentId || selectedShipmentId,
        scenario: scenario,
        preference: 'balanced',
        weights: PREFERENCE_PRESETS.balanced.weights,
        constraints: {},
      })
      setSimulationResult(res)
    } catch (err) {
      console.error('Weather simulation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSimulation(activeScenario, selectedShipmentId)
  }, [selectedShipmentId])

  const scenarioCards = [
    {
      id: 'normal',
      title: 'Normal Conditions',
      badge: 'Baseline',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: SunIcon,
      iconColor: 'text-amber-400',
      desc: 'Standard seasonal weather across global sea lanes. Minimal transit disruptions and baseline delay probabilities apply.',
    },
    {
      id: 'moderate_storm',
      title: 'Moderate Storm Disruption',
      badge: 'Advisory Active',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: CloudIcon,
      iconColor: 'text-sky-400',
      desc: 'Tropical depressions and wave swells in South China Sea, Bay of Bengal, and Malacca Strait. Transit time increases by +1 to +3 days.',
    },
    {
      id: 'severe_weather',
      title: 'Severe Weather (Typhoon/Cyclone)',
      badge: 'Critical Warning',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      icon: BoltIcon,
      iconColor: 'text-rose-400',
      desc: 'Category 4–5 Tropical Cyclone Remal and Typhoon Yagi. Severe port dwell delays (+4 to +8 days) and extreme maritime risk.',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-5 xl:p-6 space-y-5 bg-[#070b14] text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CloudIcon className="w-5 h-5 text-sky-400" />
            Weather Disruption Simulation & Dynamic Corridor Rerouting
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate seasonal monsoons, ocean typhoons, and storm gales to assess route vulnerability and MCDA recommendation resilience.
          </p>
        </div>

        {/* Corridor / Shipment Context Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Corridor Context:</span>
          <select
            value={selectedShipmentId}
            onChange={(e) => setSelectedShipmentId(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}: {s.origin_port_id} → {s.destination_port_id} ({s.cargo_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Demonstration Notice */}
      <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300">
        <InformationCircleIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-amber-200">Meteorological Advisory Center:</strong> Weather scenarios model real-time maritime disruptions calibrated against regional nautical patterns. Corridors are evaluated dynamically to predict voyage delays and recommend route diversions prior to dispatch.
        </div>
      </div>

      {/* Scenario Selection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {scenarioCards.map((scen) => {
          const Icon = scen.icon
          const isSelected = activeScenario === scen.id

          return (
            <div
              key={scen.id}
              onClick={() => runSimulation(scen.id, selectedShipmentId)}
              className={`rounded-2xl p-4 border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/50 ring-1 ring-blue-500'
                  : 'bg-[#0B1120] border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${scen.iconColor}`} />
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${scen.badgeColor}`}>
                  {scen.badge}
                </span>
              </div>
              <h3 className="text-xs font-bold text-white mb-1">{scen.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{scen.desc}</p>

              <button
                disabled={loading}
                className={`w-full py-1.5 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isSelected ? '✓ Active Scenario' : 'Apply Scenario'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Simulation Results Analysis Area */}
      {simulationResult && (
        <div className="bg-[#0B1120] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Simulation Impact Summary</span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  [{simulationResult.scenario_label || activeScenario}]
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Evaluation result for corridor: <strong className="text-slate-200">{selectedShipmentId}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Recommendation Status:</span>
              <span
                className={`px-2 py-0.5 text-xs font-bold rounded-full border ${
                  simulationResult.recommendation_changed
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {simulationResult.recommendation_changed ? 'Recommendation Shifted' : 'Recommendation Stable'}
              </span>
            </div>
          </div>

          {/* Explanation Narrative */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <ShieldExclamationIcon className="w-4 h-4 text-blue-400" />
              <span>Planner Advisory & Recommendation Rationalization:</span>
            </div>
            <p className="whitespace-pre-line text-[11px] text-slate-300">
              {simulationResult.explanation ||
                'Simulation complete. Route variants evaluated with weather risk modifiers applied.'}
            </p>
          </div>

          {/* Route Options Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 border-b border-slate-800 text-[11px] text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 font-normal">Route Option</th>
                  <th className="py-2.5 px-3 font-normal">Weather Zone</th>
                  <th className="py-2.5 px-3 font-normal">Transit Days</th>
                  <th className="py-2.5 px-3 font-normal">Delay Risk (ML)</th>
                  <th className="py-2.5 px-3 font-normal">Weather Risk Score</th>
                  <th className="py-2.5 px-3 font-normal">MCDA Score</th>
                  <th className="py-2.5 px-3 font-normal text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {(simulationResult.score_breakdowns || []).map((sb) => {
                  const isTop = sb.rank === 1
                  return (
                    <tr
                      key={sb.route_id}
                      className={`hover:bg-slate-800/40 transition ${isTop ? 'bg-blue-950/20' : ''}`}
                    >
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">
                        {sb.route_name || sb.route_id}
                        {isTop && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-sans font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                            Recommended
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] font-sans">
                        {sb.weather_zone || 'Maritime Belt'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {sb.raw_transit_days || '—'} d
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            (sb.raw_delay_prob || 0) > 25 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {sb.raw_delay_prob != null ? `${sb.raw_delay_prob}%` : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {sb.weather_risk_after || sb.weather_risk || sb.weather_score != null ? (
                          <span className="text-amber-400">
                            {Number(sb.weather_risk_after || sb.weather_score || 0).toFixed(0)}/100
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {Number(sb.total_score || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <Link
                          to={`/shipments/${selectedShipmentId}`}
                          className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          Inspect & Approve →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
