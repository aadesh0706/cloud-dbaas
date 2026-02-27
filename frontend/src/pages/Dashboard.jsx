import React from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { 
  CircleStackIcon, 
  FolderIcon, 
  ChartBarIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  CpuChipIcon,
  ServerIcon
} from '@heroicons/react/24/outline'
import { databasesAPI, projectsAPI, monitoringAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import MetricCard from '../components/MetricCard'
import DatabaseStatusChart from '../components/DatabaseStatusChart'

const Dashboard = () => {
  // Fetch dashboard data
  const { data: databases = [], isLoading: loadingDatabases } = useQuery(
    'databases',
    () => databasesAPI.getAll().then(res => res.databases)
  )

  const { data: projects = [], isLoading: loadingProjects } = useQuery(
    'projects',
    () => projectsAPI.getAll().then(res => res.projects)
  )

  const { data: systemMetrics, isLoading: loadingMetrics } = useQuery(
    'systemMetrics',
    () => monitoringAPI.getSystemMetrics().then(res => res.systemMetrics),
    { refetchInterval: 30000 } // Refresh every 30 seconds
  )

  const isLoading = loadingDatabases || loadingProjects || loadingMetrics

  // Calculate statistics
  const stats = {
    totalDatabases: databases.length,
    runningDatabases: databases.filter(db => db.status === 'running').length,
    totalProjects: projects.length,
    totalStorage: databases.reduce((sum, db) => sum + db.storage, 0)
  }

  const databasesByEngine = databases.reduce((acc, db) => {
    acc[db.engine] = (acc[db.engine] || 0) + 1
    return acc
  }, {})

  const databasesByStatus = databases.reduce((acc, db) => {
    acc[db.status] = (acc[db.status] || 0) + 1
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Overview of your database infrastructure</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/databases/new"
            className="btn-primary px-4 py-2"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Database
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Databases"
          value={stats.totalDatabases}
          icon={CircleStackIcon}
          trend={databases.length > 0 ? '+12%' : null}
          trendDirection="up"
          color="primary"
        />
        <MetricCard
          title="Running Databases"
          value={stats.runningDatabases}
          icon={ServerIcon}
          trend={`${Math.round((stats.runningDatabases / stats.totalDatabases) * 100) || 0}%`}
          trendDirection="up"
          color="success"
        />
        <MetricCard
          title="Projects"
          value={stats.totalProjects}
          icon={FolderIcon}
          trend={projects.length > 0 ? '+5%' : null}
          trendDirection="up"
          color="secondary"
        />
        <MetricCard
          title="Total Storage"
          value={`${stats.totalStorage} GB`}
          icon={CpuChipIcon}
          trend={stats.totalStorage > 0 ? '+8%' : null}
          trendDirection="up"
          color="warning"
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Status Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Status</h3>
          <DatabaseStatusChart data={databasesByStatus} />
        </div>

        {/* Engine Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Engines</h3>
          <div className="space-y-3">
            {Object.entries(databasesByEngine).map(([engine, count]) => (
              <div key={engine} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={clsx(
                    'w-3 h-3 rounded-full mr-3',
                    engine === 'mysql' && 'bg-blue-500',
                    engine === 'postgresql' && 'bg-indigo-500',
                    engine === 'mongodb' && 'bg-green-500'
                  )} />
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {engine}
                  </span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{count} databases</span>
              </div>
            ))}
            {Object.keys(databasesByEngine).length === 0 && (
              <p className="text-gray-500 text-center py-4">No databases created yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Databases */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Databases</h3>
          <Link
            to="/databases"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View all
          </Link>
        </div>
        
        {databases.length === 0 ? (
          <div className="text-center py-8">
            <CircleStackIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No databases created yet</p>
            <Link to="/databases/new" className="btn-primary px-4 py-2">
              Create your first database
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {databases.slice(0, 5).map((database) => (
                  <tr key={database.id} className="hover:bg-gray-50 dark:bg-gray-900">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/databases/${database.id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        {database.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">
                        {database.engine}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-${database.status}`}>
                        {database.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {database.storage} GB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Health */}
      {systemMetrics && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {parseFloat(systemMetrics.totalCpuUsage?.value || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">
                {parseFloat(systemMetrics.totalMemoryUsage?.value || 0).toFixed(1)} GB
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600">
                {parseFloat(systemMetrics.totalStorageUsage?.value || 0).toFixed(1)} GB
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Storage Usage</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
