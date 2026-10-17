import { Link, Outlet, useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

export default function TiendaLayout() {
  const { usuario, cerrarSesion } = useAuth()
  const { totalItems } = useCart()
  const navigate = useNavigate()

  const handleLogout = () => {
    cerrarSesion()
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
            {usuario && (
              <Link to="/pedidos" className="hover:underline">Mis pedidos</Link>
            )}
            {usuario && (
              <Link to="/cuenta" className="hover:underline">Mi cuenta</Link>
            )}
            <Link to="/carrito" className="relative hover:underline">
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>
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
