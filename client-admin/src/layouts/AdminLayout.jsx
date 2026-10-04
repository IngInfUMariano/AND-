import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const MENU = [
  {
    grupo: 'Terceros',
    perfiles: ['ADMIN', 'GERENTE', 'VENDEDOR'],
    items: [
      { label: 'Clientes',   to: '/clientes'   },
      { label: 'Empleados',  to: '/empleados',  perfiles: ['ADMIN', 'GERENTE'] },
      { label: 'Proveedores',to: '/proveedores', perfiles: ['ADMIN', 'GERENTE'] },
    ],
  },
  {
    grupo: 'Catálogo',
    perfiles: ['ADMIN', 'GERENTE'],
    items: [
      { label: 'Productos',   to: '/productos'  },
      { label: 'Categorías',  to: '/categorias' },
      { label: 'Marcas',      to: '/marcas'     },
    ],
  },
  {
    grupo: 'Inventario',
    perfiles: ['ADMIN', 'GERENTE', 'BODEGUERO'],
    items: [
      { label: 'Existencias',  to: '/existencias' },
      { label: 'Movimientos',  to: '/movimientos' },
      { label: 'Traslados',    to: '/traslados'   },
      { label: 'Comprobantes', to: '/comprobantes'},
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
      { label: 'Reportes', to: '/reportes' },
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

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const menuFiltrado = MENU
    .filter(g => g.perfiles.includes(usuario?.perfil))
    .map(g => ({
      ...g,
      items: g.items.filter(i => !i.perfiles || i.perfiles.includes(usuario?.perfil)),
    }))

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center border-b px-4 font-semibold text-lg">
          INVENTA
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
          {menuFiltrado.map(grupo => (
            <div key={grupo.grupo}>
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {grupo.grupo}
              </p>
              {grupo.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent ${
                      isActive ? 'bg-sidebar-accent font-medium' : ''
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          <p className="truncate text-xs text-muted-foreground">{usuario?.perfil}</p>
          <button
            onClick={handleLogout}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
