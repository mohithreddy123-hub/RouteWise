import React from 'react'
import { Link } from 'react-router-dom'
import { ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function NotFoundPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#070b14] text-slate-100 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-xl">
        <ExclamationTriangleIcon className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2 font-mono">404 · Page Not Found</h1>
      <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
        The logistics corridor or route destination you requested does not exist or has been relocated within the RouteWise system.
      </p>
      <Link
        to="/"
        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-2 transition shadow-lg shadow-blue-600/30"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  )
}
