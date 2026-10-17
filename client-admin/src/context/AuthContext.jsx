import { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import api from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const token = localStorage.getItem('token')
      return token ? jwtDecode(token) : null
    } catch {
      return null
    }
  })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setCargando(false)
      return
    }

    api.get('/auth/perfil')
      .then(({ data }) => setUsuario(data.data))
      .catch(() => {
        localStorage.removeItem('token')
        setUsuario(null)
      })
      .finally(() => setCargando(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/interno', { email, password })
    const { token } = data.data // { token, expira_en, usuario }
    localStorage.setItem('token', token)
    setUsuario(jwtDecode(token))
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
