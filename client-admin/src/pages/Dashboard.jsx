import { useAuth } from '@/context/AuthContext'

export default function Dashboard() {
  const { usuario } = useAuth()
  return (
    <div>
      <h2 className="text-2xl font-semibold">Bienvenido</h2>
      <p className="mt-1 text-muted-foreground">
        Sesión activa como <span className="font-medium">{usuario?.perfil}</span>
      </p>
    </div>
  )
}
