import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function RoleRoute({ roles, children }) {
  const { usuario } = useAuth()

  if (!roles.includes(usuario?.perfil)) return <Navigate to="/403" replace />

  return children
}
