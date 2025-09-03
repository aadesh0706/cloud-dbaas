import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import EmailVerification from '../components/EmailVerification'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const { login, isAuthenticated } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    
    try {
      const result = await login(data.email, data.password)
      
      if (!result.success) {
        if (result.requiresVerification) {
          setVerificationEmail(data.email)
          setShowVerification(true)
          toast.error('Please verify your email before logging in')
        } else {
          setError('root', { message: result.error })
        }
      }
    } catch (error) {
      setError('root', { message: 'Login failed. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setShowVerification(false)
    setVerificationEmail('')
  }

  const handleVerificationSuccess = () => {
    // User will be automatically redirected by EmailVerification component
    setShowVerification(false)
  }

  if (showVerification) {
    return (
      <EmailVerification
        email={verificationEmail}
        onVerificationSuccess={handleVerificationSuccess}
        onBackToRegister={handleBackToLogin}
      />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient mb-2">Cloud DBaaS</h1>
          <h2 className="text-2xl font-semibold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Sign up here
            </Link>
          </p>
        </div>

        <div className="card p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {errors.root && (
              <div className="p-3 text-sm text-error-600 bg-error-50 border border-error-200 rounded-md">
                {errors.root.message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={clsx(
                  'input',
                  errors.email && 'border-error-300 focus:border-error-500 focus:ring-error-500'
                )}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Please enter a valid email address'
                  }
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={clsx(
                    'input pr-10',
                    errors.password && 'border-error-300 focus:border-error-500 focus:ring-error-500'
                  )}
                  {...register('password', {
                    required: 'Password is required'
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary h-12 text-base"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : null}
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Demo Credentials</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600 text-center">
                <strong>Email:</strong> admin@example.com<br />
                <strong>Password:</strong> admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
