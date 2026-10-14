import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import toast from 'react-hot-toast'
import pagoService from '@/services/pago.service'
import pedidoService from '@/services/pedido.service'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

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
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })

      if (error) {
        toast.error(error.message ?? 'Error al procesar el pago')
        return
      }

      // Polling hasta que el backend confirme PAGADO
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
    } finally {
      setProcesando(false)
    }
  }

  return (
    <form onSubmit={pagar} className="space-y-6">
      <div className="rounded-xl border bg-muted/40 px-5 py-4">
        <p className="text-sm text-muted-foreground">Total a pagar</p>
        <p className="text-2xl font-bold">Q {parseFloat(monto).toFixed(2)}</p>
      </div>

      <div className="rounded-xl border p-5">
        <PaymentElement />
      </div>

      <button
        type="submit"
        disabled={procesando || !stripe}
        className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {procesando ? 'Procesando pago...' : 'Pagar ahora'}
      </button>
    </form>
  )
}

export default function Pago() {
  const { pedidoId } = useParams()
  const navigate = useNavigate()
  const [clientSecret, setClientSecret] = useState(null)
  const [monto, setMonto] = useState(0)
  const [cargando, setCargando] = useState(true)

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

  if (cargando) return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">Preparando pago...</div>
  )

  if (!clientSecret) return null

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Pago seguro</h1>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <FormPago pedidoId={pedidoId} monto={monto} />
      </Elements>
    </div>
  )
}
