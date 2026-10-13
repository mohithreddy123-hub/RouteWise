import React, { useState, useEffect, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Circle,
  Popup,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import {
  GlobeAltIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { getPorts, getShipments } from './api'

function MapFlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target && target.lat && target.lon) {
      map.flyTo([target.lat, target.lon], target.zoom || 5, { duration: 1.2 })
    }
  }, [target, map])
  return null
}

const GLOBAL_ROUTES = [
  {
    id: 'corridor-asia-europe',
    name: 'Asia-Europe Mainline (via Suez)',
    corridor: 'Shanghai → Singapore → Suez → Rotterdam',
    color: '#38bdf8',
    dashArray: '6, 6',
    coords: [
      [31.23, 121.47],
      [14.0, 114.0],
      [1.26, 103.82],
      [6.0, 78.0],
      [12.5, 43.5],
      [32.0, 31.5],
      [36.0, -5.3],
      [51.92, 4.48],
    ],
  },
  {
    id: 'corridor-china-india',
    name: 'China-India Express (Bay of Bengal)',
    corridor: 'Shanghai → Singapore → Chennai → Hyderabad',
    color: '#eab308',
    dashArray: '4, 4',
    coords: [
      [31.23, 121.47],
      [22.2, 114.1],
      [1.26, 103.82],
      [5.8, 95.0],
      [13.08, 80.27],
      [17.385, 78.4867],
    ],
  },
  {
    id: 'corridor-transpacific',
    name: 'Transpacific Fast Lane',
    corridor: 'Shanghai → Tokyo → Los Angeles',
    color: '#a855f7',
    dashArray: '5, 5',
    coords: [
      [31.23, 121.47],
      [35.65, 139.84],
      [38.0, 180.0],
      [35.0, -150.0],
      [33.73, -118.26],
    ],
  },
  {
    id: 'corridor-south-atlantic',
    name: 'South Atlantic Trade Corridor',
    corridor: 'Hamburg → Santos (Brazil)',
    color: '#22c55e',
    dashArray: '8, 6',
    coords: [
      [53.57, 9.96],
      [49.49, 0.1],
      [25.0, -20.0],
      [0.0, -30.0],
      [-23.95, -46.33],
    ],
  },
]

const WEATHER_VORTICES = [
  {
    id: 'cyclone-bob',
    name: 'Cyclone Remal (Severe)',
    zone: 'Bay of Bengal',
    center: [15.5, 88.5],
    radiusMeters: 750000,
    windKnots: 85,
    risk: 'High Severity',
  },
  {
    id: 'cyclone-scs',
    name: 'Typhoon Yagi Front',
    zone: 'South China Sea',
    center: [17.5, 115.5],
    radiusMeters: 800000,
    windKnots: 95,
    risk: 'Critical Warning',
  },
  {
    id: 'cyclone-arabian',
    name: 'Monsoon Low Pressure System',
    zone: 'Arabian Sea',
    center: [11.0, 65.0],
    radiusMeters: 600000,
    windKnots: 45,
    risk: 'Moderate Risk',
  },
  {
    id: 'cyclone-atlantic',
    name: 'North Atlantic Gale System',
    zone: 'Mid Atlantic',
    center: [30.0, -42.0],
    radiusMeters: 900000,
    windKnots: 55,
    risk: 'Moderate Risk',
  },
]

const ACTIVE_VESSELS = [
  {
    id: 'VESSEL-01',
    ref: 'AIQ-2026-001',
    name: 'Ever Glory (TEU 14,000)',
    coords: [14.0, 114.0],
    origin: 'CNSHA',
    dest: 'INHYD',
    speed: '19.4 knots',
    status: 'In Transit',
    risk: 'Moderate',
  },
  {
    id: 'VESSEL-02',
    ref: 'AIQ-2026-002',
    name: 'MSC Oscar (TEU 19,224)',
    coords: [6.0, 78.0],
    origin: 'USNYC',
    dest: 'DEHAM',
    speed: '21.0 knots',
    status: 'In Transit',
    risk: 'Low',
  },
  {
    id: 'VESSEL-03',
    ref: 'AIQ-2026-003',
    name: 'CMA CGM Palais (TEU 20,600)',
    coords: [2.5, 102.5],
    origin: 'CNHKG',
    dest: 'SGSIN',
    speed: '8.2 knots',
    status: 'Delayed (Dwell)',
    risk: 'High',
  },
]

export default function InteractiveMapPage() {
  const [ports, setPorts] = useState([])
  const [loading, setLoading] = useState(true)
  const [portSearch, setPortSearch] = useState('')
  const [selectedPort, setSelectedPort] = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)

  const [showRoutes, setShowRoutes] = useState(true)
  const [showPorts, setShowPorts] = useState(true)
  const [showWeather, setShowWeather] = useState(true)
  const [showVessels, setShowVessels] = useState(true)
  const [mapStyle, setMapStyle] = useState('dark')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await getPorts()
        setPorts(Array.isArray(data) ? data : [])
      } catch (e) {
        console.warn('Could not load ports:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredPorts = ports.filter(
    (p) =>
      p.name.toLowerCase().includes(portSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(portSearch.toLowerCase()) ||
      p.city.toLowerCase().includes(portSearch.toLowerCase()) ||
      p.country.toLowerCase().includes(portSearch.toLowerCase())
  )

  const handleSelectPort = (port) => {
    setSelectedPort(port)
    setFlyTarget({ lat: port.lat, lon: port.lon, zoom: 6 })
  }

  const handleSelectVessel = (vessel) => {
    setFlyTarget({ lat: vessel.coords[0], lon: vessel.coords[1], zoom: 6 })
  }

  const handleSelectStorm = (storm) => {
    setFlyTarget({ lat: storm.center[0], lon: storm.center[1], zoom: 5 })
  }

  const tileUrl =
    mapStyle === 'standard'
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      : 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#070b14] text-slate-100">
      <div className="w-full lg:w-80 xl:w-96 bg-[#0B1120] border-r border-slate-800/80 flex flex-col h-auto lg:h-full shrink-0 shadow-2xl z-10 overflow-y-auto">
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold text-white flex items-center gap-2 tracking-tight">
              <GlobeAltIcon className="w-4 h-4 text-cyan-400" />
              Tactical Freight & Route Map
            </h1>
            <button
              onClick={() => setFlyTarget({ lat: 20, lon: 70, zoom: 2 })}
              title="Reset global view"
              className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 transition"
            >
              Reset View
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Global maritime intelligence, active shipping lines, storm radar, and 35 trade ports.
          </p>
        </div>

        <div className="p-3 border-b border-slate-800/80 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Global Port Hubs (35)</span>
            <span className="text-blue-400 font-mono text-[10px]">{filteredPorts.length} visible</span>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={portSearch}
              onChange={(e) => setPortSearch(e.target.value)}
              placeholder="Search ports (e.g. Shanghai, Rotterdam, Mundra)..."
              className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/50 rounded-xl border border-slate-800 bg-slate-950/40">
            {filteredPorts.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPort(p)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition ${
                  selectedPort?.id === p.id
                    ? 'bg-blue-600/20 text-blue-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="truncate">
                  <span className="font-mono text-cyan-400 mr-1.5 text-[11px]">{p.id}</span>
                  <span className="truncate">{p.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono ml-2 shrink-0">{p.country}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedPort && (
          <div className="p-3 bg-blue-950/30 border-b border-blue-900/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5 text-blue-400" />
                {selectedPort.name}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded font-mono">
                {selectedPort.id}
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              {selectedPort.city}, {selectedPort.country} ·{' '}
              <span className="font-mono text-[10px] text-slate-400">
                [{selectedPort.lat.toFixed(2)}, {selectedPort.lon.toFixed(2)}]
              </span>
            </div>
            {selectedPort.notes && (
              <p className="text-[10px] text-slate-400 italic leading-snug">{selectedPort.notes}</p>
            )}
          </div>
        )}

        <div className="p-3 border-b border-slate-800/80 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Vessels in Transit (3)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>

          <div className="space-y-1.5">
            {ACTIVE_VESSELS.map((v) => (
              <div
                key={v.id}
                onClick={() => handleSelectVessel(v)}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 cursor-pointer transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-blue-400 flex items-center gap-1.5">
                    <span>{v.ref}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({v.name})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {v.origin} → {v.dest} · Speed: {v.speed}
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-medium rounded border shrink-0 ${
                    v.risk === 'High'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Severe Weather Alerts</span>
            <span className="text-rose-400 text-[10px] font-semibold">Active Radars</span>
          </div>

          <div className="space-y-1.5">
            {WEATHER_VORTICES.map((storm) => (
              <div
                key={storm.id}
                onClick={() => handleSelectStorm(storm)}
                className="p-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 cursor-pointer transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-rose-300 group-hover:text-rose-200">
                    {storm.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Zone: {storm.zone} · Gusts: {storm.windKnots} kts
                  </div>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded">
                  {storm.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative h-full min-h-[450px]">
        <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-slate-200 flex flex-col gap-2 min-w-[200px]">
          <div className="text-[11px] font-bold text-white uppercase tracking-wider pb-1 border-b border-slate-800">
            Map Overlays
          </div>

          <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-blue-500"
            />
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-[11px] font-medium">Shipping Routes</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showPorts}
              onChange={(e) => setShowPorts(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-cyan-500"
            />
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-[11px] font-medium">Major Ports ({ports.length})</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showWeather}
              onChange={(e) => setShowWeather(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-rose-500"
            />
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-[11px] font-medium">Weather Risk Radar</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showVessels}
              onChange={(e) => setShowVessels(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-emerald-500"
            />
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] font-medium">Active Shipments</span>
          </label>

          <div className="pt-1.5 border-t border-slate-800">
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
            >
              <option value="dark">Dark Nautical Canvas</option>
              <option value="standard">OpenStreetMap Standard</option>
            </select>
          </div>
        </div>

        <MapContainer
          center={[20, 70]}
          zoom={3}
          minZoom={2}
          maxZoom={9}
          scrollWheelZoom={true}
          zoomControl={false}
          className="w-full h-full"
        >
          <ZoomControl position="topright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={tileUrl}
          />

          {flyTarget && <MapFlyTo target={flyTarget} />}

          {/* Shipping Routes */}
          {showRoutes &&
            GLOBAL_ROUTES.map((route) => (
              <Polyline
                key={route.id}
                positions={route.coords}
                pathOptions={{
                  color: route.color,
                  weight: 3,
                  dashArray: route.dashArray,
                  opacity: 0.85,
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="text-blue-600 block">{route.name}</strong>
                    <div className="text-slate-600 text-[11px]">{route.corridor}</div>
                  </div>
                </Popup>
              </Polyline>
            ))}

          {/* Weather Storm Radar Disruption Zones */}
          {showWeather &&
            WEATHER_VORTICES.map((storm) => (
              <React.Fragment key={storm.id}>
                <Circle
                  center={storm.center}
                  radius={storm.radiusMeters}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#b91c1c',
                    fillOpacity: 0.18,
                    weight: 1.5,
                    dashArray: '4, 4',
                  }}
                />
                <CircleMarker
                  center={storm.center}
                  radius={18}
                  pathOptions={{
                    color: '#f87171',
                    fillColor: '#dc2626',
                    fillOpacity: 0.6,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <strong className="text-rose-600 block">{storm.name}</strong>
                      <div className="text-slate-700">Area: {storm.zone}</div>
                      <div className="text-rose-700 font-bold mt-1">
                        Sustained Winds: {storm.windKnots} kts ({storm.risk})
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            ))}

          {/* Port Hub Markers */}
          {showPorts &&
            ports.map((port) => (
              <CircleMarker
                key={port.id}
                center={[port.lat, port.lon]}
                radius={port.id === selectedPort?.id ? 8 : 5}
                pathOptions={{
                  color: port.id === selectedPort?.id ? '#ffffff' : '#38bdf8',
                  fillColor: port.id === selectedPort?.id ? '#0284c7' : '#0369a1',
                  fillOpacity: 0.9,
                  weight: port.id === selectedPort?.id ? 3 : 1.5,
                }}
                eventHandlers={{
                  click: () => setSelectedPort(port),
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <div className="font-bold text-slate-900">{port.name}</div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      {port.id} · {port.city}, {port.country}
                    </div>
                    {port.notes && <div className="text-[10px] text-slate-600 mt-1">{port.notes}</div>}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Active Vessels */}
          {showVessels &&
            ACTIVE_VESSELS.map((v) => (
              <CircleMarker
                key={v.id}
                center={v.coords}
                radius={6}
                pathOptions={{
                  color: '#22c55e',
                  fillColor: '#15803d',
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="text-emerald-700 block">{v.ref}</strong>
                    <div className="text-slate-600">{v.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {v.origin} → {v.dest} | {v.speed}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600 mt-1">{v.status}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>
    </div>
  )
}
