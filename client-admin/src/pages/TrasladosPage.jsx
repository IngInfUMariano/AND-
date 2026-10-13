import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Search,
    Calendar,
    RefreshCw,
    ArrowRightLeft,
    Building2,
    Eye,
    Truck,
    Ban,
    CheckCircle2,
    Plus,
    X,
    FileText,
    Package,
    AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { inventarioService } from '@/services/inventario.service'

const safeNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0
    const n = Number(val)
    return isNaN(n) ? 0 : n
}

const getOrigenNombre = (t) => {
    if (!t) return 'Origen N/A'
    const origen = t.sucursalOrigen?.nombre ?? t.sucursal_origen?.nombre ?? t.origen_nombre ?? t.origen
    if (!origen) return 'Origen N/A'
    if (typeof origen === 'object') return origen.nombre || 'Origen N/A'
    return String(origen)
}

const getDestinoNombre = (t) => {
    if (!t) return 'Destino N/A'
    const destino = t.sucursalDestino?.nombre ?? t.sucursal_destino?.nombre ?? t.destino_nombre ?? t.destino
    if (!destino) return 'Destino N/A'
    if (typeof destino === 'object') return destino.nombre || 'Destino N/A'
    return String(destino)
}

const getOrigenId = (t) => {
    if (!t) return ''
    return String(t.sucursal_origen_id ?? t.sucursalOrigen?.id ?? t.origen_id ?? '')
}

const getDestinoId = (t) => {
    if (!t) return ''
    return String(t.sucursal_destino_id ?? t.sucursalDestino?.id ?? t.destino_id ?? '')
}

const ELEMENTOS_POR_PAGINA = 10

export default function TrasladosPage() {
    const [traslados, setTraslados] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [existenciasOrigen, setExistenciasOrigen] = useState([])
    const [cargando, setCargando] = useState(true)

    // Filtros
    const [busqueda, setBusqueda] = useState('')
    const [filtroEstado, setFiltroEstado] = useState('TODOS')
    const [filtroSucursal, setFiltroSucursal] = useState('TODAS')
    const [filtroDireccion, setFiltroDireccion] = useState('AMBAS')
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')

    const [pagina, setPagina] = useState(1)

    // Modales
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
    const [guardandoCrear, setGuardandoCrear] = useState(false)

    // Modal de Detalle Profundo
    const [modalDetalle, setModalDetalle] = useState({ abierto: false, traslado: null, detalles: [], cargandoDetalle: false })

    // Modal de Anulación
    const [modalAnular, setModalAnular] = useState({ abierto: false, traslado: null, motivo: '' })
    const [anulando, setAnulando] = useState(false)

    // Formulario de Solicitud
    const [nuevoForm, setNuevoForm] = useState({
        sucursal_origen_id: '',
        sucursal_destino_id: '',
        observaciones: '',
        detalles: []
    })

    useEffect(() => {
        try {
            const userStored = localStorage.getItem('usuario') || localStorage.getItem('user')
            if (userStored) {
                const userObj = JSON.parse(userStored)
                const sucUser = userObj.sucursal_id || userObj.sucursal?.id
                if (sucUser) {
                    setFiltroSucursal(String(sucUser))
                    setNuevoForm((prev) => ({ ...prev, sucursal_destino_id: String(sucUser) }))
                }
            }
        } catch (err) {
            console.error('Error al detectar sucursal del usuario:', err)
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
            } catch (err) {
                console.error('Error al obtener sucursales:', err)
            }
        }
        cargarSucursales()
        return () => { activo = false }
    }, [])

    const cargarTraslados = useCallback(async () => {
        setCargando(true)
        try {
            const params = {
                sucursal_id: filtroSucursal !== 'TODAS' ? filtroSucursal : undefined,
                estado: filtroEstado !== 'TODOS' ? filtroEstado : undefined,
                q: busqueda || undefined
            }

            const res = await inventarioService.listarTraslados(params)

            let data = []
            if (Array.isArray(res)) data = res
            else if (Array.isArray(res?.rows)) data = res.rows
            else if (Array.isArray(res?.data)) data = res.data
            else if (Array.isArray(res?.datos)) data = res.datos
            else if (Array.isArray(res?.data?.rows)) data = res.data.rows

            setTraslados(Array.isArray(data) ? data : [])
            setPagina(1)
        } catch (err) {
            console.error('Error al cargar traslados:', err)
            toast.error('No se pudieron obtener los traslados')
            setTraslados([])
        } finally {
            setCargando(false)
        }
    }, [filtroSucursal, filtroEstado, busqueda])

    useEffect(() => {
        cargarTraslados()
    }, [cargarTraslados])

    const cargarExistenciasOrigen = useCallback(async (sucursalId) => {
        if (!sucursalId) {
            setExistenciasOrigen([])
            return
        }
        try {
            const res = await inventarioService.listar({ sucursal_id: sucursalId, limit: 1000 })
            const lista = Array.isArray(res) ? res : (res?.data || res?.datos || [])
            setExistenciasOrigen(lista)
        } catch (err) {
            console.error('Error al obtener existencias origen:', err)
            setExistenciasOrigen([])
        }
    }, [])

    useEffect(() => {
        if (nuevoForm.sucursal_origen_id) {
            cargarExistenciasOrigen(nuevoForm.sucursal_origen_id)
        }
    }, [nuevoForm.sucursal_origen_id, cargarExistenciasOrigen])

    const parseDDMMYYYYtoYYYYMMDD = (strDDMMYYYY) => {
        if (!strDDMMYYYY) return null
        const limpio = strDDMMYYYY.trim().split(',')[0]
        const partes = limpio.split('/')
        if (partes.length === 3) {
            const dia = partes[0].padStart(2, '0')
            const mes = partes[1].padStart(2, '0')
            let anio = partes[2].trim()
            if (anio.length === 2) anio = '20' + anio
            if (dia.length === 2 && mes.length === 2 && anio.length === 4) return `${anio}-${mes}-${dia}`
        }
        return null
    }

    const getFechaStandard = (fechaVal) => {
        if (!fechaVal) return ''
        const str = String(fechaVal).trim()
        if (str.includes('/')) return parseDDMMYYYYtoYYYYMMDD(str) || ''
        const d = new Date(str)
        if (!isNaN(d.getTime())) {
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }
        return ''
    }

    const handleFechaInput = (valor, setter) => {
        const numeros = valor.replace(/\D/g, '')
        let formateado = ''
        if (numeros.length > 0) {
            formateado = numeros.substring(0, 2)
            if (numeros.length > 2) {
                formateado += '/' + numeros.substring(2, 4)
                if (numeros.length > 4) formateado += '/' + numeros.substring(4, 8)
            }
        }
        setter(formateado)
        setPagina(1)
    }

    const resetFiltros = () => {
        setBusqueda('')
        setFiltroEstado('TODOS')
        setFiltroSucursal('TODAS')
        setFiltroDireccion('AMBAS')
        setFechaDesde('')
        setFechaHasta('')
        setPagina(1)
    }

    const abrirDetalleTraslado = async (traslado) => {
        setModalDetalle({ abierto: true, traslado, detalles: [], cargandoDetalle: true })
        try {
            const res = await inventarioService.listarTrasladoDetalles({ traslado_id: traslado.id })
            let lista = []
            if (Array.isArray(res)) lista = res
            else if (Array.isArray(res?.rows)) lista = res.rows
            else if (Array.isArray(res?.data)) lista = res.data

            setModalDetalle((prev) => ({ ...prev, detalles: lista, cargandoDetalle: false }))
        } catch (err) {
            console.error('Error al cargar detalles del traslado:', err)
            toast.error('No se pudieron obtener los productos de este traslado')
            setModalDetalle((prev) => ({ ...prev, cargandoDetalle: false }))
        }
    }

    const abrirModalAnular = (traslado) => {
        setModalAnular({ abierto: true, traslado, motivo: '' })
    }

    const ejecutarAnulacion = async (e) => {
        e.preventDefault()
        if (!modalAnular.traslado) return
        if (!modalAnular.motivo.trim()) {
            toast.error('Debe indicar un motivo de anulación')
            return
        }

        setAnulando(true)
        try {
            // Llamada directa al endpoint POST /api/traslados/:id/anular
            await inventarioService.anularTraslado(modalAnular.traslado.id, {
                observaciones: modalAnular.motivo
            })

            toast.success('Traslado anulado correctamente')
            setModalAnular({ abierto: false, traslado: null, motivo: '' })

            // Recargar la lista completa desde el servidor para reflejar el estado ANULADO
            await cargarTraslados()
        } catch (err) {
            console.error('Error al anular traslado:', err)
            toast.error(err.response?.data?.error?.mensaje || 'Error al anular el traslado')
        } finally {
            setAnulando(false)
        }
    }

    const trasladosFiltrados = useMemo(() => {
        if (!Array.isArray(traslados)) return []

        const desdeStandard = parseDDMMYYYYtoYYYYMMDD(fechaDesde)
        const hastaStandard = parseDDMMYYYYtoYYYYMMDD(fechaHasta)

        return traslados.filter((t) => {
            if (!t) return false

            const origenId = getOrigenId(t)
            const destinoId = getDestinoId(t)

            if (filtroSucursal !== 'TODAS') {
                const isOrigen = origenId === String(filtroSucursal)
                const isDestino = destinoId === String(filtroSucursal)

                if (!isOrigen && !isDestino) return false
                if (filtroDireccion === 'ENTRADAS' && !isDestino) return false
                if (filtroDireccion === 'SALIDAS' && !isOrigen) return false
            }

            const fechaRef = getFechaStandard(t.fecha_despacho || t.createdAt || t.created_at)
            if (fechaRef) {
                if (desdeStandard && fechaRef < desdeStandard) return false
                if (hastaStandard && fechaRef > hastaStandard) return false
            }

            return true
        })
    }, [traslados, filtroSucursal, filtroDireccion, fechaDesde, fechaHasta])

    const totalPaginas = Math.max(1, Math.ceil(trasladosFiltrados.length / ELEMENTOS_POR_PAGINA))
    const trasladosPaginados = useMemo(() => {
        const inicio = (pagina - 1) * ELEMENTOS_POR_PAGINA
        return trasladosFiltrados.slice(inicio, inicio + ELEMENTOS_POR_PAGINA)
    }, [trasladosFiltrados, pagina])

    const formatFecha = (str) => {
        if (!str) return '-'
        const d = new Date(str)
        if (isNaN(d.getTime())) return str
        return d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

    const agregarItemForm = (item) => {
        if (!item) return
        const varId = item.variante_id || item.variante?.id || item.id
        if (!varId) return

        const existe = nuevoForm.detalles.find((d) => String(d.variante_id) === String(varId))
        if (existe) {
            toast.error('Este producto ya está en la solicitud')
            return
        }

        const stockDisp = safeNumber(item.cantidad_fisica ?? item.stock_actual ?? item.stock)
        const sku = item.variante?.sku ?? item.sku ?? 'N/A'
        const prodNombre = item.variante?.producto?.nombre ?? item.producto_nombre ?? item.nombre ?? 'Producto'

        setNuevoForm((prev) => ({
            ...prev,
            detalles: [...prev.detalles, { variante_id: varId, cantidad: 1, sku, producto_nombre: prodNombre, stock_disponible: stockDisp }]
        }))
    }

    const cambiarCantidadItem = (varId, cant) => {
        const val = Math.max(1, Number(cant) || 1)
        setNuevoForm((prev) => ({
            ...prev,
            detalles: prev.detalles.map((d) => (String(d.variante_id) === String(varId) ? { ...d, cantidad: val } : d))
        }))
    }

    const removerItemForm = (varId) => {
        setNuevoForm((prev) => ({
            ...prev,
            detalles: prev.detalles.filter((d) => String(d.variante_id) !== String(varId))
        }))
    }

    const handleCrearSolicitud = async (e) => {
        e.preventDefault()

        if (!nuevoForm.sucursal_origen_id || !nuevoForm.sucursal_destino_id) {
            toast.error('Selecciona sucursal de origen y destino')
            return
        }

        if (String(nuevoForm.sucursal_origen_id) === String(nuevoForm.sucursal_destino_id)) {
            toast.error('La sucursal de origen y destino deben ser distintas')
            return
        }

        if (nuevoForm.detalles.length === 0) {
            toast.error('Agrega al menos un producto a la solicitud')
            return
        }

        setGuardandoCrear(true)
        try {
            const payload = {
                sucursal_origen_id: Number(nuevoForm.sucursal_origen_id),
                sucursal_destino_id: Number(nuevoForm.sucursal_destino_id),
                observaciones: nuevoForm.observaciones || null,
                detalles: nuevoForm.detalles.map((d) => ({
                    variante_id: Number(d.variante_id),
                    cantidad: Number(d.cantidad)
                }))
            }

            await inventarioService.crearTraslado(payload)
            toast.success('Solicitud de traslado creada con éxito. Pendiente de despacho.')
            setModalCrearAbierto(false)
            setNuevoForm((prev) => ({ ...prev, observaciones: '', detalles: [] }))
            cargarTraslados()
        } catch (err) {
            console.error('Error al solicitar traslado:', err)
            toast.error(err.response?.data?.error?.mensaje || 'Error al procesar la solicitud')
        } finally {
            setGuardandoCrear(false)
        }
    }

    const renderEstado = (estado) => {
        const est = String(estado || '').toUpperCase()
        switch (est) {
            case 'PENDIENTE':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 border border-amber-200">
                        Pendiente
                    </span>
                )
            case 'EN_TRANSITO':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 border border-blue-200">
                        <Truck size={13} /> En Tránsito
                    </span>
                )
            case 'RECIBIDO':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 border border-emerald-200">
                        <CheckCircle2 size={13} /> Recibido
                    </span>
                )
            case 'ANULADO':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-600 border border-rose-200">
                        <Ban size={13} /> Anulado
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {est}
                    </span>
                )
        }
    }

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto" translate="no">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <ArrowRightLeft className="text-primary" />
                        Solicitudes y Gestión de Traslados
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Registro de solicitudes entre sucursales y consulta de estado
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setModalCrearAbierto(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
                    >
                        <Plus size={15} /> Solicitar Traslado
                    </button>
                    <button
                        onClick={cargarTraslados}
                        disabled={cargando}
                        className="p-2 rounded-lg border bg-card hover:bg-muted text-muted-foreground disabled:opacity-50"
                        title="Actualizar"
                    >
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                    <div className="relative lg:col-span-3">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar correlativo..."
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
                            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="lg:col-span-3">
                        <div className="relative">
                            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <select
                                value={filtroSucursal}
                                onChange={(e) => { setFiltroSucursal(e.target.value); setPagina(1) }}
                                className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="TODAS">Todas las Sucursales</option>
                                {sucursales.map((s) => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <select
                            value={filtroDireccion}
                            onChange={(e) => { setFiltroDireccion(e.target.value); setPagina(1) }}
                            disabled={filtroSucursal === 'TODAS'}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        >
                            <option value="AMBAS">Entradas y Salidas</option>
                            <option value="ENTRADAS">Solo Entradas (Destino)</option>
                            <option value="SALIDAS">Solo Salidas (Origen)</option>
                        </select>
                    </div>

                    <div className="lg:col-span-2">
                        <select
                            value={filtroEstado}
                            onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1) }}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="TODOS">Todos los Estados</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="EN_TRANSITO">En Tránsito</option>
                            <option value="RECIBIDO">Recibido</option>
                            <option value="ANULADO">Anulado</option>
                        </select>
                    </div>

                    <div className="lg:col-span-2 flex items-center gap-1.5 bg-muted/40 border rounded-lg px-2.5 py-1">
                        <Calendar size={14} className="text-muted-foreground shrink-0" />
                        <input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            value={fechaDesde}
                            onChange={(e) => handleFechaInput(e.target.value, setFechaDesde)}
                            maxLength={10}
                            className="w-full bg-transparent text-center text-xs outline-none"
                        />
                        <span className="text-muted-foreground text-xs">-</span>
                        <input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            value={fechaHasta}
                            onChange={(e) => handleFechaInput(e.target.value, setFechaHasta)}
                            maxLength={10}
                            className="w-full bg-transparent text-center text-xs outline-none"
                        />
                        <button onClick={resetFiltros} className="p-1 text-muted-foreground hover:text-foreground" title="Limpiar filtros">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/60 border-b text-xs font-medium text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Correlativo / Número</th>
                                <th className="px-4 py-3">Ruta del Traslado</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3">Fecha Despacho</th>
                                <th className="px-4 py-3">Fecha Recepción</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {cargando ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-primary" />
                                        Cargando traslados...
                                    </td>
                                </tr>
                            ) : trasladosPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                        <ArrowRightLeft size={32} className="mx-auto mb-2 opacity-40" />
                                        No se encontraron traslados.
                                    </td>
                                </tr>
                            ) : (
                                trasladosPaginados.map((t) => {
                                    const origen = getOrigenNombre(t)
                                    const destino = getDestinoNombre(t)
                                    const est = String(t.estado || '').toUpperCase()
                                    const puedeAnular = est === 'PENDIENTE' || est === 'EN_TRANSITO'

                                    return (
                                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="font-semibold text-xs text-foreground">
                                                    {t.numero || t.correlativo || `TR-${t.id}`}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-medium px-2 py-0.5 rounded-md bg-muted/50 border truncate max-w-[140px]" title={origen}>
                                                        {origen}
                                                    </span>
                                                    <ArrowRightLeft size={12} className="text-muted-foreground shrink-0" />
                                                    <span className="font-medium px-2 py-0.5 rounded-md bg-muted/50 border truncate max-w-[140px]" title={destino}>
                                                        {destino}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                {renderEstado(t.estado)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                                                {formatFecha(t.fecha_despacho || t.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                                                {t.fecha_recepcion ? formatFecha(t.fecha_recepcion) : <span className="text-muted-foreground/50">Pendiente</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => abrirDetalleTraslado(t)}
                                                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                        title="Ver Productos y Detalle"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {puedeAnular && (
                                                        <button
                                                            onClick={() => abrirModalAnular(t)}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                                                            title="Anular Traslado"
                                                        >
                                                            <Ban size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3 bg-muted/20 text-xs text-muted-foreground">
                    <div>
                        Mostrando <span className="font-medium text-foreground">{trasladosFiltrados.length > 0 ? (pagina - 1) * ELEMENTOS_POR_PAGINA + 1 : 0} - {Math.min(pagina * ELEMENTOS_POR_PAGINA, trasladosFiltrados.length)}</span> de{' '}
                        <span className="font-medium text-foreground">{trasladosFiltrados.length}</span> traslados
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                            disabled={pagina === 1 || cargando}
                            className="rounded-md border bg-card px-2.5 py-1 font-medium text-foreground hover:bg-muted disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <span className="px-2">
                            Página <span className="font-semibold text-foreground">{pagina}</span> de <span className="font-semibold text-foreground">{totalPaginas}</span>
                        </span>
                        <button
                            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                            disabled={pagina >= totalPaginas || cargando}
                            className="rounded-md border bg-card px-2.5 py-1 font-medium text-foreground hover:bg-muted disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal: Anular Traslado */}
            {modalAnular.abierto && modalAnular.traslado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2 text-rose-600">
                                <Ban size={18} /> Anular Traslado: {modalAnular.traslado.numero}
                            </h2>
                            <button onClick={() => setModalAnular({ abierto: false, traslado: null, motivo: '' })} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={ejecutarAnulacion} className="p-5 space-y-4 text-xs">
                            <div className="bg-rose-500/10 border border-rose-200 text-rose-800 p-3 rounded-lg flex items-start gap-2">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                                <div>
                                    <strong>¡Acción irreversible!</strong> Si el traslado ya estaba en tránsito (con stock descontado en origen), la anulación devolverá automáticamente las existencias a la bodega de origen.
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-foreground mb-1">Motivo o justificación de anulación (Obligatorio):</label>
                                <textarea
                                    value={modalAnular.motivo}
                                    onChange={(e) => setModalAnular({ ...modalAnular, motivo: e.target.value })}
                                    placeholder="Indique el motivo de la anulación..."
                                    className="w-full rounded-lg border bg-background p-2 text-xs outline-none focus:ring-2 focus:ring-rose-500 h-20"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setModalAnular({ abierto: false, traslado: null, motivo: '' })}
                                    className="rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={anulando || !modalAnular.motivo.trim()}
                                    className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                                >
                                    {anulando ? 'Anulando...' : 'Confirmar Anulación'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Solicitar Traslado */}
            {modalCrearAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                                <Truck size={18} className="text-primary" /> Crear Solicitud de Traslado
                            </h2>
                            <button onClick={() => setModalCrearAbierto(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCrearSolicitud} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">Sucursal Origen (A quien solicitas)</label>
                                    <select
                                        value={nuevoForm.sucursal_origen_id}
                                        onChange={(e) => setNuevoForm({ ...nuevoForm, sucursal_origen_id: e.target.value, detalles: [] })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        <option value="">Selecciona origen</option>
                                        {sucursales.map((s) => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">Sucursal Destino (Tu sucursal)</label>
                                    <select
                                        value={nuevoForm.sucursal_destino_id}
                                        onChange={(e) => setNuevoForm({ ...nuevoForm, sucursal_destino_id: e.target.value })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        <option value="">Selecciona destino</option>
                                        {sucursales.map((s) => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {nuevoForm.sucursal_origen_id && (
                                <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
                                    <label className="block font-semibold text-foreground">Seleccionar producto disponible en Origen:</label>
                                    <select
                                        onChange={(e) => {
                                            const item = existenciasOrigen.find((ex) => String(ex.id || ex.variante_id) === e.target.value)
                                            if (item) agregarItemForm(item)
                                            e.target.value = ''
                                        }}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Buscar en stock de origen...</option>
                                        {existenciasOrigen.map((ex) => {
                                            const st = safeNumber(ex.cantidad_fisica ?? ex.stock_actual ?? ex.stock)
                                            const prod = ex.variante?.producto?.nombre ?? ex.producto_nombre ?? 'Producto'
                                            const sku = ex.variante?.sku ?? ex.sku ?? 'N/A'
                                            return (
                                                <option key={ex.id || ex.variante_id} value={ex.id || ex.variante_id} disabled={st <= 0}>
                                                    {prod} ({sku}) - Disponible: {st} u.
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block font-semibold text-foreground">Productos a solicitar:</label>
                                {nuevoForm.detalles.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground">
                                        No has agregado ningún ítem a la solicitud.
                                    </div>
                                ) : (
                                    <div className="border rounded-lg overflow-hidden divide-y bg-card">
                                        {nuevoForm.detalles.map((d) => (
                                            <div key={d.variante_id} className="p-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="font-semibold text-foreground">{d.producto_nombre}</div>
                                                    <div className="text-[11px] font-mono text-muted-foreground">SKU: {d.sku} • Disponible en origen: {d.stock_disponible} u.</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={d.stock_disponible || 9999}
                                                        value={d.cantidad}
                                                        onChange={(e) => cambiarCantidadItem(d.variante_id, e.target.value)}
                                                        className="w-16 rounded border bg-background px-2 py-1 text-center font-bold outline-none"
                                                    />
                                                    <button type="button" onClick={() => removerItemForm(d.variante_id)} className="text-destructive p-1 hover:bg-destructive/10 rounded">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block font-medium text-muted-foreground mb-1">Observaciones / Motivo</label>
                                <textarea
                                    value={nuevoForm.observaciones}
                                    onChange={(e) => setNuevoForm({ ...nuevoForm, observaciones: e.target.value })}
                                    placeholder="Justificación de la solicitud de traslado..."
                                    className="w-full rounded-lg border bg-background p-2 outline-none focus:ring-2 focus:ring-ring h-16"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setModalCrearAbierto(false)}
                                    className="rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={guardandoCrear}
                                    className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {guardandoCrear ? 'Guardando...' : 'Enviar Solicitud'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalle Profundo */}
            {modalDetalle.abierto && modalDetalle.traslado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                                <FileText size={18} className="text-primary" />
                                Detalle de Traslado: {modalDetalle.traslado.numero || modalDetalle.traslado.correlativo || `TR-${modalDetalle.traslado.id}`}
                            </h2>
                            <button onClick={() => setModalDetalle({ abierto: false, traslado: null, detalles: [] })} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3 border-b pb-3">
                                <div>
                                    <span className="text-muted-foreground block">Origen:</span>
                                    <span className="font-semibold text-foreground">{getOrigenNombre(modalDetalle.traslado)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Destino:</span>
                                    <span className="font-semibold text-foreground">{getDestinoNombre(modalDetalle.traslado)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Estado:</span>
                                    {renderEstado(modalDetalle.traslado.estado)}
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Fecha Despacho:</span>
                                    <span className="font-medium text-foreground">{formatFecha(modalDetalle.traslado.fecha_despacho || modalDetalle.traslado.createdAt)}</span>
                                </div>
                            </div>

                            {modalDetalle.traslado.observaciones && (
                                <div className="bg-muted/30 p-2.5 rounded-lg border">
                                    <span className="font-semibold block text-foreground mb-0.5">Observaciones:</span>
                                    <p className="text-muted-foreground">{modalDetalle.traslado.observaciones}</p>
                                </div>
                            )}

                            <div>
                                <h3 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                                    <Package size={15} /> Productos en este traslado:
                                </h3>
                                {modalDetalle.cargandoDetalle ? (
                                    <div className="py-8 text-center text-muted-foreground">
                                        <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                                        Cargando renglones del traslado...
                                    </div>
                                ) : modalDetalle.detalles.length === 0 ? (
                                    <div className="py-6 text-center border border-dashed rounded-lg text-muted-foreground">
                                        Sin ítems registrados en el detalle.
                                    </div>
                                ) : (
                                    <div className="border rounded-lg overflow-hidden divide-y">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted/50 text-[11px] font-medium text-muted-foreground border-b">
                                                <tr>
                                                    <th className="px-3 py-2">SKU</th>
                                                    <th className="px-3 py-2">Producto / Variante</th>
                                                    <th className="px-3 py-2 text-center">Cant. Solicitada / Despachada</th>
                                                    <th className="px-3 py-2 text-center">Cant. Recibida</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {modalDetalle.detalles.map((det) => {
                                                    const sku = det.variante?.sku ?? det.sku ?? 'N/A'
                                                    const prodNombre = det.variante?.producto?.nombre ?? det.producto_nombre ?? 'Producto'
                                                    const talla = det.variante?.talla?.codigo || ''
                                                    const color = det.variante?.color?.nombre || ''
                                                    const atributos = [talla, color].filter(Boolean).join(' / ')

                                                    return (
                                                        <tr key={det.id} className="hover:bg-muted/20">
                                                            <td className="px-3 py-2 font-mono text-[11px] font-medium">{sku}</td>
                                                            <td className="px-3 py-2">
                                                                <div className="font-medium">{prodNombre}</div>
                                                                {atributos && <div className="text-[10px] text-muted-foreground">{atributos}</div>}
                                                            </td>
                                                            <td className="px-3 py-2 text-center font-bold text-xs">{det.cantidad_despachada ?? det.cantidad ?? 0} u.</td>
                                                            <td className="px-3 py-2 text-center font-bold text-xs">
                                                                {det.cantidad_recibida !== null && det.cantidad_recibida !== undefined ? `${det.cantidad_recibida} u.` : '-'}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border-t px-5 py-3 bg-muted/20 text-right">
                            <button
                                onClick={() => setModalDetalle({ abierto: false, traslado: null, detalles: [] })}
                                className="rounded-lg border bg-card px-4 py-1.5 font-medium hover:bg-muted text-xs"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}