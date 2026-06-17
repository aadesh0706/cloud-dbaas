import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid
} from 'recharts'
import { databasesAPI, anomalyAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SignalIcon,
  SignalSlashIcon,
  BoltIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

const SEVERITY_CONFIG = {
  critical: { color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500', label: 'Critical', ring: '#ef4444' },
  high:     { color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500', label: 'High', ring: '#f97316' },
  medium:   { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500', label: 'Medium', ring: '#eab308' },
  low:      { color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-400', label: 'Low', ring: '#60a5fa' },
}

const TYPE_LABEL = {
  volume_burst: 'Volume Burst',
  volume_drop: 'Volume Drop',
  null_surge: 'Null Surge',
  value_spike: 'Value Spike',
  distribution_shift: 'Distribution Shift',
}

function AnomalyCard({ anomaly, onAcknowledge }) {
  const [expanded, setExpanded] = useState(true)
  const sev = SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.medium
  const isNew = !anomaly.is_acknowledged

  return (
    <div className={`border rounded-xl p-4 transition-all ${isNew ? 'border-l-4' : 'opacity-60 border-gray-200'}`}
      style={isNew ? { borderLeftColor: sev.ring } : {}}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${sev.dot} ${isNew && anomaly.severity === 'critical' ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sev.color}`}>
            {sev.label}
          </span>
          <span className="text-xs font-mono text-gray-600 truncate">
            {anomaly.table_name}{anomaly.column_name ? `.${anomaly.column_name}` : ''}
          </span>
          <span className="text-xs text-gray-400 hidden sm:block bg-gray-100 px-2 py-0.5 rounded">
            {TYPE_LABEL[anomaly.anomaly_type] || anomaly.anomaly_type}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {new Date(anomaly.detected_at).toLocaleTimeString()}
          </span>
          {isNew && (
            <button
              onClick={() => onAcknowledge(anomaly.id)}
              className="text-xs text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-300 px-2 py-1 rounded transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {expanded && anomaly.ai_explanation && (
        <div className="mt-3 ml-4">
          <div className="flex items-center gap-1.5 mb-1">
            <BoltIcon className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-semibold text-purple-700">AI Insight</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{anomaly.ai_explanation}</p>
        </div>
      )}
    </div>
  )
}

function RadarHealthChart({ anomalies, tables }) {
  const tableHealth = {}
  tables.forEach(t => { tableHealth[t] = 100 })
  anomalies.filter(a => !a.is_acknowledged).forEach(a => {
    const penalty = { critical: 60, high: 40, medium: 20, low: 10 }[a.severity] || 20
    tableHealth[a.table_name] = Math.max(0, (tableHealth[a.table_name] ?? 100) - penalty)
  })

  const data = Object.entries(tableHealth).slice(0, 8).map(([table, health]) => ({ table, health }))
  if (data.length === 0) return null

  const hasAnomaly = data.some(d => d.health < 100)
  const radarColor = hasAnomaly ? '#f97316' : '#22c55e'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${hasAnomaly ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
        <h3 className="text-sm font-semibold text-gray-900">Table Health Radar</h3>
        <span className="text-xs text-gray-500 ml-auto">100 = healthy</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="table" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Health" dataKey="health" stroke={radarColor} fill={radarColor} fillOpacity={0.25} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AnomalyOracle() {
  const queryClient = useQueryClient()
  const [selectedDbId, setSelectedDbId] = useState('')
  const [liveMode, setLiveMode] = useState(false)
  const [liveAnomalies, setLiveAnomalies] = useState([])
  const [streamStatus, setStreamStatus] = useState('disconnected')
  const eventSourceRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [computingBaseline, setComputingBaseline] = useState(false)

  const { data: databasesResponse } = useQuery('databases', databasesAPI.getAll)
  const databases = databasesResponse?.databases || []

  const { data: anomaliesData, refetch: refetchAnomalies } = useQuery(
    ['anomalies', selectedDbId],
    () => anomalyAPI.getAnomalies(selectedDbId),
    { enabled: !!selectedDbId, refetchInterval: liveMode ? false : 30000 }
  )

  const { data: baselineStatus, refetch: refetchBaseline } = useQuery(
    ['baseline-status', selectedDbId],
    () => anomalyAPI.getBaselineStatus(selectedDbId),
    { enabled: !!selectedDbId }
  )

  const acknowledgeAnomaly = useCallback(async (anomalyId) => {
    try {
      await anomalyAPI.acknowledge(anomalyId)
      refetchAnomalies()
      setLiveAnomalies(prev => prev.map(a => a.id === anomalyId ? { ...a, is_acknowledged: true } : a))
      toast.success('Anomaly dismissed')
    } catch {
      toast.error('Failed to dismiss anomaly')
    }
  }, [refetchAnomalies])

  const handleComputeBaseline = async () => {
    if (!selectedDbId) return
    setComputingBaseline(true)
    try {
      const result = await anomalyAPI.computeBaseline(selectedDbId)
      toast.success(result.message || 'Baseline computed')
      refetchBaseline()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to compute baseline')
    } finally {
      setComputingBaseline(false)
    }
  }

  const handleScanNow = async () => {
    if (!selectedDbId) return
    setScanning(true)
    try {
      const result = await anomalyAPI.scan(selectedDbId)
      if (result.anomalies?.length > 0) {
        toast.error(`${result.anomalies.length} anomal${result.anomalies.length === 1 ? 'y' : 'ies'} detected!`, { duration: 5000 })
      } else {
        toast.success(result.message || 'No anomalies detected — all tables normal')
      }
      refetchAnomalies()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  // SSE live mode
  useEffect(() => {
    if (liveMode && selectedDbId) {
      setStreamStatus('connecting')
      const url = anomalyAPI.getStreamUrl(selectedDbId)
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onopen = () => setStreamStatus('connected')

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'anomaly') {
            setLiveAnomalies(prev => [msg.data, ...prev].slice(0, 50))
            if (msg.data.severity === 'critical') {
              toast.error(`Critical anomaly: ${msg.data.table_name}`, { duration: 8000 })
            }
          } else if (msg.type === 'heartbeat') {
            setStreamStatus('connected')
          }
        } catch (_) {}
      }

      es.onerror = () => setStreamStatus('error')

      return () => {
        es.close()
        eventSourceRef.current = null
        setStreamStatus('disconnected')
      }
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setStreamStatus('disconnected')
    }
  }, [liveMode, selectedDbId])

  const allAnomalies = [...liveAnomalies, ...(anomaliesData?.anomalies || [])].filter(
    (a, i, arr) => arr.findIndex(x => x.id === a.id) === i
  )
  const activeAnomalies = allAnomalies.filter(a => !a.is_acknowledged)
  const tables = baselineStatus?.tables || []

  const criticalCount = activeAnomalies.filter(a => a.severity === 'critical').length
  const highCount = activeAnomalies.filter(a => a.severity === 'high').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Anomaly Oracle</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time data anomaly detection powered by NVIDIA LLM
          </p>
        </div>
        <div className="flex items-center gap-2">
          {streamStatus === 'connected' && (
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
          {streamStatus === 'error' && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              Stream error
            </span>
          )}
        </div>
      </div>

      {/* Stat pills */}
      {selectedDbId && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-2xl font-bold text-red-600">{criticalCount}</span>
            <span className="text-sm text-gray-500">Critical</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-2xl font-bold text-orange-600">{highCount}</span>
            <span className="text-sm text-gray-500">High</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-800">{activeAnomalies.length}</span>
            <span className="text-sm text-gray-500">Active</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">{tables.length}</span>
            <span className="text-sm text-gray-500">Tables monitored</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls + Radar */}
        <div className="space-y-4">
          {/* Database selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Monitor Database</h2>
            <select
              value={selectedDbId}
              onChange={e => { setSelectedDbId(e.target.value); setLiveAnomalies([]) }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a database…</option>
              {databases.map(db => (
                <option key={db.id} value={db.id}>
                  {db.name} ({db.engine})
                </option>
              ))}
            </select>

            {selectedDbId && (
              <div className="space-y-2">
                <button
                  onClick={handleComputeBaseline}
                  disabled={computingBaseline}
                  className="w-full flex items-center justify-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${computingBaseline ? 'animate-spin' : ''}`} />
                  {computingBaseline ? 'Computing…' : 'Compute Baseline'}
                </button>
                <button
                  onClick={handleScanNow}
                  disabled={scanning || !baselineStatus?.table_count}
                  className="w-full flex items-center justify-center gap-2 text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <BoltIcon className={`w-4 h-4 ${scanning ? 'animate-pulse' : ''}`} />
                  {scanning ? 'Scanning…' : 'Scan Now'}
                </button>
                <button
                  onClick={() => setLiveMode(v => !v)}
                  className={`w-full flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
                    liveMode
                      ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {liveMode ? <SignalIcon className="w-4 h-4" /> : <SignalSlashIcon className="w-4 h-4" />}
                  {liveMode ? 'Live Monitor ON' : 'Enable Live Monitor'}
                </button>
              </div>
            )}
          </div>

          {/* Baseline status */}
          {baselineStatus && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Baseline Status</h3>
              {baselineStatus.table_count === 0 ? (
                <p className="text-xs text-gray-500">No baseline computed yet. Click "Compute Baseline" to start.</p>
              ) : (
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Tables monitored</span>
                    <span className="font-medium">{baselineStatus.table_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Numeric columns</span>
                    <span className="font-medium">{baselineStatus.column_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last computed</span>
                    <span className="font-medium">
                      {baselineStatus.last_computed
                        ? new Date(baselineStatus.last_computed).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Radar chart */}
          {tables.length > 0 && (
            <RadarHealthChart anomalies={allAnomalies} tables={tables} />
          )}
        </div>

        {/* Right: Anomaly feed */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedDbId ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select a database to start monitoring anomalies.</p>
              <p className="text-xs text-gray-400 mt-2">
                Step 1: Select database → Step 2: Compute Baseline → Step 3: Scan Now
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  {activeAnomalies.length > 0 ? `${activeAnomalies.length} Active Anomal${activeAnomalies.length === 1 ? 'y' : 'ies'}` : 'No Active Anomalies'}
                </h2>
                {allAnomalies.length > activeAnomalies.length && (
                  <span className="text-xs text-gray-400">
                    {allAnomalies.length - activeAnomalies.length} dismissed
                  </span>
                )}
              </div>

              {allAnomalies.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <CheckCircleIcon className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">All tables are healthy</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {baselineStatus?.table_count
                      ? `Monitoring ${baselineStatus.table_count} table${baselineStatus.table_count === 1 ? '' : 's'}. Click "Scan Now" to check for anomalies.`
                      : 'Compute a baseline first, then run a scan.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {/* Active first */}
                  {activeAnomalies.map(anomaly => (
                    <AnomalyCard key={anomaly.id} anomaly={anomaly} onAcknowledge={acknowledgeAnomaly} />
                  ))}
                  {/* Dismissed */}
                  {allAnomalies.filter(a => a.is_acknowledged).length > 0 && (
                    <details className="group">
                      <summary className="text-xs text-gray-400 cursor-pointer select-none py-1">
                        {allAnomalies.filter(a => a.is_acknowledged).length} dismissed anomalies
                      </summary>
                      <div className="mt-2 space-y-2">
                        {allAnomalies.filter(a => a.is_acknowledged).map(anomaly => (
                          <AnomalyCard key={anomaly.id} anomaly={anomaly} onAcknowledge={acknowledgeAnomaly} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </>
          )}

          {/* How to demo section */}
          {selectedDbId && allAnomalies.length === 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <BoltIcon className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-purple-800">How to trigger a demo anomaly</p>
                  <ol className="text-xs text-purple-700 mt-1 space-y-1 list-decimal list-inside">
                    <li>Click "Compute Baseline" to snapshot current table counts</li>
                    <li>Insert many rows into a table (or delete rows)</li>
                    <li>Click "Scan Now" — the volume burst will be detected and explained by AI</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
