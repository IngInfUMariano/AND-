import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import clienteService from '@/services/cliente.service'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import MenuOverlay from '@/components/MenuOverlay'
import { useIsMobile } from '@/hooks/useIsMobile'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }
const NAV_H   = 52

const inputStyle = (hasError) => ({
  ...MONO, fontSize: '13px', letterSpacing: '0.04em',
  width: '100%', background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${hasError ? 'rgba(180,0,0,0.5)' : 'rgba(10,10,10,0.18)'}`,
  padding: '8px 0', outline: 'none',
  color: '#0a0a0a', boxSizing: 'border-box',
  transition: 'border-color 0.16s ease',
})

const labelStyle = {
  ...MONO, fontSize: '10px', letterSpacing: '0.34em',
  textTransform: 'uppercase', color: 'rgba(10,10,10,0.80)',
  display: 'block', marginBottom: '0.5rem',
}

/* ── NavHeader ── */
function NavHeader({ onOpenMenu }) {
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
          style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', color: '#0a0a0a', textDecoration: 'none', transition: 'opacity 0.18s ease', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.45'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          CARRITO{totalItems > 0 && <span style={{ ...MONO, fontSize: '10px' }}>({totalItems})</span>}
        </Link>
      </div>
      <div style={{ height: '1px', background: 'rgba(10,10,10,0.09)' }} />
    </div>
  )
}

const DEPARTAMENTOS_GT = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula',
  'El Progreso', 'Escuintla', 'Guatemala', 'Huehuetenango',
  'Izabal', 'Jalapa', 'Jutiapa', 'Petén',
  'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez',
  'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez',
  'Totonicapán', 'Zacapa',
]

const selectStyle = (hasError) => ({
  ...MONO, fontSize: '13px', letterSpacing: '0.04em',
  width: '100%', background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${hasError ? 'rgba(180,0,0,0.5)' : 'rgba(10,10,10,0.18)'}`,
  padding: '8px 0', outline: 'none',
  color: '#0a0a0a', boxSizing: 'border-box',
  appearance: 'none', WebkitAppearance: 'none',
  cursor: 'pointer',
})

function FieldError({ error }) {
  if (!error) return null
  return (
    <p style={{ ...MONO, fontSize: '11px', color: 'rgba(180,0,0,0.7)', marginTop: '0.3rem' }}>
      {error.message}
    </p>
  )
}

/* ── Formulario de dirección ── */
function FormDireccion({ inicial, onGuardar, onCancelar }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: inicial ?? {}
  })
  const isMobile = useIsMobile()

  return (
    <form
      onSubmit={handleSubmit(onGuardar)}
      style={{ padding: '1.4rem 0', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.4rem' }}>
        <div>
          <label style={labelStyle}>alias (opcional)</label>
          <input placeholder="Casa, trabajo..." style={inputStyle(false)} {...register('alias')} />
        </div>
        <div>
          <label style={labelStyle}>destinatario *</label>
          <input
            placeholder="Nombre completo"
            style={inputStyle(!!errors.destinatario)}
            {...register('destinatario', { required: 'El destinatario es obligatorio' })}
          />
          <FieldError error={errors.destinatario} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.4rem' }}>
        <div>
          <label style={labelStyle}>departamento *</label>
          <select
            style={selectStyle(!!errors.departamento)}
            {...register('departamento', { required: 'Selecciona un departamento' })}
          >
            <option value="">Seleccionar...</option>
            {DEPARTAMENTOS_GT.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <FieldError error={errors.departamento} />
        </div>
        <div>
          <label style={labelStyle}>municipio *</label>
          <input
            placeholder="Ciudad, municipio..."
            style={inputStyle(!!errors.municipio)}
            {...register('municipio', { required: 'El municipio es obligatorio' })}
          />
          <FieldError error={errors.municipio} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>dirección *</label>
        <textarea
          rows={2}
          placeholder="Calle, número, colonia, zona..."
          style={{ ...inputStyle(!!errors.direccion), resize: 'none', display: 'block', width: '100%' }}
          {...register('direccion', { required: 'La dirección es obligatoria' })}
        />
        <FieldError error={errors.direccion} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.4rem' }}>
        <div>
          <label style={labelStyle}>referencia (opcional)</label>
          <input
            placeholder="Cerca de, frente a..."
            style={inputStyle(false)}
            {...register('referencia')}
          />
        </div>
        <div>
          <label style={labelStyle}>teléfono de contacto</label>
          <input type="tel" placeholder="+502 0000-0000" style={inputStyle(false)} {...register('telefono')} />
        </div>
      </div>

      <div>
        <label style={{ ...MONO, fontSize: '12px', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.78)', display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
          <input type="checkbox" {...register('es_predeterminada')} />
          Establecer como dirección predeterminada
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...MONO, fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase',
            background: isSubmitting ? 'rgba(10,10,10,0.08)' : '#0a0a0a',
            color: isSubmitting ? 'rgba(10,10,10,0.25)' : '#fafafa',
            border: 'none', padding: '10px 20px', cursor: isSubmitting ? 'default' : 'pointer',
          }}
        >
          {isSubmitting ? 'guardando...' : 'guardar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          style={{ ...MONO, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', transition: 'color 0.16s ease' }}
          onMouseEnter={e => e.currentTarget.style.color = '#0a0a0a'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.4)'}
        >
          cancelar
        </button>
      </div>
    </form>
  )
}

function SeccionLabel({ children }) {
  return (
    <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.78)', marginBottom: '1.2rem' }}>
      {children}
    </p>
  )
}

function CampoInfo({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
      <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.78)', minWidth: '80px' }}>
        {label}
      </span>
      <span style={{ ...MONO, fontSize: '14px', color: '#0a0a0a' }}>
        {value}
      </span>
    </div>
  )
}

export default function MiCuenta() {
  const { usuario, cerrarSesion } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [direcciones, setDirecciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [credito, setCredito] = useState(null)
  const isMobile = useIsMobile()

  const cargarDirecciones = () => {
    clienteService.listarDirecciones()
      .then(res => setDirecciones(res.data ?? []))
      .catch(() => {})
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarDirecciones() }, [])

  const tipoCliente = usuario?.tipo_cliente ?? usuario?.cliente?.tipo ?? null

  useEffect(() => {
    if (tipoCliente === 'MAYORISTA') {
      clienteService.obtenerCredito()
        .then(res => setCredito(res.data ?? res))
        .catch(() => {})
    }
  }, [tipoCliente])

  const crearDireccion = async (datos) => {
    try {
      await clienteService.crearDireccion(datos)
      toast.success('Dirección guardada')
      setMostrarForm(false)
      cargarDirecciones()
    } catch {
      toast.error('Error al guardar la dirección')
    }
  }

  const actualizarDireccion = async (datos) => {
    try {
      await clienteService.actualizarDireccion(editando.id, datos)
      toast.success('Dirección actualizada')
      setEditando(null)
      cargarDirecciones()
    } catch {
      toast.error('Error al actualizar la dirección')
    }
  }

  const eliminarDireccion = async (id) => {
    if (!confirm('¿Eliminar esta dirección?')) return
    try {
      await clienteService.eliminarDireccion(id)
      toast.success('Dirección eliminada')
      cargarDirecciones()
    } catch {
      toast.error('Error al eliminar la dirección')
    }
  }

  const nombre = usuario?.cliente?.nombre
    ?? (usuario?.empleado ? `${usuario.empleado.nombres} ${usuario.empleado.apellidos}` : null)
    ?? usuario?.email
    ?? ''

  return (
    <>
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />

      <div style={{ minHeight: '100vh', background: '#fafafa' }}>
        <NavHeader onOpenMenu={() => setMenuAbierto(true)} />

        {/* ── Grid: imagen izquierda | contenido derecha ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '40% 1fr', paddingTop: `${NAV_H}px`, minHeight: `calc(100vh - ${NAV_H}px)` }}>

          {/* ── Columna izquierda: imagen sticky con título encima, solo desktop ── */}
          {!isMobile && (
            <div style={{ position: 'sticky', top: `${NAV_H}px`, height: `calc(100vh - ${NAV_H}px)`, overflow: 'hidden' }}>
              <img
                src="/cuenta-portrait.png"
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(100%) brightness(0.62)' }}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h1 style={{
                  ...DISPLAY,
                  fontSize: 'clamp(3rem, 5.5vw, 5.5rem)',
                  color: '#ffffff',
                  textAlign: 'center',
                  lineHeight: 1.15,
                }}>
                  Mi<br />Cuenta
                </h1>
              </div>
            </div>
          )}

          {/* ── Columna derecha: información ── */}
          <div style={{ padding: isMobile ? '2rem 1.2rem 4rem' : '4rem 4rem 5rem 4.5rem' }}>

            {/* Título mobile */}
            {isMobile && (
              <h1 style={{ ...DISPLAY, fontSize: 'clamp(2.2rem, 8vw, 3rem)', lineHeight: 1, marginBottom: '2rem' }}>
                Mi Cuenta
              </h1>
            )}

            {/* ── Perfil ── */}
            <section style={{ marginBottom: '3.5rem' }}>
              <SeccionLabel>perfil</SeccionLabel>
              <CampoInfo label="nombre" value={nombre} />
              <CampoInfo label="correo"  value={usuario?.email} />
              {tipoCliente === 'MAYORISTA' && (
                <CampoInfo label="tipo" value="Mayorista" />
              )}
            </section>

            {/* ── Crédito (solo mayoristas) ── */}
            {tipoCliente === 'MAYORISTA' && credito && (
              <section style={{ marginBottom: '3.5rem' }}>
                <SeccionLabel>crédito</SeccionLabel>
                <div style={{ display: 'flex', gap: '2rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(10,10,10,0.08)', justifyContent: 'space-between' }}>
                  <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.78)' }}>límite</span>
                  <span style={{ ...MONO, fontSize: '14px', color: '#0a0a0a' }}>Q {parseFloat(credito.limite_credito).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', gap: '2rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(10,10,10,0.08)', justifyContent: 'space-between' }}>
                  <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.78)' }}>utilizado</span>
                  <span style={{ ...MONO, fontSize: '14px', color: '#0a0a0a' }}>Q {parseFloat(credito.credito_utilizado).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', gap: '2rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(10,10,10,0.08)', justifyContent: 'space-between' }}>
                  <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.78)' }}>disponible</span>
                  <span style={{ ...MONO, fontSize: '14px', color: credito.disponible > 0 ? 'rgba(0,100,0,0.85)' : 'rgba(160,0,0,0.8)' }}>
                    Q {parseFloat(credito.disponible).toFixed(2)}
                  </span>
                </div>
                {credito.plazo_credito_dias > 0 && (
                  <div style={{ display: 'flex', gap: '2rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(10,10,10,0.08)', justifyContent: 'space-between' }}>
                    <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.78)' }}>plazo</span>
                    <span style={{ ...MONO, fontSize: '14px', color: '#0a0a0a' }}>{credito.plazo_credito_dias} días</span>
                  </div>
                )}
              </section>
            )}

            {/* ── Direcciones ── */}
            <section style={{ marginBottom: '3.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.2rem' }}>
                <SeccionLabel>mis direcciones</SeccionLabel>
                {!mostrarForm && !editando && (
                  <button
                    onClick={() => setMostrarForm(true)}
                    style={{
                      ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase',
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid rgba(10,10,10,0.2)', paddingBottom: '1px',
                      color: 'rgba(10,10,10,0.78)', transition: 'color 0.16s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#0a0a0a'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.78)'}
                  >
                    + nueva
                  </button>
                )}
              </div>

              {mostrarForm && (
                <FormDireccion
                  onGuardar={crearDireccion}
                  onCancelar={() => setMostrarForm(false)}
                />
              )}

              {cargando ? (
                <div>
                  {[1, 2].map(i => (
                    <div key={i} style={{ height: '60px', background: 'rgba(10,10,10,0.04)', marginBottom: '4px' }} />
                  ))}
                </div>
              ) : direcciones.length === 0 && !mostrarForm ? (
                <p style={{ ...MONO, fontSize: '13px', color: 'rgba(10,10,10,0.72)' }}>
                  No tienes direcciones guardadas
                </p>
              ) : (
                <div>
                  {direcciones.map(d => (
                    <div key={d.id}>
                      {editando?.id === d.id ? (
                        <FormDireccion
                          inicial={d}
                          onGuardar={actualizarDireccion}
                          onCancelar={() => setEditando(null)}
                        />
                      ) : (
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                          padding: '1.2rem 0',
                          borderBottom: '1px solid rgba(10,10,10,0.08)',
                        }}>
                          <div>
                            {d.alias && (
                              <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.76)', marginBottom: '0.3rem' }}>
                                {d.alias}{d.es_predeterminada ? ' · predeterminada' : ''}
                              </p>
                            )}
                            <p style={{ ...MONO, fontSize: '13px', color: '#0a0a0a', marginBottom: '0.15rem' }}>
                              {d.destinatario}
                            </p>
                            <p style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.80)', marginBottom: '0.15rem' }}>
                              {d.direccion}
                            </p>
                            <p style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.70)' }}>
                              {d.municipio}, {d.departamento}
                              {d.telefono ? ` · ${d.telefono}` : ''}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '1.2rem', marginLeft: '1.5rem', flexShrink: 0 }}>
                            <button
                              onClick={() => setEditando(d)}
                              style={{ ...MONO, fontSize: '10px', letterSpacing: '0.2em', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.68)', transition: 'color 0.16s ease', textTransform: 'uppercase' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#0a0a0a'}
                              onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.68)'}
                            >
                              editar
                            </button>
                            <button
                              onClick={() => eliminarDireccion(d.id)}
                              style={{ ...MONO, fontSize: '10px', letterSpacing: '0.2em', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.90)', transition: 'color 0.16s ease', textTransform: 'uppercase' }}
                              onMouseEnter={e => e.currentTarget.style.color = 'rgba(160,0,0,0.7)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.62)'}
                            >
                              eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Cerrar sesión ── */}
            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
              <button
                onClick={cerrarSesion}
                style={{
                  ...MONO, fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase',
                  background: 'none', border: 'none',
                  borderBottom: '1px solid rgba(10,10,10,0.15)', paddingBottom: '2px',
                  cursor: 'pointer', color: 'rgba(10,10,10,0.72)',
                  transition: 'color 0.16s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(160,0,0,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.72)'}
              >
                cerrar sesión
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
