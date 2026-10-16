import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import pedidoService from '@/services/pedido.service'
import { useAuth } from '@/context/AuthContext'

const COLORES_ESTADO = {
  REGISTRADO:     'bg-gray-100 text-gray-700',
  PENDIENTE_PAGO: 'bg-yellow-100 text-yellow-800',
  PAGADO:         'bg-blue-100 text-blue-800',
  EN_PREPARACION: 'bg-indigo-100 text-indigo-800',
  DESPACHADO:     'bg-purple-100 text-purple-800',
  ENTREGADO:      'bg-green-100 text-green-800',
  ANULADO:        'bg-red-100 text-red-800',
}

const LABEL_ESTADO = {
  REGISTRADO:     'Registrado',
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADO:         'Pagado',
  EN_PREPARACION: 'En preparación',
  DESPACHADO:     'Despachado',
  ENTREGADO:      'Entregado',
  ANULADO:        'Anulado',
}

const LABEL_ENTREGA = {
  ENVIO:            'Entrega a domicilio',
  RETIRO_SUCURSAL:  'Retiro en sucursal',
}

const LABEL_PAGO = {
  EN_LINEA: 'Tarjeta de crédito/débito',
  CREDITO:  'Crédito',
}

const getPrecio = (variante, tipoCliente) => {
  const precios = variante?.precios ?? []
  const tipo = tipoCliente === 'MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'
  return parseFloat(precios.find(p => p.tipo === tipo)?.monto ?? precios[0]?.monto ?? 0)
}

export default function PedidoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [pedido, setPedido] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    pedidoService.obtener(id)
      .then(res => setPedido(res.data))
      .catch(() => { toast.error('No se pudo cargar el pedido'); navigate('/pedidos') })
      .finally(() => setCargando(false))
  }, [id, navigate])

  if (cargando) return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">Cargando...</div>
  )

  if (!pedido) return null

  const items = pedido.pedido_detalles ?? []
  const total = items.reduce((acc, d) => {
    return acc + getPrecio(d.variante, usuario?.tipo_cliente) * d.cantidad
  }, 0)

  const necesitaPago = pedido.estado === 'PENDIENTE_PAGO' && pedido.forma_pago === 'EN_LINEA'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/pedidos')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={15} /> Mis pedidos
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pedido #{pedido.numero ?? pedido.id}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${COLORES_ESTADO[pedido.estado] ?? 'bg-muted text-muted-foreground'}`}>
          {LABEL_ESTADO[pedido.estado] ?? pedido.estado}
        </span>
      </div>

      <div className="rounded-xl border p-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fecha</span>
          <span>{new Date(pedido.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Forma de pago</span>
          <span>{LABEL_PAGO[pedido.forma_pago] ?? pedido.forma_pago}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Entrega</span>
          <span>{LABEL_ENTREGA[pedido.entrega_tipo] ?? pedido.entrega_tipo}</span>
        </div>
        {pedido.entrega_tipo === 'ENVIO' && pedido.sucursal && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Atendido desde</span>
            <span>{pedido.sucursal.nombre}</span>
          </div>
        )}
        {pedido.entrega_tipo === 'RETIRO_SUCURSAL' && pedido.sucursal && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sucursal de retiro</span>
            <span>{pedido.sucursal.nombre}</span>
          </div>
        )}
        {pedido.entrega_direccion && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dirección</span>
            <span className="text-right max-w-[60%]">{pedido.entrega_direccion}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Producto</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Cant.</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => {
              const precio = getPrecio(d.variante, usuario?.tipo_cliente)
              return (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.variante?.producto?.nombre ?? 'Producto'}</p>
                    <p className="text-xs text-muted-foreground">SKU: {d.variante?.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{d.cantidad}</td>
                  <td className="px-4 py-3 text-right">Q {(precio * d.cantidad).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td colSpan={2} className="px-4 py-3 font-semibold">Total</td>
              <td className="px-4 py-3 text-right font-semibold">Q {total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {necesitaPago && (
        <Link
          to={`/pago/${pedido.id}`}
          className="block w-full rounded-md bg-primary py-3 text-center text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Completar pago
        </Link>
      )}
    </div>
  )
}
