import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Search,
    Calendar,
    RefreshCw,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowRightLeft,
    SlidersHorizontal,
    Package,
    AlertTriangle,
    Building2,
    Download,
    ChevronLeft,
    ChevronRight,
    FilterX
} from 'lucide-react'
import toast from 'react-hot-toast'
import { inventarioService } from '@/services/inventario.service'
import { sucursalService } from '@/services/sucursal.service' // Ajustar según tu servicio de sucursales

export default function MovimientosPage() {
    const [cargando, setCargando] = useState(false)
    const [movimientos, setMovimientos] = useState([])
    const [sucursales, setSucursales] = useState([])

    // Filtros
    const [busqueda, setBusqueda] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('TODOS')
    const [filtroSucursal, setFiltroSucursal] = useState('TODAS')
    const [fechaDesde, setFechaDesde] = useState('') // Formato texto DD/MM/AAAA
    const [fechaHasta, setFechaHasta] = useState('') // Formato texto DD/MM/AAAA

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1)
    const itemsPorPagina = 15

    // Cargar Sucursales
    useEffect(() => {
        const cargarSucursales = async () => {
            try {
                const res = await sucursalService?.obtenerTodas?.() || await sucursalService?.listar?.()
                if (Array.isArray(res)) setSucursales(res)
                else if (Array.isArray(res?.data)) setSucursales(res.data)
            } catch (error) {
                console.error('Error al cargar sucursales:', error)
            }
        }
        cargarSucursales()
    }, [])

    // Cargar Movimientos General
    const cargarMovimientos = useCallback(async () => {
        setCargando(true)
        try {
            const params = {
                sucursal_id: filtroSucursal !== 'TODAS' ? filtroSucursal : undefined
            }

            const res = await inventarioService.listarMovimientos?.(params) || await inventarioService.obtenerKardex?.(params)

            let data = []
            if (Array.isArray(res)) data = res
            else if (Array.isArray(res?.data)) data = res.data
            else if (Array.isArray(res?.datos)) data = res.datos

            setMovimientos(data)
        } catch (err) {
            console.error('Error al cargar movimientos de kardex:', err)
            toast.error('No se pudo obtener el historial general de movimientos')
        } finally {
            setCargando(false)
        }
    }, [filtroSucursal])

    useEffect(() => {
        cargarMovimientos()
    }, [cargarMovimientos])

    // --- MANEJO ESTRICTO DE FECHAS (DD/MM/AAAA) ---
    const parseDDMMYYYYtoYYYYMMDD = (strDDMMYYYY) => {
        if (!strDDMMYYYY) return null
        const limpio = strDDMMYYYY.trim().split(',')[0]
        const partes = limpio.split('/')

        if (partes.length === 3) {
            const dia = partes[0].padStart(2, '0')
            const mes = partes[1].padStart(2, '0')
            let anio = partes[2].trim()

            if (anio.length === 2) anio = '20' + anio
            if (dia.length === 2 && mes.length === 2 && anio.length === 4) {
                return `${anio}-${mes}-${dia}`
            }
        }
        return null
    }

    const getMovimientoDateYYYYMMDD = (fechaVal) => {
        if (!fechaVal) return ''
        const str = String(fechaVal).trim()

        if (str.includes('/')) {
            return parseDDMMYYYYtoYYYYMMDD(str) || ''
        }

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
                if (numeros.length > 4) {
                    formateado += '/' + numeros.substring(4, 8)
                }
            }
        }
        setter(formateado)
        setPaginaActual(1)
    }

    const resetFiltros = () => {
        setBusqueda('')
        setFiltroTipo('TODOS')
        setFiltroSucursal('TODAS')
        setFechaDesde('')
        setFechaHasta('')
        setPaginaActual(1)
    }

    // --- FILTRADO MULTICRITERIO ---
    const movimientosFiltrados = useMemo(() => {
        const desdeStandard = parseDDMMYYYYtoYYYYMMDD(fechaDesde)
        const hastaStandard = parseDDMMYYYYtoYYYYMMDD(fechaHasta)
        const term = busqueda.toLowerCase().trim()

        return movimientos.filter((m) => {
            const tipo = String(m.tipo_movimiento || m.tipo || '').toUpperCase()
            const motivo = String(m.motivo || m.concepto || m.descripcion || '').toUpperCase()
            const productoNombre = String(m.producto?.nombre || m.producto_nombre || m.variante?.producto?.nombre || '').toLowerCase()
            const sku = String(m.variante?.sku || m.sku || m.codigo || '').toLowerCase()
            const usuario = String(m.usuario?.nombre || m.usuario_nombre || m.creado_por || '').toLowerCase()
            const ref = String(m.documento_referencia || m.referencia || '').toLowerCase()

            // 1. Buscador de texto general
            if (term) {
                const matchTermino =
                    productoNombre.includes(term) ||
                    sku.includes(term) ||
                    motivo.toLowerCase().includes(term) ||
                    usuario.includes(term) ||
                    ref.includes(term)
                if (!matchTermino) return false
            }

            // 2. Filtro de Tipo de Movimiento
            if (filtroTipo !== 'TODOS') {
                if (filtroTipo === 'ENTRADA') {
                    if (!tipo.includes('ENTRADA') && !tipo.includes('COMPRA') && !tipo.includes('RECEPCION')) return false
                } else if (filtroTipo === 'ENTRADA_COMPRA') {
                    if (tipo !== 'ENTRADA_COMPRA' && !(tipo.includes('ENTRADA') && tipo.includes('COMPRA'))) return false
                } else if (filtroTipo === 'SALIDA') {
                    if (!tipo.includes('SALIDA') && !tipo.includes('VENTA') && !tipo.includes('DESPACHO')) return false
                } else if (filtroTipo === 'SALIDA_VENTA') {
                    if (tipo !== 'SALIDA_VENTA' && !(tipo.includes('SALIDA') && tipo.includes('VENTA'))) return false
                } else if (filtroTipo === 'TRASLADO') {
                    if (!tipo.includes('TRASLADO') && !tipo.includes('DESPACHO') && !tipo.includes('RECEPCION')) return false
                } else if (filtroTipo === 'AJUSTE') {
                    if (!tipo.includes('AJUSTE') && !tipo.includes('MERMA')) return false
                } else if (filtroTipo === 'MERMA') {
                    if (!tipo.includes('MERMA') && !motivo.includes('MERMA')) return false
                }
            }

            // 3. Filtro por Sucursal
            if (filtroSucursal !== 'TODAS') {
                const sucId = String(m.sucursal_id || m.sucursal?.id || '')
                if (sucId !== String(filtroSucursal)) return false
            }

            // 4. Filtro por Fecha Estricto DD/MM/AAAA
            const movFechaStandard = getMovimientoDateYYYYMMDD(m.createdAt || m.created_at || m.fecha)
            if (movFechaStandard) {
                if (desdeStandard && movFechaStandard < desdeStandard) return false
                if (hastaStandard && movFechaStandard > hastaStandard) return false
            }

            return true
        })
    }, [movimientos, busqueda, filtroTipo, filtroSucursal, fechaDesde, fechaHasta])

    // Paginación lógica
    const totalPaginas = Math.ceil(movimientosFiltrados.length / itemsPorPagina) || 1
    const movimientosPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * itemsPorPagina
        return movimientosFiltrados.slice(inicio, inicio + itemsPorPagina)
    }, [movimientosFiltrados, paginaActual])

    // Resumen de Métricas
    const resumen = useMemo(() => {
        return movimientosFiltrados.reduce(
            (acc, m) => {
                const cant = Number(m.cantidad || m.cant || 0)
                const tipo = String(m.tipo_movimiento || m.tipo || '').toUpperCase()

                if (tipo.includes('ENTRADA') || tipo === 'COMPRA' || tipo === 'AJUSTE_POSITIVO') {
                    acc.entradas += Math.abs(cant)
                } else if (tipo.includes('SALIDA') || tipo === 'VENTA' || tipo === 'AJUSTE_NEGATIVO') {
                    acc.salidas += Math.abs(cant)
                } else if (tipo.includes('TRASLADO')) {
                    acc.traslados += 1
                }
                return acc
            },
            { entradas: 0, salidas: 0, traslados: 0 }
        )
    }, [movimientosFiltrados])

    // Exportar a CSV básico
    const exportarCSV = () => {
        if (movimientosFiltrados.length === 0) {
            toast.error('No hay datos para exportar')
            return
        }

        const headers = ['Fecha', 'Tipo', 'Producto', 'SKU', 'Sucursal', 'Motivo', 'Cantidad', 'Saldo Resultante', 'Usuario']
        const rows = movimientosFiltrados.map((m) => [
            formatFecha(m.createdAt || m.created_at || m.fecha),
            m.tipo_movimiento || m.tipo || '',
            `"${m.producto?.nombre || m.producto_nombre || 'Producto'}"`,
            m.variante?.sku || m.sku || '',
            `"${m.sucursal?.nombre || m.sucursal_nombre || ''}"`,
            `"${m.motivo || m.concepto || ''}"`,
            m.cantidad || 0,
            m.saldo_resultante ?? m.stock_resultante ?? '-',
            `"${m.usuario?.nombre || m.usuario_nombre || ''}"`
        ])

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `Kardex_General_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const formatFecha = (str) => {
        if (!str) return '-'
        if (typeof str === 'string' && str.includes('/')) return str
        const d = new Date(str)
        if (isNaN(d.getTime())) return str

        const dia = String(d.getDate()).padStart(2, '0')
        const mes = String(d.getMonth() + 1).padStart(2, '0')
        const anio = String(d.getFullYear()).slice(-2)
        const hora = d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })

        return `${dia}/${mes}/${anio}, ${hora}`
    }

    const renderBadgeTipo = (tipoRaw, motivoRaw) => {
        const tipo = String(tipoRaw || '').toUpperCase()
        const motivo = String(motivoRaw || '').toUpperCase()

        if (tipo === 'ENTRADA_COMPRA' || (tipo.includes('ENTRADA') && (tipo.includes('COMPRA') || motivo.includes('COMPRA')))) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                    <ArrowDownLeft size={13} /> Entrada (Compra)
                </span>
            )
        }

        if (tipo === 'SALIDA_VENTA' || (tipo.includes('SALIDA') && (tipo.includes('VENTA') || motivo.includes('VENTA')))) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                    <ArrowUpRight size={13} /> Salida (Venta)
                </span>
            )
        }

        if (tipo.includes('TRASLADO') || tipo.includes('DESPACHO') || tipo.includes('RECEPCION')) {
            const esEntrada = tipo.includes('ENTRADA') || tipo.includes('RECEPCION')
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                    <ArrowRightLeft size={13} /> {esEntrada ? 'Entrada (Traslado)' : 'Salida (Traslado)'}
                </span>
            )
        }

        if (tipo.includes('MERMA') || motivo.includes('MERMA')) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-600">
                    <AlertTriangle size={13} /> Merma
                </span>
            )
        }

        if (tipo.includes('ENTRADA')) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                    <ArrowDownLeft size={13} /> Entrada
                </span>
            )
        }

        if (tipo.includes('SALIDA')) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                    <ArrowUpRight size={13} /> Salida
                </span>
            )
        }

        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                <SlidersHorizontal size={13} /> Ajuste
            </span>
        )
    }

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto">
            {/* Encabezado Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Movimientos / Kardex General</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Historial unificado e auditoría de Entradas, Salidas, Traslados y Ajustes de Inventario.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportarCSV}
                        className="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
                    >
                        <Download size={15} /> Exportar
                    </button>
                    <button
                        onClick={cargarMovimientos}
                        disabled={cargando}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Actualizar
                    </button>
                </div>
            </div>

            {/* Tarjetas de Resumen KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Total Entradas</span>
                        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                            <ArrowDownLeft size={18} />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-emerald-600">+{resumen.entradas}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">Unidades ingresadas en el periodo</p>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Total Salidas</span>
                        <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                            <ArrowUpRight size={18} />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-destructive">-{resumen.salidas}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">Unidades egresadas por venta/merma</p>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Traslados Realizados</span>
                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                            <ArrowRightLeft size={18} />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-blue-600">{resumen.traslados}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">Movimientos entre bodegas</p>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Registros Filtrados</span>
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Package size={18} />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground">{movimientosFiltrados.length}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">De un total de {movimientos.length} registros</p>
                </div>
            </div>

            {/* Barra de Filtros Completa */}
            <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                    {/* Búsqueda por texto */}
                    <div className="relative lg:col-span-4">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar producto, SKU, motivo, ref, usuario..."
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value)
                                setPaginaActual(1)
                            }}
                            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Filtro Tipo */}
                    <div className="lg:col-span-2">
                        <select
                            value={filtroTipo}
                            onChange={(e) => {
                                setFiltroTipo(e.target.value)
                                setPaginaActual(1)
                            }}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="TODOS">Todos los tipos</option>
                            <option value="ENTRADA">Entradas (Todas)</option>
                            <option value="ENTRADA_COMPRA">Entrada (Compra)</option>
                            <option value="SALIDA">Salidas (Todas)</option>
                            <option value="SALIDA_VENTA">Salida (Venta)</option>
                            <option value="TRASLADO">Traslados</option>
                            <option value="AJUSTE">Ajustes</option>
                            <option value="MERMA">Mermas</option>
                        </select>
                    </div>

                    {/* Filtro Sucursal */}
                    <div className="lg:col-span-2">
                        <div className="relative">
                            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <select
                                value={filtroSucursal}
                                onChange={(e) => {
                                    setFiltroSucursal(e.target.value)
                                    setPaginaActual(1)
                                }}
                                className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="TODAS">Todas las Sucursales</option>
                                {sucursales.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Rango de Fechas dd/mm/aaaa */}
                    <div className="lg:col-span-3 flex items-center gap-1.5 bg-muted/40 border rounded-lg px-2.5 py-1">
                        <Calendar size={14} className="text-muted-foreground shrink-0" />
                        <input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            value={fechaDesde}
                            onChange={(e) => handleFechaInput(e.target.value, setFechaDesde)}
                            maxLength={10}
                            className="w-full bg-transparent text-center text-xs outline-none placeholder:text-muted-foreground/70"
                        />
                        <span className="text-muted-foreground text-xs">-</span>
                        <input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            value={fechaHasta}
                            onChange={(e) => handleFechaInput(e.target.value, setFechaHasta)}
                            maxLength={10}
                            className="w-full bg-transparent text-center text-xs outline-none placeholder:text-muted-foreground/70"
                        />
                    </div>

                    {/* Limpiar Filtros */}
                    <div className="lg:col-span-1 flex justify-end">
                        <button
                            onClick={resetFiltros}
                            className="p-2 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Limpiar todos los filtros"
                        >
                            <FilterX size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/60 border-b text-xs font-medium text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Fecha / Hora</th>
                                <th className="px-4 py-3">Sucursal</th>
                                <th className="px-4 py-3">Producto / Variante</th>
                                <th className="px-4 py-3">Tipo / Motivo</th>
                                <th className="px-4 py-3">Concepto / Referencia</th>
                                <th className="px-4 py-3 text-center">Cantidad</th>
                                <th className="px-4 py-3 text-center">Stock Resultante</th>
                                <th className="px-4 py-3 text-right">Usuario</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {cargando ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-primary" />
                                        Cargando movimientos de inventario...
                                    </td>
                                </tr>
                            ) : movimientosPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                                        <Package size={32} className="mx-auto mb-2 opacity-40" />
                                        No se encontraron registros de movimientos con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                movimientosPaginados.map((m, i) => {
                                    const tipo = String(m.tipo_movimiento || m.tipo || '').toUpperCase()
                                    const esEntrada = tipo.includes('ENTRADA') || tipo === 'COMPRA'
                                    const esSalida = tipo.includes('SALIDA') || tipo === 'VENTA'

                                    return (
                                        <tr key={m.id || i} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-foreground">
                                                {formatFecha(m.createdAt || m.created_at || m.fecha)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Building2 size={13} className="text-muted-foreground/70" />
                                                    {m.sucursal?.nombre || m.sucursal_nombre || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-xs text-foreground">
                                                    {m.producto?.nombre || m.producto_nombre || m.variante?.producto?.nombre || 'Producto'}
                                                </div>
                                                <div className="text-[11px] font-mono text-muted-foreground">
                                                    SKU: {m.variante?.sku || m.sku || m.codigo || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {renderBadgeTipo(tipo, m.motivo || m.concepto)}
                                            </td>
                                            <td className="px-4 py-3 max-w-xs">
                                                <div className="font-medium text-xs text-foreground truncate" title={m.motivo || m.concepto}>
                                                    {m.motivo || m.concepto || m.descripcion || 'Sin detalle'}
                                                </div>
                                                {m.documento_referencia && (
                                                    <div className="text-[11px] font-mono text-muted-foreground">
                                                        Ref: {m.documento_referencia}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-xs whitespace-nowrap">
                                                <span className={esEntrada ? 'text-emerald-600' : esSalida ? 'text-destructive' : ''}>
                                                    {esEntrada ? '+' : esSalida ? '-' : ''}{m.cantidad || m.cant || 0} u.
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-xs font-semibold">
                                                {m.saldo_resultante ?? m.stock_resultante ?? m.saldo ?? m.stock_nuevo ?? '-'} u.
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                                                {m.usuario?.nombre || m.usuario_nombre || m.creado_por || 'Sistema'}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Paginador */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3 bg-muted/20 text-xs text-muted-foreground">
                    <div>
                        Mostrando <span className="font-medium text-foreground">{movimientosPaginados.length}</span> de{' '}
                        <span className="font-medium text-foreground">{movimientosFiltrados.length}</span> resultados
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                            disabled={paginaActual === 1}
                            className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1 font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                        >
                            <ChevronLeft size={14} /> Anterior
                        </button>
                        <span className="px-2">
                            Página <span className="font-semibold text-foreground">{paginaActual}</span> de{' '}
                            <span className="font-semibold text-foreground">{totalPaginas}</span>
                        </span>
                        <button
                            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                            disabled={paginaActual === totalPaginas}
                            className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1 font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                        >
                            Siguiente <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}