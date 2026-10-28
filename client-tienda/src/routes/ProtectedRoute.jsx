import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )

  if (!usuario) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />

  return children
}
