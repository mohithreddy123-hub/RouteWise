import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import {
  getShipment,
  evaluateRoutes,
  reassessWeather,
  submitPlannerReview,
} from './api'
import {
  formatCurrency,
  formatDays,
  formatPct,
  formatCarbon,
  formatScore,
  getRiskBadgeClass,
  PREFERENCE_PRESETS,
} from './utils'

// Helper component to auto-fit map bounds
function AutoFitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points && points.length > 0) {
      try {
        const bounds = points.map((p) => [p.lat, p.lon])
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 })
      } catch (e) {
        // Fallback silently if coordinates are invalid
      }
    }
  }, [points, map])
  return null
}

export default function ShipmentAnalysis() {
  const { id } = useParams()

  // Main data states
  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Evaluation & Recommendation states
  const [activePreference, setActivePreference] = useState('balanced')
  const [weights, setWeights] = useState(PREFERENCE_PRESETS.balanced.weights)
  const [constraints, setConstraints] = useState({
    max_cost_usd: '',
    max_transit_days: '',
    exclude_constrained_capacity: false,
  })
  const [evaluationResult, setEvaluationResult] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState(null)

  // Weather simulation state
  const [weatherScenario, setWeatherScenario] = useState('normal')
  const [weatherNotice, setWeatherNotice] = useState(null)
  const [reassessingWeather, setReassessingWeather] = useState(false)

  // Review submission state
  const [decision, setDecision] = useState('approved')
  const [decisionNote, setDecisionNote] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(null)

  // Load shipment on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const data = await getShipment(id)
        setShipment(data)

        // Select initial top route
        if (data.routes && data.routes.length > 0) {
          setSelectedRouteId(data.routes[0].id)
        }

        // Auto evaluate with balanced preset
        try {
          const evalData = await evaluateRoutes({
            shipment_id: id,
            preference: 'balanced',
            weights: PREFERENCE_PRESETS.balanced.weights,
            constraints: {},
          })
          setEvaluationResult(evalData)
          if (evalData.recommendation) {
            setSelectedRouteId(evalData.recommendation.id)
          }
        } catch (e) {
          console.warn('Initial evaluation fallback:', e)
        }
      } catch (err) {
        console.error('Failed to load shipment:', err)
        setError(`Unable to load shipment ${id}. Please verify backend connection.`)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  // Weight sum calculation
  const totalWeight = useMemo(() => {
    return Object.values(weights).reduce((acc, v) => acc + (Number(v) || 0), 0)
  }, [weights])

  const isWeightValid = totalWeight === 100

  // Preference preset click handler
  const handlePreferenceChange = (key) => {
    setActivePreference(key)
    if (PREFERENCE_PRESETS[key]) {
      setWeights(PREFERENCE_PRESETS[key].weights)
    }
  }

  // Weight slider change handler
  const handleWeightChange = (factor, value) => {
    setWeights((prev) => ({
      ...prev,
      [factor]: Number(value),
    }))
  }

  // Re-evaluate routes
  const handleEvaluate = async () => {
    if (!isWeightValid) {
      alert('Total weights must sum up to exactly 100% before evaluating.')
      return
    }
    try {
      setEvaluating(true)
      const payload = {
        shipment_id: id,
        preference: activePreference,
        weights,
        constraints: {
          max_cost_usd: constraints.max_cost_usd ? Number(constraints.max_cost_usd) : null,
          max_transit_days: constraints.max_transit_days ? Number(constraints.max_transit_days) : null,
          exclude_constrained_capacity: Boolean(constraints.exclude_constrained_capacity),
        },
      }
      const result = await evaluateRoutes(payload)
      setEvaluationResult(result)
      if (result.recommendation) {
        setSelectedRouteId(result.recommendation.id)
      }
    } catch (err) {
      console.error('Evaluation failed:', err)
      alert(err.response?.data?.detail || 'Evaluation failed. Check constraints.')
    } finally {
      setEvaluating(false)
    }
  }

  // Weather scenario change
  const handleWeatherScenario = async (scenario) => {
    try {
      setWeatherScenario(scenario)
      setReassessingWeather(true)
      const res = await reassessWeather({
        shipment_id: id,
        scenario,
      })
      setWeatherNotice(res.explanation || res.scenario_description)

      // Refresh shipment routes
      const refreshed = await getShipment(id)
      setShipment(refreshed)

      // Re-run evaluation under the weather scenario
      const evalData = await evaluateRoutes({
        shipment_id: id,
        preference: activePreference,
        weights,
        constraints: {},
      })
      setEvaluationResult(evalData)
      if (evalData.recommendation) {
        setSelectedRouteId(evalData.recommendation.id)
      }
    } catch (err) {
      console.error('Weather reassessment failed:', err)
      alert('Failed to simulate weather scenario.')
    } finally {
      setReassessingWeather(false)
    }
  }

  // Planner review submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    try {
      setReviewSubmitting(true)
      setReviewSuccess(null)
      const res = await submitPlannerReview({
        shipment_id: id,
        decision,
        selected_route_id: selectedRouteId,
        decision_note: decisionNote,
      })
      setReviewSuccess(`Decision successfully recorded as ${decision.toUpperCase()}!`)
      // Refresh shipment status
      const refreshed = await getShipment(id)
      setShipment(refreshed)
    } catch (err) {
      console.error('Planner review failed:', err)
      alert(err.response?.data?.detail || 'Failed to submit review.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  // Collect map markers and route polylines
  const mapData = useMemo(() => {
    const ports = new Map()
    const polylines = []

    if (!shipment?.routes) return { ports: [], polylines: [] }

    shipment.routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId
      const isRecommended = evaluationResult?.recommendation?.id === route.id

      const coords = []
      ;(route.legs || []).forEach((leg) => {
        if (leg.from_port?.lat && leg.from_port?.lon) {
          ports.set(leg.from_port.id, leg.from_port)
          coords.push([leg.from_port.lat, leg.from_port.lon])
        }
        if (leg.to_port?.lat && leg.to_port?.lon) {
          ports.set(leg.to_port.id, leg.to_port)
          coords.push([leg.to_port.lat, leg.to_port.lon])
        }
      })

      if (coords.length > 1) {
        let color = '#475569' // Default slate
        let weight = 2
        let dashArray = '4, 4'

        if (isSelected) {
          color = '#0284c7' // Blue
          weight = 4
          dashArray = null
        }
        if (isRecommended) {
          color = '#10b981' // Emerald
          weight = 5
          dashArray = null
        }

        polylines.push({
          id: route.id,
          name: route.route_name,
          coords,
          color,
          weight,
          dashArray,
          isRecommended,
          isSelected,
        })
      }
    })

    return {
      ports: Array.from(ports.values()),
      polylines,
    }
  }, [shipment, selectedRouteId, evaluationResult])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-mono">Loading corridor analysis for {id}...</p>
      </div>
    )
  }

  if (error || !shipment) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center space-y-4">
        <div className="p-4 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-sm">
          {error || 'Shipment not found'}
        </div>
        <Link to="/" className="text-sm text-blue-400 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  const routes = shipment.routes || []
  const recommendedRoute = evaluationResult?.recommendation || routes[0]

  return (
    <div className="max-w-7xl mx-auto w-full p-6 space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white font-mono">{shipment.id}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  shipment.priority?.toLowerCase() === 'high'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {shipment.priority || 'Standard'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Status: {shipment.status || 'Under Review'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Corridor: <span className="text-slate-200 font-semibold">{shipment.origin_port_id}</span> →{' '}
              <span className="text-slate-200 font-semibold">{shipment.destination_port_id}</span> ·{' '}
              {shipment.cargo_type} ({shipment.weight_tons} tons) · Target:{' '}
              {shipment.target_delivery_days ? `${shipment.target_delivery_days} days` : 'Flexible'}
            </p>
          </div>
        </div>

        {/* Weather Scenario Quick Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400 px-2 font-medium">Weather:</span>
          {['normal', 'moderate_storm', 'severe_cyclone'].map((scen) => (
            <button
              key={scen}
              onClick={() => handleWeatherScenario(scen)}
              disabled={reassessingWeather}
              className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                weatherScenario === scen
                  ? scen === 'severe_cyclone'
                    ? 'bg-rose-600 text-white'
                    : scen === 'moderate_storm'
                    ? 'bg-amber-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {scen === 'normal' ? 'Normal' : scen === 'moderate_storm' ? 'Moderate Storm' : 'Severe Cyclone'}
            </button>
          ))}
        </div>
      </div>

      {/* Weather Alert if applied */}
      {weatherNotice && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
          <span className="text-base">🌪️</span>
          <div>
            <span className="font-semibold text-amber-400">Weather Reassessment Notice: </span>
            {weatherNotice}
          </div>
        </div>
      )}

      {/* AI Recommendation Highlight Box */}
      {recommendedRoute && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-blue-950/40 border border-emerald-500/30 rounded-xl p-5 shadow-lg shadow-emerald-950/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-slate-950 shadow-sm uppercase tracking-wide">
                  AI Recommended Route
                </span>
                <span className="text-sm font-semibold text-white">
                  {recommendedRoute.route_name}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {evaluationResult?.explanation ||
                  `Optimized for ${activePreference} routing profile. Balanced transit speed and delay protection.`}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="text-center px-2">
                <div className="text-xs text-slate-400 font-medium">Cost</div>
                <div className="text-sm font-bold text-white">
                  {formatCurrency(recommendedRoute.estimated_cost_usd)}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-800"></div>
              <div className="text-center px-2">
                <div className="text-xs text-slate-400 font-medium">Transit</div>
                <div className="text-sm font-bold text-white">
                  {formatDays(recommendedRoute.estimated_transit_days)}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-800"></div>
              <div className="text-center px-2">
                <div className="text-xs text-slate-400 font-medium">Delay Risk</div>
                <div className="text-sm font-bold text-emerald-400">
                  {formatPct(recommendedRoute.delay_probability_percent)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Interactive Map + Route Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaflet Map Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col h-[460px]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-white">Maritime Trade Corridor Map</h2>
              <p className="text-xs text-slate-400">
                Visualizing route waypoints, transshipment hubs, and active legs
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-emerald-500 rounded"></span>
                <span className="text-slate-400">Recommended</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-sky-500 rounded"></span>
                <span className="text-slate-400">Selected</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-800">
            <MapContainer
              center={[15, 80]}
              zoom={3}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              <AutoFitBounds points={mapData.ports} />

              {/* Polylines for each route */}
              {mapData.polylines.map((poly) => (
                <Polyline
                  key={poly.id}
                  positions={poly.coords}
                  pathOptions={{
                    color: poly.color,
                    weight: poly.weight,
                    dashArray: poly.dashArray,
                    opacity: 0.9,
                  }}
                  eventHandlers={{
                    click: () => setSelectedRouteId(poly.id),
                  }}
                />
              ))}

              {/* Port Circle Markers */}
              {mapData.ports.map((port) => (
                <CircleMarker
                  key={port.id}
                  center={[port.lat, port.lon]}
                  radius={6}
                  pathOptions={{
                    color: '#38bdf8',
                    fillColor: '#0284c7',
                    fillOpacity: 0.8,
                    weight: 2,
                  }}
                >
                  <Popup className="dark-popup">
                    <div className="text-slate-900 text-xs p-1">
                      <div className="font-bold">{port.name}</div>
                      <div>
                        {port.city}, {port.country}
                      </div>
                      <div className="text-slate-500 font-mono mt-1">Code: {port.id}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Route Comparison Table Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Route Options Comparison</h2>
                <p className="text-xs text-slate-400">
                  Select a route to view individual breakdown
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {routes.length} options evaluated
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
              {routes.map((route) => {
                const isSelected = route.id === selectedRouteId
                const isRecommended = evaluationResult?.recommendation?.id === route.id

                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/80 border-blue-500/80 shadow-md ring-1 ring-blue-500/30'
                        : isRecommended
                        ? 'bg-slate-900 border-emerald-500/50 hover:border-emerald-500'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isRecommended && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                            AI Pick
                          </span>
                        )}
                        <span className="font-medium text-xs text-slate-100">
                          {route.route_name}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${getRiskBadgeClass(route.overall_risk_label)}`}>
                        {route.overall_risk_label || 'Low Risk'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500">Cost</div>
                        <div className="font-semibold text-slate-200">
                          {formatCurrency(route.estimated_cost_usd)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Transit</div>
                        <div className="font-semibold text-slate-200">
                          {formatDays(route.estimated_transit_days)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Delay Prob</div>
                        <div className="font-semibold text-slate-200">
                          {formatPct(route.delay_probability_percent)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Emissions</div>
                        <div className="font-semibold text-slate-200">
                          {formatCarbon(route.carbon_estimate_kg)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Planner Controls: Preference Presets, Sliders & Constraints */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">Planner Optimisation Controls</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize factor weighting or apply hard constraints to recalculate AI route recommendations
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2">
            {Object.entries(PREFERENCE_PRESETS).map(([key, item]) => (
              <button
                key={key}
                onClick={() => handlePreferenceChange(key)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activePreference === key
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {[
            { key: 'cost', label: 'Cost Weight' },
            { key: 'transit_time', label: 'Transit Time' },
            { key: 'delay_probability', label: 'Delay Probability' },
            { key: 'port_congestion', label: 'Port Congestion' },
            { key: 'geopolitical_risk', label: 'Geopolitical Risk' },
            { key: 'weather_risk', label: 'Weather Risk' },
            { key: 'carbon_emissions', label: 'Carbon Emissions' },
          ].map(({ key, label }) => (
            <div key={key} className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">{label}</span>
                <span className="text-white font-mono font-bold">{weights[key] || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={weights[key] || 0}
                onChange={(e) => handleWeightChange(key, e.target.value)}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          ))}

          {/* Hard Constraints Box */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 space-y-2">
            <span className="text-slate-400 font-medium block">Hard Constraints</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Max Cost ($)"
                value={constraints.max_cost_usd}
                onChange={(e) => setConstraints({ ...constraints, max_cost_usd: e.target.value })}
                className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500"
              />
              <input
                type="number"
                placeholder="Max Days"
                value={constraints.max_transit_days}
                onChange={(e) => setConstraints({ ...constraints, max_transit_days: e.target.value })}
                className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500"
              />
            </div>
            <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={constraints.exclude_constrained_capacity}
                onChange={(e) =>
                  setConstraints({
                    ...constraints,
                    exclude_constrained_capacity: e.target.checked,
                  })
                }
                className="accent-blue-500"
              />
              Exclude constrained capacity
            </label>
          </div>
        </div>

        {/* Evaluation Action Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-2 py-1 rounded font-mono font-medium ${
                isWeightValid
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              Total Weight: {totalWeight}% {isWeightValid ? '✓' : '(Must be 100%)'}
            </span>
          </div>

          <button
            onClick={handleEvaluate}
            disabled={!isWeightValid || evaluating}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            {evaluating ? 'Recalculating...' : 'Re-Evaluate Recommendation'}
          </button>
        </div>
      </div>

      {/* Decision Review & Audit Trail Submission */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-bold text-white">Planner Decision &amp; Audit Trail</h2>
        <p className="text-xs text-slate-400">
          Record human-in-the-loop decision approval or override for logistics compliance.
        </p>

        {reviewSuccess && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs">
            {reviewSuccess}
          </div>
        )}

        <form onSubmit={handleReviewSubmit} className="space-y-3">
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="decision"
                value="approved"
                checked={decision === 'approved'}
                onChange={(e) => setDecision(e.target.value)}
                className="accent-emerald-500"
              />
              <span className="font-medium text-emerald-400">Approve AI Recommendation</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="decision"
                value="alternate"
                checked={decision === 'alternate'}
                onChange={(e) => setDecision(e.target.value)}
                className="accent-amber-500"
              />
              <span className="font-medium text-amber-400">Override / Select Alternate Route</span>
            </label>
          </div>

          <textarea
            placeholder="Add planner justification notes (e.g. priority customer contract, weather buffer, port holiday considerations)..."
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          ></textarea>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={reviewSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              {reviewSubmitting ? 'Recording Decision...' : 'Submit Planner Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
