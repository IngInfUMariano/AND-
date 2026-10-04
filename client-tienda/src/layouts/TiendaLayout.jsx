import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function TiendaLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="font-semibold text-lg">
            INVENTA
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link to="/productos" className="hover:underline">Tienda</Link>
            <Link to="/mis-pedidos" className="hover:underline">Mis pedidos</Link>
            <Link to="/carrito" className="hover:underline">Carrito</Link>
            {usuario
              ? <button onClick={handleLogout} className="hover:underline">Salir</button>
              : <Link to="/login" className="hover:underline">Ingresar</Link>
            }
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        INVENTA © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
