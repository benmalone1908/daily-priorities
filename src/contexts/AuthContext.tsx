import React, { createContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing auth on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('campaign-trends-auth')
    const authTimestamp = localStorage.getItem('campaign-trends-auth-timestamp')

    if (authStatus === 'authenticated' && authTimestamp) {
      const timestamp = parseInt(authTimestamp)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000

      // Check if auth is less than 24 hours old
      if (now - timestamp < twentyFourHours) {
        setIsAuthenticated(true)
      } else {
        // Auth expired
        localStorage.removeItem('campaign-trends-auth')
        localStorage.removeItem('campaign-trends-auth-timestamp')
      }
    }

    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // In production, these will come from Vercel environment variables
      // For development, we'll use fallback values
      const validUsername = import.meta.env.VITE_AUTH_USERNAME || 'admin'
      const validPassword = import.meta.env.VITE_AUTH_PASSWORD || 'password123'

      if (username === validUsername && password === validPassword) {
        setIsAuthenticated(true)
        localStorage.setItem('campaign-trends-auth', 'authenticated')
        localStorage.setItem('campaign-trends-auth-timestamp', Date.now().toString())
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('campaign-trends-auth')
    localStorage.removeItem('campaign-trends-auth-timestamp')
  }

  const value: AuthContextType = {
    isAuthenticated,
    login,
    logout,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}