import React from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendDirection = 'up', 
  color = 'primary',
  className = '' 
}) => {
  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600'
  }

  return (
    <div className={clsx('metric-card', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              {trendDirection === 'up' ? (
                <ArrowUpIcon className="w-4 h-4 text-success-500 mr-1" />
              ) : (
                <ArrowDownIcon className="w-4 h-4 text-error-500 mr-1" />
              )}
              <span className={clsx(
                'text-sm font-medium',
                trendDirection === 'up' ? 'text-success-600' : 'text-error-600'
              )}>
                {trend}
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg bg-opacity-10', {
          'bg-primary-500': color === 'primary',
          'bg-secondary-500': color === 'secondary',
          'bg-success-500': color === 'success',
          'bg-warning-500': color === 'warning',
          'bg-error-500': color === 'error'
        })}>
          <Icon className={clsx('w-6 h-6', colorClasses[color])} />
        </div>
      </div>
    </div>
  )
}

export default MetricCard
