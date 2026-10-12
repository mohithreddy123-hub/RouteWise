import React, { useState, useEffect, useRef } from 'react'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline'
import { sendAssistantChat, getSuggestedPrompts, getAssistantStatus } from './api'

export default function AIAssistantPanel({ activeShipmentId = null, onSelectRoute = null }) {
  const [messages, setMessages] = useState([
    {
      id: 'msg-initial-user',
      role: 'user',
      content: 'Find the cheapest route from Shanghai to Hyderabad that takes less than 20 days.',
      timestamp: '10:22 AM',
    },
    {
      id: 'msg-initial-assistant',
      role: 'assistant',
      content: 'Based on your criteria, here is the best option from current route variants:',
      route_recommendation: {
        route_id: 'RTE-001-B',
        route_name: 'Route B (RTE-001-B)',
        badge: 'Recommended',
        total_cost: '$2,850',
        transit_time: '16 days',
        delay_probability: '11.6% (Low)',
        key_route: 'CNSHA → SGSGP → INHYD',
        explanation:
          'This route meets your requirement of less than 20 days and has the lowest cost among eligible options, with a low predicted delay risk.',
      },
      provider: 'Groq',
      model: 'openai/gpt-oss-20b',
      tool_calls: [
        { tool: 'search_shipments', args: { query: 'Shanghai to Hyderabad' } },
        { tool: 'evaluate_routes_for_shipment', args: { shipment_id: 'SHP-001' } },
      ],
      timestamp: '10:22 AM',
    },
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [prompts, setPrompts] = useState([
    'Find the best route from Shanghai to Hyderabad',
    'Why was Route A recommended?',
    'What happens if there is a cyclone in the Bay of Bengal?',
    'Show me high-risk shipments this month',
  ])
  const [status, setStatus] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    async function loadMeta() {
      try {
        const [promptsData, statusData] = await Promise.all([
          getSuggestedPrompts().catch(() => null),
          getAssistantStatus().catch(() => null),
        ])
        if (promptsData && Array.isArray(promptsData)) {
          setPrompts(promptsData)
        }
        if (statusData) {
          setStatus(statusData)
        }
      } catch (err) {
        console.warn('Could not fetch assistant metadata:', err)
      }
    }
    loadMeta()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (messageText) => {
    const textToSend = (messageText || input).trim()
    if (!textToSend || loading) return

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      // Map history into conversation turns
      const conversationHistory = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await sendAssistantChat({
        message: textToSend,
        conversation_history: conversationHistory,
        shipment_id: activeShipmentId,
      })

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        route_recommendation: response.route_recommendation,
        tool_calls: response.tool_calls || [],
        provider: response.provider || 'RouteWise AI',
        model: response.model || 'Deterministic Reasoner',
        note: response.note,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error('Chat error:', err)
      setError(
        err.response?.data?.detail ||
          'Failed to communicate with AI Assistant. Ensure the backend server is reachable.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setError(null)
  }

  return (
    <aside className="w-full lg:w-[380px] xl:w-[410px] bg-slate-900/95 border-l border-slate-800 flex flex-col h-full shrink-0 shadow-2xl relative z-20">
      {/* Header matching reference */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <SparklesIcon className="w-4 h-4 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  AI Logistics Assistant
                </h2>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                  Beta
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClear}
            title="Clear Chat"
            className="text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Ask questions about shipments, routes, risks, or get AI-powered insights from your logistics data.
        </p>

        {status && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status.configured ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
            />
            <span className="truncate">
              Provider: <strong className="text-slate-200">{status.provider}</strong>
              {status.model ? ` (${status.model})` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Suggested Questions Section */}
      <div className="p-3 border-b border-slate-800/60 bg-slate-950/40">
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Suggested Questions</span>
        </div>
        <div className="space-y-1.5">
          {prompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="w-full text-left text-xs text-slate-300 hover:text-white bg-slate-800/50 hover:bg-blue-900/30 border border-slate-700/60 hover:border-blue-500/40 rounded-lg px-2.5 py-2 transition-all flex items-start gap-2 group"
            >
              <span className="text-blue-400 group-hover:text-blue-300 shrink-0 text-sm leading-none mt-0.5">
                {idx === 0 ? '🧭' : idx === 1 ? '❓' : idx === 2 ? '⚠️' : '📦'}
              </span>
              <span className="line-clamp-2 leading-snug">{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10 px-4 text-slate-400">
            <SparklesIcon className="w-8 h-8 text-blue-500/40 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-300">No messages yet</div>
            <p className="text-xs text-slate-400 mt-1">
              Select one of the suggested questions above or enter a custom logistics query.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === 'user'

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              {isUser ? (
                /* User Bubble matching bright blue bubble in reference image */
                <div className="max-w-[88%] bg-blue-600 text-white px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-xs leading-relaxed shadow-md shadow-blue-900/30 font-normal">
                  {m.content}
                </div>
              ) : (
                /* Assistant Bubble */
                <div className="w-full space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <SparklesIcon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                        {m.content}
                      </div>

                      {/* Structured Route Recommendation Card (Matching Design Reference) */}
                      {m.route_recommendation && (
                        <div className="bg-slate-950/80 border border-blue-500/30 rounded-xl p-3 shadow-lg space-y-2.5 mt-2">
                          {/* Card Header */}
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                              <span>{m.route_recommendation.route_name || m.route_recommendation.route_id}</span>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                              {m.route_recommendation.badge || 'Recommended'}
                            </span>
                          </div>

                          {/* Metric Rows */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <CurrencyDollarIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-slate-400">Total Cost:</span>
                              <strong className="text-white ml-auto">
                                {m.route_recommendation.total_cost}
                              </strong>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-300">
                              <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-slate-400">Transit Time:</span>
                              <strong className="text-white ml-auto">
                                {m.route_recommendation.transit_time}
                              </strong>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-300 col-span-2">
                              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-slate-400">Delay Prob (ML):</span>
                              <span className="text-emerald-400 font-medium ml-1">
                                {m.route_recommendation.delay_probability}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-300 col-span-2">
                              <ArrowsRightLeftIcon className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="text-slate-400">Key Route:</span>
                              <span className="text-cyan-300 font-mono text-[10px] ml-auto truncate max-w-[190px]">
                                {m.route_recommendation.key_route}
                              </span>
                            </div>
                          </div>

                          {/* Recommendation explanation paragraph */}
                          {m.route_recommendation.explanation && (
                            <p className="text-[11px] text-slate-300/90 leading-relaxed pt-1 border-t border-slate-800/80">
                              {m.route_recommendation.explanation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Operational Intelligence Sources Consulted */}
                      {m.tool_calls && m.tool_calls.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400 pt-1">
                          <CheckCircleIcon className="w-3 h-3 text-emerald-400 inline" />
                          <span>Operational Intelligence:</span>
                          {m.tool_calls.map((t, i) => {
                            const labels = {
                              evaluate_routes_for_shipment: 'Route Optimization Engine',
                              search_shipments: 'Manifest Inventory Lookup',
                              get_shipment_details: 'Consignment Specifications',
                              simulate_weather_impact: 'Maritime Weather Analysis',
                              get_system_overview: 'Global Fleet Surveillance',
                            }
                            return (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-medium text-[9px] border border-slate-700"
                              >
                                {labels[t.tool] || t.tool}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <SparklesIcon className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="animate-pulse">Consulting RouteWise Logistics Engine...</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/60 border border-rose-600/40 text-rose-200 text-xs p-3 rounded-lg flex items-start gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Assistant Notice</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form at Bottom */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 pr-8"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shadow-blue-600/30 shrink-0"
            title="Send Message"
          >
            <PaperAirplaneIcon className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </aside>
  )
}
