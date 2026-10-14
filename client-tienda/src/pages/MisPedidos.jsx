import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import pedidoService from '@/services/pedido.service'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }

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

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)

  useEffect(() => {
    pedidoService.listar()
      .then(res => setPedidos(res.data ?? []))
      .catch(() => setPedidos([]))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return (
    <div style={{ padding: '6rem 0', textAlign: 'center' }}>
      <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.2)' }}>
        cargando...
      </span>
    </div>
  )

  return (
    <div style={{ paddingTop: '2rem' }}>

      <h1 style={{ ...DISPLAY, fontSize: 'clamp(2.4rem, 4vw, 3.2rem)', marginBottom: '0.5rem' }}>
        Mis Pedidos
      </h1>
      <div style={{ height: '1px', background: 'rgba(10,10,10,0.1)', marginBottom: '3.5rem' }} />

      {pedidos.length === 0 ? (
        <div style={{ padding: '6rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.4rem' }}>
          <p style={{ ...DISPLAY, fontSize: '2rem', color: 'rgba(10,10,10,0.1)' }}>
            Sin pedidos
          </p>
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(10,10,10,0.90)' }}>
            Tus pedidos aparecerán aquí
          </p>
          <Link
            to="/productos"
            style={{
              marginTop: '0.5rem',
              ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase',
              borderBottom: '1px solid rgba(10,10,10,0.3)', paddingBottom: '2px',
              color: '#0a0a0a', textDecoration: 'none',
            }}
          >
            ver catálogo
          </Link>
        </div>
      ) : (
        <div>
          {/* Cabecera */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 180px 140px 20px',
            paddingBottom: '10px',
            borderBottom: '1px solid rgba(10,10,10,0.08)',
          }}>
            {['PEDIDO', 'FECHA', 'ESTADO', ''].map(h => (
              <span key={h} style={{ ...MONO, fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.88)' }}>
                {h}
              </span>
            ))}
          </div>

          {pedidos.map(p => (
            <Link
              key={p.id}
              to={`/pedidos/${p.id}`}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 180px 140px 20px',
                alignItems: 'center',
                padding: '1.3rem 0',
                borderBottom: '1px solid rgba(10,10,10,0.06)',
                textDecoration: 'none',
                background: hoveredId === p.id ? 'rgba(10,10,10,0.025)' : 'transparent',
                transition: 'background 0.16s ease',
                cursor: 'pointer',
                marginLeft: '-0.8rem', marginRight: '-0.8rem',
                paddingLeft: '0.8rem', paddingRight: '0.8rem',
              }}
            >
              <span style={{ ...DISPLAY, fontSize: '1.1rem', color: '#0a0a0a' }}>
                Pedido #{p.id}
              </span>
              <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.72)' }}>
                {new Date(p.created_at ?? p.createdAt).toLocaleDateString('es-GT', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </span>
              <span style={{
                ...MONO, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
                color: COLOR_ESTADO[p.estado] ?? 'rgba(10,10,10,0.38)',
              }}>
                {LABEL_ESTADO[p.estado] ?? p.estado?.toLowerCase()}
              </span>
              <span style={{ ...MONO, fontSize: '12px', color: 'rgba(10,10,10,0.88)' }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
