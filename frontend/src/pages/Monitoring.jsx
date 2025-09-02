import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ServerIcon
} from '@heroicons/react/24/outline'
import { monitoringAPI, databasesAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import DatabaseMetricsChart from '../components/DatabaseMetricsChart'
import MetricCard from '../components/MetricCard'

const Monitoring = () => {
  const [selectedDatabase, setSelectedDatabase] = useState('')
  const [timeRange, setTimeRange] = useState('1h')

  // Fetch databases for selection
  const { data: databasesResponse } = useQuery(
    'databases',
    () => databasesAPI.getAll()
  )

  // Fetch system metrics
  const { data: systemMetrics, isLoading: loadingSystemMetrics } = useQuery(
    'systemMetrics',
    () => monitoringAPI.getSystemMetrics().then(res => res.systemMetrics),
    { refetchInterval: 30000 }
  )

  // Fetch alerts
  const { data: alertsResponse, isLoading: loadingAlerts } = useQuery(
    'alerts',
    () => monitoringAPI.getAlerts(),
    { refetchInterval: 60000 }
  )

  const databases = databasesResponse?.databases || []
  const alerts = alertsResponse?.alerts || []

  // Get first database as default selection
  const defaultDatabase = databases.length > 0 && !selectedDatabase 
    ? databases[0].id 
    : selectedDatabase

  const selectedDatabaseData = databases.find(db => db.id === defaultDatabase)

  const formatAlertTime = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const getAlertSeverityColor = (severity) => {
    const colors = {
      critical: 'text-error-600 bg-error-50 border-error-200',
      warning: 'text-warning-600 bg-warning-50 border-warning-200',
      info: 'text-primary-600 bg-primary-50 border-primary-200'
    }
    return colors[severity] || colors.info
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
        <p className="text-gray-600">Real-time monitoring and alerts for your databases</p>
      </div>

      {/* Database Selection */}
      {databases.length > 0 && (
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="database" className="label">
                Select Database
              </label>
              <select
                id="database"
                className="input"
                value={selectedDatabase}
                onChange={(e) => setSelectedDatabase(e.target.value)}
              >
                {databases.map(db => (
                  <option key={db.id} value={db.id}>
                    {db.name} ({db.engine})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="timeRange" className="label">
                Time Range
              </label>
              <select
                id="timeRange"
                className="input"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* System Overview */}
      {systemMetrics && !loadingSystemMetrics && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Databases"
              value={parseInt(systemMetrics.totalDatabases?.value || 0)}
              icon={ServerIcon}
              color="primary"
            />
            <MetricCard
              title="CPU Usage"
              value={`${parseFloat(systemMetrics.totalCpuUsage?.value || 0).toFixed(1)}%`}
              icon={ChartBarIcon}
              color="secondary"
            />
            <MetricCard
              title="Memory Usage"
              value={`${parseFloat(systemMetrics.totalMemoryUsage?.value || 0).toFixed(1)} GB`}
              icon={ServerIcon}
              color="success"
            />
            <MetricCard
              title="Storage Usage"
              value={`${parseFloat(systemMetrics.totalStorageUsage?.value || 0).toFixed(1)} GB`}
              icon={ChartBarIcon}
              color="warning"
            />
          </div>
        </div>
      )}

      {/* Alerts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h2>
        {loadingAlerts ? (
          <div className="card p-6">
            <LoadingSpinner size="md" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="card p-6 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Alerts</h3>
            <p className="text-gray-600">All systems are running normally</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg ${getAlertSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{alert.alertname}</h3>
                    {alert.summary && (
                      <p className="text-sm mt-1">{alert.summary}</p>
                    )}
                    {alert.description && (
                      <p className="text-sm mt-1 opacity-90">{alert.description}</p>
                    )}
                  </div>
                  <div className="ml-4 text-sm opacity-75">
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {formatAlertTime(alert.activeAt)}
                    </div>
                    <div className="mt-1 text-xs">
                      Severity: {alert.severity}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Database-Specific Metrics */}
      {defaultDatabase && selectedDatabaseData && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Database Metrics - {selectedDatabaseData.name}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DatabaseMetricsChart
              databaseId={defaultDatabase}
              metric="cpu"
              title="CPU Usage (%)"
              color="#3b82f6"
            />
            <DatabaseMetricsChart
              databaseId={defaultDatabase}
              metric="memory"
              title="Memory Usage (MB)"
              color="#10b981"
            />
            <DatabaseMetricsChart
              databaseId={defaultDatabase}
              metric="connections"
              title="Active Connections"
              color="#f59e0b"
            />
            <DatabaseMetricsChart
              databaseId={defaultDatabase}
              metric="disk"
              title="Disk Usage (GB)"
              color="#ef4444"
            />
          </div>
        </div>
      )}

      {/* No Databases Message */}
      {databases.length === 0 && (
        <div className="text-center py-12">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Databases to Monitor</h3>
          <p className="text-gray-600 mb-6">
            Create your first database to start monitoring its performance
          </p>
          <a
            href="/databases/new"
            className="btn-primary px-6 py-3"
          >
            Create Database
          </a>
        </div>
      )}

      {/* Grafana Integration */}
      {defaultDatabase && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Monitoring</h3>
          <p className="text-gray-600 mb-4">
            View detailed metrics and create custom dashboards in Grafana
          </p>
          <button
            onClick={() => {
              const grafanaUrl = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3001'
              window.open(`${grafanaUrl}/d/database-${defaultDatabase}/database-monitoring`, '_blank')
            }}
            className="btn-primary px-4 py-2"
          >
            Open in Grafana
          </button>
        </div>
      )}
    </div>
  )
}

export default Monitoring
