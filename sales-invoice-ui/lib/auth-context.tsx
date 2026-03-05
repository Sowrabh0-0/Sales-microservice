"use client"

import { createContext, useContext, useEffect, useState } from "react"

type AuthContextType = {
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const stored = localStorage.getItem("token")

    if (stored) {
      setToken(stored)
    }

    setLoading(false)

  }, [])

  function login(token: string) {
    localStorage.setItem("token", token)
    setToken(token)
  }

  function logout() {
    localStorage.removeItem("token")
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error("useAuth must be inside AuthProvider")
  }

  return ctx
}