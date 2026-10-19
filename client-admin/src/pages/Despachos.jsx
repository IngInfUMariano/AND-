import { useState, useEffect, useCallback } from 'react'
import { Truck, RefreshCw, ArrowRightLeft, Package, ShieldCheck, X, AlertTriangle, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { inventarioService } from '@/services/inventario.service'

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

export default function DespachosPage() {
    const [traslados, setTraslados] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [trasladoSel, setTrasladoSel] = useState(null)
    const [detallesSel, setDetallesSel] = useState([])
    const [cargando, setCargando] = useState(true)
    const [cargandoDetalle, setCargandoDetalle] = useState(false)
    const [despachando, setDespachando] = useState(false)
    const [modalVerificacionAbierto, setModalVerificacionAbierto] = useState(false)

    const [usuarioActual, setUsuarioActual] = useState(null)
    const [sucursalSeleccionadaId, setSucursalSeleccionadaId] = useState('')

    const [cantidadesEnviadas, setCantidadesEnviadas] = useState({})
    const [motivoDiscrepancia, setMotivoDiscrepancia] = useState('')

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
            console.error('Error al leer sesion de usuario:', err)
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

    const cargarTraslados = useCallback(async () => {
        if (!sucursalSeleccionadaId) return
        setCargando(true)
        try {
            const params = {
                estado: 'PENDIENTE',
                sucursal_origen_id: sucursalSeleccionadaId
            }

            const res = await inventarioService.listarTraslados(params)
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
            console.error('Error al cargar traslados pendientes:', err)
            toast.error('Error al obtener lista de despachos')
        } finally {
            setCargando(false)
        }
    }, [sucursalSeleccionadaId])

    useEffect(() => {
        cargarTraslados()
    }, [cargarTraslados])

    const seleccionarTraslado = async (t) => {
        setTrasladoSel(t)
        setCargandoDetalle(true)
        try {
            const res = await inventarioService.listarTrasladoDetalles({ traslado_id: t.id })
            let items = []
            if (Array.isArray(res)) items = res
            else if (Array.isArray(res?.rows)) items = res.rows
            else if (Array.isArray(res?.data)) items = res.data

            setDetallesSel(items)

            const mapaCantidades = {}
            items.forEach((d) => {
                mapaCantidades[d.id] = safeNumber(d.cantidad_despachada ?? d.cantidad)
            })
            setCantidadesEnviadas(mapaCantidades)
            setMotivoDiscrepancia('')
        } catch (err) {
            console.error('Error al cargar items:', err)
            setDetallesSel([])
        } finally {
            setCargandoDetalle(false)
        }
    }

    const cambiarCantidadEnvio = (detalleId, valor) => {
        const val = Math.max(0, Number(valor) || 0)
        setCantidadesEnviadas((prev) => ({
            ...prev,
            [detalleId]: val
        }))
    }

    const hayDiscrepancias = detallesSel.some((d) => {
        const solicitado = safeNumber(d.cantidad_despachada ?? d.cantidad)
        const enCarga = safeNumber(cantidadesEnviadas[d.id])
        return enCarga !== solicitado
    })

    const validarPermisoDespacho = () => {
        if (!trasladoSel) return false
        if (esAdminOGerente()) return true

        const origenId = Number(trasladoSel.sucursal_origen_id || trasladoSel.sucursalOrigen?.id)
        const sucursalComboId = Number(sucursalSeleccionadaId)

        if (origenId === sucursalComboId) {
            return true
        }

        const usuarioSucId = Number(sucursalAsignadaUsuario)
        if (usuarioSucId && origenId !== usuarioSucId) {
            toast.error('Acceso denegado: Solo puedes despachar traslados cuya sucursal de origen sea la tuya asignada.')
            return false
        }

        return true
    }

    const confirmarDespachoFinal = async () => {
        if (!trasladoSel) return
        if (!validarPermisoDespacho()) return

        if (hayDiscrepancias && !motivoDiscrepancia.trim()) {
            toast.error('Has modificado cantidades. Debes indicar un motivo o justificacion obligatoria.')
            return
        }

        setDespachando(true)
        try {
            // 1. Enviamos el traslado tal cual está en papel (objeto vacío para evitar el error 400)
            await inventarioService.despacharTraslado(trasladoSel.id, {})

            // 2. Ejecutamos la lógica maestra original: Mandar las discrepancias a la parte de Mermas
            for (const d of detallesSel) {
                const solicitado = safeNumber(d.cantidad_despachada ?? d.cantidad)
                const enCarga = cantidadesEnviadas[d.id] !== undefined ? safeNumber(cantidadesEnviadas[d.id]) : solicitado

                if (enCarga < solicitado) {
                    const faltante = solicitado - enCarga

                    // Se crea la Merma en la sucursal de DESTINO. Así cuando ellos reciban (y el sistema
                    // les sume el total del documento), esta merma les ajustará el inventario a la realidad,
                    // y les aparecerá en su página de Mermas en la pestaña "Por Resolver (Traslados)".
                    await inventarioService.registrarMerma({
                        sucursal_id: trasladoSel.sucursal_destino_id || trasladoSel.sucursalDestino?.id,
                        variante_id: d.variante_id || d.variante?.id,
                        cantidad: faltante,
                        motivo: `FALTANTE EN TRASLADO ${trasladoSel.numero}: ${motivoDiscrepancia.trim()}`
                    })
                }
            }

            toast.success(`Despacho confirmado correctamente para ${trasladoSel.numero || `#${trasladoSel.id}`}`)
            setModalVerificacionAbierto(false)
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Truck className="text-primary" /> Despachos y Verificacion de Carga
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Control de salida fisica y conteo de mercaderia por sucursal
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-card border rounded-lg px-3.5 py-2 shadow-sm">
                        <Building2 size={16} className="text-primary" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Sucursal de Operacion</span>
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-5 flex flex-col gap-3">
                    <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Solicitudes Pendientes de Salida</h2>
                    {cargando ? (
                        <div className="py-12 text-center text-muted-foreground border rounded-xl bg-card text-xs">Cargando...</div>
                    ) : traslados.length === 0 ? (
                        <div className="py-12 text-center border rounded-xl bg-card text-muted-foreground text-xs">
                            No hay solicitudes pendientes de despacho en esta sucursal.
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
                                        <span className="font-bold text-sm text-foreground">{t.numero || `Solicitud #${t.id}`}</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200">
                                            PENDIENTE
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

                <div className="md:col-span-7">
                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                        {trasladoSel ? (
                            <>
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div>
                                        <h3 className="font-bold text-base text-foreground">
                                            Revision de {trasladoSel.numero || `Solicitud #${trasladoSel.id}`}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Origen: <strong className="text-foreground">{getOrigen(trasladoSel)}</strong> ➔ Destino: <strong className="text-foreground">{getDestino(trasladoSel)}</strong>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (validarPermisoDespacho()) setModalVerificacionAbierto(true)
                                        }}
                                        disabled={detallesSel.length === 0}
                                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        <ShieldCheck size={16} /> Verificar Carga y Despachar
                                    </button>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                                        <Package size={14} /> Items solicitados en origen:
                                    </h4>
                                    {cargandoDetalle ? (
                                        <div className="py-8 text-center text-muted-foreground text-xs">Cargando items...</div>
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
                                                    {detallesSel.map((d) => (
                                                        <tr key={d.id} className="hover:bg-muted/20">
                                                            <td className="px-3 py-2 font-mono text-xs font-medium">{d.variante?.sku ?? d.sku ?? 'N/A'}</td>
                                                            <td className="px-3 py-2 font-medium">{d.variante?.producto?.nombre ?? d.producto_nombre ?? 'Producto'}</td>
                                                            <td className="px-3 py-2 text-center font-bold text-xs">{safeNumber(d.cantidad_despachada)} u.</td>
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
                                Selecciona una solicitud pendiente para verificar y despachar.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {modalVerificacionAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <ShieldCheck size={18} className="text-primary" /> Conteo Fisico y Verificacion de Carga
                            </h2>
                            <button onClick={() => setModalVerificacionAbierto(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="bg-amber-500/10 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start gap-2">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                                <div>
                                    <strong>Atencion Bodega:</strong> Verifique fisicamente cada producto. Si despacha una cantidad distinta a la solicitada, el sistema la ingresara como Merma por resolver en la sucursal de destino.
                                </div>
                            </div>

                            <div className="border rounded-lg p-3 space-y-1 bg-muted/20">
                                <div><strong>Documento:</strong> {trasladoSel?.numero}</div>
                                <div><strong>Origen:</strong> {getOrigen(trasladoSel)} | <strong>Destino:</strong> {getDestino(trasladoSel)}</div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-foreground mb-2">Detalle de productos a verificar:</h4>
                                <div className="border rounded-lg overflow-hidden divide-y">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/50 text-[11px] font-medium text-muted-foreground border-b">
                                            <tr>
                                                <th className="px-3 py-2">Producto / SKU</th>
                                                <th className="px-3 py-2 text-center">Cant. Solicitada</th>
                                                <th className="px-3 py-2 text-center">Cant. en Carga (Fisica)</th>
                                                <th className="px-3 py-2 text-center">Estado / Alerta</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {detallesSel.map((d) => {
                                                const sku = d.variante?.sku ?? d.sku ?? 'N/A'
                                                const prodNombre = d.variante?.producto?.nombre ?? d.producto_nombre ?? 'Producto'
                                                const solicitado = safeNumber(d.cantidad_despachada)
                                                const enCarga = cantidadesEnviadas[d.id] !== undefined ? cantidadesEnviadas[d.id] : solicitado

                                                let badgeAlerta = <span className="text-emerald-600 font-medium">Exacto</span>
                                                if (enCarga < solicitado) {
                                                    badgeAlerta = <span className="text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200">Faltante (-{solicitado - enCarga})</span>
                                                } else if (enCarga > solicitado) {
                                                    badgeAlerta = <span className="text-blue-600 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200">Excedente (+{enCarga - solicitado})</span>
                                                }

                                                return (
                                                    <tr key={d.id} className="hover:bg-muted/20">
                                                        <td className="px-3 py-2">
                                                            <div className="font-semibold text-foreground">{prodNombre}</div>
                                                            <div className="text-[11px] font-mono text-muted-foreground">SKU: {sku}</div>
                                                        </td>
                                                        <td className="px-3 py-2 text-center font-bold text-muted-foreground">
                                                            {solicitado} u.
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={enCarga}
                                                                onChange={(e) => cambiarCantidadEnvio(d.id, e.target.value)}
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
                                        <AlertTriangle size={14} /> Motivo de discrepancia (Obligatorio por diferencia en carga):
                                    </label>
                                    <textarea
                                        value={motivoDiscrepancia}
                                        onChange={(e) => setMotivoDiscrepancia(e.target.value)}
                                        placeholder="Explique por que se esta enviando una cantidad distinta..."
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
                                onClick={confirmarDespachoFinal}
                                disabled={despachando || (hayDiscrepancias && !motivoDiscrepancia.trim())}
                                className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {despachando ? 'Registrando salida...' : 'Confirmar Salida Definitiva'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}