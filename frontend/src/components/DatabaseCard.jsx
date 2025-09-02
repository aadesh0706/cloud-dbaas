import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from '@headlessui/react'
import {
  EllipsisVerticalIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  LinkIcon,
  ChartBarIcon,
  CpuChipIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import { databasesAPI } from '../services/api'
import { useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const DatabaseCard = ({ database, onRefresh }) => {
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation(
    (id) => databasesAPI.delete(id),
    {
      onSuccess: () => {
        toast.success('Database deletion initiated')
        queryClient.invalidateQueries('databases')
        onRefresh()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete database')
      }
    }
  )

  const connectionMutation = useMutation(
    (id) => databasesAPI.getConnection(id),
    {
      onSuccess: (data) => {
        setShowConnectionModal(true)
        // You could also copy to clipboard here
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to get connection details')
      }
    }
  )

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${database.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(database.id)
    }
  }

  const getEngineIcon = (engine) => {
    const icons = {
      mysql: '🐬',
      postgresql: '🐘',
      mongodb: '🍃'
    }
    return icons[engine] || '💾'
  }

  const getStatusColor = (status) => {
    const colors = {
      running: 'text-success-600 bg-success-50',
      creating: 'text-warning-600 bg-warning-50',
      scaling: 'text-primary-600 bg-primary-50',
      error: 'text-error-600 bg-error-50',
      deleting: 'text-gray-600 bg-gray-50'
    }
    return colors[status] || 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="card-hover p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{getEngineIcon(database.engine)}</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              <Link
                to={`/databases/${database.id}`}
                className="hover:text-primary-600 transition-colors"
              >
                {database.name}
              </Link>
            </h3>
            <p className="text-sm text-gray-500 capitalize">
              {database.engine} {database.version}
            </p>
          </div>
        </div>

        <Menu as="div" className="relative">
          <Menu.Button className="p-1 text-gray-400 hover:text-gray-600">
            <EllipsisVerticalIcon className="w-5 h-5" />
          </Menu.Button>
          <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    to={`/databases/${database.id}`}
                    className={clsx(
                      active ? 'bg-gray-100' : '',
                      'flex items-center px-4 py-2 text-sm text-gray-700'
                    )}
                  >
                    <ChartBarIcon className="w-4 h-4 mr-3" />
                    View Details
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => connectionMutation.mutate(database.id)}
                    className={clsx(
                      active ? 'bg-gray-100' : '',
                      'flex items-center w-full px-4 py-2 text-sm text-gray-700'
                    )}
                  >
                    <LinkIcon className="w-4 h-4 mr-3" />
                    Get Connection
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isLoading}
                    className={clsx(
                      active ? 'bg-gray-100' : '',
                      'flex items-center w-full px-4 py-2 text-sm text-error-600'
                    )}
                  >
                    <TrashIcon className="w-4 h-4 mr-3" />
                    Delete
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
      </div>

      {/* Status */}
      <div className="mt-4">
        <span className={clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          getStatusColor(database.status)
        )}>
          <div className={clsx(
            'w-1.5 h-1.5 rounded-full mr-1.5',
            database.status === 'running' && 'bg-success-500',
            database.status === 'creating' && 'bg-warning-500 animate-pulse',
            database.status === 'scaling' && 'bg-primary-500 animate-pulse',
            database.status === 'error' && 'bg-error-500',
            database.status === 'deleting' && 'bg-gray-500 animate-pulse'
          )} />
          {database.status}
        </span>
      </div>

      {/* Resource Info */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center text-gray-600">
          <CpuChipIcon className="w-4 h-4 mr-2" />
          {database.cpu} CPU, {database.memory} MB
        </div>
        <div className="flex items-center text-gray-600">
          <CircleStackIcon className="w-4 h-4 mr-2" />
          {database.storage} GB Storage
        </div>
      </div>

      {/* Project Info */}
      {database.projectName && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Project: <span className="font-medium">{database.projectName}</span>
          </p>
        </div>
      )}

      {/* Creation Date */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Created {new Date(database.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

export default DatabaseCard
