import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import inventarioService from '@/services/inventario.service'

export default function Despachos() {
    const { trasladoIdParam } = useParams()
    const navigate = useNavigate()

    const [traslados, setTraslados] = useState([])
    const [trasladoSeleccionado, setTrasladoSeleccionado] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [procesando, setProcesando] = useState(false)
    const [error, setError] = useState(null)

    // Carga e independiza el formato de lista retornado por la API
    const cargarTraslados = async () => {
        try {
            setCargando(true)
            setError(null)
            const res = await inventarioService.listarTraslados()

            const listaBruta = Array.isArray(res) ? res : (res?.data || res?.traslados || [])

            // Ordena: Primero activos ('PENDIENTE', 'SOLICITADO', 'EN_PROCESO'), luego por fecha reciente
            const listaOrdenada = [...listaBruta].sort((a, b) => {
                const estadosActivos = ['PENDIENTE', 'SOLICITADO', 'EN_PROCESO']
                const aEsActivo = estadosActivos.includes(a.estado?.toUpperCase())
                const bEsActivo = estadosActivos.includes(b.estado?.toUpperCase())

                if (aEsActivo && !bEsActivo) return -1
                if (!aEsActivo && bEsActivo) return 1

                const fechaA = new Date(a.created_at || a.createdAt || a.fecha || 0)
                const fechaB = new Date(b.created_at || b.createdAt || b.fecha || 0)
                return fechaB - fechaA
            })

            setTraslados(listaOrdenada)

            if (trasladoIdParam && listaOrdenada.length > 0) {
                const encontrado = listaOrdenada.find((t) => String(t.id) === String(trasladoIdParam))
                if (encontrado) setTrasladoSeleccionado(encontrado)
            }
        } catch (err) {
            console.error('Error al cargar despachos:', err)
            setError('No se pudo cargar la lista de despachos.')
            setTraslados([])
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        cargarTraslados()
    }, [trasladoIdParam])

    const handleDespachar = async (id) => {
        try {
            setProcesando(true)
            await inventarioService.despacharTraslado(id, {})
            await cargarTraslados()
            setTrasladoSeleccionado(null)
            navigate('/despachos')
        } catch (err) {
            console.error('Error al procesar despacho:', err)
            alert(err?.response?.data?.message || 'Error al procesar el despacho.')
        } finally {
            setProcesando(false)
        }
    }

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Despachos (Salidas por Traslado)</h1>
                    <p className="text-sm text-muted-foreground">
                        Verificación y salida física de mercadería entre sucursales.
                    </p>
                </div>
                <button
                    onClick={cargarTraslados}
                    className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                >
                    Refrescar
                </button>
            </div>

            {cargando ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    Cargando traslados pendientes...
                </div>
            ) : error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                </div>
            ) : traslados.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                    <p className="font-medium">No hay despachos registrados</p>
                    <p className="text-sm text-muted-foreground">
                        No existen traslados pendientes de salida actualmente.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Lista de Traslados */}
                    <div className="space-y-2 md:col-span-1">
                        {traslados.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setTrasladoSeleccionado(item)}
                                className={`cursor-pointer rounded-lg border p-3 transition-colors ${trasladoSeleccionado?.id === item.id ? 'border-primary bg-accent' : 'hover:bg-accent/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">Traslado #{item.id}</span>
                                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                        {item.estado || 'PENDIENTE'}
                                    </span>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    Origen: {item.sucursal_origen?.nombre || item.origen_id || 'N/A'} <br />
                                    Destino: {item.sucursal_destino?.nombre || item.destino_id || 'N/A'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detalle del Traslado */}
                    <div className="rounded-lg border p-4 md:col-span-2">
                        {trasladoSeleccionado ? (
                            <div className="space-y-4">
                                <div className="border-b pb-3">
                                    <h2 className="text-lg font-bold">Detalle de Traslado #{trasladoSeleccionado.id}</h2>
                                    <p className="text-xs text-muted-foreground">Estado: {trasladoSeleccionado.estado}</p>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-semibold">Ítems a despachar:</p>
                                    {(trasladoSeleccionado.detalles || trasladoSeleccionado.items || []).length === 0 ? (
                                        <p className="text-xs text-muted-foreground">Sin detalles de ítems.</p>
                                    ) : (
                                        <ul className="divide-y rounded border text-sm">
                                            {(trasladoSeleccionado.detalles || trasladoSeleccionado.items || []).map((det, idx) => (
                                                <li key={idx} className="flex justify-between p-2">
                                                    <span>{det.producto?.nombre || det.variante?.sku || `Ítem ${idx + 1}`}</span>
                                                    <span className="font-mono font-bold">{det.cantidad} u.</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {['PENDIENTE', 'SOLICITADO', 'EN_PROCESO'].includes(trasladoSeleccionado.estado?.toUpperCase()) && (
                                    <button
                                        disabled={procesando}
                                        onClick={() => handleDespachar(trasladoSeleccionado.id)}
                                        className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                                    >
                                        {procesando ? 'Procesando Salida...' : 'Confirmar Salida de Bodega'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                                Selecciona un traslado de la lista para ver su detalle.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}