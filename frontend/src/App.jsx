import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Databases from './pages/Databases'
import DatabaseDetail from './pages/DatabaseDetail'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Monitoring from './pages/Monitoring'
import PerformanceAnalysis from './pages/PerformanceAnalysis'
import CreateDatabase from './pages/CreateDatabase'
import Backups from './pages/Backups'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="App">
        <Routes>
          {!user ? (
            // Public routes
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            // Protected routes
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="databases" element={<Databases />} />
              <Route path="databases/new" element={<CreateDatabase />} />
              <Route path="databases/:id" element={<DatabaseDetail />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="monitoring" element={<Monitoring />} />
              <Route path="performance" element={<PerformanceAnalysis />} />
              <Route path="backups" element={<Backups />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          )}
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export default App
