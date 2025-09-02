import React from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <ExclamationTriangleIcon className="w-12 h-12 text-error-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          We encountered an error while loading this content.
        </p>
        
        {import.meta.env.DEV && error && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded text-left">
            <details className="text-sm">
              <summary className="font-medium text-error-800 cursor-pointer">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-error-700 whitespace-pre-wrap">
                {error.message}
              </pre>
            </details>
          </div>
        )}
        
        <button
          onClick={resetErrorBoundary}
          className="btn-primary inline-flex items-center px-4 py-2"
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    </div>
  )
}

export default ErrorFallback
