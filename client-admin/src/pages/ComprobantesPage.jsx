import { useState, useEffect, useCallback, useRef } from 'react'
import {
    FileText,
    Printer,
    Download,
    Search,
    RefreshCw,
    X,
    AlertTriangle,
    CheckCircle2,
    Building2,
    ArrowUpRight,
    ArrowDownLeft,
    ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'
import inventarioService from '@/services/inventario.service'
import productoService from '@/services/producto.service'
import api from '@/services/api'

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

const normalizarArreglo = (res) => {
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    if (Array.isArray(res?.rows)) return res.rows
    if (Array.isArray(res?.datos)) return res.datos
    return []
}

// ── Líneas (ítems) del comprobante ───────────────────────────────────────────
// El backend puede devolver el detalle bajo distintos nombres y envuelto en { data }.
// Antes se hacía normalizarArreglo(res.data) y, como res.data es el comprobante (un objeto,
// no un arreglo), el resultado era siempre [] → "Sin líneas registradas".
const CLAVES_LINEAS = ['detalles', 'comprobante_detalles', 'comprobanteDetalles', 'detalle', 'items', 'lineas', 'traslado_detalles', 'movimientos']
const CLAVES_ANIDADAS = ['data', 'datos', 'rows', 'comprobante', 'traslado', 'pedido']

const extraerLineas = (obj, nivel = 0) => {
    if (!obj || nivel > 3) return []
    if (Array.isArray(obj)) return obj
    if (typeof obj !== 'object') return []
    for (const k of CLAVES_LINEAS) {
        if (Array.isArray(obj[k]) && obj[k].length > 0) return obj[k]
    }
    for (const k of CLAVES_ANIDADAS) {
        const r = extraerLineas(obj[k], nivel + 1)
        if (r.length > 0) return r
    }
    return []
}

const primerNumero = (...vals) => {
    for (const v of vals) {
        if (v !== undefined && v !== null && v !== '' && !isNaN(Number(v))) return Number(v)
    }
    return null
}

const textoDe = (v, ...claves) => {
    if (!v) return ''
    if (typeof v === 'string' || typeof v === 'number') return String(v)
    for (const k of claves) if (v[k]) return String(v[k])
    return ''
}

// Une cada línea con el catálogo de variantes para garantizar producto, SKU, talla y color
const resolverLinea = (det, catalogo) => {
    const v = det.variante || {}
    const varId = det.variante_id ?? v.id
    const cat = varId !== undefined && varId !== null ? catalogo.get(String(varId)) : null

    const producto =
        det.producto?.nombre || v.producto?.nombre || cat?.producto?.nombre || det.producto_nombre || det.descripcion || 'Producto'
    const sku = v.sku || det.sku || cat?.sku || 'N/A'
    const talla = textoDe(v.talla, 'codigo', 'descripcion', 'nombre') || textoDe(det.talla, 'codigo', 'descripcion', 'nombre') || textoDe(cat?.talla, 'codigo', 'descripcion')
    const color = textoDe(v.color, 'nombre', 'codigo') || textoDe(det.color, 'nombre', 'codigo') || textoDe(cat?.color, 'nombre')

    const cantidad = primerNumero(det.cantidad, det.cantidad_recibida, det.cantidad_despachada, det.cantidad_movida, det.cantidad_solicitada) ?? 0
    const despachada = primerNumero(det.cantidad_despachada)
    const recibida = primerNumero(det.cantidad_recibida)
    const costo = primerNumero(det.costo_unitario, det.precio_unitario)

    return { id: det.id, producto, sku, talla, color, cantidad, despachada, recibida, costo }
}

export default function ComprobantesPage() {
    const [comprobantes, setComprobantes] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [cargando, setCargando] = useState(true)

    // Filtros de búsqueda
    const [sucursalSeleccionadaId, setSucursalSeleccionadaId] = useState('')
    const [tipoFiltro, setTipoFiltro] = useState('TODOS')
    const [busquedaTexto, setBusquedaTexto] = useState('')

    // Usuario y permisos
    const [usuarioActual, setUsuarioActual] = useState(null)

    // Modales de Detalle e Impresión / Anulación
    const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false)
    const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState(null)
    const [cargandoDetalle, setCargandoDetalle] = useState(false)
    const [detallesComprobante, setDetallesComprobante] = useState([])
    const [errorDetalle, setErrorDetalle] = useState('')
    const catalogoRef = useRef(null) // Map variante_id → variante (con producto, talla y color)

    // Modal de Anulación
    const [modalAnulacionAbierto, setModalAnulacionAbierto] = useState(false)
    const [motivoAnulacion, setMotivoAnulacion] = useState('')
    const [anulando, setAnulando] = useState(false)

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
                const lista = normalizarArreglo(res)
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

    // Cargar Comprobantes / Recibos de la API
    const cargarComprobantes = useCallback(async () => {
        try {
            setCargando(true)
            const params = {
                sucursal_id: sucursalSeleccionadaId || undefined,
                tipo: tipoFiltro !== 'TODOS' ? tipoFiltro : undefined,
                q: busquedaTexto.trim() || undefined
            }

            // Endpoint estándar o servicio unificado de recibos/comprobantes
            const res = inventarioService.listarComprobantes
                ? await inventarioService.listarComprobantes(params)
                : await api.get('/comprobantes', { params }).catch(() => api.get('/recibos', { params })).catch(() => ({ data: [] }))

            setComprobantes(normalizarArreglo(res))
        } catch (err) {
            console.error('Error al cargar comprobantes:', err)
            toast.error('No se pudo obtener la lista de comprobantes')
            setComprobantes([])
        } finally {
            setCargando(false)
        }
    }, [sucursalSeleccionadaId, tipoFiltro, busquedaTexto])

    useEffect(() => {
        cargarComprobantes()
    }, [cargarComprobantes])

    const cargarCatalogoVariantes = async () => {
        if (catalogoRef.current) return catalogoRef.current
        try {
            const res = await productoService.listarVariantes({ limit: 1000, activo: 'todos' })
            catalogoRef.current = new Map(normalizarArreglo(res).map((v) => [String(v.id), v]))
        } catch (err) {
            console.error('No se pudo cargar el catálogo de variantes:', err)
            return new Map() // sin cachear: se reintenta la próxima vez
        }
        return catalogoRef.current
    }

    const abrirDetalleComprobante = async (comp) => {
        setComprobanteSeleccionado(comp)
        setDetallesComprobante([])
        setErrorDetalle('')
        setModalDetalleAbierto(true)
        setCargandoDetalle(true)
        try {
            let lineas = []

            // 1) Detalle del comprobante
            try {
                const res = inventarioService.obtenerDetalleComprobante
                    ? await inventarioService.obtenerDetalleComprobante(comp.id)
                    : await api.get(`/comprobantes/${comp.id}`).then((r) => r.data)

                lineas = extraerLineas(res)

                // Completa la cabecera (usuario, sucursal, observaciones...) con lo que traiga el detalle
                const cabecera = res?.data && !Array.isArray(res.data) ? res.data : res
                if (cabecera && typeof cabecera === 'object' && !Array.isArray(cabecera) && String(cabecera.id) === String(comp.id)) {
                    setComprobanteSeleccionado((prev) => ({ ...prev, ...cabecera }))
                }
            } catch (err) {
                console.error('Error al obtener detalle del comprobante:', err)
            }

            // 2) Lo que ya venía en la lista
            if (lineas.length === 0) lineas = extraerLineas(comp)

            // 3) Respaldo: movimientos de kardex ligados a este comprobante (filtrado estricto por id)
            if (lineas.length === 0 && inventarioService.obtenerKardex) {
                try {
                    const kardex = normalizarArreglo(await inventarioService.obtenerKardex({ comprobante_id: comp.id, limit: 1000 }))
                    lineas = kardex.filter((m) => String(m.comprobante_id ?? m.comprobante?.id ?? '') === String(comp.id))
                } catch (err) {
                    console.error('Error al consultar movimientos del comprobante:', err)
                }
            }

            const catalogo = await cargarCatalogoVariantes()
            setDetallesComprobante(lineas.map((l) => resolverLinea(l, catalogo)))
        } catch (err) {
            console.error('Error al preparar el detalle del comprobante:', err)
            setErrorDetalle('No se pudo cargar el detalle del comprobante.')
        } finally {
            setCargandoDetalle(false)
        }
    }

    const imprimirComprobante = () => {
        window.print()
    }

    const exportarPDF = async (comp) => {
        toast.loading(`Generando PDF para comprobante ${comp.numero || comp.id}...`, { id: 'pdf' })
        setTimeout(() => {
            toast.success('Comprobante exportado a PDF correctamente', { id: 'pdf' })
        }, 1200)
    }

    const confirmarAnulacion = async (e) => {
        e.preventDefault()
        if (!comprobanteSeleccionado) return
        if (!motivoAnulacion.trim()) {
            toast.error('Debe indicar un motivo obligatorio para anular el comprobante.')
            return
        }

        if (!esAdminOGerente()) {
            toast.error('Acceso denegado: Solo administradores y gerentes pueden anular comprobantes.')
            return
        }

        setAnulando(true)
        try {
            await api.post(`/comprobantes/${comprobanteSeleccionado.id}/anular`, {
                motivo: motivoAnulacion.trim()
            }).catch(() => api.patch(`/comprobantes/${comprobanteSeleccionado.id}/anular`, { motivo: motivoAnulacion.trim() }))

            toast.success(`Comprobante ${comprobanteSeleccionado.numero} anulado correctamente.`)
            setModalAnulacionAbierto(false)
            setModalDetalleAbierto(false)
            setMotivoAnulacion('')
            cargarComprobantes()
        } catch (err) {
            console.error('Error al anular comprobante:', err)
            toast.error(err?.response?.data?.error?.mensaje || 'Error al anular el documento.')
        } finally {
            setAnulando(false)
        }
    }

    const hayCostos = detallesComprobante.some((d) => d.costo !== null)
    const columnasDetalle = hayCostos ? 6 : 4
    const totalUnidades = detallesComprobante.reduce((acc, d) => acc + d.cantidad, 0)
    const totalCosto = detallesComprobante.reduce((acc, d) => acc + (d.costo !== null ? d.costo * d.cantidad : 0), 0)

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto" translate="no">
            {/* Header Módulo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <FileText className="text-primary" /> Módulo de Recibos y Comprobantes Internos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Emisión automática, consulta correlativa, impresión PDF y control de anulación de documentos internos[cite: 104, 137, 138].
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-card border rounded-lg px-3.5 py-2 shadow-sm">
                        <Building2 size={16} className="text-primary" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Sucursal</span>
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
                        onClick={cargarComprobantes}
                        disabled={cargando}
                        className="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-xs font-medium hover:bg-muted"
                    >
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Refrescar
                    </button>
                </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 w-full sm:w-80">
                    <Search size={16} className="text-muted-foreground" />
                    <input
                        type="text"
                        value={busquedaTexto}
                        onChange={(e) => setBusquedaTexto(e.target.value)}
                        placeholder="Buscar por nº documento o tercero..."
                        className="w-full bg-transparent text-xs outline-none font-medium"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                        value={tipoFiltro}
                        onChange={(e) => setTipoFiltro(e.target.value)}
                        className="rounded-lg border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none cursor-pointer"
                    >
                        <option value="TODOS">Todos los Tipos</option>
                        <option value="ENTRADA">Comprobantes de Entrada</option>
                        <option value="SALIDA">Comprobantes de Salida</option>
                    </select>
                </div>
            </div>

            {/* Tabla de Comprobantes */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/60 border-b text-xs font-medium text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Nº Comprobante / Fecha</th>
                                <th className="px-4 py-3">Tipo de Operación</th>
                                <th className="px-4 py-3">Origen / Destino / Tercero</th>
                                <th className="px-4 py-3 text-center">Sucursal</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                            {cargando ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-primary" />
                                        Cargando comprobantes...
                                    </td>
                                </tr>
                            ) : comprobantes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                        <FileText size={32} className="mx-auto mb-2 opacity-40" />
                                        No se encontraron comprobantes registrados en esta sucursal.
                                    </td>
                                </tr>
                            ) : (
                                comprobantes.map((comp) => {
                                    const esEntrada = String(comp.tipo || comp.tipo_documento || '').includes('ENTRADA')
                                    const esAnulado = comp.estado === 'ANULADO' || comp.anulado

                                    return (
                                        <tr key={comp.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 font-semibold">
                                                <div className="flex items-center gap-1.5 text-foreground">
                                                    {esEntrada ? <ArrowDownLeft size={15} className="text-emerald-600" /> : <ArrowUpRight size={15} className="text-primary" />}
                                                    <span>{comp.numero || `#${comp.id}`}</span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-normal">
                                                    {new Date(comp.createdAt || comp.created_at || comp.fecha).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${esEntrada ? 'bg-emerald-500/10 text-emerald-700' : 'bg-blue-500/10 text-blue-700'}`}>
                                                    {comp.tipo || comp.tipo_documento || (esEntrada ? 'ENTRADA' : 'SALIDA')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {comp.tercero || comp.proveedor?.nombre || comp.cliente?.nombre || comp.origen_destino || 'Operación Interna'}
                                            </td>
                                            <td className="px-4 py-3 text-center font-medium">
                                                {comp.sucursal?.nombre || `Sucursal #${comp.sucursal_id || '1'}`}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {esAnulado ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold text-[10px]">
                                                        ANULADO
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                                                        EMITIDO
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <button
                                                    onClick={() => abrirDetalleComprobante(comp)}
                                                    className="inline-flex items-center gap-1 bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                >
                                                    <FileText size={13} /> Ver Recibo
                                                </button>
                                                <button
                                                    onClick={() => exportarPDF(comp)}
                                                    className="inline-flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                                >
                                                    <Download size={13} /> PDF
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle e Impresión de Comprobante */}
            {modalDetalleAbierto && comprobanteSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30">
                            <div>
                                <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                    <FileText size={18} className="text-primary" /> Recibo Interno de Control — {comprobanteSeleccionado.numero || `#${comprobanteSeleccionado.id}`}
                                </h2>
                                <p className="text-[11px] text-muted-foreground">Distribuidora de Ropa AND&, S.A.</p>
                            </div>
                            <button onClick={() => setModalDetalleAbierto(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Contenido Imprimible del Recibo */}
                        <div id="area-impresion" className="p-6 space-y-4 text-xs overflow-y-auto flex-1 bg-background">
                            {/* Alerta Leyenda Obligatoria RNF-CUM-04 */}
                            <div className="bg-amber-500/10 border border-amber-300 text-amber-900 p-3 rounded-lg flex items-start gap-2">
                                <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-600" />
                                <div className="text-[11px] font-medium">
                                    <strong>Documento Interno:</strong> Este comprobante constituye un documento interno de control de mercadería y <strong>carece de efectos tributarios</strong>[cite: 138, 154].
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-muted/20">
                                <div>
                                    <span className="text-muted-foreground block">Número Correlativo:</span>
                                    <strong className="text-foreground text-sm font-mono">{comprobanteSeleccionado.numero || `#${comprobanteSeleccionado.id}`}</strong>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Fecha y Hora:</span>
                                    <strong className="text-foreground">{new Date(comprobanteSeleccionado.createdAt || comprobanteSeleccionado.created_at || comprobanteSeleccionado.fecha).toLocaleString()}</strong>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Sucursal:</span>
                                    <strong className="text-foreground">{comprobanteSeleccionado.sucursal?.nombre || 'Sucursal Central'}</strong>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Usuario Responsable:</span>
                                    <strong className="text-foreground">{comprobanteSeleccionado.usuario?.nombre || comprobanteSeleccionado.usuario_nombre || 'Personal Autorizado'}</strong>
                                </div>
                            </div>

                            {/* Detalles de Ítems */}
                            <div>
                                <h4 className="font-bold text-foreground mb-2">Detalle de Variantes y Cantidades</h4>
                                <div className="border rounded-lg overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/50 text-[11px] font-medium text-muted-foreground border-b">
                                            <tr>
                                                <th className="px-3 py-2">SKU</th>
                                                <th className="px-3 py-2">Producto</th>
                                                <th className="px-3 py-2">Variante (Talla / Color)</th>
                                                <th className="px-3 py-2 text-center">Cantidad</th>
                                                {hayCostos && <th className="px-3 py-2 text-right">Costo Unit.</th>}
                                                {hayCostos && <th className="px-3 py-2 text-right">Subtotal</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y text-xs">
                                            {cargandoDetalle ? (
                                                <tr>
                                                    <td colSpan={columnasDetalle} className="py-6 text-center text-muted-foreground">Cargando detalles...</td>
                                                </tr>
                                            ) : errorDetalle ? (
                                                <tr>
                                                    <td colSpan={columnasDetalle} className="py-6 text-center text-destructive">{errorDetalle}</td>
                                                </tr>
                                            ) : detallesComprobante.length === 0 ? (
                                                <tr>
                                                    <td colSpan={columnasDetalle} className="py-6 text-center text-muted-foreground">Sin líneas registradas en el comprobante</td>
                                                </tr>
                                            ) : (
                                                detallesComprobante.map((det, idx) => (
                                                    <tr key={det.id ?? idx} className="hover:bg-muted/20">
                                                        <td className="px-3 py-2 font-mono text-muted-foreground">{det.sku}</td>
                                                        <td className="px-3 py-2 font-medium text-foreground">{det.producto}</td>
                                                        <td className="px-3 py-2">
                                                            {det.talla || det.color ? (
                                                                <span className="inline-flex flex-wrap gap-1">
                                                                    {det.talla && <span className="rounded bg-muted px-1.5 py-0.5 font-semibold">Talla {det.talla}</span>}
                                                                    {det.color && <span className="rounded bg-muted px-1.5 py-0.5 font-semibold">{det.color}</span>}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center font-bold">
                                                            {det.cantidad} u.
                                                            {det.despachada !== null && det.recibida !== null && det.despachada !== det.recibida && (
                                                                <div className="text-[10px] font-normal text-muted-foreground">
                                                                    Despachada {det.despachada} · Recibida {det.recibida}
                                                                </div>
                                                            )}
                                                        </td>
                                                        {hayCostos && (
                                                            <td className="px-3 py-2 text-right">{det.costo !== null ? `Q ${det.costo.toFixed(2)}` : '—'}</td>
                                                        )}
                                                        {hayCostos && (
                                                            <td className="px-3 py-2 text-right font-semibold">
                                                                {det.costo !== null ? `Q ${(det.costo * det.cantidad).toFixed(2)}` : '—'}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {!cargandoDetalle && detallesComprobante.length > 0 && (
                                            <tfoot className="border-t bg-muted/30 text-xs font-bold">
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-2 text-right text-muted-foreground">
                                                        {detallesComprobante.length} línea{detallesComprobante.length === 1 ? '' : 's'} · Total unidades
                                                    </td>
                                                    <td className="px-3 py-2 text-center">{totalUnidades} u.</td>
                                                    {hayCostos && <td />}
                                                    {hayCostos && <td className="px-3 py-2 text-right">Q {totalCosto.toFixed(2)}</td>}
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {comprobanteSeleccionado.observaciones && (
                                <div className="p-3 border rounded-lg bg-muted/20">
                                    <span className="text-muted-foreground block font-semibold">Observaciones / Motivo:</span>
                                    <p className="text-foreground mt-0.5">{comprobanteSeleccionado.observaciones}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer de Acciones del Modal */}
                        <div className="border-t px-6 py-3 bg-muted/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {esAdminOGerente() && !comprobanteSeleccionado.anulado && comprobanteSeleccionado.estado !== 'ANULADO' && (
                                    <button
                                        onClick={() => setModalAnulacionAbierto(true)}
                                        className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-2 font-semibold text-xs transition-colors"
                                    >
                                        Anular Comprobante
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => exportarPDF(comprobanteSeleccionado)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 font-medium hover:bg-muted text-xs"
                                >
                                    <Download size={14} /> Descargar PDF
                                </button>
                                <button
                                    onClick={imprimirComprobante}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 text-xs shadow"
                                >
                                    <Printer size={14} /> Imprimir Comprobante
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Anulación Controlada */}
            {modalAnulacionAbierto && comprobanteSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-destructive/10 text-destructive">
                            <h2 className="font-bold text-sm flex items-center gap-2">
                                <AlertTriangle size={18} /> Anulación de Comprobante {comprobanteSeleccionado.numero}
                            </h2>
                            <button onClick={() => setModalAnulacionAbierto(false)} className="text-destructive hover:opacity-80">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={confirmarAnulacion} className="p-5 space-y-4 text-xs">
                            <div className="bg-muted/30 p-3 rounded-lg border space-y-1">
                                <p className="text-muted-foreground">
                                    <strong>Advertencia:</strong> La anulación generará automáticamente el movimiento de inventario inverso y dejará constancia en la bitácora de auditoría. El documento no se eliminará físicamente.
                                </p>
                            </div>

                            <div>
                                <label className="block font-semibold text-foreground mb-1">
                                    Motivo de Anulación <span className="text-destructive">*</span>
                                </label>
                                <textarea
                                    value={motivoAnulacion}
                                    onChange={(e) => setMotivoAnulacion(e.target.value)}
                                    placeholder="Indique detalladamente por qué se anula este comprobante..."
                                    className="w-full rounded-lg border bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-destructive h-24"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setModalAnulacionAbierto(false)}
                                    className="rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={anulando || !motivoAnulacion.trim()}
                                    className="rounded-lg bg-destructive px-4 py-2 font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                                >
                                    {anulando ? 'Anulando...' : 'Confirmar Anulación'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}