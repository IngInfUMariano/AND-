import { useState, useEffect, useCallback } from 'react'
import { Truck, RefreshCw, CheckCircle2, ArrowRightLeft, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { inventarioService } from '@/services/inventario.service'

const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val))

export default function DespachosPage() {
    const [traslados, setTraslados] = useState([])
    const [trasladoSel, setTrasladoSel] = useState(null)
    const [detallesSel, setDetallesSel] = useState([])
    const [cargando, setCargando] = useState(true)
    const [cargandoDetalle, setCargandoDetalle] = useState(false)
    const [despachando, setDespachando] = useState(false)

    // Cargar traslados pendientes de despacho
    const cargarTraslados = useCallback(async () => {
        setCargando(true)
        try {
            const res = await inventarioService.listarTraslados({ estado: 'EN_TRANSITO' })
            let lista = []
            if (Array.isArray(res)) lista = res
            else if (Array.isArray(res?.rows)) lista = res.rows
            else if (Array.isArray(res?.data)) lista = res.data

            setTraslados(lista)
            if (lista.length > 0) {
                seleccionarTraslado(lista[0])
            } else {
                setTrasladoSel(null)
                setDetallesSel([])
            }
        } catch (err) {
            console.error('Error al cargar traslados para despacho:', err)
            toast.error('Error al obtener lista de despachos')
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        cargarTraslados()
    }, [cargarTraslados])

    // Seleccionar traslado y cargar sus ítems reales mediante /traslado-detalles
    const seleccionarTraslado = useCallback(async (t) => {
        setTrasladoSel(t)
        setCargandoDetalle(true)
        try {
            const res = await inventarioService.listarTrasladoDetalles({ traslado_id: t.id })
            let items = []
            if (Array.isArray(res)) items = res
            else if (Array.isArray(res?.rows)) items = res.rows
            else if (Array.isArray(res?.data)) items = res.data

            setDetallesSel(items)
        } catch (err) {
            console.error('Error al cargar items del traslado:', err)
            setDetallesSel([])
        } finally {
            setCargandoDetalle(false)
        }
    }, [])

    // Despachar el traslado seleccionado desde la sucursal origen
    const handleConfirmarDespacho = async () => {
        if (!trasladoSel) return
        setDespachando(true)
        try {
            await inventarioService.despacharTraslado(trasladoSel.id, {})
            toast.success(`Traslado ${trasladoSel.numero || `#${trasladoSel.id}`} despachado correctamente`)
            cargarTraslados()
        } catch (err) {
            console.error('Error al despachar:', err)
            toast.error(err.response?.data?.error?.mensaje || 'Error al procesar el despacho')
        } finally {
            setDespachando(false)
        }
    }

    const getOrigen = (t) => t?.sucursalOrigen?.nombre || t?.sucursal_origen?.nombre || 'Origen N/A'
    const getDestino = (t) => t?.sucursalDestino?.nombre || t?.sucursal_destino?.nombre || 'Destino N/A'

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto" translate="no">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Truck className="text-primary" /> Despachos (Salidas por Traslado)
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Verificación y salida física de mercadería entre sucursales
                    </p>
                </div>
                <button
                    onClick={cargarTraslados}
                    disabled={cargando}
                    className="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-xs font-medium hover:bg-muted"
                >
                    <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Refrescar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Panel Izquierdo: Lista de Traslados */}
                <div className="md:col-span-5 flex flex-col gap-3">
                    <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Traslados Pendientes</h2>
                    {cargando ? (
                        <div className="py-12 text-center text-muted-foreground border rounded-xl bg-card">
                            <RefreshCw size={20} className="animate-spin mx-auto mb-2" /> Cargando despachos...
                        </div>
                    ) : traslados.length === 0 ? (
                        <div className="py-12 text-center border rounded-xl bg-card text-muted-foreground text-xs">
                            No hay traslados pendientes de despacho.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {traslados.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => seleccionarTraslado(t)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all bg-card ${trasladoSel?.id === t.id ? 'ring-2 ring-primary border-transparent shadow-md' : 'hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-sm text-foreground">{t.numero || `Traslado #${t.id}`}</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-200">
                                            {t.estado}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Origen: <strong className="text-foreground">{getOrigen(t)}</strong></span>
                                        <ArrowRightLeft size={12} />
                                        <span>Destino: <strong className="text-foreground">{getDestino(t)}</strong></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Panel Derecho: Detalle del Traslado Seleccionado */}
                <div className="md:col-span-7">
                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                        {trasladoSel ? (
                            <>
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div>
                                        <h3 className="font-bold text-base text-foreground">
                                            Detalle de {trasladoSel.numero || `Traslado #${trasladoSel.id}`}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Origen: <strong className="text-foreground">{getOrigen(trasladoSel)}</strong> ➔ Destino: <strong className="text-foreground">{getDestino(trasladoSel)}</strong>
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleConfirmarDespacho}
                                        disabled={despachando || detallesSel.length === 0}
                                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={16} />
                                        {despachando ? 'Procesando...' : 'Confirmar Despacho'}
                                    </button>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                                        <Package size={14} /> Ítems a despachar:
                                    </h4>
                                    {cargandoDetalle ? (
                                        <div className="py-8 text-center text-muted-foreground text-xs">
                                            <RefreshCw size={18} className="animate-spin mx-auto mb-2" /> Cargando renglones del traslado...
                                        </div>
                                    ) : detallesSel.length === 0 ? (
                                        <div className="py-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                                            Sin detalles de ítems.
                                        </div>
                                    ) : (
                                        <div className="border rounded-lg overflow-hidden divide-y text-xs">
                                            <table className="w-full text-left">
                                                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                                    <tr>
                                                        <th className="px-3 py-2">SKU</th>
                                                        <th className="px-3 py-2">Producto / Variante</th>
                                                        <th className="px-3 py-2 text-center">Cantidad Solicitada</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {detallesSel.map((d) => {
                                                        const sku = d.variante?.sku ?? d.sku ?? 'N/A'
                                                        const prod = d.variante?.producto?.nombre ?? d.producto_nombre ?? 'Producto'
                                                        const cant = safeNumber(d.cantidad_despachada ?? d.cantidad ?? d.cant)

                                                        return (
                                                            <tr key={d.id} className="hover:bg-muted/20">
                                                                <td className="px-3 py-2 font-mono text-xs font-medium">{sku}</td>
                                                                <td className="px-3 py-2 font-medium">{prod}</td>
                                                                <td className="px-3 py-2 text-center font-bold text-xs">{cant} u.</td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="py-16 text-center text-muted-foreground text-xs">
                                Selecciona un traslado de la lista para gestionar su despacho.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}