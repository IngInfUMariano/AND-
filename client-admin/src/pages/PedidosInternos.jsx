import { useState, useEffect, useCallback } from 'react'
import {
    Package,
    Truck,
    RefreshCw,
    X,
    ClipboardCheck,
    Building2,
    CheckCircle2,
    ArrowRightLeft,
    ShieldCheck,
    AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import inventarioService from '@/services/inventario.service'
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

export default function PedidosInternos() {
    // Pestaña activa: 'pedidos' | 'despachos'
    const [pestañaActiva, setPestañaActiva] = useState('pedidos')

    // Estados compartidos
    const [sucursales, setSucursales] = useState([])
    const [usuarioActual, setUsuarioActual] = useState(null)
    const [sucursalSeleccionadaId, setSucursalSeleccionadaId] = useState('')
    const [cargando, setCargando] = useState(true)

    // Estados para Módulo de Pedidos
    const [pedidos, setPedidos] = useState([])
    const [filtroEstadoPedido, setFiltroEstadoPedido] = useState('PAGADO')
    const [modalVerificar, setModalVerificar] = useState(false)
    const [modalDespacho, setModalDespacho] = useState(false)
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
    const [checklistItems, setChecklistItems] = useState({})
    const [datosDespacho, setDatosDespacho] = useState({
        transportista: 'Cargo Expreso',
        numero_guia: '',
        observaciones: ''
    })
    const [procesandoPedido, setProcesandoPedido] = useState(false)

    // Estados para Módulo de Despachos (Traslados)
    const [trasladosPendientes, setTrasladosPendientes] = useState([])
    const [trasladoSel, setTrasladoSel] = useState(null)
    const [detallesSel, setDetallesSel] = useState([])
    const [cargandoDetalle, setCargandoDetalle] = useState(false)
    const [despachandoTraslado, setDespachandoTraslado] = useState(false)
    const [modalVerificacionTraslado, setModalVerificacionTraslado] = useState(false)
    const [cantidadesEnviadas, setCantidadesEnviadas] = useState({})
    const [motivoDiscrepancia, setMotivoDiscrepancia] = useState('')

    // 1. Lectura de Sesión y Usuario
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

    // 2. Cargar Sucursales
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

    const sucursalAsignadaUsuario = usuarioActual?.sucursal_id || usuarioActual?.sucursal?.id
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

    // 3. Cargar Pedidos
    const cargarPedidos = useCallback(async () => {
        if (!sucursalSeleccionadaId) return
        try {
            setCargando(true)
            const params = {
                estado: filtroEstadoPedido !== 'TODOS' ? filtroEstadoPedido : undefined,
                sucursal_id: sucursalSeleccionadaId
            }
            const res = inventarioService.listarPedidos
                ? await inventarioService.listarPedidos(params)
                : await api.get('/pedidos', { params })

            setPedidos(normalizarArreglo(res))
        } catch (err) {
            console.error('Error al cargar pedidos:', err)
            toast.error('No se pudieron obtener los pedidos')
            setPedidos([])
        } finally {
            setCargando(false)
        }
    }, [filtroEstadoPedido, sucursalSeleccionadaId])

    // 4. Cargar Despachos (Traslados Pendientes de Origen)
    const cargarTrasladosDespacho = useCallback(async () => {
        if (!sucursalSeleccionadaId) return
        setCargando(true)
        try {
            const params = {
                estado: 'PENDIENTE',
                sucursal_origen_id: sucursalSeleccionadaId
            }
            const res = await inventarioService.listarTraslados(params)
            const lista = normalizarArreglo(res)
            setTrasladosPendientes(lista)

            if (lista.length > 0) {
                seleccionarTrasladoDespacho(lista[0])
            } else {
                setTrasladoSel(null)
                setDetallesSel([])
            }
        } catch (err) {
            console.error('Error al cargar despachos de traslados:', err)
            toast.error('Error al obtener lista de despachos pendientes')
        } finally {
            setCargando(false)
        }
    }, [sucursalSeleccionadaId])

    useEffect(() => {
        if (pestañaActiva === 'pedidos') {
            cargarPedidos()
        } else {
            cargarTrasladosDespacho()
        }
    }, [pestañaActiva, sucursalSeleccionadaId, filtroEstadoPedido, cargarPedidos, cargarTrasladosDespacho])

    // --- LÓGICA DE PEDIDOS ---
    const abrirModalVerificacion = async (pedido) => {
        setPedidoSeleccionado(pedido)
        if (String(pedido.estado || '').toUpperCase() === 'PAGADO') {
            try {
                await api.patch(`/pedidos/${pedido.id}/estado`, {
                    estado: 'EN_PREPARACION',
                    observacion: 'Iniciando empaque y verificación en bodega'
                })
                pedido.estado = 'EN_PREPARACION'
                cargarPedidos()
            } catch (err) {
                console.error('Error al cambiar a en preparación:', err)
                toast.error(err?.response?.data?.error?.mensaje || 'No se pudo iniciar la preparación.')
                return
            }
        }

        const mapa = {}
        const items = normalizarArreglo(pedido.pedido_detalles || pedido.detalles || pedido.items)
        items.forEach((item, idx) => {
            mapa[item.id || idx] = false
        })
        setChecklistItems(mapa)
        setModalVerificar(true)
    }

    const toggleCheckItem = (id) => {
        setChecklistItems(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const todosVerificados = () => {
        const valores = Object.values(checklistItems)
        return valores.length > 0 && valores.every(v => v === true)
    }

    const pasarADespachoDirecto = () => {
        if (!todosVerificados()) {
            toast.error('Debes verificar y marcar todos los ítems antes de proceder al despacho.')
            return
        }
        setModalVerificar(false)
        setDatosDespacho({ transportista: 'Cargo Expreso', numero_guia: '', observaciones: '' })
        setModalDespacho(true)
    }

    const confirmarDespachoConGuia = async (e) => {
        e.preventDefault()
        if (!pedidoSeleccionado) return

        if (!datosDespacho.numero_guia.trim()) {
            toast.error('El número de guía de envío es obligatorio para completar el despacho.')
            return
        }

        setProcesandoPedido(true)
        try {
            const pedidoId = pedidoSeleccionado.id
            const obsCompleta = `[${datosDespacho.transportista} - Guía: ${datosDespacho.numero_guia.trim()}] ${datosDespacho.observaciones.trim()}`.trim()

            await api.patch(`/pedidos/${pedidoId}/estado`, {
                estado: 'DESPACHADO',
                observacion: obsCompleta
            })

            toast.success(`Pedido #${pedidoSeleccionado.numero || pedidoId} despachado correctamente. Guía: ${datosDespacho.numero_guia}`)
            setModalDespacho(false)
            setPedidoSeleccionado(null)
            cargarPedidos()
        } catch (err) {
            console.error('Error al despachar:', err)
            toast.error(err?.response?.data?.error?.mensaje || 'Error al completar el despacho.')
        } finally {
            setProcesandoPedido(false)
        }
    }

    // --- LÓGICA DE DESPACHOS (TRASLADOS) ---
    const seleccionarTrasladoDespacho = async (t) => {
        setTrasladoSel(t)
        setCargandoDetalle(true)
        try {
            const res = await inventarioService.listarTrasladoDetalles({ traslado_id: t.id })
            const items = normalizarArreglo(res)
            setDetallesSel(items)

            const mapaCantidades = {}
            items.forEach((d) => {
                mapaCantidades[d.id] = safeNumber(d.cantidad_despachada ?? d.cantidad)
            })
            setCantidadesEnviadas(mapaCantidades)
            setMotivoDiscrepancia('')
        } catch (err) {
            console.error('Error al cargar items de traslado:', err)
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

    const hayDiscrepanciasTraslado = detallesSel.some((d) => {
        const solicitado = safeNumber(d.cantidad_despachada ?? d.cantidad)
        const enCarga = safeNumber(cantidadesEnviadas[d.id])
        return enCarga !== solicitado
    })

    const confirmarDespachoTrasladoFinal = async () => {
        if (!trasladoSel) return
        if (hayDiscrepanciasTraslado && !motivoDiscrepancia.trim()) {
            toast.error('Has modificado cantidades. Debes indicar un motivo o justificación obligatoria.')
            return
        }

        setDespachandoTraslado(true)
        try {
            await inventarioService.despacharTraslado(trasladoSel.id, {
                cantidades_enviadas: cantidadesEnviadas,
                observaciones_despacho: motivoDiscrepancia.trim() || null
            })
            toast.success(`Despacho confirmado para traslado ${trasladoSel.numero || `#${trasladoSel.id}`}`)
            setModalVerificacionTraslado(false)
            cargarTrasladosDespacho()
        } catch (err) {
            console.error('Error al despachar traslado:', err)
            toast.error(err.response?.data?.error?.mensaje || 'Error al procesar el despacho')
        } finally {
            setDespachandoTraslado(false)
        }
    }

    const getOrigenNombre = (t) => t?.sucursalOrigen?.nombre || t?.sucursal_origen?.nombre || 'Origen N/A'
    const getDestinoNombre = (t) => t?.sucursalDestino?.nombre || t?.sucursal_destino?.nombre || 'Destino N/A'

    const listaDetallesSeleccionados = normalizarArreglo(
        pedidoSeleccionado?.pedido_detalles || pedidoSeleccionado?.detalles || pedidoSeleccionado?.items
    )

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto" translate="no">
            {/* Header y Selector de Sucursal y Pestañas */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Truck className="text-primary" /> Módulo de Salidas y Despachos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Gestión unificada de salidas por pedidos de clientes (con guía) y despachos por traslados entre sucursales.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-card border rounded-lg px-3.5 py-2 shadow-sm">
                        <Building2 size={16} className="text-primary" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Sucursal de Operación</span>
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
                        onClick={() => pestañaActiva === 'pedidos' ? cargarPedidos() : cargarTrasladosDespacho()}
                        disabled={cargando}
                        className="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-xs font-medium hover:bg-muted"
                    >
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Refrescar
                    </button>
                </div>
            </div>

            {/* Sistema de Pestañas Superior */}
            <div className="flex border-b gap-4">
                <button
                    onClick={() => setPestañaActiva('pedidos')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${pestañaActiva === 'pedidos'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Package size={16} /> Salida de Pedidos (Clientes)
                </button>
                <button
                    onClick={() => setPestañaActiva('despachos')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${pestañaActiva === 'despachos'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <ArrowRightLeft size={16} /> Despachos de Traslados (Sucursales)
                </button>
            </div>

            {/* CONTENIDO PESTAÑA 1: PEDIDOS */}
            {pestañaActiva === 'pedidos' && (
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Listado de Pedidos</h2>
                        <select
                            value={filtroEstadoPedido}
                            onChange={(e) => setFiltroEstadoPedido(e.target.value)}
                            className="rounded-lg border bg-card px-3.5 py-2 text-xs font-bold text-foreground outline-none cursor-pointer"
                        >
                            <option value="TODOS">Todos los Estados</option>
                            <option value="REGISTRADO">Registrados</option>
                            <option value="PENDIENTE_PAGO">Pendientes de Pago</option>
                            <option value="PAGADO">Pagados / Listos para Empaque</option>
                            <option value="EN_PREPARACION">En Empaque / Bodega</option>
                            <option value="DESPACHADO">Despachados</option>
                        </select>
                    </div>

                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/60 border-b text-xs font-medium text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Nº Pedido / Fecha</th>
                                        <th className="px-4 py-3">Cliente</th>
                                        <th className="px-4 py-3">Canal / Tipo</th>
                                        <th className="px-4 py-3 text-center">Total</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                        <th className="px-4 py-3 text-right">Acciones de Salida / Empaque</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-xs">
                                    {cargando ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                                <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-primary" />
                                                Cargando pedidos...
                                            </td>
                                        </tr>
                                    ) : pedidos.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                                <Package size={32} className="mx-auto mb-2 opacity-40" />
                                                No hay pedidos en este estado para la sucursal seleccionada.
                                            </td>
                                        </tr>
                                    ) : (
                                        pedidos.map((p) => (
                                            <tr key={p.id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-semibold">
                                                    {p.numero || `#${p.id}`}
                                                    <div className="text-[10px] text-muted-foreground font-normal">
                                                        {new Date(p.createdAt || p.created_at || p.fecha).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {p.cliente?.nombre || 'Cliente General'}
                                                    <div className="text-[10px] text-muted-foreground">NIT: {p.cliente?.nit || 'C/F'}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-semibold">{p.canal || 'TIENDA'}</span> / <span className="text-muted-foreground">{p.tipo_cliente || 'MINORISTA'}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-foreground">
                                                    Q {safeNumber(p.total).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                                                        {p.estado}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {p.estado === 'PAGADO' || p.estado === 'EN_PREPARACION' ? (
                                                        <button
                                                            onClick={() => abrirModalVerificacion(p)}
                                                            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                                                        >
                                                            <ClipboardCheck size={14} /> Verificar Empaque y Guía
                                                        </button>
                                                    ) : (
                                                        <span className="text-muted-foreground font-medium text-[11px] flex items-center justify-end gap-1">
                                                            <CheckCircle2 size={13} className="text-emerald-600" /> Procesado / {p.estado}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENIDO PESTAÑA 2: DESPACHOS DE TRASLADOS */}
            {pestañaActiva === 'despachos' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-5 flex flex-col gap-3">
                        <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Solicitudes Pendientes de Salida</h2>
                        {cargando ? (
                            <div className="py-12 text-center text-muted-foreground border rounded-xl bg-card text-xs">Cargando...</div>
                        ) : trasladosPendientes.length === 0 ? (
                            <div className="py-12 text-center border rounded-xl bg-card text-muted-foreground text-xs">
                                No hay solicitudes de traslado pendientes de despacho en esta sucursal.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {trasladosPendientes.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => seleccionarTrasladoDespacho(t)}
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
                                            <span>Origen: <strong className="text-foreground">{getOrigenNombre(t)}</strong></span>
                                            <ArrowRightLeft size={12} />
                                            <span>Destino: <strong className="text-foreground">{getDestinoNombre(t)}</strong></span>
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
                                                Revisión de {trasladoSel.numero || `Solicitud #${trasladoSel.id}`}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                Origen: <strong className="text-foreground">{getOrigenNombre(trasladoSel)}</strong> ➔ Destino: <strong className="text-foreground">{getDestinoNombre(trasladoSel)}</strong>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setModalVerificacionTraslado(true)}
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
                                                                <td className="px-3 py-2 text-center font-bold text-xs">{safeNumber(d.cantidad_despachada ?? d.cantidad)} u.</td>
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
            )}

            {/* MODAL 1: VERIFICACIÓN DE EMPAQUE DE PEDIDOS */}
            {modalVerificar && pedidoSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <ClipboardCheck size={18} className="text-emerald-600" /> Verificación y Empaque (Bodega)
                            </h2>
                            <button onClick={() => setModalVerificar(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="bg-emerald-500/10 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs">
                                <strong>Pedido #{pedidoSeleccionado.numero || pedidoSeleccionado.id}</strong> — Revise y confirme cada producto antes de proceder con el envío.
                            </div>

                            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                                {listaDetallesSeleccionados.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-4">Sin detalles registrados</div>
                                ) : (
                                    listaDetallesSeleccionados.map((det, idx) => {
                                        const key = det.id || idx
                                        const prodNom = det.producto?.nombre || det.variante?.producto?.nombre || det.descripcion || `Producto ${idx + 1}`
                                        const cant = safeNumber(det.cantidad)

                                        return (
                                            <div
                                                key={key}
                                                onClick={() => toggleCheckItem(key)}
                                                className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${checklistItems[key] ? 'bg-emerald-500/10 border-emerald-500 font-bold' : 'bg-background hover:border-primary/50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!checklistItems[key]}
                                                        onChange={() => { }}
                                                        className="rounded border-muted-foreground"
                                                    />
                                                    <span>{prodNom}</span>
                                                </div>
                                                <span className="bg-muted px-2 py-0.5 rounded text-xs">{cant} u.</span>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                        <div className="border-t px-5 py-3 bg-muted/20 flex items-center justify-end gap-2">
                            <button onClick={() => setModalVerificar(false)} className="rounded-lg border px-4 py-2 font-medium hover:bg-muted">
                                Cancelar
                            </button>
                            <button
                                onClick={pasarADespachoDirecto}
                                disabled={!todosVerificados()}
                                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Siguiente: Registrar Número de Guía
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: REGISTRO DE GUÍA DE ENVÍO (PEDIDOS) */}
            {modalDespacho && pedidoSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <Truck size={18} className="text-primary" /> Registro de Guía y Salida — Pedido {pedidoSeleccionado.numero || `#${pedidoSeleccionado.id}`}
                            </h2>
                            <button onClick={() => setModalDespacho(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={confirmarDespachoConGuia} className="p-5 space-y-4 text-xs">
                            <div className="bg-muted/30 p-3 rounded-lg border space-y-1">
                                <div><strong>Cliente:</strong> {pedidoSeleccionado.cliente?.nombre || 'Consumidor Final'}</div>
                                <div><strong>Destino:</strong> {pedidoSeleccionado.entrega_direccion || 'Retiro en Sucursal'}</div>
                                <div><strong>Total:</strong> Q {safeNumber(pedidoSeleccionado.total).toFixed(2)}</div>
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Servicio de Encomienda / Transportista</label>
                                <select
                                    value={datosDespacho.transportista}
                                    onChange={(e) => setDatosDespacho({ ...datosDespacho, transportista: e.target.value })}
                                    className="w-full rounded-lg border bg-background px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="Cargo Expreso">Cargo Expreso</option>
                                    <option value="Forza Delivery">Forza Delivery</option>
                                    <option value="GuateEx">GuateEx</option>
                                    <option value="Expreso Guate">Expreso Guate</option>
                                    <option value="Entrega Local / Propia">Entrega Local / Propia</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-foreground mb-1">
                                    Número de Guía de Envío <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={datosDespacho.numero_guia}
                                    onChange={(e) => setDatosDespacho({ ...datosDespacho, numero_guia: e.target.value })}
                                    placeholder="Ej. CE-98432105 o FX-2026-89"
                                    className="w-full rounded-lg border bg-background px-3 py-2 font-mono font-bold text-foreground outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Observaciones de Despacho (Opcional)</label>
                                <textarea
                                    value={datosDespacho.observaciones}
                                    onChange={(e) => setDatosDespacho({ ...datosDespacho, observaciones: e.target.value })}
                                    placeholder="Notas adicionales..."
                                    className="w-full rounded-lg border bg-background p-2 outline-none focus:ring-2 focus:ring-ring h-16"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button type="button" onClick={() => setModalDespacho(false)} className="rounded-lg border px-4 py-2 font-medium hover:bg-muted">
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={procesandoPedido || !datosDespacho.numero_guia.trim()}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {procesandoPedido ? 'Procesando Salida...' : 'Confirmar Salida y Guardar Guía'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: VERIFICACIÓN FÍSICA Y CONTEO DE CARGA (TRASLADOS) */}
            {modalVerificacionTraslado && trasladoSel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <ShieldCheck size={18} className="text-primary" /> Conteo Físico y Verificación de Carga
                            </h2>
                            <button onClick={() => setModalVerificacionTraslado(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="bg-amber-500/10 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start gap-2">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                                <div>
                                    <strong>Atención Bodega:</strong> Verifique físicamente cada producto. Si despacha una cantidad distinta a la solicitada, deberá registrar una justificación.
                                </div>
                            </div>

                            <div className="border rounded-lg p-3 space-y-1 bg-muted/20">
                                <div><strong>Documento:</strong> {trasladoSel?.numero}</div>
                                <div><strong>Origen:</strong> {getOrigenNombre(trasladoSel)} | <strong>Destino:</strong> {getDestinoNombre(trasladoSel)}</div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-foreground mb-2">Detalle de productos a verificar:</h4>
                                <div className="border rounded-lg overflow-hidden divide-y">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/50 text-[11px] font-medium text-muted-foreground border-b">
                                            <tr>
                                                <th className="px-3 py-2">Producto / SKU</th>
                                                <th className="px-3 py-2 text-center">Cant. Solicitada</th>
                                                <th className="px-3 py-2 text-center">Cant. en Carga (Física)</th>
                                                <th className="px-3 py-2 text-center">Estado / Alerta</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {detallesSel.map((d) => {
                                                const sku = d.variante?.sku ?? d.sku ?? 'N/A'
                                                const prodNombre = d.variante?.producto?.nombre ?? d.producto_nombre ?? 'Producto'
                                                const solicitado = safeNumber(d.cantidad_despachada ?? d.cantidad)
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

                            {hayDiscrepanciasTraslado && (
                                <div className="border border-amber-300 bg-amber-500/5 p-3 rounded-lg space-y-1.5">
                                    <label className="block font-semibold text-amber-800 flex items-center gap-1">
                                        <AlertTriangle size={14} /> Motivo de discrepancia (Obligatorio por diferencia en carga):
                                    </label>
                                    <textarea
                                        value={motivoDiscrepancia}
                                        onChange={(e) => setMotivoDiscrepancia(e.target.value)}
                                        placeholder="Explique por qué se está enviando una cantidad distinta..."
                                        className="w-full rounded-lg border bg-background p-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 h-16"
                                        required
                                    />
                                </div>
                            )}
                        </div>
                        <div className="border-t px-5 py-3 bg-muted/20 flex items-center justify-end gap-2">
                            <button onClick={() => setModalVerificacionTraslado(false)} className="rounded-lg border px-4 py-2 font-medium hover:bg-muted">
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarDespachoTrasladoFinal}
                                disabled={despachandoTraslado || (hayDiscrepanciasTraslado && !motivoDiscrepancia.trim())}
                                className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {despachandoTraslado ? 'Registrando salida...' : 'Confirmar Salida Definitiva'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}