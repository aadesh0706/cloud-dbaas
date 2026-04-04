import React, { useState, useEffect, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { EnvelopeIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

const EmailVerification = ({ email, onVerificationSuccess, onBackToRegister }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef([])

  const { login, isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  // Countdown for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleInputChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value

    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all fields are filled
    if (index === 5 && value && newOtp.every(digit => digit !== '')) {
      handleVerifyOTP(newOtp.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    
    // Handle paste
    if (e.key === 'Paste') {
      e.preventDefault()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      inputRefs.current[5]?.focus()
      
      // Auto-verify after paste
      setTimeout(() => handleVerifyOTP(pastedData), 100)
    }
  }

  const handleVerifyOTP = async (otpCode = otp.join('')) => {
    if (otpCode.length !== 6) {
      toast.error('Please enter all 6 digits')
      return
    }

    setIsVerifying(true)
    
    try {
      const response = await authAPI.verifyOTP({ email, otp: otpCode })
      
      // Automatically log the user in with the received token
      if (response.token) {
        await login(email, null, response.token)
      }
      
      toast.success(response.message || 'Email verified successfully!')
      onVerificationSuccess && onVerificationSuccess(response)
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Verification failed. Please try again.'
      toast.error(errorMessage)
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return

    setIsResending(true)
    
    try {
      const response = await authAPI.resendOTP({ email })
      toast.success(response.message || 'Verification code sent!')
      setResendCooldown(60) // 60 seconds cooldown
      
      // Clear current OTP
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend code. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <EnvelopeIcon className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Cloud DBaaS</h1>
          <h2 className="text-2xl font-semibold text-gray-900">Verify your email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We sent a verification code to
          </p>
          <p className="text-sm font-medium text-gray-900">{email}</p>
        </div>

        <div className="card p-8">
          <div className="space-y-6">
            {/* OTP Input Fields */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 text-center">
                Enter the 6-digit code
              </label>
              <div className="flex justify-center space-x-3" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => inputRefs.current[index] = el}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    disabled={isVerifying}
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <button
              onClick={() => handleVerifyOTP()}
              disabled={isVerifying || otp.some(digit => digit === '')}
              className="w-full btn-primary h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <CheckCircleIcon className="w-5 h-5 mr-2" />
              )}
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </button>

            {/* Resend Section */}
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Didn't receive the code?
              </p>
              
              {resendCooldown > 0 ? (
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <ClockIcon className="w-4 h-4 mr-2" />
                  Resend code in {resendCooldown}s
                </div>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="text-sm text-primary-600 hover:text-primary-500 font-medium disabled:opacity-50"
                >
                  {isResending ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="xs" className="mr-1" />
                      Sending...
                    </span>
                  ) : (
                    'Resend verification code'
                  )}
                </button>
              )}
            </div>

            {/* Back to Register Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <button
                onClick={onBackToRegister}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to registration
              </button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Check your spam folder if you don't see the email
          </p>
        </div>
      </div>
    </div>
  )
}

export default EmailVerification
