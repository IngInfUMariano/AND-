import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import pedidoService from '@/services/pedido.service'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import clienteService from '@/services/cliente.service'

const DEPARTAMENTOS_GT = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula',
  'El Progreso', 'Escuintla', 'Guatemala', 'Huehuetenango',
  'Izabal', 'Jalapa', 'Jutiapa', 'Petén',
  'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez',
  'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez',
  'Totonicapán', 'Zacapa',
]

// Busca en la lista de zonas cargadas la que cubre el departamento dado
const zonaParaDept = (zonasEnvio, departamento) => {
  if (!departamento || !zonasEnvio.length) return null
  return zonasEnvio.find(z => {
    if (!z.departamentos) return false
    return z.departamentos.split(',').map(s => s.trim()).includes(departamento.trim())
  }) ?? null
}

export default function Checkout() {
  const navigate = useNavigate()
  const { carrito, recargar } = useCart()
  const { usuario } = useAuth()

  const [sucursales, setSucursales] = useState([])
  const [zonasEnvio, setZonasEnvio] = useState([])
  const [direcciones, setDirecciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      entrega_tipo: 'RETIRO_SUCURSAL',
      forma_pago: 'STRIPE',
      direccion_guardada: '',
    }
  })

  const entregaTipo        = watch('entrega_tipo')
  const dirGuardadaId      = watch('direccion_guardada')
  const departamentoNuevo  = watch('departamento_nuevo')

  const esEnvio = entregaTipo === 'ENVIO'

  // Dirección guardada seleccionada (objeto completo)
  const dirGuardada = dirGuardadaId
    ? direcciones.find(d => String(d.id) === dirGuardadaId) ?? null
    : null

  // Zona que aplica según la dirección (guardada o nueva)
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

  const onSubmit = async (valores) => {
    setEnviando(true)
    try {
      const payload = {
        forma_pago: valores.forma_pago === 'STRIPE' ? 'EN_LINEA' : valores.forma_pago,
        entrega_tipo: valores.entrega_tipo,
        observaciones: valores.observaciones || undefined,
      }

      if (esEnvio) {
        if (dirGuardada) {
          // Usar dirección guardada — la zona ya está asociada a ella
          if (!dirGuardada.zona_envio_id) {
            toast.error('Esta dirección no tiene zona de envío asignada. Actualízala en Mi Cuenta.')
            setEnviando(false)
            return
          }
          payload.zona_envio_id       = dirGuardada.zona_envio_id
          payload.entrega_destinatario = dirGuardada.destinatario
          payload.entrega_direccion   = dirGuardada.direccion
          payload.entrega_municipio   = dirGuardada.municipio
          payload.entrega_departamento = dirGuardada.departamento
          payload.entrega_telefono    = dirGuardada.telefono || undefined
        } else {
          // Dirección nueva ingresada en el checkout
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
        // Retiro en sucursal
        payload.sucursal_id = Number(valores.sucursal_id)
      }

      const res = await pedidoService.crear(payload)
      const pedidoId = res.data.id
      await recargar()

      if (valores.forma_pago === 'STRIPE') {
        navigate(`/pago/${pedidoId}`)
      } else {
        navigate(`/pedidos/${pedidoId}`)
      }
    } catch (err) {
      const msg = err.response?.data?.error?.mensaje ?? 'Error al crear el pedido'
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  const detalles = carrito?.carrito_detalles ?? []

  if (cargando) return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">Cargando...</div>
  )

  if (detalles.length === 0) {
    navigate('/carrito')
    return null
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">Finalizar compra</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Tipo de entrega */}
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="font-medium">Tipo de entrega</h2>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" value="RETIRO_SUCURSAL" {...register('entrega_tipo')} />
              Retirar en sucursal
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" value="ENVIO" {...register('entrega_tipo')} />
              Entrega a domicilio
            </label>
          </div>
        </div>

        {/* Sucursal — sólo para retiro */}
        {!esEnvio && (
          <div className="rounded-xl border p-5 space-y-3">
            <h2 className="font-medium">Sucursal de retiro</h2>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('sucursal_id', { required: 'Selecciona una sucursal' })}
            >
              <option value="">Seleccionar sucursal...</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            {errors.sucursal_id && <p className="text-xs text-destructive">{errors.sucursal_id.message}</p>}
          </div>
        )}

        {/* Entrega a domicilio */}
        {esEnvio && (
          <div className="rounded-xl border p-5 space-y-5">
            <h2 className="font-medium">Dirección de entrega</h2>

            {/* Selector de dirección guardada */}
            {direcciones.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Usar dirección guardada</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  {...register('direccion_guardada')}
                >
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

            {/* Resumen de dirección guardada seleccionada */}
            {dirGuardada && (
              <div className="rounded-md bg-muted/40 px-4 py-3 text-sm space-y-0.5">
                <p className="font-medium">{dirGuardada.destinatario}</p>
                <p className="text-muted-foreground">{dirGuardada.direccion}</p>
                <p className="text-muted-foreground">{dirGuardada.municipio}, {dirGuardada.departamento}</p>
                {dirGuardada.telefono && <p className="text-muted-foreground">{dirGuardada.telefono}</p>}
                {!dirGuardada.zona_envio_id && (
                  <p className="text-destructive text-xs mt-1">
                    Esta dirección no tiene zona de envío asignada. Actualízala en Mi Cuenta para poder usarla.
                  </p>
                )}
              </div>
            )}

            {/* Formulario de nueva dirección */}
            {!dirGuardada && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Destinatario *</label>
                    <input
                      placeholder="Nombre completo"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      {...register('destinatario_nuevo', { required: esEnvio && !dirGuardada ? 'Obligatorio' : false })}
                    />
                    {errors.destinatario_nuevo && <p className="text-xs text-destructive mt-0.5">{errors.destinatario_nuevo.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Teléfono</label>
                    <input
                      type="tel"
                      placeholder="+502 0000-0000"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      {...register('telefono_nuevo')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Departamento *</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      {...register('departamento_nuevo', { required: esEnvio && !dirGuardada ? 'Selecciona un departamento' : false })}
                    >
                      <option value="">Seleccionar...</option>
                      {DEPARTAMENTOS_GT.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.departamento_nuevo && <p className="text-xs text-destructive mt-0.5">{errors.departamento_nuevo.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Municipio *</label>
                    <input
                      placeholder="Ciudad, municipio..."
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      {...register('municipio_nuevo', { required: esEnvio && !dirGuardada ? 'Obligatorio' : false })}
                    />
                    {errors.municipio_nuevo && <p className="text-xs text-destructive mt-0.5">{errors.municipio_nuevo.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Dirección *</label>
                  <textarea
                    rows={2}
                    placeholder="Calle, número, colonia, zona..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                    {...register('direccion_nueva', { required: esEnvio && !dirGuardada ? 'La dirección es obligatoria' : false })}
                  />
                  {errors.direccion_nueva && <p className="text-xs text-destructive mt-0.5">{errors.direccion_nueva.message}</p>}
                </div>

                {/* Indicador de zona derivada del departamento */}
                {departamentoNuevo && (
                  zonaActual ? (
                    <div className="rounded-md bg-muted/40 px-4 py-2 text-sm flex justify-between items-center">
                      <span className="text-muted-foreground">Costo de envío a {departamentoNuevo}</span>
                      <span className="font-medium">Q {Number(zonaActual.costo).toFixed(2)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">
                      No disponemos envíos al departamento de {departamentoNuevo}.
                    </p>
                  )
                )}
              </div>
            )}

            {/* Resumen de costo de envío para dirección guardada con zona */}
            {dirGuardada?.zona_envio && (
              <div className="rounded-md bg-muted/40 px-4 py-2 text-sm flex justify-between items-center">
                <span className="text-muted-foreground">Costo de envío</span>
                <span className="font-medium">Q {Number(dirGuardada.zona_envio.costo).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Forma de pago */}
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="font-medium">Forma de pago</h2>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" value="STRIPE" {...register('forma_pago')} />
              Pago con tarjeta (Stripe)
            </label>
            {usuario?.tipo_cliente === 'MAYORISTA' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" value="CREDITO" {...register('forma_pago')} />
                Pago a crédito
              </label>
            )}
          </div>
        </div>

        {/* Observaciones */}
        <div className="rounded-xl border p-5 space-y-3">
          <h2 className="font-medium">
            Observaciones{' '}
            <span className="text-muted-foreground text-sm font-normal">(opcional)</span>
          </h2>
          <textarea
            rows={3}
            placeholder="Instrucciones especiales, talla alternativa, etc."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            {...register('observaciones')}
          />
        </div>

        {/* Resumen */}
        <div className="rounded-xl border bg-muted/40 p-5 space-y-2">
          <p className="font-medium">Resumen del pedido</p>
          <p className="text-sm text-muted-foreground">{detalles.length} producto(s)</p>
          {zonaActual && (
            <p className="text-sm text-muted-foreground">
              Envío: Q {Number(zonaActual.costo).toFixed(2)} · {zonaActual.dias_estimados ? `${zonaActual.dias_estimados} día(s) hábiles` : 'tiempo estimado según zona'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? 'Procesando...' : 'Confirmar pedido'}
        </button>
      </form>
    </div>
  )
}
