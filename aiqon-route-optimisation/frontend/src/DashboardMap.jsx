import React, { useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Popup, ZoomControl } from 'react-leaflet'

// Key hub ports shown in the reference image
const HUBS = [
  { id: 'NLRTM', name: 'Rotterdam (NLRTM)', lat: 51.9225, lon: 4.4792, type: 'major' },
  { id: 'CNSHA', name: 'Shanghai (CNSHA)', lat: 31.2304, lon: 121.4737, type: 'major' },
  { id: 'INHYD', name: 'Hyderabad (INHYD)', lat: 17.385, lon: 78.4867, type: 'inland' },
  { id: 'SGSGP', name: 'Singapore (SGSGP)', lat: 1.2655, lon: 103.8198, type: 'major' },
  { id: 'LKCMB', name: 'Colombo (LKCMB)', lat: 6.9271, lon: 79.8612, type: 'transshipment' },
  { id: 'INMAA', name: 'Chennai (INMAA)', lat: 13.0827, lon: 80.2707, type: 'coastal' },
  { id: 'DEHAM', name: 'Hamburg (DEHAM)', lat: 53.5753, lon: 9.96, type: 'major' },
  { id: 'USNYC', name: 'New York (USNYC)', lat: 40.684, lon: -74.045, type: 'major' },
]

// Prominent trade routes connecting hubs matching the reference image
const ROUTES = [
  {
    id: 'route-rotterdam-shanghai',
    name: 'Rotterdam → Shanghai (Suez Corridor)',
    color: '#38bdf8', // bright cyan/blue
    dashArray: '6, 6',
    coords: [
      [51.9225, 4.4792],
      [36.0, -5.3],     // Gibraltar
      [32.0, 31.5],     // Suez Canal
      [12.5, 43.5],     // Bab el Mandeb
      [6.0, 78.0],      // South Sri Lanka
      [1.26, 103.82],   // Singapore
      [14.0, 114.0],    // South China Sea
      [31.23, 121.47],  // Shanghai
    ],
  },
  {
    id: 'route-shanghai-singapore-hyderabad',
    name: 'Shanghai → Singapore → Hyderabad',
    color: '#eab308', // amber/yellow
    dashArray: '4, 4',
    coords: [
      [31.23, 121.47],  // Shanghai
      [22.2, 114.1],    // Hong Kong
      [1.26, 103.82],   // Singapore
      [5.8, 95.0],      // Malacca strait out
      [13.08, 80.27],   // Chennai
      [17.385, 78.4867],// Hyderabad
    ],
  },
  {
    id: 'route-active-singapore-europe',
    name: 'Active Freight Corridor (Southern Arc)',
    color: '#22c55e', // green
    dashArray: '8, 6',
    coords: [
      [1.26, 103.82],   // Singapore
      [-5.0, 80.0],     // Equatorial Indian Ocean
      [-20.0, 50.0],    // South Indian Ocean
      [-34.0, 20.0],    // Cape of Good Hope
      [10.0, -20.0],    // Mid Atlantic
      [51.9225, 4.4792],// Rotterdam
    ],
  },
]

// Weather risk zones matching cyclones/storms in the reference image
const WEATHER_RISKS = [
  {
    id: 'cyclone-bob',
    name: 'Severe Tropical Storm Remal',
    zone: 'Bay of Bengal',
    center: [15.5, 88.5],
    radiusMeters: 750000,
    intensity: 'High Risk',
  },
  {
    id: 'cyclone-scs',
    name: 'Typhoon Yagi Vortex',
    zone: 'South China Sea',
    center: [17.5, 115.5],
    radiusMeters: 800000,
    intensity: 'Severe Warning',
  },
  {
    id: 'cyclone-arabian',
    name: 'Monsoon Depression Zone',
    zone: 'Arabian Sea',
    center: [11.0, 65.0],
    radiusMeters: 600000,
    intensity: 'Moderate Warning',
  },
  {
    id: 'cyclone-atlantic',
    name: 'North Atlantic Gale Front',
    zone: 'Atlantic Corridor',
    center: [30.0, -42.0],
    radiusMeters: 900000,
    intensity: 'Moderate Risk',
  },
]

export default function DashboardMap() {
  const [showRoutes, setShowRoutes] = useState(true)
  const [showPorts, setShowPorts] = useState(true)
  const [showWeather, setShowWeather] = useState(true)
  const [showActiveShipments, setShowActiveShipments] = useState(true)
  const [mapStyle, setMapStyle] = useState('dark')

  const tileUrl =
    mapStyle === 'standard'
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      : 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'

  return (
    <div className="relative w-full h-[370px] rounded-2xl overflow-hidden border border-slate-800/80 bg-[#090d16] shadow-xl">
      {/* Floating Layer Controls (Top-Left matching reference) */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 text-xs shadow-2xl text-slate-200 flex flex-col gap-1.5 min-w-[190px]">
        <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
          <input
            type="checkbox"
            checked={showRoutes}
            onChange={(e) => setShowRoutes(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-0 focus:ring-offset-0"
          />
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span className="text-[11px] font-medium">Shipping Routes</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
          <input
            type="checkbox"
            checked={showPorts}
            onChange={(e) => setShowPorts(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-0 focus:ring-offset-0"
          />
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span className="text-[11px] font-medium">Major Ports</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
          <input
            type="checkbox"
            checked={showWeather}
            onChange={(e) => setShowWeather(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-red-500 focus:ring-0 focus:ring-offset-0"
          />
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span className="text-[11px] font-medium">Weather Risk Zones</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
          <input
            type="checkbox"
            checked={showActiveShipments}
            onChange={(e) => setShowActiveShipments(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
          />
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-[11px] font-medium">Active Shipments</span>
        </label>

        <div className="pt-1 mt-0.5 border-t border-slate-800">
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-300 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-blue-500"
          >
            <option value="dark">Standard Map (Dark)</option>
            <option value="standard">OpenStreetMap</option>
          </select>
        </div>
      </div>

      {/* Leaflet Map Container */}
      <MapContainer
        center={[24, 75]}
        zoom={2}
        minZoom={2}
        maxZoom={7}
        scrollWheelZoom={false}
        zoomControl={false}
        className="w-full h-full"
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
        />

        {/* Shipping Routes */}
        {showRoutes &&
          ROUTES.map((route) => (
            <Polyline
              key={route.id}
              positions={route.coords}
              pathOptions={{
                color: route.color,
                weight: 2.5,
                dashArray: route.dashArray,
                opacity: 0.85,
              }}
            >
              <Popup>
                <div className="text-xs font-semibold text-slate-900">{route.name}</div>
              </Popup>
            </Polyline>
          ))}

        {/* Weather Risk Storm Zones (Circular radar waves) */}
        {showWeather &&
          WEATHER_RISKS.map((risk) => (
            <React.Fragment key={risk.id}>
              {/* Outer faint storm halo */}
              <Circle
                center={risk.center}
                radius={risk.radiusMeters}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#b91c1c',
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: '3, 4',
                }}
              />
              {/* Inner high-intensity storm eye */}
              <CircleMarker
                center={risk.center}
                radius={16}
                pathOptions={{
                  color: '#f87171',
                  fillColor: '#dc2626',
                  fillOpacity: 0.5,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong className="text-rose-600 block">{risk.name}</strong>
                    <span className="text-slate-600">{risk.zone}</span>
                    <div className="text-[10px] text-amber-600 font-bold mt-1">
                      Status: {risk.intensity}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          ))}

        {/* Hub Port Markers */}
        {showPorts &&
          HUBS.map((port) => (
            <CircleMarker
              key={port.id}
              center={[port.lat, port.lon]}
              radius={port.type === 'major' ? 6 : 4}
              pathOptions={{
                color: '#38bdf8',
                fillColor: '#0284c7',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">{port.name}</div>
                  <div className="text-slate-500 font-mono text-[10px]">{port.id}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* Active In-Transit Vessel Markers */}
        {showActiveShipments && (
          <>
            <CircleMarker
              center={[14.0, 114.0]}
              radius={5}
              pathOptions={{ color: '#22c55e', fillColor: '#15803d', fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div className="text-xs font-semibold text-slate-900">
                  AIQ-2026-001 (In Transit)
                </div>
              </Popup>
            </CircleMarker>
            <CircleMarker
              center={[6.0, 78.0]}
              radius={5}
              pathOptions={{ color: '#22c55e', fillColor: '#15803d', fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div className="text-xs font-semibold text-slate-900">
                  AIQ-2026-002 (In Transit)
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}
      </MapContainer>
    </div>
  )
}
