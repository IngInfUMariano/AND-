import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }

const resolverNombre = (usuario) => {
  if (!usuario) return null
  return usuario.cliente?.nombre
    ?? (usuario.empleado ? `${usuario.empleado.nombres} ${usuario.empleado.apellidos}` : null)
    ?? usuario.email
    ?? null
}

const resolverTipo = (usuario) => {
  if (!usuario) return null
  return usuario.tipo_cliente ?? usuario.cliente?.tipo ?? null
}

export default function MenuOverlay({ open, onClose }) {
  const { usuario, cerrarSesion } = useAuth()
  const { totalItems } = useCart()
  const navigate = useNavigate()
  const [hoveredNav, setHoveredNav] = useState(null)

  useEffect(() => {
    if (!open) { setHoveredNav(null); return }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const ir = (to) => {
    onClose()
    navigate(to)
  }

  const handleLogout = () => {
    cerrarSesion()
    onClose()
  }

  const navItems = [
    { label: 'Catálogo',     to: '/productos' },
    { label: 'Carrito',      to: '/carrito', badge: totalItems || null },
    ...(usuario
      ? [
          { label: 'Mis Pedidos', to: '/pedidos' },
          { label: 'Mi Cuenta',   to: '/cuenta'  },
        ]
      : [
          { label: 'Ingresar',    to: '/login'    },
          { label: 'Registrarse', to: '/registro' },
        ]
    ),
  ]

  // Open:  center drops first (0s), sides follow (0.09s)
  // Close: sides retract first (0s), center follows (0.07s)
  const tr = (isCenter) => {
    const dur  = open ? '0.82s' : '0.70s'
    const ease = 'cubic-bezier(0.76, 0, 0.24, 1)'
    const delay = isCenter
      ? (open ? '0s' : '0.07s')
      : (open ? '0.09s' : '0s')
    return `transform ${dur} ${ease} ${delay}`
  }

  const panelBase = (isCenter) => ({
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    willChange: 'transform',
    transform: open ? 'translateY(0)' : 'translateY(-100%)',
    transition: tr(isCenter),
  })

  const nombre     = resolverNombre(usuario)
  const tipoCliente = resolverTipo(usuario)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex',
      pointerEvents: open ? 'auto' : 'none',
    }}>

      {/* ── Panel izquierdo ─────────────────────────────── */}
      <div style={{
        ...panelBase(false),
        width: '28%',
        background: '#0d0d0d',
        borderRight: '1px solid rgba(255,255,255,0.045)',
        padding: '2.8rem 2.6rem',
        justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ ...DISPLAY, fontSize: '1.5rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.08)' }}>
            AND&
          </span>

          <div style={{ marginTop: '4rem' }}>
            <p style={{ ...MONO, fontSize: '9px', letterSpacing: '0.44em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginBottom: '1.2rem' }}>
              explorar
            </p>
            {[
              { label: 'nuevos arrivals', to: '/productos?sort=created_at&order=desc' },
              { label: 'colección actual', to: '/productos' },
              { label: 'todos los productos', to: '/productos' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => ir(item.to)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  ...MONO, fontSize: '11px', letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.62)',
                  background: 'none', border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', padding: '11px 0',
                  transition: 'color 0.18s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.72)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <span style={{ ...MONO, fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.1)' }}>
          {new Date().getFullYear()} · AND&
        </span>
      </div>

      {/* ── Panel central ─────────────────────────────── */}
      <div style={{
        ...panelBase(true),
        flex: 1,
        background: '#111111',
        padding: '2.8rem 3.5rem',
        justifyContent: 'center',
      }}>
        <nav
          onMouseLeave={() => setHoveredNav(null)}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {navItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => ir(item.to)}
              onMouseEnter={() => setHoveredNav(i)}
              style={{
                display: 'flex', alignItems: 'baseline', gap: '1rem',
                ...DISPLAY,
                fontSize: 'clamp(2.8rem, 5.5vw, 5rem)',
                lineHeight: 1.15,
                color: '#ffffff',
                opacity: hoveredNav === null ? 1 : hoveredNav === i ? 1 : 0.1,
                background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                padding: '0.5rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                transition: 'opacity 0.22s ease',
              }}
            >
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.68)' }}>
                  ({item.badge})
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Panel derecho ─────────────────────────────── */}
      <div style={{
        ...panelBase(false),
        width: '28%',
        background: '#0d0d0d',
        borderLeft: '1px solid rgba(255,255,255,0.045)',
        padding: '2.8rem 2.6rem',
        justifyContent: 'space-between',
      }}>
        <div>
          {/* Botón cerrar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4rem' }}>
            <button
              onClick={onClose}
              style={{
                ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.58)',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'color 0.18s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.58)'}
            >
              ✕ ESC
            </button>
          </div>

          {/* Info usuario */}
          {usuario ? (
            <div>
              <p style={{ ...MONO, fontSize: '9px', letterSpacing: '0.44em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginBottom: '0.8rem' }}>
                cuenta
              </p>
              {nombre && (
                <p style={{ ...MONO, fontSize: '14px', color: 'rgba(255,255,255,0.82)', marginBottom: '0.5rem' }}>
                  {nombre}
                </p>
              )}
              {tipoCliente === 'MAYORISTA' && (
                <span style={{
                  ...MONO, fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.48)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '2px 7px', display: 'inline-block',
                }}>
                  MAYORISTA
                </span>
              )}
            </div>
          ) : (
            <div>
              <p style={{ ...MONO, fontSize: '9px', letterSpacing: '0.44em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginBottom: '0.8rem' }}>
                bienvenido/a
              </p>
              <p style={{ ...MONO, fontSize: '11px', lineHeight: '2', color: 'rgba(255,255,255,0.55)', maxWidth: '170px' }}>
                Inicia sesión para acceder a tu cuenta y tus pedidos.
              </p>
            </div>
          )}
        </div>

        <div>
          {usuario && (
            <button
              onClick={handleLogout}
              style={{
                ...MONO, fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.2)',
                background: 'none', border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '2px', cursor: 'pointer',
                display: 'block', marginBottom: '1.6rem',
                transition: 'color 0.18s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
            >
              cerrar sesión
            </button>
          )}
          <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '1.2rem' }} />
          <span style={{ ...MONO, fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.1)' }}>
            moda femenina de autor
          </span>
        </div>
      </div>

    </div>
  )
}
