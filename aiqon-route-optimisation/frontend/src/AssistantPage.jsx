import React from 'react'
import AIAssistantPanel from './AIAssistantPanel'
import { SparklesIcon, CpuChipIcon, ShieldCheckIcon, CircleStackIcon } from '@heroicons/react/24/outline'

export default function AssistantPage() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#070b14] text-slate-100">
      {/* Left Information & Capabilities Column */}
      <div className="w-full lg:w-96 xl:w-[440px] bg-[#0B1120] border-r border-slate-800/80 p-5 space-y-5 shrink-0 overflow-y-auto">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <SparklesIcon className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-base font-bold text-white tracking-tight">
              RouteWise GenAI Assistant
            </h1>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enterprise decision-support copilot for international shipping route optimization, delay risk surveillance, and weather contingency planning.
          </p>
        </div>

        {/* Engine Transparency Architecture */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <CpuChipIcon className="w-4 h-4 text-cyan-400" />
            <span>Dual-Engine Intelligence Stack</span>
          </h2>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <strong className="text-emerald-400 block mb-0.5">1. Verified Logistics Intelligence</strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Directly interrogates RouteWise freight dispatch manifests, active port schedules, and route evaluations.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <strong className="text-blue-400 block mb-0.5">2. Predictive Delay Intelligence</strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Forecasts empirical maritime delay probabilities based on weather exposure, historical port dwell times, and multimodal corridor distance.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <strong className="text-amber-400 block mb-0.5">3. Multi-Factor Route Optimization</strong>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ranks all corridor alternatives across 7 weighted dimensions: cost, transit speed, delay risk, port congestion, geopolitics, weather, and carbon.
              </p>
            </div>
          </div>
        </div>

        {/* Safety & Compliance Constraints */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <h3 className="text-[11px] font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
            <span>Safety & Governance Guardrails</span>
          </h3>
          <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>Strictly read-only tools: cannot modify shipment records or approve routes autonomously.</li>
            <li>Zero hallucinations: missing or unverified corridor metrics are never fabricated.</li>
            <li>Automatic deterministic fallback when external cloud LLM credentials are not configured.</li>
          </ul>
        </div>
      </div>

      {/* Main AI Chat Workspace Column */}
      <div className="flex-1 flex justify-center h-full bg-[#070b14] overflow-hidden">
        <div className="w-full max-w-2xl h-full flex flex-col border-x border-slate-800/80 bg-[#0B1120]">
          <AIAssistantPanel />
        </div>
      </div>
    </div>
  )
}
