import React, { createContext, useContext, useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('authToken')
      
      if (token) {
        try {
          const userData = await authAPI.getCurrentUser()
          setUser(userData.user)
        } catch (error) {
          console.error('Auth initialization error:', error)
          Cookies.remove('authToken')
        }
      }
      
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password)
      const { user: userData, token } = response

      // Store token in cookie (httpOnly would be better in production)
      Cookies.set('authToken', token, { 
        expires: 1, // 1 day
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })

      setUser(userData)
      toast.success('Login successful!')
      
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      const { user: newUser, token } = response

      // Store token in cookie
      Cookies.set('authToken', token, { 
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })

      setUser(newUser)
      toast.success('Registration successful!')
      
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    Cookies.remove('authToken')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const updateUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser()
      setUser(userData.user)
    } catch (error) {
      console.error('Update user error:', error)
      logout()
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
