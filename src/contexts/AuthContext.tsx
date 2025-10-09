import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { USERS, type User } from '@/config/users'

interface AuthContextType {
  isAuthenticated: boolean
  currentUser: User | null
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
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing auth on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('campaign-trends-auth')
    const authTimestamp = localStorage.getItem('campaign-trends-auth-timestamp')
    const authUserId = localStorage.getItem('campaign-trends-user-id')

    if (authStatus === 'authenticated' && authTimestamp && authUserId) {
      const timestamp = parseInt(authTimestamp)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000

      // Check if auth is less than 24 hours old
      if (now - timestamp < twentyFourHours) {
        // Find user by ID
        const user = Object.values(USERS).find(u => u.id === authUserId)
        if (user) {
          setIsAuthenticated(true)
          setCurrentUser(user)
        } else {
          // User not found, clear auth
          localStorage.removeItem('campaign-trends-auth')
          localStorage.removeItem('campaign-trends-auth-timestamp')
          localStorage.removeItem('campaign-trends-user-id')
        }
      } else {
        // Auth expired
        localStorage.removeItem('campaign-trends-auth')
        localStorage.removeItem('campaign-trends-auth-timestamp')
        localStorage.removeItem('campaign-trends-user-id')
      }
    }

    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Check if user exists and password matches
      const user = USERS[username.toLowerCase()]

      if (user && user.password === password) {
        setIsAuthenticated(true)
        setCurrentUser(user)
        localStorage.setItem('campaign-trends-auth', 'authenticated')
        localStorage.setItem('campaign-trends-auth-timestamp', Date.now().toString())
        localStorage.setItem('campaign-trends-user-id', user.id)
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
    setCurrentUser(null)
    localStorage.removeItem('campaign-trends-auth')
    localStorage.removeItem('campaign-trends-auth-timestamp')
    localStorage.removeItem('campaign-trends-user-id')
  }

  const value: AuthContextType = {
    isAuthenticated,
    currentUser,
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