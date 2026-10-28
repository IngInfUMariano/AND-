import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import pedidoService from '@/services/pedido.service'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import MenuOverlay from '@/components/MenuOverlay'
import { useIsMobile } from '@/hooks/useIsMobile'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }
const NAV_H   = 52

const LABEL_ESTADO = {
  REGISTRADO:     'registrado',
  PENDIENTE_PAGO: 'pendiente pago',
  PAGADO:         'pagado',
  EN_PREPARACION: 'en preparación',
  DESPACHADO:     'despachado',
  ENTREGADO:      'entregado',
  ANULADO:        'anulado',
}

const COLOR_ESTADO = {
  ENTREGADO:      '#0a0a0a',
  PAGADO:         'rgba(10,10,10,0.55)',
  DESPACHADO:     'rgba(10,10,10,0.55)',
  EN_PREPARACION: 'rgba(10,10,10,0.55)',
  PENDIENTE_PAGO: 'rgba(180,120,0,0.7)',
  ANULADO:        'rgba(180,0,0,0.5)',
}

const LABEL_ENTREGA = {
  ENVIO:           'entrega a domicilio',
  RETIRO_SUCURSAL: 'retiro en sucursal',
}

const LABEL_PAGO = {
  EN_LINEA: 'tarjeta de crédito/débito',
  CREDITO:  'crédito',
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
          to="/pedidos"
          style={{ ...MONO, fontSize: '11px', letterSpacing: '0.16em', color: '#0a0a0a', textDecoration: 'none', transition: 'opacity 0.18s ease' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.45'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          ← VOLVER
        </Link>
      </div>
      <div style={{ height: '1px', background: 'rgba(10,10,10,0.09)' }} />
    </div>
  )
}

function FilaInfo({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.85rem 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
      <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)', minWidth: '120px' }}>
        {label}
      </span>
      <span style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.78)', textAlign: 'right', maxWidth: '60%' }}>
        {value}
      </span>
    </div>
  )
}

export default function PedidoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    pedidoService.obtener(id)
      .then(res => setPedido(res.data))
      .catch(() => { toast.error('No se pudo cargar el pedido'); navigate('/pedidos') })
      .finally(() => setCargando(false))
  }, [id, navigate])

  if (cargando) return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <NavHeader onOpenMenu={() => {}} />
      <div style={{ paddingTop: `${NAV_H + 120}px`, textAlign: 'center' }}>
        <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.2)' }}>
          cargando...
        </span>
      </div>
    </div>
  )

  if (!pedido) return null

  const items = pedido.pedido_detalles ?? []
  const total = Number(pedido.total ?? items.reduce((acc, d) => acc + Number(d.subtotal ?? 0), 0))
  const costoEnvio = pedido.costo_envio ? Number(pedido.costo_envio) : null
  const necesitaPago = pedido.estado === 'PENDIENTE_PAGO' && pedido.forma_pago === 'EN_LINEA'

  const descargarPDF = () => {
    const doc = new jsPDF()
    const emp = pedido.empresa ?? {}
    const cli = pedido.cliente ?? {}
    const suc = pedido.sucursal ?? {}
    const fecha = new Date(pedido.createdAt).toLocaleDateString('es-GT')

    // Cabecera empresa
    doc.setFontSize(14)
    doc.text(emp.EMPRESA_NOMBRE ?? 'AND& Moda', 14, 20)
    doc.setFontSize(9)
    doc.text(`NIT: ${emp.EMPRESA_NIT ?? '-'}`, 14, 26)
    doc.text(emp.EMPRESA_DIRECCION ?? '', 14, 31)
    doc.text(`Sucursal: ${suc.nombre ?? '-'}`, 14, 36)

    // Título y número de boleta
    doc.setFontSize(12)
    doc.text('BOLETA DE VENTA', 140, 20)
    doc.setFontSize(9)
    doc.text(`No. ${pedido.numero}`, 140, 26)
    doc.text(`Fecha: ${fecha}`, 140, 31)

    // Datos del cliente
    doc.setFontSize(10)
    doc.text('Cliente', 14, 46)
    doc.setFontSize(9)
    doc.text(cli.nombre ?? '-', 14, 52)
    doc.text(`NIT: ${cli.nit ?? 'CF'}`, 14, 57)
    if (cli.direccion_fiscal) doc.text(cli.direccion_fiscal, 14, 62)

    // Tabla de productos
    autoTable(doc, {
      startY: 70,
      head: [['Descripción', 'SKU', 'Cant.', 'Precio unit.', 'Subtotal']],
      body: items.map(d => [
        d.descripcion ?? '-',
        d.sku ?? '-',
        d.cantidad,
        `Q ${Number(d.precio_unitario ?? 0).toFixed(2)}`,
        `Q ${Number(d.subtotal ?? 0).toFixed(2)}`,
      ]),
      styles: { fontSize: 8 },
    })

    // Totales
    const y = doc.lastAutoTable.finalY + 8
    doc.setFontSize(9)
    doc.text(`Subtotal:    Q ${Number(pedido.subtotal ?? 0).toFixed(2)}`, 140, y)
    if (costoEnvio) doc.text(`Envío:       Q ${costoEnvio.toFixed(2)}`, 140, y + 6)
    doc.setFontSize(11)
    doc.text(`TOTAL:       Q ${total.toFixed(2)}`, 140, y + (costoEnvio ? 13 : 6))

    doc.save(`boleta-${pedido.numero}.pdf`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#0a0a0a' }}>
      <NavHeader onOpenMenu={() => setMenuAbierto(true)} />
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '38% 1fr', paddingTop: `${NAV_H}px`, minHeight: `calc(100vh - ${NAV_H}px)` }}>

        {/* Columna izquierda: imagen sticky, solo desktop */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: `${NAV_H}px`, height: `calc(100vh - ${NAV_H}px)`, overflow: 'hidden' }}>
            <img
              src="https://picsum.photos/seed/andorderdetail/800/1100"
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(100%) brightness(0.55)' }}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '2.5rem' }}>
              <div>
                <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: '0.5rem' }}>
                  pedido
                </p>
                <p style={{ ...DISPLAY, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: '#ffffff', lineHeight: 1 }}>
                  #{pedido.numero ?? pedido.id}
                </p>
                <p style={{
                  ...MONO, fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: COLOR_ESTADO[pedido.estado] ?? 'rgba(255,255,255,0.45)',
                  marginTop: '0.6rem',
                  background: 'rgba(250,250,250,0.1)',
                  padding: '4px 10px',
                  display: 'inline-block',
                }}>
                  {LABEL_ESTADO[pedido.estado] ?? pedido.estado?.toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Columna derecha */}
        <div style={{ padding: isMobile ? '2rem 1.2rem 4rem' : '4rem 4rem 5rem 4.5rem' }}>

          {/* Número y estado mobile */}
          {isMobile && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)', marginBottom: '0.4rem' }}>
                pedido
              </p>
              <p style={{ ...DISPLAY, fontSize: 'clamp(1.6rem, 6vw, 2.4rem)', lineHeight: 1 }}>
                #{pedido.numero ?? pedido.id}
              </p>
              <p style={{
                ...MONO, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase',
                color: COLOR_ESTADO[pedido.estado] ?? 'rgba(10,10,10,0.38)',
                marginTop: '0.5rem',
              }}>
                {LABEL_ESTADO[pedido.estado] ?? pedido.estado?.toLowerCase()}
              </p>
            </div>
          )}

          {/* Volver */}
          <button
            onClick={() => navigate('/pedidos')}
            style={{
              marginBottom: '3rem',
              ...MONO, fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(10,10,10,0.38)', transition: 'color 0.16s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#0a0a0a'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.38)'}
          >
            ← mis pedidos
          </button>

          {/* Información del pedido */}
          <section style={{ marginBottom: '3rem' }}>
            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)', marginBottom: '0.8rem' }}>
              detalles
            </p>
            <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }}>
              <FilaInfo
                label="fecha"
                value={new Date(pedido.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' })}
              />
              <FilaInfo label="pago" value={LABEL_PAGO[pedido.forma_pago] ?? pedido.forma_pago} />
              <FilaInfo label="entrega" value={LABEL_ENTREGA[pedido.entrega_tipo] ?? pedido.entrega_tipo} />
              {pedido.sucursal && (
                <FilaInfo
                  label={pedido.entrega_tipo === 'RETIRO_SUCURSAL' ? 'sucursal' : 'atendido desde'}
                  value={pedido.sucursal.nombre}
                />
              )}
              {pedido.entrega_destinatario && <FilaInfo label="destinatario" value={pedido.entrega_destinatario} />}
              {pedido.entrega_direccion && <FilaInfo label="dirección" value={`${pedido.entrega_direccion}, ${pedido.entrega_municipio ?? ''}, ${pedido.entrega_departamento ?? ''}`} />}
              {pedido.numero_guia && (
                <FilaInfo label="guía" value={`${pedido.courier ? pedido.courier + ' · ' : ''}${pedido.numero_guia}`} />
              )}
              {pedido.observaciones && <FilaInfo label="observaciones" value={pedido.observaciones} />}
            </div>
          </section>

          {/* Productos */}
          <section style={{ marginBottom: '3rem' }}>
            <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)', marginBottom: '0.8rem' }}>
              productos
            </p>

            <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }}>
              {/* Cabecera — solo desktop */}
              {!isMobile && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px', padding: '0.6rem 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
                  {['PRODUCTO', 'CANT.', 'SUBTOTAL'].map(h => (
                    <span key={h} style={{ ...MONO, fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', textAlign: h === 'SUBTOTAL' ? 'right' : 'left' }}>
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {items.map(d => (
                isMobile ? (
                  <div key={d.id} style={{ padding: '1rem 0', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
                    <p style={{ ...MONO, fontSize: '13px', color: '#0a0a0a', marginBottom: '0.2rem' }}>
                      {d.descripcion ?? d.variante?.producto?.nombre ?? 'Producto'}
                    </p>
                    {(d.sku ?? d.variante?.sku) && (
                      <p style={{ ...MONO, fontSize: '10px', color: 'rgba(10,10,10,0.35)', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                        {d.sku ?? d.variante?.sku}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.50)' }}>
                        Cant. {d.cantidad}
                      </span>
                      <span style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.78)' }}>
                        Q {Number(d.subtotal ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px', alignItems: 'center', padding: '1.1rem 0', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
                    <div>
                      <p style={{ ...MONO, fontSize: '13px', color: '#0a0a0a', marginBottom: '0.2rem' }}>
                        {d.descripcion ?? d.variante?.producto?.nombre ?? 'Producto'}
                      </p>
                      {(d.sku ?? d.variante?.sku) && (
                        <p style={{ ...MONO, fontSize: '10px', color: 'rgba(10,10,10,0.35)', letterSpacing: '0.06em' }}>
                          {d.sku ?? d.variante?.sku}
                        </p>
                      )}
                    </div>
                    <span style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.55)', textAlign: 'center' }}>{d.cantidad}</span>
                    <span style={{ ...MONO, fontSize: '13px', color: 'rgba(10,10,10,0.78)', textAlign: 'right' }}>
                      Q {Number(d.subtotal ?? 0).toFixed(2)}
                    </span>
                  </div>
                )
              ))}
            </div>
          </section>

          {/* Total */}
          <div style={{ maxWidth: '300px', marginLeft: 'auto' }}>
            {costoEnvio != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.45)' }}>envío</span>
                <span style={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,10,0.45)' }}>Q {costoEnvio.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: '2px solid #0a0a0a', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...MONO, fontSize: '13px', color: '#0a0a0a' }}>total</span>
              <span style={{ ...MONO, fontSize: '15px', color: '#0a0a0a' }}>Q {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Descargar boleta */}
          <div style={{ marginTop: '2rem' }}>
            <button
              onClick={descargarPDF}
              style={{
                display: 'block', width: '100%', padding: '12px',
                background: 'none', border: '1px solid rgba(10,10,10,0.18)',
                cursor: 'pointer', ...MONO, fontSize: '10px',
                letterSpacing: '0.3em', textTransform: 'uppercase',
                color: 'rgba(10,10,10,0.55)', transition: 'color 0.16s ease, border-color 0.16s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0a0a0a'; e.currentTarget.style.borderColor = '#0a0a0a' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.55)'; e.currentTarget.style.borderColor = 'rgba(10,10,10,0.18)' }}
            >
              descargar boleta pdf
            </button>
          </div>

          {/* CTA pago pendiente */}
          {necesitaPago && (
            <div style={{ marginTop: '3rem' }}>
              <Link
                to={`/pago/${pedido.id}`}
                style={{
                  display: 'block', textAlign: 'center',
                  width: '100%', padding: '14px',
                  background: '#0a0a0a', color: '#fafafa',
                  ...MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase',
                  textDecoration: 'none',
                  transition: 'opacity 0.18s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                completar pago
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
