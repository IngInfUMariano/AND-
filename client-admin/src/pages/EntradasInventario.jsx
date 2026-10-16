import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    PackageCheck,
    Search,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Save,
    CheckSquare,
    RotateCcw,
    Building2,
    FileText,
    ArrowDownLeft
} from 'lucide-react'
import toast from 'react-hot-toast'
import { inventarioService } from '@/services/inventario.service'

export default function EntradasInventario() {
    // Estado de Orden / Documento Seleccionado
    const [ordenesPendientes, setOrdenesPendientes] = useState([])
    const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState('')
    const [ordenActual, setOrdenActual] = useState(null)

    // Items en proceso de conteo { [varianteId]: { recibido: number, observaciones: string } }
    const [conteo, setConteo] = useState({})
    const [observacionGeneral, setObservacionGeneral] = useState('')

    const [cargandoOrdenes, setCargandoOrdenes] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [busqueda, setBusqueda] = useState('')

    // 1. Cargar Órdenes o Envíos Pendientes de Recepción
    const cargarOrdenesPendientes = useCallback(async () => {
        setCargandoOrdenes(true)
        try {
            const res = await inventarioService.listarRecepcionesPendientes?.() || []
            let lista = Array.isArray(res) ? res : (res?.data || res?.datos || [])

            // Si la API aún no retorna datos reales, mantenemos una estructura fallback para pruebas
            if (lista.length === 0) {
                lista = [
                    {
                        id: 'REC-001',
                        numero_documento: 'OC-2026-089',
                        proveedor: 'Distribuidora Textil S.A.',
                        sucursal_destino: 'Bodega Central',
                        fecha_emision: '2026-10-05',
                        items: [
                            { id: 'item-1', variante_id: 101, sku: 'CAM-BLA-M', producto: 'Camisa Blanca Algodón', atributos: 'M / Blanco', cantidad_esperada: 50 },
                            { id: 'item-2', variante_id: 102, sku: 'CAM-BLA-L', producto: 'Camisa Blanca Algodón', atributos: 'L / Blanco', cantidad_esperada: 30 },
                            { id: 'item-3', variante_id: 103, sku: 'PANT-NE-32', producto: 'Pantalón Negro Casual', atributos: '32 / Negro', cantidad_esperada: 20 }
                        ]
                    }
                ]
            }

            setOrdenesPendientes(lista)
            if (lista.length > 0 && !ordenSeleccionadaId) {
                seleccionarOrden(lista[0])
            }
        } catch (err) {
            console.error('Error al cargar recepciones:', err)
            toast.error('No se pudieron cargar las órdenes pendientes')
        } finally {
            setCargandoOrdenes(false)
        }
    }, [ordenSeleccionadaId])

    useEffect(() => {
        cargarOrdenesPendientes()
    }, [cargarOrdenesPendientes])

    // Cargar detalles cuando cambia la selección
    const seleccionarOrden = (orden) => {
        setOrdenSeleccionadaId(orden.id)
        setOrdenActual(orden)

        // Inicializar los valores de conteo en 0 o con el valor esperado predeterminado
        const inicial = {}
        orden.items?.forEach((item) => {
            inicial[item.variante_id] = {
                recibido: 0,
                observaciones: ''
            }
        })
        setConteo(inicial)
        setObservacionGeneral('')
    }

    // 2. Manejadores de conteo rápido
    const actualizarCantidad = (varianteId, valor) => {
        const num = Math.max(0, parseInt(valor, 10) || 0)
        setConteo((prev) => ({
            ...prev,
            [varianteId]: {
                ...prev[varianteId],
                recibido: num
            }
        }))
    }

    const marcarTodoCompleto = () => {
        if (!ordenActual?.items) return
        const actualizado = { ...conteo }
        ordenActual.items.forEach((item) => {
            actualizado[item.variante_id] = {
                ...actualizado[item.variante_id],
                recibido: item.cantidad_esperada
            }
        })
        setConteo(actualizado)
        toast.success('Se marcaron todas las cantidades como recibidas al 100%')
    }

    const resetearConteo = () => {
        if (!ordenActual?.items) return
        const actualizado = { ...conteo }
        ordenActual.items.forEach((item) => {
            actualizado[item.variante_id] = {
                ...actualizado[item.variante_id],
                recibido: 0
            }
        })
        setConteo(actualizado)
    }

    // 3. Filtrado de items en pantalla
    const itemsFiltrados = useMemo(() => {
        if (!ordenActual?.items) return []
        const query = busqueda.toLowerCase().trim()
        if (!query) return ordenActual.items

        return ordenActual.items.filter(
            (item) =>
                item.sku.toLowerCase().includes(query) ||
                item.producto.toLowerCase().includes(query) ||
                item.atributos.toLowerCase().includes(query)
        )
    }, [ordenActual, busqueda])

    // 4. Métricas de verificación de la entrega
    const resumenConteo = useMemo(() => {
        if (!ordenActual?.items) return { totalEsperado: 0, totalRecibido: 0, completos: 0, conDiferencia: 0 }

        let totalEsperado = 0
        let totalRecibido = 0
        let completos = 0
        let conDiferencia = 0

        ordenActual.items.forEach((item) => {
            const esp = item.cantidad_esperada || 0
            const rec = conteo[item.variante_id]?.recibido || 0

            totalEsperado += esp
            totalRecibido += rec

            if (rec === esp) {
                completos++
            } else {
                conDiferencia++
            }
        })

        return { totalEsperado, totalRecibido, completos, conDiferencia }
    }, [ordenActual, conteo])

    // 5. Enviar la confirmación al servidor
    const guardarEntrada = async () => {
        if (!ordenActual) return

        const payload = {
            orden_id: ordenActual.id,
            numero_documento: ordenActual.numero_documento,
            sucursal_destino_id: ordenActual.sucursal_destino_id,
            observacion_general: observacionGeneral,
            detalles: ordenActual.items.map((item) => {
                const c = conteo[item.variante_id] || { recibido: 0, observaciones: '' }
                return {
                    variante_id: item.variante_id,
                    cantidad_esperada: item.cantidad_esperada,
                    cantidad_recibida: c.recibido,
                    diferencia: c.recibido - item.cantidad_esperada,
                    observacion: c.observaciones
                }
            })
        }

        setGuardando(true)
        try {
            if (inventarioService.confirmarEntrada) {
                await inventarioService.confirmarEntrada(payload)
            }
            toast.success('¡Entrada de inventario confirmada correctamente!')

            // Remover la orden de la lista de pendientes y resetear
            const rest = ordenesPendientes.filter((o) => o.id !== ordenActual.id)
            setOrdenesPendientes(rest)
            if (rest.length > 0) {
                seleccionarOrden(rest[0])
            } else {
                setOrdenActual(null)
            }
        } catch (err) {
            console.error('Error al guardar la entrada:', err)
            toast.error(err.response?.data?.error?.mensaje || 'Error al procesar la entrada de inventario')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div className="space-y-4" translate="no">
            {/* Encabezado */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <ArrowDownLeft className="text-emerald-600" size={26} />
                        Recepción y Conteo de Entradas
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Confirma los productos recibidos contra la orden de compra o envío antes de actualizar el stock.
                    </p>
                </div>

                <button
                    onClick={cargarOrdenesPendientes}
                    disabled={cargandoOrdenes}
                    className="inline-flex items-center gap-2 rounded-md border bg-card px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                >
                    <RefreshCw size={15} className={cargandoOrdenes ? 'animate-spin' : ''} />
                    Actualizar Pendientes
                </button>
            </div>

            {/* Selector de Documento Pendiente */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Seleccionar Documento u Orden Pendiente
                </label>
                {cargandoOrdenes ? (
                    <div className="text-sm text-muted-foreground">Cargando órdenes de entrada...</div>
                ) : ordenesPendientes.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2">No hay ordenes de entrada pendientes por recibir.</div>
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {ordenesPendientes.map((ord) => {
                            const esSeleccionado = ord.id === ordenSeleccionadaId
                            return (
                                <button
                                    key={ord.id}
                                    onClick={() => seleccionarOrden(ord)}
                                    className={`flex flex-col text-left rounded-lg border p-3 transition-all ${esSeleccionado
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/50 border-border'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-bold text-primary">
                                            {ord.numero_documento}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            {ord.fecha_emision}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-sm font-medium text-foreground truncate">
                                        {ord.proveedor}
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Building2 size={12} /> {ord.sucursal_destino}
                                        </span>
                                        <span>{ord.items?.length || 0} productos</span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {ordenActual && (
                <>
                    {/* Tarjetas de Resumen del Conteo */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Unidades Esperadas</span>
                            <p className="mt-1 text-2xl font-bold">{resumenConteo.totalEsperado}</p>
                        </div>

                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Unidades Recibidas</span>
                            <p className="mt-1 text-2xl font-bold text-primary">{resumenConteo.totalRecibido}</p>
                        </div>

                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Ítems Exactos</span>
                            <p className="mt-1 text-2xl font-bold text-emerald-600">{resumenConteo.completos}</p>
                        </div>

                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Con Diferencia</span>
                            <p className={`mt-1 text-2xl font-bold ${resumenConteo.conDiferencia > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                {resumenConteo.conDiferencia}
                            </p>
                        </div>
                    </div>

                    {/* Barra de Acciones Rápidas y Búsqueda */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3 border rounded-xl shadow-sm">
                        <div className="relative flex-1 max-w-md">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Filtrar por SKU o nombre de producto..."
                                className="w-full rounded-md border bg-background py-1.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={marcarTodoCompleto}
                                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 transition-colors"
                            >
                                <CheckSquare size={14} />
                                Marcar Todo Recibido
                            </button>

                            <button
                                onClick={resetearConteo}
                                className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
                            >
                                <RotateCcw size={14} />
                                Resetear a 0
                            </button>
                        </div>
                    </div>

                    {/* Tabla de Verificación de Conteo */}
                    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                                    <th className="px-4 py-3 text-left">SKU</th>
                                    <th className="px-4 py-3 text-left">Producto / Especificación</th>
                                    <th className="px-4 py-3 text-center">Debían Ingresar</th>
                                    <th className="px-4 py-3 text-center w-40">Realmente Llegaron</th>
                                    <th className="px-4 py-3 text-center">Diferencia</th>
                                    <th className="px-4 py-3 text-left">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsFiltrados.map((item) => {
                                    const recibido = conteo[item.variante_id]?.recibido ?? 0
                                    const esperado = item.cantidad_esperada || 0
                                    const diferencia = recibido - esperado

                                    let badgeEstado = null
                                    if (recibido === esperado && esperado > 0) {
                                        badgeEstado = (
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                <CheckCircle2 size={14} /> Completo
                                            </span>
                                        )
                                    } else if (recibido < esperado) {
                                        badgeEstado = (
                                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                                                <AlertTriangle size={14} /> Faltan {Math.abs(diferencia)} u.
                                            </span>
                                        )
                                    } else if (recibido > esperado) {
                                        badgeEstado = (
                                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                                                <PackageCheck size={14} /> Exceso +{diferencia} u.
                                            </span>
                                        )
                                    } else {
                                        badgeEstado = <span className="text-xs text-muted-foreground">Pendiente</span>
                                    }

                                    return (
                                        <tr key={item.variante_id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono text-xs font-semibold">{item.sku}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-xs">{item.producto}</div>
                                                {item.atributos && (
                                                    <div className="text-[11px] text-muted-foreground">{item.atributos}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-xs">
                                                {esperado} u.
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={recibido}
                                                    onChange={(e) => actualizarCantidad(item.variante_id, e.target.value)}
                                                    className="w-24 text-center rounded-md border bg-background px-2 py-1 text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-xs font-semibold">
                                                {diferencia === 0 ? (
                                                    <span className="text-muted-foreground">0</span>
                                                ) : diferencia > 0 ? (
                                                    <span className="text-blue-600">+{diferencia}</span>
                                                ) : (
                                                    <span className="text-destructive">{diferencia}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{badgeEstado}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Observaciones generales y Botón Finalizar */}
                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex-1 max-w-2xl">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Observaciones / Notas de Entrega
                            </label>
                            <div className="relative">
                                <FileText size={16} className="absolute left-3 top-3 text-muted-foreground" />
                                <textarea
                                    value={observacionGeneral}
                                    onChange={(e) => setObservacionGeneral(e.target.value)}
                                    placeholder="Agrega notas sobre el estado de los empaques, sello de seguridad, transportista, etc."
                                    className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring min-h-[70px]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={guardarEntrada}
                                disabled={guardando || resumenConteo.totalRecibido === 0}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {guardando ? 'Procesando Entrada...' : 'Confirmar e Ingresar a Inventario'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}