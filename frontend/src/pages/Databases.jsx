import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  CircleStackIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { Menu } from '@headlessui/react'
import { databasesAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import DatabaseCard from '../components/DatabaseCard'
import { DatabaseCardSkeleton, Skeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { useDebouncedSearch } from '../hooks/useDebounce'
import clsx from 'clsx'

const Databases = () => {
  const [filterEngine, setFilterEngine] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const { searchTerm, setSearchTerm, debouncedTerm } = useDebouncedSearch('', 300)

  const { data: response, isLoading, refetch } = useQuery(
    'databases',
    databasesAPI.getAll
  )

  const databases = response?.databases || []

  // Filter databases
  const filteredDatabases = databases.filter(db => {
    const matchesSearch = db.name.toLowerCase().includes(debouncedTerm.toLowerCase()) ||
                         db.engine.toLowerCase().includes(debouncedTerm.toLowerCase())
    const matchesEngine = filterEngine === 'all' || db.engine === filterEngine
    const matchesStatus = filterStatus === 'all' || db.status === filterStatus
    
    return matchesSearch && matchesEngine && matchesStatus
  })

  const engines = ['all', ...new Set(databases.map(db => db.engine))]
  const statuses = ['all', ...new Set(databases.map(db => db.status))]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton variant="title" className="w-32 mb-2" />
            <Skeleton variant="text" className="w-48" />
          </div>
          <Skeleton variant="button" className="w-40" />
        </div>
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton variant="input" className="flex-1" />
            <Skeleton variant="input" className="w-full sm:w-32" />
            <Skeleton variant="input" className="w-full sm:w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <DatabaseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Databases</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your database instances</p>
        </div>
        <Link
          to="/databases/new"
          className="btn-primary px-4 py-2 w-fit"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Database
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search databases..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Engine Filter */}
          <select
            className="input w-full sm:w-auto"
            value={filterEngine}
            onChange={(e) => setFilterEngine(e.target.value)}
          >
            {engines.map(engine => (
              <option key={engine} value={engine}>
                {engine === 'all' ? 'All Engines' : engine.charAt(0).toUpperCase() + engine.slice(1)}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="input w-full sm:w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Databases Grid */}
      {filteredDatabases.length === 0 ? (
        <EmptyState
          icon={CircleStackIcon}
          title={databases.length === 0 ? 'No databases yet' : 'No databases match your filters'}
          description={databases.length === 0 
            ? 'Create your first database to get started'
            : 'Try adjusting your search or filter criteria'
          }
          actionLabel={databases.length === 0 ? 'Create Database' : undefined}
          actionHref={databases.length === 0 ? '/databases/new' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatabases.map((database) => (
            <DatabaseCard
              key={database.id}
              database={database}
              onRefresh={refetch}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Databases
