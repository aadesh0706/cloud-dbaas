import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  ArrowLeftIcon,
  LinkIcon,
  TrashIcon,
  CpuChipIcon,
  CircleStackIcon,
  ServerIcon,
  ChartBarIcon,
  TableCellsIcon,
  DocumentTextIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline'
import { databasesAPI, monitoringAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import MetricCard from '../components/MetricCard'
import DatabaseMetricsChart from '../components/DatabaseMetricsChart'
import ConnectionModal from '../components/ConnectionModal'
import DatabaseSchemaExplorer from '../components/DatabaseSchemaExplorer'
import RelationshipStory from '../components/RelationshipStory'
import toast from 'react-hot-toast'

const DatabaseDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const [connectionData, setConnectionData] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch database details
  const { data: response, isLoading } = useQuery(
    ['database', id],
    () => databasesAPI.getById(id),
    { refetchInterval: 10000 }
  )

  // Fetch database metrics
  const { data: metricsResponse } = useQuery(
    ['database-metrics', id],
    () => monitoringAPI.getDatabaseMetrics(id),
    { 
      refetchInterval: 30000,
      enabled: !!response?.database
    }
  )

  const database = response?.database
  const metrics = metricsResponse?.metrics

  const connectionMutation = useMutation(
    () => databasesAPI.getConnection(id),
    {
      onSuccess: (data) => {
        setConnectionData(data)
        setShowConnectionModal(true)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to get connection details')
      }
    }
  )

  const deleteMutation = useMutation(
    () => databasesAPI.delete(id),
    {
      onSuccess: () => {
        toast.success('Database deletion initiated')
        navigate('/databases')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete database')
      }
    }
  )

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${database.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!database) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Database not found</h2>
        <p className="text-gray-600 mb-4">The database you're looking for doesn't exist.</p>
        <Link to="/databases" className="btn-primary px-4 py-2">
          Back to Databases
        </Link>
      </div>
    )
  }

  const getEngineIcon = (engine) => {
    const icons = {
      mysql: '🐬',
      postgresql: '🐘',
      mongodb: '🍃'
    }
    return icons[engine] || '💾'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/databases')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{getEngineIcon(database.engine)}</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{database.name}</h1>
              <p className="text-gray-600 capitalize">
                {database.engine} {database.version}
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => connectionMutation.mutate()}
            disabled={connectionMutation.isLoading}
            className="btn-secondary px-4 py-2"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            {connectionMutation.isLoading ? 'Getting...' : 'Get Connection'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isLoading}
            className="btn-danger px-4 py-2"
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'relationships', name: 'Relationship Story', icon: BookOpenIcon },
            { id: 'schema', name: 'Schema & Data', icon: TableCellsIcon },
            { id: 'monitoring', name: 'Monitoring', icon: DocumentTextIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Status and Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium status-${database.status}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                database.status === 'running' ? 'bg-success-500' :
                database.status === 'creating' ? 'bg-warning-500 animate-pulse' :
                database.status === 'error' ? 'bg-error-500' : 'bg-gray-500'
              }`} />
              {database.status}
            </div>
            <p className="text-xs text-gray-500 mt-2">Current Status</p>
          </div>
        </div>

        <MetricCard
          title="CPU Allocation"
          value={`${database.cpu} cores`}
          icon={CpuChipIcon}
          color="primary"
        />

        <MetricCard
          title="Memory"
          value={`${database.memory} MB`}
          icon={ServerIcon}
          color="secondary"
        />

        <MetricCard
          title="Storage"
          value={`${database.storage} GB`}
          icon={CircleStackIcon}
          color="success"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DatabaseMetricsChart
          databaseId={id}
          metric="cpu"
          title="CPU Usage (%)"
          color="#3b82f6"
        />
        <DatabaseMetricsChart
          databaseId={id}
          metric="memory"
          title="Memory Usage (MB)"
          color="#10b981"
        />
      </div>

      {/* Kubernetes Info - Only show in production with real k8s data */}
      {database.k8sStatus && database.k8sStatus.replicas !== undefined && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kubernetes Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Replicas</h3>
              <p className="text-2xl font-bold text-gray-900">
                {database.k8sStatus.readyReplicas || 0} / {database.k8sStatus.replicas || 0}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Namespace</h3>
              <p className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                {database.k8s_namespace}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Deployment</h3>
              <p className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                {database.k8s_deployment}
              </p>
            </div>
          </div>

          {/* Pods */}
          {database.k8sStatus.pods && database.k8sStatus.pods.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pods</h3>
              <div className="space-y-2">
                {database.k8sStatus.pods.map((pod, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-sm font-mono">{pod.name}</span>
                    <div className="flex items-center space-x-4">
                      <span className={`status-${pod.status.toLowerCase()}`}>
                        {pod.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {pod.restarts} restarts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {/* Relationship Story Tab */}
      {activeTab === 'relationships' && (
        <div className="space-y-6">
          <RelationshipStory databaseId={id} />
        </div>
      )}

      {/* Schema & Data Tab */}
      {activeTab === 'schema' && (
        <div className="space-y-6">
          <DatabaseSchemaExplorer database={database} />
        </div>
      )}

      {/* Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Real-time Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="CPU Usage"
                value={`${parseFloat(metrics.cpu?.value || 0).toFixed(1)}%`}
                icon={CpuChipIcon}
                color="primary"
              />
              <MetricCard
                title="Memory Usage"
                value={`${parseFloat(metrics.memory?.value || 0).toFixed(1)} MB`}
                icon={ServerIcon}
                color="secondary"
              />
              <MetricCard
                title="Storage Usage"
                value={`${parseFloat(metrics.storage?.value || 0).toFixed(1)} GB`}
                icon={CircleStackIcon}
                color="success"
              />
              <MetricCard
                title="Queries/Second"
                value={parseFloat(metrics.queries_per_second?.value || 0).toFixed(1)}
                icon={ChartBarIcon}
                color="warning"
              />
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DatabaseMetricsChart
              databaseId={id}
              metric="cpu"
              title="CPU Usage (%)"
              color="#3b82f6"
            />
            <DatabaseMetricsChart
              databaseId={id}
              metric="memory"
              title="Memory Usage (MB)"
              color="#10b981"
            />
          </div>
        </div>
      )}

      {/* Connection Modal */}
      {showConnectionModal && connectionData && (
        <ConnectionModal
          isOpen={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          database={database}
          connectionData={connectionData}
        />
      )}
    </div>
  )
}

export default DatabaseDetail
