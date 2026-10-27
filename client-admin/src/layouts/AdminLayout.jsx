import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const MENU = [
  {
    grupo: 'Terceros',
    perfiles: ['ADMIN', 'GERENTE', 'VENDEDOR'],
    items: [
      { label: 'Clientes', to: '/clientes' },
      { label: 'Empleados', to: '/empleados', perfiles: ['ADMIN', 'GERENTE'] },
      { label: 'Proveedores', to: '/proveedores', perfiles: ['ADMIN', 'GERENTE'] },
    ],
  },
  {
    grupo: 'Catálogo',
    perfiles: ['ADMIN', 'GERENTE'],
    items: [
      { label: 'Productos', to: '/productos' },
      { label: 'Precios', to: '/precios' },
      { label: 'Catálogos', to: '/catalogos' },
    ],
  },
  {
    grupo: 'Inventario',
    perfiles: ['ADMIN', 'GERENTE', 'BODEGUERO'],
    items: [
      { label: 'Existencias', to: '/existencias' },
      { label: 'Movimientos', to: '/movimientos' },
      { label: 'Despachos', to: '/despachos' },
      { label: 'Recepciones', to: '/recepciones' },
      { label: 'Traslados', to: '/traslados' },
      { label: 'Comprobantes', to: '/comprobantes' },
      { label: 'Mermas', to: '/mermas' },
      { label: 'Compras', to: '/compras' },
    ],
  },
  {
    grupo: 'Pedidos',
    perfiles: ['ADMIN', 'GERENTE', 'VENDEDOR', 'BODEGUERO'],
    items: [
      { label: 'Pedidos', to: '/pedidos' },
    ],
  },
  {
    grupo: 'Pagos',
    perfiles: ['ADMIN', 'GERENTE'],
    items: [
      { label: 'Transacciones', to: '/transacciones' },
    ],
  },
  {
    grupo: 'Reportes',
    perfiles: ['ADMIN', 'GERENTE'],
    items: [
      { label: 'Informes', to: '/informes' },
      { label: 'Dashboard', to: '/dashboard' },
    ],
  },
  
  {
    grupo: 'Dev',
    perfiles: ['ADMIN', 'GERENTE', 'VENDEDOR', 'BODEGUERO'],
    items: [
      { label: 'Referencia UI', to: '/referencia' },
    ],
  },
]

export default function AdminLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState(new Set())

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const toggleGroup = (grupo) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(grupo) ? next.delete(grupo) : next.add(grupo)
      return next
    })
  }

  const menuFiltrado = MENU
    .filter(g => g.perfiles.includes(usuario?.perfil))
    .map(g => ({
      ...g,
      items: g.items.filter(i => !i.perfiles || i.perfiles.includes(usuario?.perfil)),
    }))

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Overlay oscuro al abrir el drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-foreground text-background transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera */}
        <div className="flex h-14 items-center justify-between px-6 border-b border-white/10">
          <span
            style={{ fontFamily: "'EB Garamond', serif" }}
            className="text-xl tracking-[0.1em] uppercase"
          >
            AND&
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="opacity-40 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navegación colapsable */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          {menuFiltrado.map(grupo => {
            const isOpen = openGroups.has(grupo.grupo)
            return (
              <div key={grupo.grupo}>
                <button
                  onClick={() => toggleGroup(grupo.grupo)}
                  className="flex w-full items-center justify-between py-2.5 font-mono text-xs uppercase tracking-[0.22em] opacity-40 hover:opacity-100 transition-opacity"
                >
                  {grupo.grupo}
                  <ChevronDown
                    size={12}
                    className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="mb-2 space-y-0.5">
                    {grupo.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `block pl-4 py-1.5 font-mono text-sm tracking-[0.06em] border-l transition-opacity ${
                            isActive
                              ? 'opacity-100 border-white/50'
                              : 'opacity-40 hover:opacity-90 border-transparent'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Usuario */}
        <div className="border-t border-white/10 px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-30 mb-2">
            {usuario?.perfil}
          </p>
          <button
            onClick={handleLogout}
            className="font-mono text-sm tracking-[0.08em] opacity-40 hover:opacity-100 transition-opacity"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Barra superior */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
          <span
            style={{ fontFamily: "'EB Garamond', serif" }}
            className="text-lg tracking-[0.1em] uppercase"
          >
            AND&
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
