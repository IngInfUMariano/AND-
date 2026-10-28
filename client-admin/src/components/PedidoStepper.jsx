import React from 'react'
import {
  FileText,
  CreditCard,
  Package,
  Truck,
  CheckCircle2,
  XCircle
} from 'lucide-react'

// Definición secuencial de los estados del ciclo de vida del pedido
const PASOS_PEDIDO = [
  { id: 'REGISTRADO', label: 'Registrado', icon: FileText },
  { id: 'PAGADO', label: 'Pagado', icon: CreditCard },
  { id: 'EN_PREPARACION', label: 'En Preparación', icon: Package },
  { id: 'DESPACHADO', label: 'Despachado', icon: Truck },
  { id: 'ENTREGADO', label: 'Entregado', icon: CheckCircle2 }
]

export default function PedidoStepper({ estadoActual, historial = [] }) {
  const esAnulado = estadoActual === 'ANULADO'

  // Mapa de fechas por estado para renderizar debajo de cada paso
  const fechasPorEstado = React.useMemo(() => {
    const mapa = {}
    if (Array.isArray(historial)) {
      historial.forEach((h) => {
        if (h.estado_nuevo) {
          mapa[h.estado_nuevo] = h.createdAt || h.created_at || h.fecha
        }
      })
    }
    return mapa
  }, [historial])

  // Determinar índice actual en la secuencia
  const indiceActual = PASOS_PEDIDO.findIndex((p) => p.id === estadoActual)

  if (esAnulado) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
        <div className="flex items-center gap-2 font-bold text-sm">
          <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <span>Pedido Anulado / Cancelado</span>
        </div>
        <p className="mt-1 text-xs text-rose-600/90 dark:text-rose-400/90">
          Este pedido fue anulado. Revisa la tabla inferior de auditoría para ver el motivo registrado.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full py-4">
      <div className="relative flex items-center justify-between">
        {/* Línea conectora de fondo */}
        <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-slate-200 dark:bg-slate-800" />

        {/* Línea conectora de progreso activo */}
        <div
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-emerald-500 transition-all duration-500"
          style={{
            width: `${Math.max(0, (indiceActual / (PASOS_PEDIDO.length - 1)) * 100)}%`
          }}
        />

        {/* Renderizado de Nodos */}
        {PASOS_PEDIDO.map((paso, idx) => {
          const Icono = paso.icon
          const completado = idx <= indiceActual
          const esPasoActual = idx === indiceActual
          const fechaHistorial = fechasPorEstado[paso.id]

          return (
            <div key={paso.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  completado
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                    : 'border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'
                } ${esPasoActual ? 'ring-4 ring-emerald-600/20 scale-110' : ''}`}
              >
                <Icono className="h-5 w-5" />
              </div>

              <div className="mt-2 text-center">
                <p
                  className={`text-xs font-bold ${
                    completado ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                  }`}
                >
                  {paso.label}
                </p>
                {fechaHistorial && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {new Date(fechaHistorial).toLocaleDateString()}{' '}
                    {new Date(fechaHistorial).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}