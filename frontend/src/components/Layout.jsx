import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  CircleStackIcon, 
  FolderIcon, 
  ChartBarIcon,
  CpuChipIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import AIAssistantButton from './AIAssistantButton'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Databases', href: '/databases', icon: CircleStackIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Monitoring', href: '/monitoring', icon: ChartBarIcon },
  { name: 'Performance', href: '/performance', icon: CpuChipIcon },
  { name: 'Backups', href: '/backups', icon: CloudArrowUpIcon },
]

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const location = useLocation()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <div className={clsx(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex flex-col w-64 h-full bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gradient">Cloud DBaaS</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  location.pathname === item.href
                    ? 'sidebar-link-active'
                    : 'sidebar-link-inactive'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-white dark:bg-gray-800 lg:border-r lg:border-gray-200 dark:border-gray-700">
        <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gradient">Cloud DBaaS</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                location.pathname === item.href
                  ? 'sidebar-link-active'
                  : 'sidebar-link-inactive'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User profile section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="w-8 h-8 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-gray-500"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:pl-0">
        {/* Top bar */}
        <div className="flex items-center h-16 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-600 lg:hidden"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center justify-between w-full lg:justify-end">
            <h2 className="ml-4 text-lg font-semibold text-gray-900 lg:hidden">
              Cloud DBaaS
            </h2>
            
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>
              <div className="hidden lg:flex lg:items-center lg:space-x-2">
                <UserCircleIcon className="w-6 h-6 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <button
                onClick={logout}
                className="lg:hidden text-gray-400 hover:text-gray-500"
              >
                <ArrowRightOnRectangleIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>

        {/* AI Assistant Floating Button */}
        <AIAssistantButton />
      </div>
    </div>
  )
}

export default Layout
