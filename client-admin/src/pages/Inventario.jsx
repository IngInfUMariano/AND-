import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Search,
    Package,
    AlertTriangle,
    XCircle,
    DollarSign,
    History,
    RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { inventarioService } from '@/services/inventario.service'

// Extractores alineados exactamente con la respuesta de la API
const safeNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0
    const n = Number(val)
    return isNaN(n) ? 0 : n
}

const getStock = (f) => {
    if (!f) return 0
    return safeNumber(
        f.cantidad_fisica ?? f.disponible ?? f.stock_actual ?? f.stock_fisico ?? f.stock
    )
}

const getStockMin = (f) => {
    if (!f) return 0
    return safeNumber(
        f.variante?.existencia_minima ?? f.existencia_minima ?? f.stock_minimo ?? f.stock_min ?? f.variante?.stock_minimo
    )
}

const getCosto = (f) => {
    if (!f) return 0
    return safeNumber(
        f.costo_promedio ?? f.costo_unitario ?? f.precio_costo ?? f.costo
    )
}

const getSku = (f) => {
    if (!f) return 'N/A'
    return f.variante?.sku ?? f.sku ?? 'N/A'
}

const getProductoNombre = (f) => {
    if (!f) return 'Producto'
    return f.variante?.producto?.nombre ?? f.producto_nombre ?? f.producto?.nombre ?? f.nombre ?? 'Producto'
}

const getAtributos = (f) => {
    if (!f) return ''
    const talla = f.variante?.talla?.codigo || f.variante?.talla?.nombre || f.talla || ''
    const color = f.variante?.color?.nombre || f.variante?.color?.codigo || f.color || ''

    const tallaStr = typeof talla === 'object' ? (talla?.codigo || talla?.nombre || '') : String(talla || '')
    const colorStr = typeof color === 'object' ? (color?.nombre || color?.codigo || '') : String(color || '')

    return [tallaStr, colorStr].filter(Boolean).join(' / ')
}

const getSucursalNombre = (f) => {
    if (!f) return 'General'
    const sucursal = f.sucursal?.nombre ?? f.sucursal_nombre ?? f.sucursal
    if (!sucursal) return 'General'
    if (typeof sucursal === 'object') return sucursal.nombre || 'General'
    return String(sucursal)
}

const ELEMENTOS_POR_PAGINA = 10

export default function Inventario() {
    const navigate = useNavigate()

    // Estado de Datos
    const [filasRaw, setFilasRaw] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [cargando, setCargando] = useState(true)

    // Filtros
    const [busqueda, setBusqueda] = useState('')
    const [sucursalSel, setSucursalSel] = useState('')
    const [filtroEstado, setFiltroEstado] = useState('todos')

    // Paginación
    const [pagina, setPagina] = useState(1)

    // Cargar sucursales al montar
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

    // Cargar inventario desde la API
    const cargarInventario = useCallback(async () => {
        setCargando(true)
        try {
            const params = {
                limit: 1000,
                sucursal_id: sucursalSel || undefined,
                activo: true
            }

            const res = await inventarioService.listar(params)

            let rows = []
            if (Array.isArray(res)) rows = res
            else if (Array.isArray(res?.data)) rows = res.data
            else if (Array.isArray(res?.datos)) rows = res.datos
            else if (Array.isArray(res?.data?.data)) rows = res.data.data

            setFilasRaw(Array.isArray(rows) ? rows : [])
            setPagina(1)
        } catch (err) {
            console.error('Error al cargar existencias:', err)
            toast.error(err.response?.data?.error?.mensaje || 'Error al cargar existencias')
            setFilasRaw([])
        } finally {
            setCargando(false)
        }
    }, [sucursalSel])

    useEffect(() => {
        cargarInventario()
    }, [cargarInventario])

    // Filtrado instantáneo en memoria sin resetear estados
    const filasFiltradas = useMemo(() => {
        if (!Array.isArray(filasRaw)) return []

        let resultado = filasRaw.filter(Boolean)

        const query = String(busqueda || '').toLowerCase().trim()

        if (query) {
            resultado = resultado.filter((f) => {
                try {
                    const sku = getSku(f).toLowerCase()
                    const producto = getProductoNombre(f).toLowerCase()
                    const atributos = getAtributos(f).toLowerCase()
                    const sucursal = getSucursalNombre(f).toLowerCase()

                    return (
                        sku.includes(query) ||
                        producto.includes(query) ||
                        atributos.includes(query) ||
                        sucursal.includes(query)
                    )
                } catch {
                    return false
                }
            })
        }

        if (filtroEstado !== 'todos') {
            resultado = resultado.filter((f) => {
                const st = getStock(f)
                const mn = getStockMin(f)
                if (filtroEstado === 'AGOTADO') return st <= 0
                if (filtroEstado === 'STOCK_BAJO') return st > 0 && st <= mn
                if (filtroEstado === 'DISPONIBLE') return st > mn
                return true
            })
        }

        return resultado
    }, [filasRaw, busqueda, filtroEstado])

    // Cálculo de Paginación
    const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / ELEMENTOS_POR_PAGINA))

    const filasPaginadas = useMemo(() => {
        const inicio = (pagina - 1) * ELEMENTOS_POR_PAGINA
        return filasFiltradas.slice(inicio, inicio + ELEMENTOS_POR_PAGINA)
    }, [filasFiltradas, pagina])

    // Cálculo de KPIs inmediatos sobre las filas obtenidas
    const metricas = useMemo(() => {
        if (!Array.isArray(filasFiltradas)) return { unidades: 0, valorizado: 0, enRiesgo: 0, agotados: 0 }

        return filasFiltradas.reduce(
            (acc, item) => {
                if (!item) return acc
                const st = getStock(item)
                const ct = getCosto(item)
                const mn = getStockMin(item)

                acc.unidades += st
                acc.valorizado += st * ct
                if (st <= 0) acc.agotados += 1
                else if (st <= mn) acc.enRiesgo += 1

                return acc
            },
            { unidades: 0, valorizado: 0, enRiesgo: 0, agotados: 0 }
        )
    }, [filasFiltradas])

    const irAKardex = (varianteId, sucursalId) => {
        if (!varianteId) return
        navigate(`/kardex?variante_id=${varianteId}${sucursalId ? `&sucursal_id=${sucursalId}` : ''}`)
    }

    return (
        <div className="space-y-4" translate="no">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Existencias en inventario</h1>
                    <p className="text-sm text-muted-foreground">Consulta de stock físico, alertas de stock mínimo y acceso al Kardex</p>
                </div>
                <button
                    onClick={cargarInventario}
                    disabled={cargando}
                    className="flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                >
                    <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
                    Refrescar
                </button>
            </div>

            {/* Tarjetas KPI */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium uppercase tracking-wider">Unidades Totales</span>
                        <Package size={18} className="text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                        {cargando ? '...' : metricas.unidades.toLocaleString()}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium uppercase tracking-wider">Valorizado</span>
                        <DollarSign size={18} className="text-emerald-600" />
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                        {cargando ? '...' : `Q ${metricas.valorizado.toFixed(2)}`}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium uppercase tracking-wider">Stock Bajo</span>
                        <AlertTriangle size={18} className="text-amber-500" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-amber-600">
                        {cargando ? '...' : metricas.enRiesgo}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium uppercase tracking-wider">Agotados</span>
                        <XCircle size={18} className="text-destructive" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-destructive">
                        {cargando ? '...' : metricas.agotados}
                    </p>
                </div>
            </div>

            {/* Controles de Filtro */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => {
                            setBusqueda(e.target.value)
                            setPagina(1)
                        }}
                        placeholder="Buscar por SKU, producto, color..."
                        className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <select
                    value={sucursalSel}
                    onChange={(e) => {
                        setSucursalSel(e.target.value)
                        setPagina(1)
                    }}
                    className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="">Todas las sucursales</option>
                    {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.nombre}
                        </option>
                    ))}
                </select>

                <select
                    value={filtroEstado}
                    onChange={(e) => {
                        setFiltroEstado(e.target.value)
                        setPagina(1)
                    }}
                    className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="todos">Todos los estados</option>
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="STOCK_BAJO">Stock Bajo</option>
                    <option value="AGOTADO">Agotado</option>
                </select>
            </div>

            {/* Tabla de Existencias */}
            <div className="overflow-hidden rounded-lg border bg-card">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Producto / Variante</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sucursal</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Stock real</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Stock Mín.</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unidad Costo.</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                                    Cargando datos...
                                </td>
                            </tr>
                        ) : filasPaginadas.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                                    Sin resultados {busqueda ? `para "${busqueda}"` : ''}
                                </td>
                            </tr>
                        ) : (
                            filasPaginadas.map((f, index) => {
                                if (!f) return null

                                const stock = getStock(f)
                                const min = getStockMin(f)
                                const costo = getCosto(f)

                                const sku = getSku(f)
                                const nombreProducto = getProductoNombre(f)
                                const atributos = getAtributos(f)
                                const sucursalNombre = getSucursalNombre(f)

                                let badgeClass = 'bg-primary/10 text-primary'
                                if (stock <= 0) badgeClass = 'bg-destructive/10 text-destructive'
                                else if (stock <= min) badgeClass = 'bg-amber-500/10 text-amber-600'

                                const rowKey = f.id || `${f.variante_id || index}-${f.sucursal_id || index}-${index}`

                                return (
                                    <tr
                                        key={rowKey}
                                        className="border-b last:border-0 transition-colors hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs font-medium">{sku}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{nombreProducto}</div>
                                            {atributos && <div className="text-xs text-muted-foreground">{atributos}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{sucursalNombre}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
                                                {stock} u.
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-muted-foreground">{min} u.</td>
                                        <td className="px-4 py-3 text-right">Q {costo.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-medium">Q {(stock * costo).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => irAKardex(f.variante_id || f.variante?.id, f.sucursal_id || f.sucursal?.id)}
                                                className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <History size={14} />
                                                Kardex
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación y contador */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                    Mostrando {filasFiltradas.length > 0 ? (pagina - 1) * ELEMENTOS_POR_PAGINA + 1 : 0} - {Math.min(pagina * ELEMENTOS_POR_PAGINA, filasFiltradas.length)} de {filasFiltradas.length} elementos
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                        disabled={pagina === 1 || cargando}
                        className="rounded-md border px-3 py-1.5 transition-colors hover:bg-muted disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span className="px-2 text-xs font-medium">
                        Pág. {pagina} de {totalPaginas}
                    </span>
                    <button
                        onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
                        disabled={pagina >= totalPaginas || cargando}
                        className="rounded-md border px-3 py-1.5 transition-colors hover:bg-muted disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    )
}