import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import toast from 'react-hot-toast'
import pagoService from '@/services/pago.service'
import pedidoService from '@/services/pedido.service'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import MenuOverlay from '@/components/MenuOverlay'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }
const NAV_H   = 52

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

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

function ProcesandoOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: '#fafafa',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '2.5rem',
    }}>
      {/* Línea animada */}
      <div style={{ width: '120px', height: '1px', background: 'rgba(10,10,10,0.1)', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: '-100%',
          width: '100%', height: '100%',
          background: '#0a0a0a',
          animation: 'slideLine 1.4s ease-in-out infinite',
        }} />
      </div>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <p style={{ ...DISPLAY, fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1 }}>And&</p>
        <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)' }}>
          procesando pago
        </p>
      </div>

      <style>{`
        @keyframes slideLine {
          0%   { left: -100%; }
          50%  { left: 0%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  )
}

function FormPago({ pedidoId, monto }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [procesando, setProcesando] = useState(false)

  const pagar = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcesando(true)
    try {
      const { error } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
      if (error) { toast.error(error.message ?? 'Error al procesar el pago'); setProcesando(false); return }

      let intentos = 0
      const verificar = async () => {
        const res = await pedidoService.obtener(pedidoId)
        const estado = res.data?.estado
        if (estado === 'PAGADO' || estado === 'PROCESANDO' || estado === 'CONFIRMADO') {
          toast.success('Pago realizado con éxito')
          navigate(`/pedidos/${pedidoId}`)
          return
        }
        if (++intentos < 8) setTimeout(verificar, 1500)
        else {
          toast('Pago enviado. Verificando estado...', { icon: 'ℹ️' })
          navigate(`/pedidos/${pedidoId}`)
        }
      }
      await verificar()
    } catch {
      toast.error('Error inesperado al procesar el pago')
      setProcesando(false)
    }
  }

  return (
    <>
      {procesando && <ProcesandoOverlay />}

      <form onSubmit={pagar} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Monto */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', paddingBottom: '1.8rem' }}>
        <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)', marginBottom: '0.5rem' }}>
          total a pagar
        </p>
        <p style={{ ...DISPLAY, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1 }}>
          Q {parseFloat(monto).toFixed(2)}
        </p>
      </div>

      {/* Stripe PaymentElement */}
      <div>
        <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.38)', marginBottom: '1.2rem' }}>
          datos de pago
        </p>
        <PaymentElement />
      </div>

      <button
        type="submit"
        disabled={procesando || !stripe}
        style={{
          width: '100%', padding: '14px',
          background: procesando || !stripe ? 'rgba(10,10,10,0.08)' : '#0a0a0a',
          color: procesando || !stripe ? 'rgba(10,10,10,0.22)' : '#fafafa',
          border: 'none', cursor: procesando || !stripe ? 'default' : 'pointer',
          ...MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase',
          transition: 'background 0.22s ease, color 0.22s ease',
          marginTop: '0.5rem',
        }}
      >
        {procesando ? 'procesando pago...' : 'pagar ahora'}
      </button>
    </form>
    </>
  )
}

export default function Pago() {
  const { pedidoId } = useParams()
  const navigate = useNavigate()
  const [clientSecret, setClientSecret] = useState(null)
  const [monto, setMonto] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    pagoService.crearIntencion(Number(pedidoId))
      .then(res => {
        setClientSecret(res.data.client_secret)
        setMonto(res.data.monto)
      })
      .catch(() => {
        toast.error('No se pudo iniciar el pago')
        navigate(`/pedidos/${pedidoId}`)
      })
      .finally(() => setCargando(false))
  }, [pedidoId, navigate])

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#0a0a0a' }}>
      <NavHeader onOpenMenu={() => setMenuAbierto(true)} />
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />

      <div style={{ display: 'grid', gridTemplateColumns: '44% 1fr', paddingTop: `${NAV_H}px`, minHeight: `calc(100vh - ${NAV_H}px)` }}>

        {/* Imagen sticky */}
        <div style={{ position: 'sticky', top: `${NAV_H}px`, height: `calc(100vh - ${NAV_H}px)`, overflow: 'hidden' }}>
          <img
            src="https://picsum.photos/seed/andpago22/800/1100"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(100%) brightness(0.52)' }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{
              ...DISPLAY,
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: 1.15,
            }}>
              Pago<br />Seguro
            </h1>
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{ padding: '4rem 4rem 5rem 4.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {cargando ? (
            <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.2)' }}>
              preparando pago...
            </span>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <FormPago pedidoId={pedidoId} monto={monto} />
            </Elements>
          ) : null}

          <Link
            to={`/pedidos/${pedidoId}`}
            style={{
              display: 'block', textAlign: 'center', marginTop: '1.5rem',
              ...MONO, fontSize: '11px', letterSpacing: '0.18em',
              color: 'rgba(10,10,10,0.35)', textDecoration: 'none',
              transition: 'color 0.16s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#0a0a0a'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}
          >
            volver al pedido
          </Link>
        </div>
      </div>
    </div>
  )
}
