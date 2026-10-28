import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import pedidoService from '@/services/pedido.service'
import MenuOverlay from '@/components/MenuOverlay'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }
const NAV_H   = 52

const LABEL_ESTADO = {
  REGISTRADO:     'registrado',
  PENDIENTE_PAGO: 'pendiente pago',
  PAGADO:         'pagado',
  PROCESANDO:     'procesando',
  ENVIADO:        'enviado',
  ENTREGADO:      'entregado',
  ANULADO:        'anulado',
  CANCELADO:      'cancelado',
}

const COLOR_ESTADO = {
  ENTREGADO: '#0a0a0a',
  PAGADO:    'rgba(10,10,10,0.55)',
  ENVIADO:   'rgba(10,10,10,0.55)',
  ANULADO:   'rgba(180,0,0,0.5)',
  CANCELADO: 'rgba(180,0,0,0.5)',
}

function NavHeader({ onOpenMenu }) {
  const { usuario } = useAuth()
  const { totalItems } = useCart()

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#ffffff' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.75rem', height: `${NAV_H}px`,
        color: '#0a0a0a', position: 'relative',
      }}>
        <button
          onClick={onOpenMenu}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            ...MONO, fontSize: '11px', letterSpacing: '0.18em', color: '#0a0a0a',
            transition: 'opacity 0.18s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.45'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          MENU
        </button>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#0a0a0a' }}>
            <h1 style={{ ...DISPLAY, fontSize: '1.12rem', lineHeight: 1, letterSpacing: '0.06em' }}>AND&</h1>
          </Link>
        </div>

        <Link
          to="/productos"
          style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', color: '#0a0a0a', textDecoration: 'none', transition: 'opacity 0.18s ease' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.45'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          CATÁLOGO
        </Link>
      </div>
      <div style={{ height: '1px', background: 'rgba(10,10,10,0.09)' }} />
    </div>
  )
}

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    pedidoService.listar()
      .then(res => setPedidos(res.data ?? []))
      .catch(() => setPedidos([]))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#0a0a0a' }}>
      <NavHeader onOpenMenu={() => setMenuAbierto(true)} />
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />

      {/* Grid: imagen izquierda | contenido derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '38% 1fr', paddingTop: `${NAV_H}px`, minHeight: `calc(100vh - ${NAV_H}px)` }}>

        {/* Columna izquierda: imagen sticky, solo desktop */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: `${NAV_H}px`, height: `calc(100vh - ${NAV_H}px)`, overflow: 'hidden' }}>
            <img
              src="/cuenta-portrait.png"
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(100%) brightness(0.58)' }}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <h1 style={{
                ...DISPLAY,
                fontSize: 'clamp(2.8rem, 5vw, 5rem)',
                color: '#ffffff',
                textAlign: 'center',
                lineHeight: 1.15,
              }}>
                Mis<br />Pedidos
              </h1>
            </div>
          </div>
        )}

        {/* Columna derecha: lista */}
        <div style={{ padding: isMobile ? '2rem 1.2rem 4rem' : '4rem 4rem 5rem 4.5rem' }}>

          {/* Título mobile */}
          {isMobile && (
            <h1 style={{ ...DISPLAY, fontSize: 'clamp(2.2rem, 8vw, 3rem)', lineHeight: 1, marginBottom: '2rem' }}>
              Mis Pedidos
            </h1>
          )}

          {cargando ? (
            <div style={{ paddingTop: '4rem' }}>
              <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.2)' }}>
                cargando...
              </span>
            </div>
          ) : pedidos.length === 0 ? (
            <div style={{ paddingTop: '4rem', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <p style={{ ...DISPLAY, fontSize: '2rem', color: 'rgba(10,10,10,0.1)' }}>
                Sin pedidos
              </p>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(10,10,10,0.56)' }}>
                Tus pedidos aparecerán aquí
              </p>
              <Link
                to="/productos"
                style={{
                  marginTop: '0.5rem',
                  ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase',
                  borderBottom: '1px solid rgba(10,10,10,0.3)', paddingBottom: '2px',
                  color: '#0a0a0a', textDecoration: 'none', display: 'inline-block',
                }}
              >
                ver catálogo
              </Link>
            </div>
          ) : (
            <div>
              {/* Cabecera — solo desktop */}
              {!isMobile && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 140px 20px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid rgba(10,10,10,0.08)',
                  marginBottom: '0',
                }}>
                  {['PEDIDO', 'FECHA', 'ESTADO', ''].map(h => (
                    <span key={h} style={{ ...MONO, fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {pedidos.map(p => (
                <Link
                  key={p.id}
                  to={`/pedidos/${p.id}`}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: isMobile ? 'flex' : 'grid',
                    gridTemplateColumns: isMobile ? undefined : '1fr 160px 140px 20px',
                    justifyContent: isMobile ? 'space-between' : undefined,
                    alignItems: 'center',
                    padding: '1.3rem 0',
                    borderBottom: '1px solid rgba(10,10,10,0.06)',
                    textDecoration: 'none',
                    opacity: hoveredId !== null && hoveredId !== p.id ? 0.35 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {isMobile ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={{ ...DISPLAY, fontSize: '1.05rem', color: '#0a0a0a' }}>
                          {p.nombre_pedido || `Pedido #${p.numero ?? p.id}`}
                        </span>
                        <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.50)' }}>
                          {new Date(p.created_at ?? p.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' · '}
                          <span style={{ color: COLOR_ESTADO[p.estado] ?? 'rgba(10,10,10,0.38)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                            {LABEL_ESTADO[p.estado] ?? p.estado?.toLowerCase()}
                          </span>
                        </span>
                      </div>
                      <span style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.4)', flexShrink: 0 }}>→</span>
                    </>
                  ) : (
                    <>
                      <div>
                        <span style={{ ...DISPLAY, fontSize: '1.1rem', color: '#0a0a0a', display: 'block' }}>
                          {p.nombre_pedido || `Pedido #${p.numero ?? p.id}`}
                        </span>
                        {p.nombre_pedido && (
                          <span style={{ ...MONO, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(10,10,10,0.35)' }}>
                            #{p.numero ?? p.id}
                          </span>
                        )}
                      </div>
                      <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.50)' }}>
                        {new Date(p.created_at ?? p.createdAt).toLocaleDateString('es-GT', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                      <div>
                        <span style={{
                          ...MONO, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
                          color: COLOR_ESTADO[p.estado] ?? 'rgba(10,10,10,0.38)',
                          display: 'block',
                        }}>
                          {LABEL_ESTADO[p.estado] ?? p.estado?.toLowerCase()}
                        </span>
                        {p.estado === 'DESPACHADO' && p.numero_guia && (
                          <span style={{ ...MONO, fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(10,10,10,0.38)', display: 'block', marginTop: '2px' }}>
                            {p.courier ? `${p.courier} · ` : ''}{p.numero_guia}
                          </span>
                        )}
                      </div>
                      <span style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.4)' }}>→</span>
                    </>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
