import React from 'react'
import { useQuery } from 'react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { monitoringAPI } from '../services/api'
import LoadingSpinner from './LoadingSpinner'

const DatabaseMetricsChart = ({ databaseId, metric, title, color = '#3b82f6' }) => {
  const { data: response, isLoading } = useQuery(
    ['database-metrics-history', databaseId, metric],
    () => monitoringAPI.getDatabaseHistory(databaseId, metric),
    {
      refetchInterval: 60000, // Refresh every minute
      enabled: !!databaseId
    }
  )

  const data = response?.data || []

  const formatData = (data) => {
    return data.map(point => ({
      timestamp: new Date(point.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      value: parseFloat(point.value)
    }))
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm" style={{ color }}>
            {title}: {payload[0].value.toFixed(2)}
            {metric === 'cpu' && '%'}
            {metric === 'memory' && ' MB'}
            {metric === 'connections' && ' connections'}
          </p>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  const formattedData = formatData(data)

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        {formattedData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default DatabaseMetricsChart
