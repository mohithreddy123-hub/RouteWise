import React from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Dashboard from './Dashboard'
import ShipmentAnalysis from './ShipmentAnalysis'

function Navbar() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 font-bold text-white text-lg group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <div className="font-semibold text-slate-100 text-base leading-tight tracking-tight">
              Aiqon AI
            </div>
            <div className="text-xs text-slate-400 font-mono">
              RouteWise · Decision Support
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link
            to="/"
            className="text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800/80 transition-colors"
          >
            Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Simulated / Synthetic Data
          </div>
        </nav>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/shipments/:id" element={<ShipmentAnalysis />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
