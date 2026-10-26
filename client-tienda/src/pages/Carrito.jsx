import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import carritoService from '@/services/carrito.service'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import MenuOverlay from '@/components/MenuOverlay'
import { useIsMobile } from '@/hooks/useIsMobile'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }
const NAV_H   = 52

const SLIDE_DUR = 900   // ms — duración de la transición
const SLIDE_INT = 4000  // ms — intervalo entre cambios

const getPrecioEfectivo = (variante, tipoCliente) => {
  const ps = variante?.precios ?? []
  const tipo = tipoCliente === 'MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'
  return parseFloat(ps.find(p => p.tipo === 'OFERTA')?.monto ?? ps.find(p => p.tipo === tipo)?.monto ?? ps[0]?.monto ?? 0)
}
const getPrecioNormal = (variante) => {
  const ps = variante?.precios ?? []
  if (!ps.some(p => p.tipo === 'OFERTA')) return null
  return parseFloat(ps.find(p => p.tipo === 'MINORISTA')?.monto ?? 0)
}

const imgUrl = (producto) => {
  const imgs = producto?.imagen_productos ?? []
  const principal = imgs.find(i => i.es_principal) ?? imgs[0]
  return principal?.url ?? `https://picsum.photos/seed/andcat${producto?.id ?? 'x'}w/900/1200`
}

/* ── NavHeader ── */
function NavHeader({ onOpenMenu }) {
  const { usuario } = useAuth()
  const primerNombre = usuario?.cliente?.nombre?.split(' ')[0]
    ?? usuario?.empleado?.nombres?.split(' ')[0]
    ?? null

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
          to={usuario ? '/cuenta' : '/login'}
          style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', color: '#0a0a0a', textDecoration: 'none', transition: 'opacity 0.18s ease' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.45'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {usuario ? 'PERFIL' : 'ENTRAR'}
        </Link>
      </div>
      <div style={{ height: '1px', background: 'rgba(10,10,10,0.09)' }} />
    </div>
  )
}

/* ── Imagen entrante: se monta en translateY(100%) y sube a 0 ── */
function SlideImg({ src, alt }) {
  const [ty, setTy] = useState(100)

  useEffect(() => {
    // double rAF: asegura que el navegador pintó el estado inicial antes de transicionar
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setTy(0))
    )
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 2,
      transform: `translateY(${ty}%)`,
      transition: `transform ${SLIDE_DUR}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
    }}>
      <img src={src} alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(100%) brightness(0.72)' }}
      />
    </div>
  )
}

/* ── Lateral con slideshow ── */
function ImagenLateral({ detalles }) {
  const [curr, setCurr]         = useState(0)
  const [incoming, setIncoming] = useState(null)
  const currRef = useRef(0)
  const busyRef = useRef(false)
  const n = detalles.length

  useEffect(() => {
    if (n <= 1) return
    const id = setInterval(() => {
      if (busyRef.current) return
      busyRef.current = true
      const next = (currRef.current + 1) % n
      setIncoming(next)
      setTimeout(() => {
        currRef.current = next
        setCurr(next)
        setIncoming(null)
        busyRef.current = false
      }, SLIDE_DUR + 60)
    }, SLIDE_INT)
    return () => clearInterval(id)
  }, [n])

  const d = detalles[curr]
  const src = imgUrl(d?.variante?.producto)

  const dIn  = incoming !== null ? detalles[incoming] : null
  const srcIn = dIn ? imgUrl(dIn?.variante?.producto) : null

  return (
    <div style={{
      position: 'sticky',
      top: `${NAV_H}px`,
      height: `calc(100vh - ${NAV_H}px)`,
      overflow: 'hidden',
      borderRight: '1px solid rgba(10,10,10,0.07)',
    }}>
      {/* Imagen actual — siempre visible debajo */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <img src={src} alt={d?.variante?.producto?.nombre ?? ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(100%) brightness(0.72)' }}
        />
      </div>

      {/* Imagen entrante — sube por encima */}
      {incoming !== null && (
        <SlideImg key={incoming} src={srcIn} alt={dIn?.variante?.producto?.nombre ?? ''} />
      )}

      {/* Indicador de posición */}
      {n > 1 && (
        <div style={{
          position: 'absolute', bottom: '1.8rem', right: '1.8rem', zIndex: 10,
          ...MONO, fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.75)',
        }}>
          {String(curr + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </div>
      )}
    </div>
  )
}

/* ── Componente principal ── */
export default function Carrito() {
  const { carrito, cargando, recargar } = useCart()
  const { usuario }  = useAuth()
  const navigate     = useNavigate()
  const isMobile     = useIsMobile()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [procesando, setProcesando]   = useState(null)

  const detalles = carrito?.carrito_detalles ?? []
  const subtotal = detalles.reduce(
    (acc, d) => acc + getPrecioEfectivo(d.variante, usuario?.tipo_cliente) * d.cantidad, 0
  )

  const actualizarCantidad = async (itemId, cantidad) => {
    if (cantidad < 1) return
    setProcesando(itemId)
    try {
      await carritoService.actualizarCantidad(itemId, cantidad)
      await recargar()
    } catch (err) {
      toast.error(err.response?.data?.error?.mensaje ?? 'Error al actualizar')
    } finally {
      setProcesando(null)
    }
  }

  const eliminar = async (itemId) => {
    setProcesando(itemId)
    try {
      await carritoService.eliminarItem(itemId)
      await recargar()
    } catch {
      toast.error('Error al eliminar el producto')
    } finally {
      setProcesando(null)
    }
  }

  const irAlCheckout = async () => {
    try {
      await carritoService.revalidar()
      navigate('/checkout')
    } catch (err) {
      toast.error(err.response?.data?.error?.mensaje ?? 'Error al validar el carrito')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0a0a0a' }}>
      <NavHeader onOpenMenu={() => setMenuAbierto(true)} />
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />

      {/* Loading */}
      {cargando && (
        <div style={{ paddingTop: `${NAV_H + 120}px`, textAlign: 'center' }}>
          <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.90)' }}>
            cargando...
          </span>
        </div>
      )}

      {/* Vacío */}
      {!cargando && detalles.length === 0 && (
        <div style={{
          paddingTop: `${NAV_H}px`, minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1.4rem',
        }}>
          <h2 style={{ ...DISPLAY, fontSize: '3rem', letterSpacing: '0.06em', color: 'rgba(10,10,10,0.12)' }}>
            CARRITO VACÍO
          </h2>
          <p style={{ ...MONO, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(10,10,10,0.76)' }}>
            Agrega productos para continuar
          </p>
          <Link to="/productos" style={{
            marginTop: '0.5rem',
            ...MONO, fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase',
            borderBottom: '1px solid rgba(10,10,10,0.35)', paddingBottom: '2px',
            color: '#0a0a0a', textDecoration: 'none',
          }}>
            ver catálogo
          </Link>
        </div>
      )}

      {/* Contenido */}
      {!cargando && detalles.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '38% 1fr',
          paddingTop: `${NAV_H}px`,
        }}>

          {/* ── Lateral: slideshow (solo desktop) ── */}
          {!isMobile && <ImagenLateral detalles={detalles} />}

          {/* ── Contenido principal ── */}
          <div style={{ padding: isMobile ? '2rem 1.2rem' : '3.5rem 4rem 3.5rem 3.5rem' }}>

            <h1 style={{ ...DISPLAY, fontSize: isMobile ? '2.4rem' : 'clamp(3rem, 4.5vw, 4.5rem)', marginBottom: '0.5rem' }}>
              Carrito
            </h1>
            <div style={{ height: '1px', background: 'rgba(10,10,10,0.12)', marginBottom: isMobile ? '1.5rem' : '3rem' }} />

            {/* Lista de productos */}
            <div style={{ marginBottom: isMobile ? '2rem' : '3rem' }}>
              {isMobile ? (
                /* Mobile: tarjetas apiladas */
                <div>
                  {detalles.map(d => {
                    const precio      = getPrecioEfectivo(d.variante, usuario?.tipo_cliente)
                    const precioNormal = getPrecioNormal(d.variante)
                    const dis         = procesando === d.id
                    return (
                      <div key={d.id} style={{
                        padding: '1.2rem 0',
                        borderBottom: '1px solid rgba(10,10,10,0.08)',
                        opacity: dis ? 0.4 : 1,
                        transition: 'opacity 0.18s ease',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ ...MONO, fontSize: '14px', color: '#0a0a0a', marginBottom: '0.25rem' }}>
                              {d.variante?.producto?.nombre ?? 'Producto'}
                            </p>
                            <p style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.5)' }}>
                              {d.variante?.sku}
                            </p>
                          </div>
                          <button onClick={() => eliminar(d.id)} disabled={dis} style={{
                            background: 'none', border: 'none', cursor: dis ? 'default' : 'pointer',
                            ...MONO, fontSize: '16px', color: 'rgba(10,10,10,0.4)', padding: '4px',
                          }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button onClick={() => actualizarCantidad(d.id, d.cantidad - 1)} disabled={dis} style={{
                              ...MONO, fontSize: '22px', lineHeight: 1,
                              background: 'none', border: 'none', cursor: dis ? 'default' : 'pointer',
                              color: 'rgba(10,10,10,0.5)', padding: '4px 8px',
                            }}>−</button>
                            <span style={{ ...MONO, fontSize: '14px', minWidth: '24px', textAlign: 'center' }}>{d.cantidad}</span>
                            <button onClick={() => actualizarCantidad(d.id, d.cantidad + 1)} disabled={dis} style={{
                              ...MONO, fontSize: '22px', lineHeight: 1,
                              background: 'none', border: 'none', cursor: dis ? 'default' : 'pointer',
                              color: 'rgba(10,10,10,0.5)', padding: '4px 8px',
                            }}>+</button>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ ...MONO, fontSize: '15px', color: precioNormal != null ? 'rgba(180,30,30,0.85)' : '#0a0a0a' }}>
                              Q {(precio * d.cantidad).toFixed(2)}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', justifyContent: 'flex-end' }}>
                              {precioNormal != null && (
                                <span style={{ ...MONO, fontSize: '10px', color: 'rgba(10,10,10,0.35)', textDecoration: 'line-through' }}>Q {precioNormal.toFixed(2)}</span>
                              )}
                              <span style={{ ...MONO, fontSize: '11px', color: precioNormal != null ? 'rgba(180,30,30,0.6)' : 'rgba(10,10,10,0.4)' }}>Q {precio.toFixed(2)} c/u</span>
                              {precioNormal != null && (
                                <span style={{ ...MONO, fontSize: '8px', letterSpacing: '0.12em', color: 'rgba(180,30,30,0.65)', border: '1px solid rgba(180,30,30,0.25)', padding: '1px 4px' }}>OFERTA</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Desktop: tabla */
                <div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 120px 100px 24px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(10,10,10,0.12)',
                  }}>
                    {['PRODUCTO', 'CANTIDAD', 'SUBTOTAL', ''].map(h => (
                      <span key={h} style={{ ...MONO, fontSize: '10px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.78)' }}>
                        {h}
                      </span>
                    ))}
                  </div>

                  {detalles.map(d => {
                    const precio       = getPrecioEfectivo(d.variante, usuario?.tipo_cliente)
                    const precioNormal = getPrecioNormal(d.variante)
                    const dis          = procesando === d.id
                    return (
                      <div key={d.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr 120px 100px 24px',
                        alignItems: 'center',
                        padding: '1.6rem 0',
                        borderBottom: '1px solid rgba(10,10,10,0.08)',
                        opacity: dis ? 0.4 : 1,
                        transition: 'opacity 0.18s ease',
                      }}>
                        <div>
                          <p style={{ ...MONO, fontSize: '14px', color: '#0a0a0a', marginBottom: '0.3rem' }}>
                            {d.variante?.producto?.nombre ?? 'Producto'}
                          </p>
                          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.80)' }}>
                            {d.variante?.sku}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                            {precioNormal != null && (
                              <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.35)', textDecoration: 'line-through' }}>Q {precioNormal.toFixed(2)}</span>
                            )}
                            <span style={{ ...MONO, fontSize: '12px', color: precioNormal != null ? 'rgba(180,30,30,0.75)' : 'rgba(10,10,10,0.88)' }}>
                              Q {precio.toFixed(2)} c/u
                            </span>
                            {precioNormal != null && (
                              <span style={{ ...MONO, fontSize: '8px', letterSpacing: '0.12em', color: 'rgba(180,30,30,0.65)', border: '1px solid rgba(180,30,30,0.25)', padding: '1px 4px' }}>OFERTA</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          {[
                            { label: '−', onClick: () => actualizarCantidad(d.id, d.cantidad - 1) },
                            null,
                            { label: '+', onClick: () => actualizarCantidad(d.id, d.cantidad + 1) },
                          ].map((btn) =>
                            btn === null ? (
                              <span key="val" style={{ ...MONO, fontSize: '14px', minWidth: '20px', textAlign: 'center' }}>
                                {d.cantidad}
                              </span>
                            ) : (
                              <button key={btn.label} onClick={btn.onClick} disabled={dis} style={{
                                ...MONO, fontSize: '20px', lineHeight: 1,
                                background: 'none', border: 'none',
                                cursor: dis ? 'default' : 'pointer',
                                color: 'rgba(10,10,10,0.72)',
                                transition: 'color 0.15s ease',
                              }}
                                onMouseEnter={e => { if (!dis) e.currentTarget.style.color = '#0a0a0a' }}
                                onMouseLeave={e => { if (!dis) e.currentTarget.style.color = 'rgba(10,10,10,0.72)' }}
                              >{btn.label}</button>
                            )
                          )}
                        </div>

                        <span style={{ ...MONO, fontSize: '14px', color: precioNormal != null ? 'rgba(180,30,30,0.85)' : '#0a0a0a' }}>
                          Q {(precio * d.cantidad).toFixed(2)}
                        </span>

                        <button onClick={() => eliminar(d.id)} disabled={dis} style={{
                          background: 'none', border: 'none',
                          cursor: dis ? 'default' : 'pointer',
                          ...MONO, fontSize: '15px', lineHeight: 1,
                          color: 'rgba(10,10,10,0.85)',
                          transition: 'color 0.15s ease',
                        }}
                          onMouseEnter={e => { if (!dis) e.currentTarget.style.color = 'rgba(160,0,0,0.65)' }}
                          onMouseLeave={e => { if (!dis) e.currentTarget.style.color = 'rgba(10,10,10,0.55)' }}
                        >✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Resumen */}
            <div style={{ maxWidth: isMobile ? '100%' : '360px', marginLeft: 'auto' }}>
              <div style={{ borderTop: '2px solid #0a0a0a', paddingTop: '1.8rem' }}>
                  <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.44em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)', marginBottom: '1.4rem' }}>
                    resumen
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                    <span style={{ ...MONO, fontSize: '13px', color: 'rgba(10,10,10,0.82)' }}>
                      {detalles.length} {detalles.length === 1 ? 'producto' : 'productos'}
                    </span>
                    <span style={{ ...MONO, fontSize: '13px', color: 'rgba(10,10,10,0.90)' }}>
                      Q {subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: '1px', background: 'rgba(10,10,10,0.08)', margin: '1.2rem 0 1.4rem' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <span style={{ ...MONO, fontSize: '14px', color: '#0a0a0a' }}>Total</span>
                    <span style={{ ...MONO, fontSize: '15px', color: '#0a0a0a' }}>Q {subtotal.toFixed(2)}</span>
                  </div>

                  <button onClick={irAlCheckout} style={{
                    width: '100%', padding: '15px',
                    background: '#0a0a0a', color: '#fafafa',
                    border: 'none', cursor: 'pointer',
                    ...MONO, fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase',
                    transition: 'opacity 0.18s ease',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    proceder al pago
                  </button>

                  <Link to="/productos" style={{
                    display: 'block', textAlign: 'center', marginTop: '1.2rem',
                    ...MONO, fontSize: '12px', letterSpacing: '0.18em',
                    color: 'rgba(10,10,10,0.76)', textDecoration: 'none',
                    transition: 'color 0.16s ease',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = '#0a0a0a'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.76)'}
                  >
                    continuar comprando
                  </Link>
                </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
