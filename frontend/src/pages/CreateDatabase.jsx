import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from 'react-query'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { databasesAPI, projectsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CreateDatabase = () => {
  const navigate = useNavigate()
  const [selectedEngine, setSelectedEngine] = useState('postgresql')

  const { data: projectsResponse } = useQuery('projects', projectsAPI.getAll)
  const projects = projectsResponse?.projects || []

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      engine: 'postgresql',
      version: '15',
      storage: 10,
      cpu: 1,
      memory: 1024,
      replicas: 1
    }
  })

  const createMutation = useMutation(
    (data) => databasesAPI.create(data),
    {
      onSuccess: (response) => {
        toast.success('Database creation initiated!')
        navigate('/databases')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create database')
      }
    }
  )

  const engineConfigs = {
    mysql: {
      name: 'MySQL',
      icon: '🐬',
      versions: ['8.0', '5.7'],
      defaultPort: 3306,
      description: 'Popular open-source relational database'
    },
    postgresql: {
      name: 'PostgreSQL',
      icon: '🐘',
      versions: ['15', '14', '13'],
      defaultPort: 5432,
      description: 'Advanced open-source relational database'
    },
    mongodb: {
      name: 'MongoDB',
      icon: '🍃',
      versions: ['6.0', '5.0', '4.4'],
      defaultPort: 27017,
      description: 'Document-oriented NoSQL database'
    }
  }

  const handleEngineChange = (engine) => {
    setSelectedEngine(engine)
    setValue('engine', engine)
    setValue('version', engineConfigs[engine].versions[0])
  }

  const onSubmit = (data) => {
    createMutation.mutate({
      ...data,
      storage: parseInt(data.storage),
      cpu: parseFloat(data.cpu),
      memory: parseInt(data.memory),
      replicas: parseInt(data.replicas)
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/databases')}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Database</h1>
          <p className="text-gray-600 dark:text-gray-400">Deploy a new database instance</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Engine Selection */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Engine</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(engineConfigs).map(([engine, config]) => (
              <div
                key={engine}
                className={clsx(
                  'p-4 border rounded-lg cursor-pointer transition-all',
                  selectedEngine === engine
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => handleEngineChange(engine)}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{config.icon}</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{config.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Basic Configuration */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="label">
                Database Name
              </label>
              <input
                id="name"
                type="text"
                className={clsx('input', errors.name && 'border-error-300')}
                {...register('name', {
                  required: 'Database name is required',
                  minLength: { value: 3, message: 'Name must be at least 3 characters' },
                  pattern: {
                    value: /^[a-zA-Z0-9-]+$/,
                    message: 'Name can only contain letters, numbers, and hyphens'
                  }
                })}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="version" className="label">
                Version
              </label>
              <select
                id="version"
                className="input"
                {...register('version', { required: 'Version is required' })}
              >
                {engineConfigs[selectedEngine].versions.map(version => (
                  <option key={version} value={version}>{version}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="projectId" className="label">
                Project (Optional)
              </label>
              <select
                id="projectId"
                className="input"
                {...register('projectId')}
              >
                <option value="">No Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resource Configuration */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resource Allocation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="cpu" className="label">
                CPU Cores
              </label>
              <select
                id="cpu"
                className="input"
                {...register('cpu', { required: 'CPU allocation is required' })}
              >
                <option value="0.5">0.5 CPU</option>
                <option value="1">1 CPU</option>
                <option value="2">2 CPU</option>
                <option value="4">4 CPU</option>
              </select>
            </div>

            <div>
              <label htmlFor="memory" className="label">
                Memory (MB)
              </label>
              <select
                id="memory"
                className="input"
                {...register('memory', { required: 'Memory allocation is required' })}
              >
                <option value="512">512 MB</option>
                <option value="1024">1 GB</option>
                <option value="2048">2 GB</option>
                <option value="4096">4 GB</option>
                <option value="8192">8 GB</option>
              </select>
            </div>

            <div>
              <label htmlFor="storage" className="label">
                Storage (GB)
              </label>
              <select
                id="storage"
                className="input"
                {...register('storage', { required: 'Storage allocation is required' })}
              >
                <option value="10">10 GB</option>
                <option value="20">20 GB</option>
                <option value="50">50 GB</option>
                <option value="100">100 GB</option>
              </select>
            </div>

            <div>
              <label htmlFor="replicas" className="label">
                Replicas
              </label>
              <select
                id="replicas"
                className="input"
                {...register('replicas')}
              >
                <option value="1">1 (Single instance)</option>
                <option value="2">2 (High availability)</option>
                <option value="3">3 (High availability + read replicas)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cost Estimation */}
        <div className="card p-6 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Estimated Cost</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>CPU ({watch('cpu')} cores)</span>
              <span>${(parseFloat(watch('cpu')) * 0.05 * 24 * 30).toFixed(2)}/month</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Memory ({watch('memory')} MB)</span>
              <span>${(parseInt(watch('memory')) / 1024 * 0.02 * 24 * 30).toFixed(2)}/month</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Storage ({watch('storage')} GB)</span>
              <span>${(parseInt(watch('storage')) * 0.1).toFixed(2)}/month</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total Estimated Cost</span>
              <span className="text-primary-600">
                ${(
                  parseFloat(watch('cpu')) * 0.05 * 24 * 30 +
                  parseInt(watch('memory')) / 1024 * 0.02 * 24 * 30 +
                  parseInt(watch('storage')) * 0.1
                ).toFixed(2)}/month
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/databases')}
            className="btn-secondary px-6 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isLoading}
            className="btn-primary px-6 py-2"
          >
            {createMutation.isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Database'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateDatabase
