import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { authApi } from '../services/api'

const STORAGE_KEYS = {
  TOKEN: 'hq_token',
  USER: 'hq_user',
}

const ALLOWED_ROLES = ['super_admin', 'facility_admin']

// --- Storage Utilities ---
const getStoredUser = () => {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.USER)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

const setSession = (token, user) => {
  if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token)
  if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
}

const clearSession = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
  localStorage.removeItem(STORAGE_KEYS.USER)
}

// --- Context Definition ---
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Lazy initial state prevents render flashing
  const [user, setUser] = useState(() => getStoredUser())
  const [loading, setLoading] = useState(true)

  // Restore and verify session on mount
  useEffect(() => {
    let isMounted = true
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN)

    if (!token) {
      setLoading(false)
      return
    }

    authApi.me()
      .then((res) => {
        if (!isMounted) return
        const freshUser = res.data.user
        setUser(freshUser)
        setSession(null, freshUser)
      })
      .catch((err) => {
        if (!isMounted) return
        // Invalidate session strictly on 401 Unauthorized
        if (err?.response?.status === 401) {
          clearSession()
          setUser(null)
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Action: Login
  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password)
    const { token, user: userData } = res.data

    if (!ALLOWED_ROLES.includes(userData.role)) {
      throw new Error('Access denied. This portal is for System Administrator or Facility Admin only.')
    }

    setSession(token, userData)
    setUser(userData)
    setLoading(false)
    return userData
  }, [])

  // Action: Logout
  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  // Memoize context value to avoid unnecessary downstream re-renders
  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  }), [user, loading, login, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook with consumer boundary check
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}