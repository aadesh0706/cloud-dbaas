import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  reset() {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const { FallbackComponent } = this.props
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error}
            resetErrorBoundary={this.reset}
          />
        )
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="text-center">
              <ExclamationTriangleIcon className="w-16 h-16 text-error-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                We're sorry for the inconvenience. The page encountered an unexpected error.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg text-left">
                  <details className="text-sm">
                    <summary className="font-medium text-error-800 cursor-pointer mb-2">
                      Error Details (Development Mode)
                    </summary>
                    <div className="text-error-700 space-y-2">
                      <div>
                        <strong>Error:</strong> {this.state.error.toString()}
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap text-xs mt-1 p-2 bg-error-100 rounded">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.reset}
                  className="btn-primary w-full py-3"
                >
                  Try Again
                </button>
                <button
                  onClick={() => { window.location.href = '/dashboard' }}
                  className="btn-secondary w-full py-3"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
