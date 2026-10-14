import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PackageCheck, RefreshCw, ArrowRightLeft, ShieldCheck, X, AlertTriangle, Building2, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import inventarioService from '@/services/inventario.service'

const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val))

const parseJwt = (token) => {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
            window.atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        )
        return JSON.parse(jsonPayload)
    } catch {
        return null
    }
}

export default function Recepciones() {
    const { trasladoIdParam } = useParams()
    const navigate = useNavigate()

    const [traslados, setTraslados] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [trasladoSeleccionado, setTrasladoSeleccionado] = useState(null)
    const [detallesSeleccionados, setDetallesSeleccionados] = useState([])
    const [cargando, setCargando] = useState(true)
    const [cargandoDetalle, setCargandoDetalle] = useState(false)
    const [procesando, setProcesando] = useState(false)
    const [error, setError] = useState(null)

    const [usuarioActual, setUsuarioActual] = useState(null)
    const [sucursalSeleccionadaId, setSucursalSeleccionadaId] = useState('')

    const [modalVerificacionAbierto, setModalVerificacionAbierto] = useState(false)
    const [cantidadesRecibidas, setCantidadesRecibidas] = useState({})
    const [observacionesDiferencia, setObservacionesDiferencia] = useState({})
    const [motivoGeneralDiscrepancia, setMotivoGeneralDiscrepancia] = useState('')

    useEffect(() => {
        try {
            let u = null
            const userStored = localStorage.getItem('usuario') || localStorage.getItem('user') || localStorage.getItem('auth')
            if (userStored) {
                const parsed = JSON.parse(userStored)
                u = parsed.data?.usuario || parsed.usuario || parsed.user || parsed
            }

            if (!u || !u.perfil) {
                const token = localStorage.getItem('token') || localStorage.getItem('jwt')
                if (token) {
                    const decoded = parseJwt(token)
                    if (decoded) u = decoded
                }
            }

            setUsuarioActual(u)
            const sucUser = u?.sucursal_id || u?.sucursal?.id
            if (sucUser) {
                setSucursalSeleccionadaId(String(sucUser))
            }
        } catch (err) {
            console.error('Error al leer sesión de usuario:', err)
        }
    }, [])

    useEffect(() => {
        let activo = true
        const cargarSucursales = async () => {
            try {
                const res = await inventarioService.listarSucursales()
                if (!activo) return
                const lista = Array.isArray(res) ? res : (res?.data || res?.datos || [])
                setSucursales(lista)

                if (!sucursalSeleccionadaId && lista.length > 0) {
                    setSucursalSeleccionadaId(String(lista[0].id))
                }
            } catch (err) {
                console.error('Error al obtener sucursales:', err)
            }
        }
        cargarSucursales()
        return () => { activo = false }
    }, [sucursalSeleccionadaId])

    const esAdminOGerente = () => {
        if (!usuarioActual) return true
        const rol = String(
            usuarioActual.perfil ||
            usuarioActual.rol ||
            usuarioActual.role ||
            usuarioActual.tipo ||
            ''
        ).toUpperCase()
        return rol.includes('ADMIN') || rol.includes('GERENTE') || usuarioActual.perfil === 'ADMIN'
    }

    const sucursalAsignadaUsuario = usuarioActual?.sucursal_id || usuarioActual?.sucursal?.id

    const cargarTraslados = async () => {
        if (!sucursalSeleccionadaId) return
        try {
            setCargando(true)
            setError(null)
            const params = {
                sucursal_destino_id: sucursalSeleccionadaId
            }
            const res = await inventarioService.listarTraslados(params)

            const listaBruta = Array.isArray(res) ? res : (res?.data || res?.traslados || [])

            const listaValida = listaBruta.filter((t) => {
                const est = String(t.estado || '').toUpperCase()
                return est !== 'RECIBIDO' && est !== 'ANULADO'
            })

            setTraslados(listaValida)

            if (trasladoIdParam && listaValida.length > 0) {
                const encontrado = listaValida.find((t) => String(t.id) === String(trasladoIdParam))
                if (encontrado) seleccionarTraslado(encontrado)
            } else if (listaValida.length > 0 && !trasladoSeleccionado) {
                seleccionarTraslado(listaValida[0])
            } else if (listaValida.length === 0) {
                setTrasladoSeleccionado(null)
                setDetallesSeleccionados([])
            }
        } catch (err) {
            console.error('Error al cargar recepciones:', err)
            setError('No se pudo cargar la lista de recepciones.')
            setTraslados([])
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        cargarTraslados()
    }, [trasladoIdParam, sucursalSeleccionadaId])

    const seleccionarTraslado = async (item) => {
        setTrasladoSeleccionado(item)
        setCargandoDetalle(true)
        try {
            const res = await inventarioService.listarTrasladoDetalles({ traslado_id: item.id })
            let items = []
            if (Array.isArray(res)) items = res
            else if (Array.isArray(res?.rows)) items = res.rows
            else if (Array.isArray(res?.data)) items = res.data
            else if (Array.isArray(res?.traslado_detalles)) items = res.traslado_detalles

            setDetallesSeleccionados(items)

            const mapaCantidades = {}
            items.forEach((d) => {
                const despachada = safeNumber(d.cantidad_despachada ?? d.cantidad)
                mapaCantidades[d.id] = despachada
            })
            setCantidadesRecibidas(mapaCantidades)
            setObservacionesDiferencia({})
            setMotivoGeneralDiscrepancia('')
        } catch (err) {
            console.error('Error al cargar detalles de recepción:', err)
            const fallbackItems = item.traslado_detalles || item.detalles || item.items || []
            setDetallesSeleccionados(fallbackItems)
            const mapaCantidades = {}
            fallbackItems.forEach((d) => {
                mapaCantidades[d.id] = safeNumber(d.cantidad_despachada ?? d.cantidad)
            })
            setCantidadesRecibidas(mapaCantidades)
        } finally {
            setCargandoDetalle(false)
        }
    }

    const cambiarCantidadRecibida = (detalleId, valor) => {
        const val = Math.max(0, Number(valor) || 0)
        setCantidadesRecibidas((prev) => ({
            ...prev,
            [detalleId]: val
        }))
    }

    const hayDiscrepancias = detallesSeleccionados.some((d) => {
        const despachado = safeNumber(d.cantidad_despachada ?? d.cantidad)
        const recibido = safeNumber(cantidadesRecibidas[d.id])
        return recibido !== despachado
    })

    const validarPermisoRecepcion = () => {
        if (!trasladoSeleccionado) return false
        if (esAdminOGerente()) return true

        const destinoId = Number(trasladoSeleccionado.sucursal_destino_id || trasladoSeleccionado.sucursalDestino?.id)
        const sucursalComboId = Number(sucursalSeleccionadaId)

        if (destinoId === sucursalComboId) {
            return true
        }

        const usuarioSucId = Number(sucursalAsignadaUsuario)
        if (usuarioSucId && destinoId !== usuarioSucId) {
            toast.error('Acceso denegado: Solo puedes recibir traslados destinados a tu sucursal seleccionada.')
            return false
        }
        return true
    }

    const confirmarRecepcionFinal = async () => {
        if (!trasladoSeleccionado) return
        if (!validarPermisoRecepcion()) return

        const estActual = String(trasladoSeleccionado.estado || '').toUpperCase()
        if (estActual === 'PENDIENTE') {
            toast.error('No se puede registrar recepción en un traslado en estado PENDIENTE. Debe ser despachado primero.')
            return
        }

        if (hayDiscrepancias && !motivoGeneralDiscrepancia.trim()) {
            toast.error('Has modificado cantidades. Debes indicar un motivo o justificación obligatoria.')
            return
        }

        setProcesando(true)
        try {
            // 1. Enviar el PATCH individual por cada ítem recibido
            const promesasDetalles = detallesSeleccionados.map((d) => {
                const recibido = safeNumber(cantidadesRecibidas[d.id] ?? d.cantidad_despachada ?? d.cantidad)
                const despachado = safeNumber(d.cantidad_despachada ?? d.cantidad)
                const obs = observacionesDiferencia[d.id] || (recibido !== despachado ? motivoGeneralDiscrepancia.trim() : null)

                return inventarioService.registrarRecepcionItem(d.id, {
                    cantidad_recibida: recibido,
                    observacion_diferencia: obs
                })
            })

            await Promise.all(promesasDetalles)

            // 2. Confirmar recepción general en el backend
            await inventarioService.recibirTraslado(trasladoSeleccionado.id, {
                observaciones_recepcion: motivoGeneralDiscrepancia.trim() || null
            }).catch(() => { })

            // 3. Registrar automáticamente la merma si hay faltantes
            const promesasMermas = []
            detallesSeleccionados.forEach((d) => {
                const enviado = safeNumber(d.cantidad_despachada ?? d.cantidad)
                const recibido = safeNumber(cantidadesRecibidas[d.id] ?? enviado)

                if (recibido < enviado) {
                    const faltante = enviado - recibido
                    const varianteId = d.variante_id || d.variante?.id
                    const sucursalDestinoId = trasladoSeleccionado.sucursal_destino_id || trasladoSeleccionado.sucursalDestino?.id || sucursalSeleccionadaId

                    promesasMermas.push(
                        inventarioService.registrarMerma({
                            sucursal_id: Number(sucursalDestinoId),
                            variante_id: Number(varianteId),
                            cantidad: Number(faltante),
                            motivo: `Faltante detectado en Recepción de Traslado #${trasladoSeleccionado.numero || trasladoSeleccionado.id}: ${motivoGeneralDiscrepancia.trim()}`
                        })
                    )
                }
            })

            if (promesasMermas.length > 0) {
                await Promise.all(promesasMermas)
                toast.success('Se han generado los registros de merma correspondientes por el faltante detectado.')
            }

            toast.success(`Recepción confirmada correctamente para el traslado #${trasladoSeleccionado.id}`)
            setModalVerificacionAbierto(false)
            await cargarTraslados()
            setTrasladoSeleccionado(null)
            navigate('/recepciones')
        } catch (err) {
            console.error('Error al procesar recepción:', err)
            toast.error(err?.response?.data?.error?.mensaje || err?.response?.data?.message || 'Error al registrar el ingreso.')
        } finally {
            setProcesando(false)
        }
    }

    const getOrigenNombre = (item) => item?.sucursalOrigen?.nombre || item?.sucursal_origen?.nombre || 'Origen N/A'
    const getDestinoNombre = (item) => item?.sucursalDestino?.nombre || item?.sucursal_destino?.nombre || 'Destino N/A'

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto" translate="no">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <PackageCheck className="text-primary" /> Recepciones (Entradas por Traslado)
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Conteo e ingreso físico de mercancía recibida de otras sucursales.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-card border rounded-lg px-3.5 py-2 shadow-sm">
                        <Building2 size={16} className="text-primary" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Sucursal de Destino</span>
                            <select
                                value={sucursalSeleccionadaId}
                                onChange={(e) => setSucursalSeleccionadaId(e.target.value)}
                                className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
                            >
                                {sucursales.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nombre} {String(s.id) === String(sucursalAsignadaUsuario) ? '(Tu Sucursal)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={cargarTraslados}
                        disabled={cargando}
                        className="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-xs font-medium hover:bg-muted"
                    >
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Refrescar
                    </button>
                </div>
            </div>

            {cargando ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground border rounded-xl bg-card">
                    Cargando recepciones pendientes...
                </div>
            ) : error ? (
                <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                </div>
            ) : traslados.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center bg-card">
                    <p className="font-medium text-foreground">No hay recepciones registradas</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        No hay envíos pendientes de ingresar a esta bodega.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-5 flex flex-col gap-3">
                        <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Traslados Pendientes / En Tránsito</h2>
                        <div className="space-y-2">
                            {traslados.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => seleccionarTraslado(item)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all bg-card ${trasladoSeleccionado?.id === item.id ? 'ring-2 ring-primary border-transparent shadow-md' : 'hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-sm text-foreground">{item.numero || `Traslado #${item.id}`}</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200">
                                            {item.estado || 'PENDIENTE'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Origen: <strong className="text-foreground">{getOrigenNombre(item)}</strong></span>
                                        <ArrowRightLeft size={12} />
                                        <span>Destino: <strong className="text-foreground">{getDestinoNombre(item)}</strong></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-7">
                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                            {trasladoSeleccionado ? (
                                <>
                                    <div className="flex items-center justify-between border-b pb-3">
                                        <div>
                                            <h3 className="font-bold text-base text-foreground">
                                                Revisión de Recepción {trasladoSeleccionado.numero || `#${trasladoSeleccionado.id}`}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                Origen: <strong className="text-foreground">{getOrigenNombre(trasladoSeleccionado)}</strong> ➔ Destino: <strong className="text-foreground">{getDestinoNombre(trasladoSeleccionado)}</strong>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const est = String(trasladoSeleccionado.estado || '').toUpperCase()
                                                if (est === 'PENDIENTE') {
                                                    toast.error('Este traslado aún está en estado PENDIENTE. Debe ser despachado antes de recibirlo.')
                                                    return
                                                }
                                                if (validarPermisoRecepcion()) setModalVerificacionAbierto(true)
                                            }}
                                            disabled={detallesSeleccionados.length === 0}
                                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            <ShieldCheck size={16} /> Verificar e Ingresar Inventario
                                        </button>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                                            <Package size={14} /> Items en este envío:
                                        </h4>
                                        {cargandoDetalle ? (
                                            <div className="py-8 text-center text-muted-foreground text-xs">Cargando items...</div>
                                        ) : (
                                            <div className="border rounded-lg overflow-hidden divide-y text-xs">
                                                <table className="w-full text-left">
                                                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                                        <tr>
                                                            <th className="px-3 py-2">Producto / Variante</th>
                                                            <th className="px-3 py-2 text-center">Cantidad Enviada</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {detallesSeleccionados.map((det, idx) => (
                                                            <tr key={det.id || idx} className="hover:bg-muted/20">
                                                                <td className="px-3 py-2 font-medium">{det.producto?.nombre || det.variante?.producto?.nombre || det.variante?.sku || `Item ${idx + 1}`}</td>
                                                                <td className="px-3 py-2 text-center font-bold text-xs">{safeNumber(det.cantidad_despachada ?? det.cantidad)} u.</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="py-16 text-center text-muted-foreground text-xs">
                                    Selecciona una recepción de la lista para ver sus detalles.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {modalVerificacionAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <ShieldCheck size={18} className="text-emerald-600" /> Conteo Físico y Verificación de Recepción
                            </h2>
                            <button onClick={() => setModalVerificacionAbierto(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="bg-amber-500/10 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start gap-2">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                                <div>
                                    <strong>Atención Bodega:</strong> Cuente físicamente lo recibido frente a lo enviado. Si hay diferencias, deberá registrar una justificación obligatoria.
                                </div>
                            </div>

                            <div className="border rounded-lg p-3 space-y-1 bg-muted/20">
                                <div><strong>Traslado:</strong> {trasladoSeleccionado?.numero || `#${trasladoSeleccionado?.id}`}</div>
                                <div><strong>Origen:</strong> {getOrigenNombre(trasladoSeleccionado)} | <strong>Destino:</strong> {getDestinoNombre(trasladoSeleccionado)}</div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-foreground mb-2">Detalle de productos a recibir:</h4>
                                <div className="border rounded-lg overflow-hidden divide-y">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/50 text-[11px] font-medium text-muted-foreground border-b">
                                            <tr>
                                                <th className="px-3 py-2">Producto / Variante</th>
                                                <th className="px-3 py-2 text-center">Cant. Enviada</th>
                                                <th className="px-3 py-2 text-center">Cant. Recibida (Física)</th>
                                                <th className="px-3 py-2 text-center">Estado / Alerta</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {detallesSeleccionados.map((d) => {
                                                const prodNombre = d.producto?.nombre || d.variante?.producto?.nombre || 'Producto'
                                                const enviado = safeNumber(d.cantidad_despachada ?? d.cantidad)
                                                const recibido = cantidadesRecibidas[d.id] !== undefined ? cantidadesRecibidas[d.id] : enviado

                                                let badgeAlerta = <span className="text-emerald-600 font-medium">Exacto</span>
                                                if (recibido < enviado) {
                                                    badgeAlerta = <span className="text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200">Faltante (-{enviado - recibido})</span>
                                                } else if (recibido > enviado) {
                                                    badgeAlerta = <span className="text-blue-600 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200">Sobrante (+{recibido - enviado})</span>
                                                }

                                                return (
                                                    <tr key={d.id} className="hover:bg-muted/20">
                                                        <td className="px-3 py-2">
                                                            <div className="font-semibold text-foreground">{prodNombre}</div>
                                                            <div className="text-[11px] font-mono text-muted-foreground">SKU: {d.variante?.sku ?? d.sku ?? 'N/A'}</div>
                                                        </td>
                                                        <td className="px-3 py-2 text-center font-bold text-muted-foreground">
                                                            {enviado} u.
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={recibido}
                                                                onChange={(e) => cambiarCantidadRecibida(d.id, e.target.value)}
                                                                className="w-20 rounded border bg-background px-2 py-1 text-center font-bold text-foreground outline-none focus:ring-2 focus:ring-ring"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {badgeAlerta}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {hayDiscrepancias && (
                                <div className="border border-amber-300 bg-amber-500/5 p-3 rounded-lg space-y-1.5">
                                    <label className="block font-semibold text-amber-800 flex items-center gap-1">
                                        <AlertTriangle size={14} /> Motivo de discrepancia general (Obligatorio):
                                    </label>
                                    <textarea
                                        value={motivoGeneralDiscrepancia}
                                        onChange={(e) => setMotivoGeneralDiscrepancia(e.target.value)}
                                        placeholder="Explique el motivo de la diferencia en la recepción..."
                                        className="w-full rounded-lg border bg-background p-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 h-16"
                                        required
                                    />
                                </div>
                            )}
                        </div>
                        <div className="border-t px-5 py-3 bg-muted/20 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setModalVerificacionAbierto(false)}
                                className="rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarRecepcionFinal}
                                disabled={procesando || (hayDiscrepancias && !motivoGeneralDiscrepancia.trim())}
                                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {procesando ? 'Procesando Ingreso...' : 'Confirmar Ingreso a Inventario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}