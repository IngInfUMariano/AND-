import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    X,
    Maximize2,
    Minimize2,
    RefreshCw,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowRightLeft,
    SlidersHorizontal,
    Package,
    Calendar,
    AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { inventarioService } from '@/services/inventario.service'

export default function KardexModal({
    isOpen,
    onClose,
    varianteId,
    sucursalId,
    productoInfo = {}
}) {
    const [esPantallaCompleta, setEsPantallaCompleta] = useState(false)
    const [cargando, setCargando] = useState(false)
    const [movimientos, setMovimientos] = useState([])

    // Filtros locales
    const [filtroTipo, setFiltroTipo] = useState('TODOS')
    const [fechaDesde, setFechaDesde] = useState('') // Formato texto DD/MM/AAAA
    const [fechaHasta, setFechaHasta] = useState('') // Formato texto DD/MM/AAAA

    // Cargar historial de movimientos
    const cargarKardex = useCallback(async () => {
        if (!varianteId || !isOpen) return
        setCargando(true)
        try {
            const params = {
                variante_id: varianteId,
                sucursal_id: sucursalId || undefined
            }

            const res = await inventarioService.obtenerKardex?.(params) || await inventarioService.listarMovimientos?.(params)

            let data = []
            if (Array.isArray(res)) data = res
            else if (Array.isArray(res?.data)) data = res.data
            else if (Array.isArray(res?.datos)) data = res.datos

            setMovimientos(data)
        } catch (err) {
            console.error('Error al cargar Kardex:', err)
            toast.error('No se pudo obtener el historial de movimientos')
        } finally {
            setCargando(false)
        }
    }, [varianteId, sucursalId, isOpen])

    useEffect(() => {
        if (isOpen) {
            cargarKardex()
        } else {
            setEsPantallaCompleta(false)
            setMovimientos([])
            setFiltroTipo('TODOS')
            setFechaDesde('')
            setFechaHasta('')
        }
    }, [isOpen, varianteId, sucursalId, cargarKardex])

    /**
     * Convierte cualquier fecha en formato texto DD/MM/AAAA a 'YYYY-MM-DD' para comparación
     */
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

    /**
     * Extrae 'YYYY-MM-DD' de cualquier registro de movimiento (ISO o string DD/MM/YYYY)
     */
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

    // Auto-formateador de máscara mientras el usuario escribe DD/MM/AAAA
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
    }

    // FILTRADO ROBUSTO EN CLIENTE (ESTRICTO DD/MM/AAAA)
    const movimientosFiltrados = useMemo(() => {
        const desdeStandard = parseDDMMYYYYtoYYYYMMDD(fechaDesde)
        const hastaStandard = parseDDMMYYYYtoYYYYMMDD(fechaHasta)

        return movimientos.filter((m) => {
            const tipo = String(m.tipo_movimiento || m.tipo || '').toUpperCase()
            const motivo = String(m.motivo || m.concepto || '').toUpperCase()

            // 1. Filtrar por Tipo de Movimiento / Motivo
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

            // 2. Filtrar por Fecha
            const movFechaStandard = getMovimientoDateYYYYMMDD(m.createdAt || m.created_at || m.fecha)

            if (movFechaStandard) {
                if (desdeStandard && movFechaStandard < desdeStandard) return false
                if (hastaStandard && movFechaStandard > hastaStandard) return false
            }

            return true
        })
    }, [movimientos, filtroTipo, fechaDesde, fechaHasta])

    // Métricas del Kardex
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

    if (!isOpen) return null

    // Formatear visualización a DD/MM/YYYY, HH:MM
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 transition-all">
            <div
                className={`flex flex-col bg-card border shadow-2xl transition-all duration-200 overflow-hidden ${esPantallaCompleta
                        ? 'fixed inset-0 w-full h-full rounded-none z-50'
                        : 'w-full max-w-5xl max-h-[90vh] rounded-xl'
                    }`}
            >
                {/* Encabezado */}
                <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Package size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold leading-tight">
                                    {productoInfo.nombre || 'Kardex de Movimientos'}
                                </h2>
                                {productoInfo.sku && (
                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                        {productoInfo.sku}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {productoInfo.atributos && `${productoInfo.atributos} • `}
                                Sucursal: <span className="font-medium text-foreground">{productoInfo.sucursal || 'Todas'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setEsPantallaCompleta((v) => !v)}
                            title={esPantallaCompleta ? 'Restaurar tamaño' : 'Pantalla completa'}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            {esPantallaCompleta ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>

                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 gap-3 border-b p-4 bg-card sm:grid-cols-12 sm:items-center">
                    <div className="flex flex-wrap items-center gap-2 sm:col-span-8">
                        <select
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                            className="rounded-md border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
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

                        <div className="flex items-center gap-1 text-xs">
                            <Calendar size={14} className="text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="dd/mm/aaaa"
                                value={fechaDesde}
                                onChange={(e) => handleFechaInput(e.target.value, setFechaDesde)}
                                maxLength={10}
                                className="w-24 rounded-md border bg-background px-2 py-1 text-center text-xs outline-none focus:ring-2 focus:ring-ring"
                            />
                            <span className="text-muted-foreground">-</span>
                            <input
                                type="text"
                                placeholder="dd/mm/aaaa"
                                value={fechaHasta}
                                onChange={(e) => handleFechaInput(e.target.value, setFechaHasta)}
                                maxLength={10}
                                className="w-24 rounded-md border bg-background px-2 py-1 text-center text-xs outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <button
                            onClick={cargarKardex}
                            disabled={cargando}
                            className="rounded-md border bg-muted px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted/80 disabled:opacity-50"
                            title="Recargar datos de servidor"
                        >
                            <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="flex items-center justify-end gap-3 text-xs sm:col-span-4 border-t pt-2 sm:border-t-0 sm:pt-0">
                        <div className="text-right">
                            <span className="block text-muted-foreground">Entradas:</span>
                            <span className="font-semibold text-emerald-600">+{resumen.entradas}</span>
                        </div>
                        <div className="h-6 w-px bg-border" />
                        <div className="text-right">
                            <span className="block text-muted-foreground">Salidas:</span>
                            <span className="font-semibold text-destructive">-{resumen.salidas}</span>
                        </div>
                        <div className="h-6 w-px bg-border" />
                        <div className="text-right">
                            <span className="block text-muted-foreground">Movimientos:</span>
                            <span className="font-semibold">{movimientosFiltrados.length}</span>
                        </div>
                    </div>
                </div>

                {/* Tabla */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/90 backdrop-blur border-b">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Fecha / Hora</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tipo / Motivo</th>
                                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Concepto / Referencia</th>
                                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Cantidad</th>
                                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Saldo Resultante</th>
                                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Usuario</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargando ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                        <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                                        Cargando historial de Kardex...
                                    </td>
                                </tr>
                            ) : movimientosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                        No se encontraron movimientos registrados.
                                    </td>
                                </tr>
                            ) : (
                                movimientosFiltrados.map((m, i) => {
                                    const tipo = String(m.tipo_movimiento || m.tipo || '').toUpperCase()
                                    const esEntrada = tipo.includes('ENTRADA') || tipo === 'COMPRA'
                                    const esSalida = tipo.includes('SALIDA') || tipo === 'VENTA'

                                    return (
                                        <tr
                                            key={m.id || i}
                                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                {formatFecha(m.createdAt || m.created_at || m.fecha)}
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                {renderBadgeTipo(tipo, m.motivo || m.concepto)}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="font-medium text-xs">
                                                    {m.motivo || m.concepto || m.descripcion || m.referencia || 'Sin descripción'}
                                                </div>
                                                {m.documento_referencia && (
                                                    <div className="text-[11px] font-mono text-muted-foreground">
                                                        Ref: {m.documento_referencia}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-center font-semibold text-xs whitespace-nowrap">
                                                <span className={esEntrada ? 'text-emerald-600' : esSalida ? 'text-destructive' : ''}>
                                                    {esEntrada ? '+' : esSalida ? '-' : ''}{m.cantidad || m.cant || 0} u.
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold">
                                                {m.saldo_resultante ?? m.stock_resultante ?? m.saldo ?? m.stock_nuevo ?? '-'} u.
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                                                {m.usuario?.nombre || m.usuario_nombre || m.creado_por || 'Sistema'}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-5 py-3 bg-muted/20 text-xs text-muted-foreground">
                    <span>
                        Tip: Presiona el ícono <Maximize2 size={12} className="inline mx-0.5" /> para expandir la vista si hay muchos datos.
                    </span>
                    <button
                        onClick={onClose}
                        className="rounded-md border bg-card px-4 py-1.5 font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}