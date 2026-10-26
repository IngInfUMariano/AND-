import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import catalogoService from '@/services/catalogo.service'
import carritoService from '@/services/carrito.service'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import MenuOverlay from '@/components/MenuOverlay'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }
const NAV_H   = 52

const getPrecioEfectivo = (variante, tipoCliente) => {
  const ps = variante?.precios ?? []
  const tipo = tipoCliente === 'MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'
  return ps.find(p => p.tipo === 'OFERTA')?.monto
      ?? ps.find(p => p.tipo === tipo)?.monto
      ?? ps[0]?.monto ?? null
}
const getPrecioNormal = (variante) => {
  const ps = variante?.precios ?? []
  if (!ps.some(p => p.tipo === 'OFERTA')) return null
  return ps.find(p => p.tipo === 'MINORISTA')?.monto ?? null
}

const imgUrl = (producto) => {
  const imgs = producto?.imagen_productos ?? []
  const principal = imgs.find(i => i.es_principal) ?? imgs[0]
  return principal?.url ?? `https://picsum.photos/seed/andprod${producto?.id ?? 'x'}/900/1200`
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
          to="/carrito"
          style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', color: '#0a0a0a', textDecoration: 'none', transition: 'opacity 0.18s ease' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.45'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          CARRITO{totalItems > 0 ? ` (${totalItems})` : ''}
        </Link>
      </div>
      <div style={{ height: '1px', background: 'rgba(10,10,10,0.09)' }} />
    </div>
  )
}

export default function ProductoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { recargar } = useCart()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const [producto, setProducto] = useState(null)
  const [variantes, setVariantes] = useState([])
  const [cargando, setCargando] = useState(true)

  const [tallaSeleccionada, setTallaSeleccionada] = useState(null)
  const [colorSeleccionado, setColorSeleccionado] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [agregando, setAgregando] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    Promise.all([
      catalogoService.obtenerProducto(id),
      catalogoService.listarVariantesProducto(id),
    ]).then(([prod, vars]) => {
      setProducto(prod.data)
      setVariantes(vars.data ?? [])
    }).catch(() => toast.error('No se pudo cargar el producto'))
      .finally(() => setCargando(false))
  }, [id])

  const tallas = [...new Map(variantes.map(v => [v.talla?.id, v.talla])).values()].filter(Boolean)
  const colores = [...new Map(variantes.map(v => [v.color?.id, v.color])).values()].filter(Boolean)
  const varianteActual = variantes.find(v => v.talla?.id === tallaSeleccionada && v.color?.id === colorSeleccionado)
  const precio = varianteActual
    ? getPrecioEfectivo(varianteActual, usuario?.tipo_cliente)
    : producto?.precio_base != null ? Number(producto.precio_base) : null
  const precioNormal = varianteActual ? getPrecioNormal(varianteActual) : null

  const agregarAlCarrito = async () => {
    if (!usuario) { navigate('/login'); return }
    if (!varianteActual) { toast.error('Selecciona talla y color'); return }
    setAgregando(true)
    try {
      await carritoService.agregar(varianteActual.id, cantidad)
      await recargar()
      toast.success('Producto agregado al carrito')
    } catch (err) {
      toast.error(err.response?.data?.error?.mensaje ?? 'Error al agregar al carrito')
    } finally {
      setAgregando(false)
    }
  }

  const listo = (varianteActual || (tallas.length === 0 && colores.length === 0)) && !agregando
  const combinacionNoDisponible = tallaSeleccionada && colorSeleccionado && !varianteActual

  if (cargando) return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <NavHeader onOpenMenu={() => setMenuAbierto(true)} />
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />
      <div style={{ paddingTop: `${NAV_H + 120}px`, textAlign: 'center' }}>
        <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.2)' }}>
          cargando...
        </span>
      </div>
    </div>
  )

  if (!producto) return null

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0a0a0a' }}>
      <NavHeader onOpenMenu={() => setMenuAbierto(true)} />
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />

      <div style={{ display: 'grid', gridTemplateColumns: '52% 1fr', paddingTop: `${NAV_H}px`, minHeight: `calc(100vh - ${NAV_H}px)` }}>

        {/* Imagen — sticky */}
        <div style={{ position: 'sticky', top: `${NAV_H}px`, height: `calc(100vh - ${NAV_H}px)`, overflow: 'hidden' }}>
          <img
            src={imgUrl(producto)}
            alt={producto.nombre}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(100%) brightness(0.75)' }}
          />
        </div>

        {/* Panel derecho */}
        <div style={{ padding: '4rem 4rem 5rem 4rem', display: 'flex', flexDirection: 'column' }}>

          {/* Volver */}
          <button
            onClick={() => navigate(-1)}
            style={{
              alignSelf: 'flex-start', marginBottom: '3rem',
              ...MONO, fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(10,10,10,0.4)', transition: 'color 0.16s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#0a0a0a'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.4)'}
          >
            ← volver
          </button>

          {/* Encabezado */}
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)', marginBottom: '0.7rem' }}>
              {[producto.categoria?.nombre, producto.marca?.nombre].filter(Boolean).join(' · ')}
            </p>
            <h1 style={{ ...DISPLAY, fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: 0.95, marginBottom: '1rem' }}>
              {producto.nombre}
            </h1>
            {producto.descripcion && (
              <p style={{ ...MONO, fontSize: '12px', lineHeight: '1.9', color: 'rgba(10,10,10,0.55)', maxWidth: '360px' }}>
                {producto.descripcion}
              </p>
            )}
          </div>

          {/* Precio */}
          {precio != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
              {precioNormal != null && (
                <span style={{ ...MONO, fontSize: '14px', color: 'rgba(10,10,10,0.35)', textDecoration: 'line-through' }}>
                  ₡ {Number(precioNormal).toLocaleString('es-CR')}
                </span>
              )}
              <span style={{ ...MONO, fontSize: '18px', color: precioNormal != null ? 'rgba(180,30,30,0.85)' : 'rgba(10,10,10,0.7)', fontWeight: 500 }}>
                ₡ {Number(precio).toLocaleString('es-CR')}
              </span>
              {precioNormal != null && (
                <span style={{ ...MONO, fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(180,30,30,0.75)', border: '1px solid rgba(180,30,30,0.3)', padding: '2px 6px' }}>
                  OFERTA
                </span>
              )}
            </div>
          )}

          <div style={{ height: '1px', background: 'rgba(10,10,10,0.08)', marginBottom: '2rem' }} />

          {/* Tallas */}
          {tallas.length > 0 && (
            <div style={{ marginBottom: '1.8rem' }}>
              <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.55)', marginBottom: '0.75rem' }}>
                TALLA
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tallas.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTallaSeleccionada(t.id)}
                    style={{
                      ...MONO, fontSize: '10px', letterSpacing: '0.14em',
                      padding: '5px 14px', cursor: 'pointer',
                      border: `1px solid ${tallaSeleccionada === t.id ? '#0a0a0a' : 'rgba(10,10,10,0.14)'}`,
                      background: tallaSeleccionada === t.id ? '#0a0a0a' : 'transparent',
                      color: tallaSeleccionada === t.id ? '#fafafa' : 'rgba(10,10,10,0.5)',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {t.codigo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colores */}
          {colores.length > 0 && (
            <div style={{ marginBottom: '1.8rem' }}>
              <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.55)', marginBottom: '0.75rem' }}>
                COLOR
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {colores.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setColorSeleccionado(c.id)}
                    style={{
                      ...MONO, fontSize: '10px', letterSpacing: '0.14em',
                      padding: '5px 14px', cursor: 'pointer',
                      border: `1px solid ${colorSeleccionado === c.id ? '#0a0a0a' : 'rgba(10,10,10,0.14)'}`,
                      background: colorSeleccionado === c.id ? '#0a0a0a' : 'transparent',
                      color: colorSeleccionado === c.id ? '#fafafa' : 'rgba(10,10,10,0.5)',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.55)' }}>
              CANTIDAD
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setCantidad(q => Math.max(1, q - 1))}
                style={{ ...MONO, fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', lineHeight: 1 }}
              >−</button>
              <span style={{ ...MONO, fontSize: '13px', minWidth: '22px', textAlign: 'center' }}>{cantidad}</span>
              <button
                onClick={() => setCantidad(q => q + 1)}
                style={{ ...MONO, fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', lineHeight: 1 }}
              >+</button>
            </div>
          </div>

          {combinacionNoDisponible && (
            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(160,0,0,0.6)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
              combinación no disponible
            </p>
          )}

          <button
            onClick={agregarAlCarrito}
            disabled={!listo}
            style={{
              width: '100%', padding: '14px',
              background: listo ? '#0a0a0a' : 'rgba(10,10,10,0.07)',
              color: listo ? '#fafafa' : 'rgba(10,10,10,0.2)',
              border: 'none', cursor: listo ? 'pointer' : 'default',
              ...MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase',
              transition: 'background 0.22s ease, color 0.22s ease',
            }}
          >
            {agregando ? 'agregando...' : 'agregar al carrito'}
          </button>

          <Link
            to="/productos"
            style={{
              display: 'block', textAlign: 'center', marginTop: '1.2rem',
              ...MONO, fontSize: '11px', letterSpacing: '0.18em',
              color: 'rgba(10,10,10,0.35)', textDecoration: 'none',
              transition: 'color 0.16s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#0a0a0a'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}
          >
            seguir comprando
          </Link>
        </div>
      </div>
    </div>
  )
}
