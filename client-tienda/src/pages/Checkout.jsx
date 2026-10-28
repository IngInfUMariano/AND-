import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import pedidoService from '@/services/pedido.service'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import clienteService from '@/services/cliente.service'
import MenuOverlay from '@/components/MenuOverlay'
import { useIsMobile } from '@/hooks/useIsMobile'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }
const NAV_H   = 52

const DEPARTAMENTOS_GT = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula',
  'El Progreso', 'Escuintla', 'Guatemala', 'Huehuetenango',
  'Izabal', 'Jalapa', 'Jutiapa', 'Petén',
  'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez',
  'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez',
  'Totonicapán', 'Zacapa',
]

const getPrecioEfectivo = (variante, tipoCliente) => {
  const ps = variante?.precios ?? []
  const tipo = tipoCliente === 'MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'
  return parseFloat(ps.find(p => p.tipo === 'OFERTA')?.monto ?? ps.find(p => p.tipo === tipo)?.monto ?? ps[0]?.monto ?? 0)
}
const getPrecioNormal = (variante, tipoCliente) => {
  const ps = variante?.precios ?? []
  if (!ps.some(p => p.tipo === 'OFERTA')) return null
  const tipo = tipoCliente === 'MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'
  return parseFloat(ps.find(p => p.tipo === tipo)?.monto ?? ps.find(p => p.tipo === 'MINORISTA')?.monto ?? 0)
}

const zonaParaDept = (zonasEnvio, departamento) => {
  if (!departamento || !zonasEnvio.length) return null
  return zonasEnvio.find(z => {
    if (!z.departamentos) return false
    return z.departamentos.split(',').map(s => s.trim()).includes(departamento.trim())
  }) ?? null
}

const fieldStyle = (hasError = false) => ({
  ...MONO, fontSize: '13px', letterSpacing: '0.03em',
  width: '100%', background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${hasError ? 'rgba(180,0,0,0.5)' : 'rgba(10,10,10,0.16)'}`,
  padding: '8px 0', outline: 'none',
  color: '#0a0a0a', boxSizing: 'border-box',
  transition: 'border-color 0.16s ease',
})

const selectStyle = (hasError = false) => ({
  ...fieldStyle(hasError),
  appearance: 'none', WebkitAppearance: 'none',
  cursor: 'pointer',
})

const labelStyle = {
  ...MONO, fontSize: '10px', letterSpacing: '0.3em',
  textTransform: 'uppercase', color: 'rgba(10,10,10,0.55)',
  display: 'block', marginBottom: '0.5rem',
}

const errorStyle = {
  ...MONO, fontSize: '10px', letterSpacing: '0.1em',
  color: 'rgba(180,0,0,0.65)', marginTop: '0.35rem',
}

function NavHeader({ onOpenMenu }) {
  const { usuario } = useAuth()

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

function SeccionLabel({ children }) {
  return (
    <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)', marginBottom: '1.2rem' }}>
      {children}
    </p>
  )
}

function RadioBtn({ label, value, current, onChange }) {
  const activo = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      style={{
        ...MONO, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
        padding: '6px 16px', cursor: 'pointer',
        border: `1px solid ${activo ? '#0a0a0a' : 'rgba(10,10,10,0.14)'}`,
        background: activo ? '#0a0a0a' : 'transparent',
        color: activo ? '#fafafa' : 'rgba(10,10,10,0.5)',
        transition: 'all 0.18s ease',
      }}
    >
      {label}
    </button>
  )
}

export default function Checkout() {
  const navigate = useNavigate()
  const { carrito, recargar } = useCart()
  const { usuario } = useAuth()
  const isMobile = useIsMobile()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const [sucursales, setSucursales] = useState([])
  const [zonasEnvio, setZonasEnvio] = useState([])
  const [direcciones, setDirecciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [creditoDisponible, setCreditoDisponible] = useState(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      entrega_tipo: 'RETIRO_SUCURSAL',
      forma_pago: 'STRIPE',
      direccion_guardada: '',
    }
  })

  const entregaTipo       = watch('entrega_tipo')
  const formaPago         = watch('forma_pago')
  const dirGuardadaId     = watch('direccion_guardada')
  const departamentoNuevo = watch('departamento_nuevo')

  const esEnvio = entregaTipo === 'ENVIO'

  const dirGuardada = dirGuardadaId
    ? direcciones.find(d => String(d.id) === dirGuardadaId) ?? null
    : null

  const zonaActual = esEnvio
    ? (dirGuardada
        ? (dirGuardada.zona_envio ?? null)
        : zonaParaDept(zonasEnvio, departamentoNuevo))
    : null

  useEffect(() => {
    Promise.all([
      pedidoService.listarSucursales(),
      pedidoService.listarZonasEnvio(),
      clienteService.listarDirecciones(),
    ]).then(([suc, zonas, dirs]) => {
      setSucursales(suc.data ?? [])
      setZonasEnvio(zonas.data ?? [])
      setDirecciones(dirs.data ?? [])
    }).catch(() => {}).finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    if (usuario?.tipo_cliente === 'MAYORISTA')
      clienteService.obtenerCredito()
        .then(res => setCreditoDisponible((res.data ?? res).disponible ?? null))
        .catch(() => {})
  }, [usuario?.tipo_cliente])

  const onSubmit = async (valores) => {
    setEnviando(true)
    try {
      const payload = {
        forma_pago: valores.forma_pago === 'STRIPE' ? 'EN_LINEA' : valores.forma_pago,
        entrega_tipo: valores.entrega_tipo,
        observaciones: valores.observaciones || undefined,
        nombre_pedido: valores.nombre_pedido?.trim() || undefined,
      }

      if (esEnvio) {
        if (dirGuardada) {
          if (!dirGuardada.zona_envio_id) {
            toast.error('Esta dirección no tiene zona de envío asignada. Actualízala en Mi Cuenta.')
            setEnviando(false)
            return
          }
          payload.zona_envio_id        = dirGuardada.zona_envio_id
          payload.entrega_destinatario = dirGuardada.destinatario
          payload.entrega_direccion    = dirGuardada.direccion
          payload.entrega_municipio    = dirGuardada.municipio
          payload.entrega_departamento = dirGuardada.departamento
          payload.entrega_telefono     = dirGuardada.telefono || undefined
        } else {
          const zona = zonaParaDept(zonasEnvio, valores.departamento_nuevo)
          if (!zona) {
            toast.error(`No disponemos envíos al departamento de ${valores.departamento_nuevo || 'este departamento'}.`)
            setEnviando(false)
            return
          }
          payload.zona_envio_id        = zona.id
          payload.entrega_destinatario = valores.destinatario_nuevo
          payload.entrega_direccion    = valores.direccion_nueva
          payload.entrega_municipio    = valores.municipio_nuevo
          payload.entrega_departamento = valores.departamento_nuevo
          payload.entrega_telefono     = valores.telefono_nuevo || undefined
        }
      } else {
        payload.sucursal_id = Number(valores.sucursal_id)
      }

      const res = await pedidoService.crear(payload)
      const pedidoId = res.data.id

      navigate(`/pago/${pedidoId}`)
      recargar()
    } catch (err) {
      toast.error(err.response?.data?.error?.mensaje ?? 'Error al crear el pedido')
    } finally {
      setEnviando(false)
    }
  }

  const detalles = carrito?.carrito_detalles ?? []

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

  if (detalles.length === 0) {
    navigate('/carrito')
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#0a0a0a' }}>
      <NavHeader onOpenMenu={() => setMenuAbierto(true)} />
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '40% 1fr',
        paddingTop: `${NAV_H}px`,
        minHeight: `calc(100vh - ${NAV_H}px)`,
      }}>

        {/* Imagen sticky (solo desktop) */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: `${NAV_H}px`, height: `calc(100vh - ${NAV_H}px)`, overflow: 'hidden' }}>
            <img
              src="https://picsum.photos/seed/andcheckout44/800/1200"
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(100%) brightness(0.52)' }}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <h1 style={{
                ...DISPLAY,
                fontSize: 'clamp(2.5rem, 4.5vw, 4.2rem)',
                color: '#ffffff', textAlign: 'center', lineHeight: 1.15,
              }}>
                Finalizar<br />Compra
              </h1>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div style={{ padding: isMobile ? '2rem 1.2rem 4rem' : '4rem 4rem 5rem 4.5rem', overflowY: 'auto' }}>
          {isMobile && (
            <h1 style={{ ...DISPLAY, fontSize: '2rem', marginBottom: '2rem', lineHeight: 1 }}>
              Finalizar Compra
            </h1>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

            {/* ── Tipo de entrega ── */}
            <section>
              <SeccionLabel>tipo de entrega</SeccionLabel>
              <div style={{ display: 'flex', gap: '8px' }}>
                <RadioBtn label="Retirar en sucursal" value="RETIRO_SUCURSAL" current={entregaTipo} onChange={v => setValue('entrega_tipo', v)} />
                <RadioBtn label="Envío a domicilio" value="ENVIO" current={entregaTipo} onChange={v => setValue('entrega_tipo', v)} />
              </div>
            </section>

            {/* ── Sucursal ── */}
            {!esEnvio && (
              <section>
                <SeccionLabel>sucursal de retiro</SeccionLabel>
                <select style={selectStyle(!!errors.sucursal_id)} {...register('sucursal_id', { required: 'Selecciona una sucursal' })}>
                  <option value="">Seleccionar...</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                {errors.sucursal_id && <p style={errorStyle}>{errors.sucursal_id.message}</p>}
              </section>
            )}

            {/* ── Dirección de envío ── */}
            {esEnvio && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
                <SeccionLabel>dirección de entrega</SeccionLabel>

                {/* Dirección guardada */}
                {direcciones.length > 0 && (
                  <div>
                    <label style={labelStyle}>usar dirección guardada</label>
                    <select style={selectStyle(false)} {...register('direccion_guardada')}>
                      <option value="">Ingresar nueva dirección</option>
                      {direcciones.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.alias ? `${d.alias} — ` : ''}{d.municipio}, {d.departamento}
                          {d.zona_envio ? ` (Q ${Number(d.zona_envio.costo).toFixed(2)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Resumen dirección guardada */}
                {dirGuardada && (
                  <div style={{ borderLeft: '2px solid rgba(10,10,10,0.12)', paddingLeft: '1rem' }}>
                    <p style={{ ...MONO, fontSize: '13px', color: '#0a0a0a', marginBottom: '0.2rem' }}>{dirGuardada.destinatario}</p>
                    <p style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.55)', marginBottom: '0.15rem' }}>{dirGuardada.direccion}</p>
                    <p style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.55)' }}>{dirGuardada.municipio}, {dirGuardada.departamento}</p>
                    {!dirGuardada.zona_envio_id && (
                      <p style={{ ...MONO, fontSize: '10px', color: 'rgba(180,0,0,0.65)', marginTop: '0.5rem', letterSpacing: '0.1em' }}>
                        Esta dirección no tiene zona de envío asignada.
                      </p>
                    )}
                  </div>
                )}

                {/* Formulario nueva dirección */}
                {!dirGuardada && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.4rem' }}>
                      <div>
                        <label style={labelStyle}>destinatario *</label>
                        <input
                          placeholder="Nombre completo"
                          style={fieldStyle(!!errors.destinatario_nuevo)}
                          {...register('destinatario_nuevo', { required: esEnvio && !dirGuardada ? 'Obligatorio' : false })}
                        />
                        {errors.destinatario_nuevo && <p style={errorStyle}>{errors.destinatario_nuevo.message}</p>}
                      </div>
                      <div>
                        <label style={labelStyle}>teléfono</label>
                        <input type="tel" placeholder="+502 0000-0000" style={fieldStyle(false)} {...register('telefono_nuevo')} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.4rem' }}>
                      <div>
                        <label style={labelStyle}>departamento *</label>
                        <select
                          style={selectStyle(!!errors.departamento_nuevo)}
                          {...register('departamento_nuevo', { required: esEnvio && !dirGuardada ? 'Selecciona un departamento' : false })}
                        >
                          <option value="">Seleccionar...</option>
                          {DEPARTAMENTOS_GT.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        {errors.departamento_nuevo && <p style={errorStyle}>{errors.departamento_nuevo.message}</p>}
                      </div>
                      <div>
                        <label style={labelStyle}>municipio *</label>
                        <input
                          placeholder="Ciudad, municipio..."
                          style={fieldStyle(!!errors.municipio_nuevo)}
                          {...register('municipio_nuevo', { required: esEnvio && !dirGuardada ? 'Obligatorio' : false })}
                        />
                        {errors.municipio_nuevo && <p style={errorStyle}>{errors.municipio_nuevo.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>dirección *</label>
                      <textarea
                        rows={2}
                        placeholder="Calle, número, colonia, zona..."
                        style={{ ...fieldStyle(!!errors.direccion_nueva), resize: 'none', display: 'block' }}
                        {...register('direccion_nueva', { required: esEnvio && !dirGuardada ? 'La dirección es obligatoria' : false })}
                      />
                      {errors.direccion_nueva && <p style={errorStyle}>{errors.direccion_nueva.message}</p>}
                    </div>

                    {/* Costo de envío derivado */}
                    {departamentoNuevo && (
                      zonaActual ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 0', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
                          <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.45)' }}>envío a {departamentoNuevo}</span>
                          <span style={{ ...MONO, fontSize: '12px', color: '#0a0a0a' }}>Q {Number(zonaActual.costo).toFixed(2)}</span>
                        </div>
                      ) : (
                        <p style={{ ...MONO, fontSize: '11px', color: 'rgba(180,0,0,0.65)', letterSpacing: '0.1em' }}>
                          No disponemos envíos al departamento de {departamentoNuevo}.
                        </p>
                      )
                    )}
                  </div>
                )}

                {/* Costo de envío para dirección guardada */}
                {dirGuardada?.zona_envio && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 0', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
                    <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.45)' }}>costo de envío</span>
                    <span style={{ ...MONO, fontSize: '12px', color: '#0a0a0a' }}>Q {Number(dirGuardada.zona_envio.costo).toFixed(2)}</span>
                  </div>
                )}
              </section>
            )}

            {/* ── Forma de pago ── */}
            <section>
              <SeccionLabel>forma de pago</SeccionLabel>
              <div style={{ display: 'flex', gap: '8px' }}>
                <RadioBtn label="Tarjeta (Stripe)" value="STRIPE" current={formaPago} onChange={v => setValue('forma_pago', v)} />
                {usuario?.tipo_cliente === 'MAYORISTA' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <RadioBtn label="Crédito" value="CREDITO" current={formaPago} onChange={v => setValue('forma_pago', v)} />
                    {creditoDisponible !== null && (
                      <span style={{ ...MONO, fontSize: '9px', letterSpacing: '0.15em', color: creditoDisponible > 0 ? 'rgba(10,10,10,0.45)' : 'rgba(160,0,0,0.7)' }}>
                        disponible: Q {parseFloat(creditoDisponible).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* ── Nombre del pedido (solo mayoristas) ── */}
            {(usuario?.tipo_cliente ?? usuario?.cliente?.tipo) === 'MAYORISTA' && (
              <section>
                <SeccionLabel>nombre del pedido <span style={{ fontSize: '8px', letterSpacing: '0.1em' }}>(opcional)</span></SeccionLabel>
                <input
                  placeholder="Ej: Reposición enero, Sucursal norte..."
                  style={fieldStyle(false)}
                  {...register('nombre_pedido')}
                />
              </section>
            )}

            {/* ── Observaciones ── */}
            <section>
              <SeccionLabel>observaciones <span style={{ fontSize: '8px', letterSpacing: '0.1em' }}>(opcional)</span></SeccionLabel>
              <textarea
                rows={2}
                placeholder="Instrucciones especiales, talla alternativa..."
                style={{ ...fieldStyle(false), resize: 'none', display: 'block' }}
                {...register('observaciones')}
              />
            </section>

            {/* ── Resumen ── */}
            <section>
              <div style={{ borderTop: '2px solid #0a0a0a', paddingTop: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {detalles.map(d => {
                  const precio       = getPrecioEfectivo(d.variante, usuario?.tipo_cliente)
                  const precioNormal = getPrecioNormal(d.variante, usuario?.tipo_cliente)
                  return (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ ...MONO, fontSize: '12px', color: '#0a0a0a' }}>
                          {d.variante?.producto?.nombre ?? 'Producto'} ×{d.cantidad}
                        </span>
                        {precioNormal != null && (
                          <span style={{ ...MONO, fontSize: '9px', letterSpacing: '0.12em', color: 'rgba(180,30,30,0.65)', border: '1px solid rgba(180,30,30,0.25)', padding: '1px 4px', marginLeft: '6px' }}>OFERTA</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {precioNormal != null && (
                          <span style={{ ...MONO, fontSize: '10px', color: 'rgba(10,10,10,0.35)', textDecoration: 'line-through', marginRight: '4px' }}>
                            Q {(precioNormal * d.cantidad).toFixed(2)}
                          </span>
                        )}
                        <span style={{ ...MONO, fontSize: '12px', color: precioNormal != null ? 'rgba(180,30,30,0.85)' : '#0a0a0a' }}>
                          Q {(precio * d.cantidad).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {(() => {
                  const subtotal = detalles.reduce((acc, d) => acc + getPrecioEfectivo(d.variante, usuario?.tipo_cliente) * d.cantidad, 0)
                  const costoEnvio = zonaActual ? Number(zonaActual.costo) : 0
                  const total = subtotal + costoEnvio
                  return (
                    <>
                      <div style={{ borderTop: '1px solid rgba(10,10,10,0.1)', marginTop: '0.4rem', paddingTop: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.5)' }}>subtotal</span>
                        <span style={{ ...MONO, fontSize: '12px', color: '#0a0a0a' }}>Q {subtotal.toFixed(2)}</span>
                      </div>
                      {zonaActual && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.5)' }}>
                            envío{zonaActual.dias_estimados ? ` · ${zonaActual.dias_estimados} días` : ''}
                          </span>
                          <span style={{ ...MONO, fontSize: '12px', color: '#0a0a0a' }}>Q {costoEnvio.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ borderTop: '1px solid rgba(10,10,10,0.1)', paddingTop: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ ...MONO, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0a0a0a' }}>total</span>
                        <span style={{ ...MONO, fontSize: '15px', color: '#0a0a0a', fontWeight: 500 }}>Q {total.toFixed(2)}</span>
                      </div>
                    </>
                  )
                })()}
              </div>
            </section>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={enviando}
              style={{
                width: '100%', padding: '15px',
                background: enviando ? 'rgba(10,10,10,0.08)' : '#0a0a0a',
                color: enviando ? 'rgba(10,10,10,0.22)' : '#fafafa',
                border: 'none', cursor: enviando ? 'default' : 'pointer',
                ...MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase',
                transition: 'background 0.22s ease, color 0.22s ease',
              }}
            >
              {enviando ? 'procesando...' : 'confirmar pedido'}
            </button>

            <Link
              to="/carrito"
              style={{
                display: 'block', textAlign: 'center', marginTop: '-1.5rem',
                ...MONO, fontSize: '11px', letterSpacing: '0.18em',
                color: 'rgba(10,10,10,0.35)', textDecoration: 'none',
                transition: 'color 0.16s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#0a0a0a'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}
            >
              ← volver al carrito
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
