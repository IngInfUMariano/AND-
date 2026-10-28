import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import catalogoService from '@/services/catalogo.service'
import carritoService from '@/services/carrito.service'
import MenuOverlay from '@/components/MenuOverlay'
import { useIsMobile } from '@/hooks/useIsMobile'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }

const imgUrl = (producto) => {
  const imgs = producto?.imagen_productos ?? []
  const principal = imgs.find(i => i.es_principal) ?? imgs[0]
  return principal?.url ?? `https://picsum.photos/seed/andcat${producto?.id ?? 'x'}w/900/1200`
}

// Retorna { efectivo, normal } desde las variantes del producto para mostrar en tarjeta.
// normal != null solo cuando hay OFERTA (precio tachado = MINORISTA/MAYORISTA base).
const getPrecioCard = (producto, tipoCliente) => {
  const tipo = tipoCliente === 'MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'
  for (const v of (producto?.variantes ?? [])) {
    const ps = v.precios ?? []
    const oferta = ps.find(p => p.tipo === 'OFERTA')
    const base = ps.find(p => p.tipo === tipo) ?? ps.find(p => p.tipo === 'MINORISTA')
    if (oferta || base) return {
      efectivo: parseFloat((oferta ?? base).monto),
      normal: oferta && base ? parseFloat(base.monto) : null
    }
  }
  return { efectivo: null, normal: null }
}

const LIMIT        = 10
const LIMIT_MAY    = 25
const SLOT_VH      = 175
const NAV_H        = 52
const FILTER_H     = 38
const STICKY_TOP   = NAV_H + FILTER_H

/* ═══════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════ */
function NavHeader({ progress, usuario, totalItems, onOpenMenu }) {
  const isMobile   = useIsMobile()
  const formed     = progress >= 0.95
  const vh         = typeof window !== 'undefined' ? window.innerHeight : 800
  const translateY = Math.max(0, (vh / 2 - NAV_H / 2) * (1 - progress))
  const andSize    = 2.0 - 0.88 * progress
  const color      = formed ? '#0a0a0a' : '#ffffff'

  const catOpacity = Math.max(0, 1 - progress / 0.70)
  const catBlur    = progress * 16

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      transform: `translateY(${translateY}px)`,
    }}>
      <div style={{
        position: 'absolute', inset: 0, background: '#ffffff',
        opacity: formed ? 1 : 0, transition: 'opacity 0.2s ease',
      }} />

      {/* "Catálogo" flotante — solo desktop (en mobile solapa con And&) */}
      {!isMobile && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '22%',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: catOpacity,
            filter: `blur(${catBlur}px)`,
            pointerEvents: 'none',
            zIndex: 1,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ ...DISPLAY, fontSize: 'clamp(2.8rem, 4.5vw, 4rem)', color: '#ffffff', lineHeight: 1 }}>
            Catálogo
          </span>
        </div>
      )}

      <div
        className="relative flex items-center justify-between px-7"
        style={{ height: `${NAV_H}px`, color, transition: 'color 0.2s ease' }}
      >
        <button
          onClick={onOpenMenu}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            ...MONO, fontSize: '11px', letterSpacing: '0.18em',
            color: 'inherit', transition: 'opacity 0.18s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          MENU
        </button>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <h1 style={{
              ...DISPLAY,
              fontSize: `${andSize}rem`,
              lineHeight: 1, whiteSpace: 'nowrap',
              transition: 'font-size 0.45s ease',
              color,
            }}>
              And&
            </h1>
          </Link>
        </div>

        {/* Derecha: carrito (siempre) + perfil (solo desktop) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.8rem' }}>
          <Link
            to="/carrito"
            style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', color, textDecoration: 'none', transition: 'color 0.2s ease' }}
            className="hover:opacity-55 transition-opacity"
          >
            CARRITO{totalItems > 0 ? ` (${totalItems})` : ''}
          </Link>
          {!isMobile && (
            <Link
              to={usuario ? '/cuenta' : '/login'}
              style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', color, textDecoration: 'none', transition: 'color 0.2s ease' }}
              className="hover:opacity-55 transition-opacity"
            >
              {usuario ? `${usuario.nombre?.split(' ')[0] ?? ''} PERFIL` : 'ENTRAR'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   POPUP COMPRAR
   ═══════════════════════════════════════════════════════════════ */
function PopupCompra({ producto, onClose }) {
  const { usuario } = useAuth()
  const { recargar } = useCart()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [variantes, setVariantes]   = useState([])
  const [cargando, setCargando]     = useState(true)
  const [tallaId, setTallaId]       = useState(null)
  const [colorId, setColorId]       = useState(null)
  const [cantidad, setCantidad]     = useState(1)
  const [agregando, setAgregando]   = useState(false)
  const [slideY, setSlideY]         = useState(100)

  useEffect(() => {
    catalogoService.listarVariantesProducto(producto.id)
      .then(r => setVariantes(r.data ?? []))
      .catch(() => {})
      .finally(() => setCargando(false))

    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [producto.id, onClose])

  // Animación slide-up para mobile
  useEffect(() => {
    if (!isMobile) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSlideY(0)))
    return () => cancelAnimationFrame(id)
  }, [isMobile])

  const tallas = [...new Map(variantes.map(v => [v.talla?.id, v.talla])).values()].filter(Boolean)
  const colores = [...new Map(variantes.map(v => [v.color?.id, v.color])).values()].filter(Boolean)
  const varianteActual = variantes.find(v => v.talla?.id === tallaId && v.color?.id === colorId)
  const stockVariante = (v) => (v?.existencias ?? []).reduce((s, e) => s + ((e.cantidad_fisica ?? 0) - (e.cantidad_comprometida ?? 0)), 0)
  const sinStock = varianteActual != null && stockVariante(varianteActual) <= 0

  const getPrecioEfectivo = (v) => {
    const ps = v?.precios ?? []
    const tipo = (usuario?.tipo_cliente ?? usuario?.cliente?.tipo) === 'MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'
    return parseFloat(ps.find(p => p.tipo === 'OFERTA')?.monto ?? ps.find(p => p.tipo === tipo)?.monto ?? ps[0]?.monto ?? 0)
  }
  const getPrecioNormal = (v) => {
    const ps = v?.precios ?? []
    if (!ps.some(p => p.tipo === 'OFERTA')) return null
    const tipo = (usuario?.tipo_cliente ?? usuario?.cliente?.tipo) === 'MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'
    return parseFloat(ps.find(p => p.tipo === tipo)?.monto ?? ps.find(p => p.tipo === 'MINORISTA')?.monto ?? 0)
  }

  const precio = varianteActual
    ? getPrecioEfectivo(varianteActual)
    : producto.precio_base != null ? Number(producto.precio_base) : null
  const precioNormal = varianteActual ? getPrecioNormal(varianteActual) : null

  const combinacionNoDisponible = tallaId && colorId && !varianteActual

  const agregar = async () => {
    if (!usuario) { onClose(); navigate('/login'); return }
    if (!varianteActual) { toast.error('Selecciona talla y color'); return }
    setAgregando(true)
    try {
      await carritoService.agregar(varianteActual.id, cantidad)
      await recargar()
      toast.success('Producto agregado al carrito')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error?.mensaje ?? 'Error al agregar al carrito')
    } finally {
      setAgregando(false)
    }
  }

  const listo = (varianteActual || (tallas.length === 0 && colores.length === 0)) && !agregando && !sinStock

  /* ── Panel de detalles (compartido mobile/desktop) ── */
  const detallesPanel = (
    <div style={{ padding: isMobile ? '1.5rem' : '2.4rem 2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Cerrar */}
      <button
        onClick={onClose}
        style={{
          alignSelf: 'flex-end', marginBottom: '1.2rem',
          background: 'none', border: 'none', cursor: 'pointer',
          ...MONO, fontSize: '10px', letterSpacing: '0.18em',
          color: 'rgba(10,10,10,0.68)',
        }}
      >
        ✕ ESC
      </button>

      {/* Encabezado */}
      <div style={{ marginBottom: '1.6rem' }}>
        <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.90)', marginBottom: '0.5rem' }}>
          {[producto.categoria?.nombre, producto.marca?.nombre].filter(Boolean).join(' · ')}
        </p>
        <h2 style={{ ...DISPLAY, fontSize: 'clamp(1.4rem, 5vw, 1.9rem)', lineHeight: 0.95, marginBottom: '0.8rem' }}>
          {producto.nombre}
        </h2>
        {producto.descripcion && (
          <p style={{ ...MONO, fontSize: '11px', lineHeight: '1.85', color: 'rgba(10,10,10,0.44)', marginBottom: '0.75rem' }}>
            {producto.descripcion}
          </p>
        )}
        {precio != null && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            {precioNormal != null && (
              <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.35)', textDecoration: 'line-through' }}>
                Q {Number(precioNormal).toFixed(2)}
              </span>
            )}
            <span style={{ ...MONO, fontSize: '13px', color: precioNormal != null ? 'rgba(180,30,30,0.85)' : 'rgba(10,10,10,0.6)', fontWeight: 500 }}>
              Q {Number(precio).toFixed(2)}
            </span>
            {precioNormal != null && (
              <span style={{ ...MONO, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(180,30,30,0.7)', border: '1px solid rgba(180,30,30,0.25)', padding: '2px 5px' }}>
                OFERTA
              </span>
            )}
          </div>
        )}
      </div>

      {cargando ? (
        <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.24em', color: 'rgba(10,10,10,0.2)', textTransform: 'uppercase' }}>
          cargando...
        </p>
      ) : (
        <>
          {tallas.length > 0 && (
            <div style={{ marginBottom: '1.4rem' }}>
              <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.90)', marginBottom: '0.6rem' }}>TALLA</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tallas.map(t => (
                  <button key={t.id} onClick={() => setTallaId(t.id)} style={{
                    ...MONO, fontSize: '10px', letterSpacing: '0.14em',
                    padding: '7px 14px', cursor: 'pointer',
                    border: `1px solid ${tallaId === t.id ? '#0a0a0a' : 'rgba(10,10,10,0.14)'}`,
                    background: tallaId === t.id ? '#0a0a0a' : 'transparent',
                    color: tallaId === t.id ? '#fafafa' : 'rgba(10,10,10,0.5)',
                    transition: 'all 0.18s ease',
                  }}>{t.codigo}</button>
                ))}
              </div>
            </div>
          )}

          {colores.length > 0 && (
            <div style={{ marginBottom: '1.4rem' }}>
              <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.90)', marginBottom: '0.6rem' }}>COLOR</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {colores.map(c => (
                  <button key={c.id} onClick={() => setColorId(c.id)} style={{
                    ...MONO, fontSize: '10px', letterSpacing: '0.14em',
                    padding: '7px 14px', cursor: 'pointer',
                    border: `1px solid ${colorId === c.id ? '#0a0a0a' : 'rgba(10,10,10,0.14)'}`,
                    background: colorId === c.id ? '#0a0a0a' : 'transparent',
                    color: colorId === c.id ? '#fafafa' : 'rgba(10,10,10,0.5)',
                    transition: 'all 0.18s ease',
                  }}>{c.nombre}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1.6rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.90)' }}>CANTIDAD</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={() => setCantidad(q => Math.max(1, q - 1))}
                style={{ ...MONO, fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', lineHeight: 1, padding: '4px 8px' }}>−</button>
              <span style={{ ...MONO, fontSize: '13px', minWidth: '22px', textAlign: 'center' }}>{cantidad}</span>
              <button onClick={() => setCantidad(q => q + 1)}
                style={{ ...MONO, fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', lineHeight: 1, padding: '4px 8px' }}>+</button>
            </div>
          </div>

          {combinacionNoDisponible && (
            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(160,0,0,0.6)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
              combinación no disponible
            </p>
          )}
          {sinStock && (
            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(160,0,0,0.6)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
              sin stock disponible
            </p>
          )}

          <button onClick={agregar} disabled={!listo} style={{
            marginTop: 'auto', width: '100%', padding: '15px',
            background: listo ? '#0a0a0a' : 'rgba(10,10,10,0.08)',
            color: listo ? '#fafafa' : 'rgba(10,10,10,0.22)',
            border: 'none', cursor: listo ? 'pointer' : 'default',
            ...MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase',
            transition: 'background 0.22s ease, color 0.22s ease',
          }}>
            {agregando ? 'agregando...' : sinStock ? 'agotado' : 'agregar al carrito'}
          </button>
        </>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: '#fafafa',
        display: 'flex', flexDirection: 'column',
        transform: `translateY(${slideY}%)`,
        transition: 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform',
      }}>
        {/* Imagen — ocupa ~60vh fijo */}
        <div style={{ height: '60vh', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
          <img src={imgUrl(producto)} alt={producto.nombre}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.72)' }}
          />
          {/* Botón cerrar sobre la imagen */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(10,10,10,0.48)', border: 'none', cursor: 'pointer',
              ...MONO, fontSize: '10px', letterSpacing: '0.22em', color: '#ffffff',
              padding: '8px 14px',
            }}
          >
            ✕ ESC
          </button>
          {/* Nombre del producto sobre la imagen (parte inferior) */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '2.5rem 1.5rem 1.2rem',
            background: 'linear-gradient(to top, rgba(10,10,10,0.7) 0%, transparent 100%)',
          }}>
            <p style={{ ...MONO, fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.35rem' }}>
              {[producto.categoria?.nombre, producto.marca?.nombre].filter(Boolean).join(' · ')}
            </p>
            <h2 style={{ ...DISPLAY, fontSize: 'clamp(1.5rem, 6vw, 2rem)', lineHeight: 0.95, color: '#ffffff' }}>
              {producto.nombre}
            </h2>
          </div>
        </div>

        {/* Panel de detalles — scrolleable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.4rem 1.5rem 2rem', display: 'flex', flexDirection: 'column' }}>
          {/* Precio */}
          {precio != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
              {precioNormal != null && (
                <span style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.35)', textDecoration: 'line-through' }}>
                  Q {Number(precioNormal).toFixed(2)}
                </span>
              )}
              <span style={{ ...MONO, fontSize: '14px', color: precioNormal != null ? 'rgba(180,30,30,0.85)' : 'rgba(10,10,10,0.6)', fontWeight: 500 }}>
                Q {Number(precio).toFixed(2)}
              </span>
              {precioNormal != null && (
                <span style={{ ...MONO, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(180,30,30,0.7)', border: '1px solid rgba(180,30,30,0.25)', padding: '2px 5px' }}>
                  OFERTA
                </span>
              )}
            </div>
          )}

          {cargando ? (
            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.24em', color: 'rgba(10,10,10,0.2)', textTransform: 'uppercase' }}>
              cargando...
            </p>
          ) : (
            <>
              {tallas.length > 0 && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.55)', marginBottom: '0.6rem' }}>TALLA</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {tallas.map(t => (
                      <button key={t.id} onClick={() => setTallaId(t.id)} style={{
                        ...MONO, fontSize: '11px', letterSpacing: '0.1em',
                        padding: '9px 18px', cursor: 'pointer',
                        border: `1px solid ${tallaId === t.id ? '#0a0a0a' : 'rgba(10,10,10,0.14)'}`,
                        background: tallaId === t.id ? '#0a0a0a' : 'transparent',
                        color: tallaId === t.id ? '#fafafa' : 'rgba(10,10,10,0.5)',
                        transition: 'all 0.18s ease',
                      }}>{t.codigo}</button>
                    ))}
                  </div>
                </div>
              )}

              {colores.length > 0 && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.55)', marginBottom: '0.6rem' }}>COLOR</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {colores.map(c => (
                      <button key={c.id} onClick={() => setColorId(c.id)} style={{
                        ...MONO, fontSize: '11px', letterSpacing: '0.1em',
                        padding: '9px 18px', cursor: 'pointer',
                        border: `1px solid ${colorId === c.id ? '#0a0a0a' : 'rgba(10,10,10,0.14)'}`,
                        background: colorId === c.id ? '#0a0a0a' : 'transparent',
                        color: colorId === c.id ? '#fafafa' : 'rgba(10,10,10,0.5)',
                        transition: 'all 0.18s ease',
                      }}>{c.nombre}</button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.4rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.55)' }}>CANTIDAD</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => setCantidad(q => Math.max(1, q - 1))}
                    style={{ ...MONO, fontSize: '22px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', lineHeight: 1, padding: '6px 10px' }}>−</button>
                  <span style={{ ...MONO, fontSize: '15px', minWidth: '24px', textAlign: 'center' }}>{cantidad}</span>
                  <button onClick={() => setCantidad(q => q + 1)}
                    style={{ ...MONO, fontSize: '22px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', lineHeight: 1, padding: '6px 10px' }}>+</button>
                </div>
              </div>

              {combinacionNoDisponible && (
                <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(160,0,0,0.6)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
                  combinación no disponible
                </p>
              )}
              {sinStock && (
                <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(160,0,0,0.6)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
                  sin stock disponible
                </p>
              )}

              <button onClick={agregar} disabled={!listo} style={{
                marginTop: 'auto', width: '100%', padding: '16px',
                background: listo ? '#0a0a0a' : 'rgba(10,10,10,0.08)',
                color: listo ? '#fafafa' : 'rgba(10,10,10,0.22)',
                border: 'none', cursor: listo ? 'pointer' : 'default',
                ...MONO, fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase',
                transition: 'background 0.22s ease, color 0.22s ease',
              }}>
                {agregando ? 'agregando...' : sinStock ? 'agotado' : 'agregar al carrito'}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(10,10,10,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fafafa', color: '#0a0a0a',
        width: '100%', maxWidth: '700px',
        display: 'grid', gridTemplateColumns: '42% 1fr',
        position: 'relative',
        maxHeight: '90vh', overflow: 'hidden',
      }}>
        {/* Imagen izquierda */}
        <div style={{ overflow: 'hidden', minHeight: '420px' }}>
          <img src={imgUrl(producto)} alt={producto.nombre}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.75)' }}
          />
        </div>
        {detallesPanel}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────── */

export default function Catalogo() {
  const { usuario }    = useAuth()
  const { totalItems } = useCart()
  const isMobile       = useIsMobile()

  const tipoCliente = usuario?.tipo_cliente ?? usuario?.cliente?.tipo ?? null
  const esMayorista = tipoCliente === 'MAYORISTA'

  const [menuAbierto, setMenuAbierto] = useState(false)
  const [navProgress, setNavProgress] = useState(0)
  const [productos, setProductos]     = useState([])
  const [meta, setMeta]               = useState({ total: 0, pages: 1, page: 1 })
  const [categorias, setCategorias]   = useState([])
  const [cargando, setCargando]       = useState(true)
  const [categoriaId, setCategoriaId] = useState('')
  const [inputBusqueda, setInputBusqueda] = useState('')
  const [busqueda, setBusqueda]           = useState('')
  const [pagina, setPagina]           = useState(1)
  const [activeIndex, setActiveIndex]   = useState(0)
  const [itemProgress, setItemProgress] = useState(0)
  const [popup, setPopup]               = useState(null)

  const s1Ref        = useRef(null)
  const containerRef = useRef(null)
  const cargadoRef   = useRef(false)   // true después de la primera carga exitosa

  // Al montar: garantiza que la página empieza arriba del todo
  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Debounce: actualiza el término real de búsqueda 300ms después del último tipeo
  useEffect(() => {
    const id = setTimeout(() => {
      setBusqueda(inputBusqueda)
      setPagina(1)
    }, 300)
    return () => clearTimeout(id)
  }, [inputBusqueda])

  useEffect(() => {
    const fn = () => {
      const vh = window.innerHeight

      if (s1Ref.current) {
        const rect = s1Ref.current.getBoundingClientRect()
        setNavProgress(Math.min(1, Math.max(0, -rect.top / (vh * 0.85))))
      }

      if (containerRef.current && productos.length) {
        const rect     = containerRef.current.getBoundingClientRect()
        const INTRO_PX = (SLOT_VH / 100) * vh
        const afterIntro = Math.max(0, -rect.top - INTRO_PX)
        const total      = rect.height - vh - INTRO_PX
        const progress   = Math.min(1, afterIntro / Math.max(1, total))
        const n          = productos.length
        const slotFloat  = progress * n
        const ai = Math.min(n - 1, Math.floor(slotFloat))
        const ip = ai === n - 1
          ? Math.min(1, slotFloat - (n - 1))
          : slotFloat - ai
        setActiveIndex(ai)
        setItemProgress(ip)
      }
    }
    window.addEventListener('scroll', fn, { passive: true })
    fn()
    return () => window.removeEventListener('scroll', fn)
  }, [productos])

  useEffect(() => {
    catalogoService.listarCategorias()
      .then(r => setCategorias(r.data ?? []))
      .catch(() => {})
  }, [])

  const cargar = useCallback(() => {
    if (!cargadoRef.current) setCargando(true)
    setActiveIndex(0)
    setItemProgress(0)
    const params = { activo: true, page: pagina, limit: esMayorista ? LIMIT_MAY : LIMIT }
    if (busqueda)    params.q            = busqueda
    if (categoriaId) params.categoria_id = categoriaId

    catalogoService.listarProductos(params)
      .then(res => {
        setProductos(res.data ?? [])
        setMeta(res.meta ?? { total: 0, pages: 1, page: 1 })
        cargadoRef.current = true
      })
      .catch(() => setProductos([]))
      .finally(() => setCargando(false))
  }, [busqueda, categoriaId, pagina])

  useEffect(() => { cargar() }, [cargar])

  const seleccionarCategoria = (id) => { setCategoriaId(id); setPagina(1) }
  const buscarQuery = (q) => setInputBusqueda(q)

  /* ── Vista Mayorista (mosaico) ── */
  const vistaMayorista = esMayorista && !cargando && (
    <>
      {productos.length === 0 ? (
        <div style={{ padding: isMobile ? '4rem 1.5rem' : '6rem 4rem', textAlign: 'center' }}>
          <p style={{ ...DISPLAY, fontSize: isMobile ? '1.8rem' : '2.5rem', color: 'rgba(10,10,10,0.1)' }}>SIN RESULTADOS</p>
          <p style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.50)', marginTop: '1rem' }}>Prueba con otros filtros</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '1px',
          background: 'rgba(10,10,10,0.08)',
          margin: isMobile ? '0' : '0',
        }}>
          {productos.map(p => (
            <div
              key={p.id}
              style={{ background: '#fafafa', display: 'flex', flexDirection: 'column' }}
            >
              {/* Imagen */}
              <div style={{ position: 'relative', paddingBottom: '120%', overflow: 'hidden' }}>
                <img
                  src={imgUrl(p)}
                  alt={p.nombre}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                    display: 'block',
                    filter: 'brightness(0.80)',
                  }}
                />
              </div>

              {/* Info */}
              <div style={{ padding: isMobile ? '0.8rem' : '1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <p style={{ ...MONO, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)' }}>
                  {[p.categoria?.nombre, p.marca?.nombre].filter(Boolean).join(' · ')}
                </p>
                <h3 style={{
                  ...DISPLAY,
                  fontSize: isMobile ? '0.88rem' : 'clamp(0.9rem, 1.1vw, 1.05rem)',
                  lineHeight: 1.15, flex: 1,
                }}>
                  {p.nombre.toUpperCase()}
                </h3>
                {(() => {
                  const { efectivo, normal } = getPrecioCard(p, tipoCliente)
                  return efectivo != null ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {normal != null && <span style={{ ...MONO, fontSize: '10px', color: 'rgba(10,10,10,0.35)', textDecoration: 'line-through' }}>Q {Number(normal).toFixed(2)}</span>}
                      <span style={{ ...MONO, fontSize: isMobile ? '11px' : '12px', color: normal != null ? 'rgba(180,30,30,0.85)' : 'rgba(10,10,10,0.55)' }}>Q {Number(efectivo).toFixed(2)}</span>
                      {normal != null && <span style={{ ...MONO, fontSize: '8px', letterSpacing: '0.12em', color: 'rgba(180,30,30,0.7)', border: '1px solid rgba(180,30,30,0.25)', padding: '1px 4px' }}>OFERTA</span>}
                    </div>
                  ) : null
                })()}
                {getPrecioCard(p, tipoCliente).efectivo != null && (
                  <button
                    onClick={() => setPopup(p)}
                    style={{
                      marginTop: '0.5rem',
                      ...MONO, fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase',
                      background: '#0a0a0a', color: '#fafafa',
                      border: 'none', cursor: 'pointer',
                      padding: isMobile ? '9px 0' : '10px 0',
                      width: '100%',
                      transition: 'opacity 0.16s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    comprar →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {meta.pages > 1 && (
        <div style={{ padding: isMobile ? '2rem 1rem' : '2rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(10,10,10,0.07)' }}>
          <button disabled={pagina === 1} onClick={() => { setPagina(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{
            ...MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
            background: 'none', border: 'none', cursor: pagina === 1 ? 'default' : 'pointer',
            color: pagina === 1 ? 'rgba(10,10,10,0.18)' : '#0a0a0a',
            borderBottom: pagina === 1 ? '1px solid transparent' : '1px solid rgba(10,10,10,0.26)', paddingBottom: '2px',
          }}>← anterior</button>
          <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.22em', color: 'rgba(10,10,10,0.55)' }}>
            {pagina} / {meta.pages} · {meta.total} productos
          </span>
          <button disabled={pagina >= meta.pages} onClick={() => { setPagina(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{
            ...MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
            background: 'none', border: 'none', cursor: pagina >= meta.pages ? 'default' : 'pointer',
            color: pagina >= meta.pages ? 'rgba(10,10,10,0.18)' : '#0a0a0a',
            borderBottom: pagina >= meta.pages ? '1px solid transparent' : '1px solid rgba(10,10,10,0.26)', paddingBottom: '2px',
          }}>siguiente →</button>
        </div>
      )}
    </>
  )

  /* ── Barra de filtros (compartida) ── */
  const barraDeFiltros = (
    <>
      <div style={{
        position: 'sticky', top: `${NAV_H}px`, zIndex: 9,
        background: '#ffffff',
        padding: isMobile ? '0 1rem' : '0 4rem',
        height: isMobile ? 'auto' : `${FILTER_H}px`,
        minHeight: `${FILTER_H}px`,
        display: 'flex', gap: '0.75rem', alignItems: 'center',
      }}>
        <div style={{
          display: 'flex', gap: '0.45rem', flex: 1,
          overflowX: 'auto', overflowY: 'hidden',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {[{ id: '', nombre: 'Todas' }, ...categorias].map(c => (
            <button key={c.id} onClick={() => seleccionarCategoria(c.id)} style={{
              ...MONO, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
              padding: '4px 10px', borderRadius: '2px', cursor: 'pointer', whiteSpace: 'nowrap',
              border: `1px solid ${categoriaId === c.id ? '#0a0a0a' : 'rgba(10,10,10,0.12)'}`,
              background: categoriaId === c.id ? '#0a0a0a' : 'transparent',
              color: categoriaId === c.id ? '#ffffff' : 'rgba(10,10,10,0.38)',
              transition: 'all 0.18s ease', flexShrink: 0,
            }}>
              {c.nombre}
            </button>
          ))}
        </div>
        {!isMobile && (
          <input
            value={inputBusqueda}
            onChange={e => buscarQuery(e.target.value)}
            placeholder="buscar..."
            style={{
              ...MONO, fontSize: '10px', letterSpacing: '0.14em',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(10,10,10,0.16)',
              padding: '3px 0', outline: 'none', width: '130px', color: '#0a0a0a',
            }}
          />
        )}
        {!esMayorista && (
          <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(10,10,10,0.85)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {meta.total} prod.
          </span>
        )}
      </div>

      {isMobile && (
        <div style={{ padding: '0 1rem 8px', background: '#ffffff' }}>
          <input
            value={inputBusqueda}
            onChange={e => buscarQuery(e.target.value)}
            placeholder="buscar productos..."
            style={{
              ...MONO, fontSize: '12px', letterSpacing: '0.08em',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(10,10,10,0.16)',
              padding: '6px 0', outline: 'none', width: '100%', color: '#0a0a0a',
            }}
          />
        </div>
      )}

      <div style={{ height: '1px', background: 'rgba(10,10,10,0.07)' }} />
    </>
  )

  return (
    <>
      <NavHeader progress={esMayorista ? 1 : navProgress} usuario={usuario} totalItems={totalItems} onOpenMenu={() => setMenuAbierto(true)} />
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />

      {/* Hero — solo para minoristas */}
      {!esMayorista && (
        <section ref={s1Ref} className="relative overflow-hidden" style={{ height: '100vh', background: '#111' }}>
          <video autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.5)' }}
          >
            <source src="/video/catalogo.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/12" />
        </section>
      )}

      {/* ── Catálogo ── */}
      <div style={{ background: '#ffffff', color: '#0a0a0a', paddingTop: esMayorista ? `${NAV_H}px` : 0 }}>

        {barraDeFiltros}

        {/* ── Catálogo: mayorista | móvil | escritorio ── */}
        {cargando ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.2)', letterSpacing: '0.3em' }}>cargando...</span>
          </div>
        ) : esMayorista ? vistaMayorista
        : productos.length === 0 ? (
          <div style={{ padding: isMobile ? '4rem 1.5rem' : '6rem 4rem', textAlign: 'center' }}>
            <p style={{ ...DISPLAY, fontSize: isMobile ? '1.8rem' : '2.5rem', color: 'rgba(10,10,10,0.1)' }}>SIN RESULTADOS</p>
            <p style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.90)', marginTop: '1rem' }}>Prueba con otros filtros</p>
          </div>
        ) : isMobile ? (
          /* ── MOBILE: scroll-driver vertical (imagen 75% + franja info 25%) ── */
          <>
            <div ref={containerRef} style={{ height: `${(productos.length + 1) * SLOT_VH}vh`, position: 'relative' }}>
              <div style={{
                position: 'sticky',
                top: `${STICKY_TOP}px`,
                height: `calc(100vh - ${STICKY_TOP}px)`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Zona imagen: 75% */}
                <div style={{ flex: '0 0 75%', position: 'relative', overflow: 'hidden' }}>
                  {productos.map((p, i) => {
                    const ty = i === 0
                      ? 0
                      : i < activeIndex
                        ? 0
                        : i === activeIndex
                          ? (1 - itemProgress) * 100
                          : 100
                    return (
                      <div key={p.id} style={{
                        position: 'absolute', inset: 0,
                        transform: `translateY(${ty}%)`,
                        zIndex: i,
                        willChange: 'transform',
                      }}>
                        <img
                          src={imgUrl(p)}
                          alt={p.nombre}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.72)' }}
                        />
                      </div>
                    )
                  })}
                  {/* Contador */}
                  <div style={{
                    position: 'absolute', bottom: '1rem', right: '1rem', zIndex: productos.length + 1,
                    ...MONO, fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)',
                  }}>
                    {String(activeIndex + 1).padStart(2, '0')} / {String(productos.length).padStart(2, '0')}
                  </div>
                </div>

                {/* Franja info: 25% — cross-fade sincronizado con la imagen */}
                {(() => {
                  const curr = productos[activeIndex]
                  const prev = activeIndex > 0 ? productos[activeIndex - 1] : null
                  // Al 52% de ip, la imagen nueva cubre >50% del área → cambia el nombre
                  const FADE = 0.52
                  const prevOp = prev ? Math.max(0, 1 - itemProgress / FADE) : 0
                  const currOp = !prev ? 1 : Math.min(1, itemProgress / FADE)

                  const infoLayer = (p, opacity) => (
                    <div style={{
                      position: 'absolute', inset: 0,
                      padding: '1rem 1.5rem',
                      background: '#ffffff',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      opacity,
                    }}>
                      <div>
                        <p style={{ ...MONO, fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(10,10,10,0.35)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                          {[p.categoria?.nombre, p.marca?.nombre].filter(Boolean).join(' · ')}
                        </p>
                        <h3 style={{ ...DISPLAY, fontSize: 'clamp(1.1rem, 4.5vw, 1.5rem)', lineHeight: 1.05 }}>
                          {p.nombre}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {(() => {
                          const { efectivo, normal } = getPrecioCard(p, tipoCliente)
                          return efectivo != null ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {normal != null && <span style={{ ...MONO, fontSize: '10px', color: 'rgba(10,10,10,0.35)', textDecoration: 'line-through' }}>Q {Number(normal).toFixed(2)}</span>}
                              <span style={{ ...MONO, fontSize: '12px', color: normal != null ? 'rgba(180,30,30,0.85)' : 'rgba(10,10,10,0.5)' }}>Q {Number(efectivo).toFixed(2)}</span>
                              {normal != null && <span style={{ ...MONO, fontSize: '8px', letterSpacing: '0.12em', color: 'rgba(180,30,30,0.7)', border: '1px solid rgba(180,30,30,0.25)', padding: '1px 4px' }}>OFERTA</span>}
                            </div>
                          ) : null
                        })()}
                        {getPrecioCard(p, tipoCliente).efectivo != null && (
                          <button onClick={() => setPopup(p)} style={{
                            ...MONO, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase',
                            background: '#0a0a0a', color: '#fafafa',
                            border: 'none', cursor: 'pointer',
                            padding: '11px 22px', marginLeft: 'auto',
                          }}>comprar →</button>
                        )}
                      </div>
                    </div>
                  )

                  return (
                    <div style={{ flex: '0 0 25%', position: 'relative', borderTop: '1px solid rgba(10,10,10,0.07)' }}>
                      {prev && prevOp > 0 && infoLayer(prev, prevOp)}
                      {curr && infoLayer(curr, currOp)}
                    </div>
                  )
                })()}
              </div>
            </div>

            {meta.pages > 1 && (
              <div style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(10,10,10,0.07)' }}>
                <button disabled={pagina === 1} onClick={() => { setPagina(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{
                  ...MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
                  background: 'none', border: 'none', cursor: pagina === 1 ? 'default' : 'pointer',
                  color: pagina === 1 ? 'rgba(10,10,10,0.18)' : '#0a0a0a',
                  borderBottom: pagina === 1 ? '1px solid transparent' : '1px solid rgba(10,10,10,0.26)', paddingBottom: '2px',
                }}>← ant.</button>
                <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.22em', color: 'rgba(10,10,10,0.88)' }}>{pagina} / {meta.pages}</span>
                <button disabled={pagina >= meta.pages} onClick={() => { setPagina(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{
                  ...MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
                  background: 'none', border: 'none', cursor: pagina >= meta.pages ? 'default' : 'pointer',
                  color: pagina >= meta.pages ? 'rgba(10,10,10,0.18)' : '#0a0a0a',
                  borderBottom: pagina >= meta.pages ? '1px solid transparent' : '1px solid rgba(10,10,10,0.26)', paddingBottom: '2px',
                }}>sig. →</button>
              </div>
            )}
          </>
        ) : (
          /* ── DESKTOP: scroll-driver ── */
          <>
            <div ref={containerRef} style={{ height: `${(productos.length + 1) * SLOT_VH}vh`, position: 'relative' }}>
              <div style={{
                position: 'sticky',
                top: `${STICKY_TOP}px`,
                height: `calc(100vh - ${STICKY_TOP}px)`,
                display: 'grid',
                gridTemplateColumns: '55% 45%',
                overflow: 'hidden',
              }}>

                {/* Izquierda: lista */}
                <div style={{
                  padding: '2.5rem 4rem',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  overflow: 'hidden',
                  borderRight: '1px solid rgba(10,10,10,0.07)',
                }}>
                  {productos.map((p, i) => {
                    const isActive = i === activeIndex
                    const ip       = isActive ? itemProgress : 0
                    const expandIp = Math.min(1, Math.max(0, (ip - 0.25) / 0.50))
                    return (
                      <div key={p.id} style={{
                        borderBottom: '1px solid rgba(10,10,10,0.07)',
                        padding: isActive ? '1.1rem 0' : '0.7rem 0',
                        transition: 'padding 0.42s ease',
                        opacity: isActive
                          ? (activeIndex === 0 ? 1 : 0.27 + 0.73 * itemProgress)
                          : 0.27,
                      }}>
                        <div style={{ overflow: 'hidden' }}>
                          <h3 style={{
                            ...DISPLAY,
                            fontSize: isActive ? 'clamp(1.4rem, 2.2vw, 2rem)' : '1rem',
                            lineHeight: 1, letterSpacing: '0.05em',
                            transition: 'font-size 0.42s cubic-bezier(0.25,0.46,0.45,0.94)',
                            marginBottom: isActive ? '0.6rem' : 0,
                          }}>
                            {p.nombre.toUpperCase()}
                          </h3>
                          <div style={{ maxHeight: `${expandIp * 260}px`, overflow: 'hidden' }}>
                            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(10,10,10,0.3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                              {[p.categoria?.nombre, p.marca?.nombre].filter(Boolean).join(' · ')}
                            </p>
                            {p.descripcion && (
                              <p style={{ ...MONO, fontSize: '11px', lineHeight: '1.85', color: 'rgba(10,10,10,0.76)', marginBottom: '0.65rem', maxWidth: '320px' }}>
                                {p.descripcion.length > 100 ? p.descripcion.slice(0, 100) + '…' : p.descripcion}
                              </p>
                            )}
                            {(() => {
                              const { efectivo, normal } = getPrecioCard(p, tipoCliente)
                              return efectivo != null ? (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                                  {normal != null && <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.35)', textDecoration: 'line-through' }}>Q {Number(normal).toFixed(2)}</span>}
                                  <span style={{ ...MONO, fontSize: '13px', color: normal != null ? 'rgba(180,30,30,0.85)' : 'rgba(10,10,10,0.6)', fontWeight: 500 }}>Q {Number(efectivo).toFixed(2)}</span>
                                  {normal != null && <span style={{ ...MONO, fontSize: '8px', letterSpacing: '0.12em', color: 'rgba(180,30,30,0.7)', border: '1px solid rgba(180,30,30,0.25)', padding: '1px 4px' }}>OFERTA</span>}
                                </div>
                              ) : null
                            })()}
                            {getPrecioCard(p, tipoCliente).efectivo != null && (
                              <button
                                onClick={() => setPopup(p)}
                                style={{
                                  ...MONO, fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase',
                                  background: 'none', border: 'none',
                                  borderBottom: '1px solid rgba(10,10,10,0.26)',
                                  paddingBottom: '2px', color: '#0a0a0a', cursor: 'pointer',
                                }}
                              >
                                comprar →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Derecha: imágenes */}
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  {productos.map((p, i) => {
                    const ty = i === 0
                      ? 0
                      : i < activeIndex
                        ? 0
                        : i === activeIndex
                          ? (1 - itemProgress) * 100
                          : 100
                    return (
                      <div key={p.id} style={{
                        position: 'absolute', inset: 0,
                        transform: `translateY(${ty}%)`,
                        zIndex: i,
                        willChange: 'transform',
                      }}>
                        <img
                          src={imgUrl(p)}
                          alt={p.nombre}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.75)' }}
                        />
                      </div>
                    )
                  })}
                  <div style={{
                    position: 'absolute', bottom: '1.8rem', right: '1.8rem', zIndex: productos.length + 1,
                    ...MONO, fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)',
                  }}>
                    {String(activeIndex + 1).padStart(2,'0')} / {String(productos.length).padStart(2,'0')}
                  </div>
                </div>

              </div>
            </div>

            {meta.pages > 1 && (
              <div style={{ padding: '2.5rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(10,10,10,0.07)' }}>
                <button disabled={pagina === 1} onClick={() => { setPagina(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{
                  ...MONO, fontSize: '11px', letterSpacing: '0.26em', textTransform: 'uppercase',
                  background: 'none', border: 'none', cursor: pagina === 1 ? 'default' : 'pointer',
                  color: pagina === 1 ? 'rgba(10,10,10,0.18)' : '#0a0a0a',
                  borderBottom: pagina === 1 ? '1px solid transparent' : '1px solid rgba(10,10,10,0.26)', paddingBottom: '2px',
                }}>← anterior</button>
                <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.26em', color: 'rgba(10,10,10,0.88)' }}>{pagina} / {meta.pages}</span>
                <button disabled={pagina >= meta.pages} onClick={() => { setPagina(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{
                  ...MONO, fontSize: '11px', letterSpacing: '0.26em', textTransform: 'uppercase',
                  background: 'none', border: 'none', cursor: pagina >= meta.pages ? 'default' : 'pointer',
                  color: pagina >= meta.pages ? 'rgba(10,10,10,0.18)' : '#0a0a0a',
                  borderBottom: pagina >= meta.pages ? '1px solid transparent' : '1px solid rgba(10,10,10,0.26)', paddingBottom: '2px',
                }}>siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>

      {popup && <PopupCompra producto={popup} onClose={() => setPopup(null)} />}
    </>
  )
}
