import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ArrowLeftIcon, CircleStackIcon, PlusIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { projectsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import DatabaseCard from '../components/DatabaseCard'
import toast from 'react-hot-toast'

const ProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: response, isLoading } = useQuery(
    ['project', id],
    () => projectsAPI.getById(id)
  )

  const { data: statsResponse } = useQuery(
    ['project-stats', id],
    () => projectsAPI.getStats(id),
    { enabled: !!response?.project }
  )

  const project = response?.project
  const stats = statsResponse?.stats
  const queryClient = useQueryClient()
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', tags: [] })
  const [tagInput, setTagInput] = useState('')

  const updateMutation = useMutation(
    (data) => projectsAPI.update(id, data),
    {
      onSuccess: () => {
        toast.success('Project updated successfully')
        queryClient.invalidateQueries(['project', id])
        setShowEditModal(false)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update project')
      }
    }
  )

  const openEdit = () => {
    setEditForm({
      name: project.name,
      description: project.description || '',
      tags: project.tags ? [...project.tags] : []
    })
    setTagInput('')
    setShowEditModal(true)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(editForm)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !editForm.tags.includes(t) && editForm.tags.length < 10) {
      setEditForm(f => ({ ...f, tags: [...f.tags, t] }))
      setTagInput('')
    }
  }

  const removeTag = (tag) => {
    setEditForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Project not found</h2>
        <p className="text-gray-600 mb-4">The project you're looking for doesn't exist.</p>
        <Link to="/projects" className="btn-primary px-4 py-2">
          Back to Projects
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button onClick={openEdit} className="btn-secondary px-4 py-2">
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit Project
          </button>
          <Link
            to="/databases/new"
            state={{ projectId: project.id }}
            className="btn-primary px-4 py-2"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Database
          </Link>
        </div>
      </div>

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 text-sm font-medium bg-primary-100 text-primary-800 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Project Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalDatabases}</div>
            <div className="text-sm text-gray-600">Total Databases</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-success-600">{stats.runningDatabases}</div>
            <div className="text-sm text-gray-600">Running</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-primary-600">{stats.totalStorage.toFixed(1)} GB</div>
            <div className="text-sm text-gray-600">Total Storage</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-secondary-600">{stats.totalCpu.toFixed(1)}</div>
            <div className="text-sm text-gray-600">CPU Cores</div>
          </div>
        </div>
      )}

      {/* Resource Usage Overview */}
      {stats && stats.totalDatabases > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">CPU Usage</h3>
              <div className="text-xl font-bold text-gray-900">
                {stats.totalCpu.toFixed(1)} cores
              </div>
              <div className="text-sm text-gray-500">
                Avg: {stats.avgCpu.toFixed(1)} per database
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Memory Usage</h3>
              <div className="text-xl font-bold text-gray-900">
                {(stats.totalMemory / 1024).toFixed(1)} GB
              </div>
              <div className="text-sm text-gray-500">
                Avg: {(stats.avgMemory / 1024).toFixed(1)} GB per database
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Storage Usage</h3>
              <div className="text-xl font-bold text-gray-900">
                {stats.totalStorage.toFixed(1)} GB
              </div>
              <div className="text-sm text-gray-500">
                {stats.totalDatabases} databases
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Status Breakdown */}
      {stats && stats.totalDatabases > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-success-600">{stats.runningDatabases}</div>
              <div className="text-sm text-gray-600">Running</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-warning-600">{stats.creatingDatabases}</div>
              <div className="text-sm text-gray-600">Creating</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-error-600">{stats.errorDatabases}</div>
              <div className="text-sm text-gray-600">Error</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-600">
                {stats.totalDatabases - stats.runningDatabases - stats.creatingDatabases - stats.errorDatabases}
              </div>
              <div className="text-sm text-gray-600">Other</div>
            </div>
          </div>
        </div>
      )}

      {/* Databases */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Databases</h2>
          <Link
            to="/databases/new"
            state={{ projectId: project.id }}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Add Database
          </Link>
        </div>

        {project.databases && project.databases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.databases.map((database) => (
              <DatabaseCard
                key={database.id}
                database={database}
                onRefresh={() => {}} // You might want to implement refresh here
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 card">
            <CircleStackIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No databases yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first database in this project to get started
            </p>
            <Link
              to="/databases/new"
              state={{ projectId: project.id }}
              className="btn-primary px-6 py-3"
            >
              Create Database
            </Link>
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="card p-6 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <span className="ml-2 text-gray-900">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
          {project.updatedAt && (
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <span className="ml-2 text-gray-900">
                {new Date(project.updatedAt).toLocaleDateString()}
              </span>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-700">Database Count:</span>
            <span className="ml-2 text-gray-900">{project.databaseCount}</span>
          </div>
          {project.lastDatabaseCreated && (
            <div>
              <span className="font-medium text-gray-700">Last Database:</span>
              <span className="ml-2 text-gray-900">
                {new Date(project.lastDatabaseCreated).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Project</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text" required minLength={3} maxLength={50}
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3} maxLength={500}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex space-x-2">
                  <input
                    type="text" placeholder="Add a tag..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={addTag} className="btn-secondary px-3 py-2 text-sm">Add</button>
                </div>
                {editForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editForm.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-blue-600 hover:text-blue-900">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary px-4 py-2">Cancel</button>
                <button type="submit" disabled={updateMutation.isLoading} className="btn-primary px-4 py-2">
                  {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetail
