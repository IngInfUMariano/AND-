import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Plus, RefreshCw, Truck, CheckCircle2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import inventarioService from '@/services/inventario.service'

const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val))

export default function ComprasInventarioPage() {
    const [compras, setCompras] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [existencias, setExistencias] = useState([]) // Para listar los productos
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)

    const [modalCrearAbierto, setModalCrearAbierto] = useState(false)

    const [formCompra, setFormCompra] = useState({
        sucursal_id: '',
        proveedor_id: '',
        variante_id: '',
        cantidad: 1,
        costo_unitario: 0,
        motivo: '' // Número de Factura o Referencia
    })

    const cargarDatosIniciales = useCallback(async () => {
        try {
            setCargando(true)

            // Cargar sucursales, proveedores y el historial de compras
            const [resSuc, resProv, resHistorial, resExist] = await Promise.all([
                inventarioService.listarSucursales(),
                inventarioService.listarProveedores().catch(() => []),
                inventarioService.obtenerKardex({ tipo: 'ENTRADA_COMPRA' }).catch(() => []),
                inventarioService.listar({ limit: 1000 }).catch(() => []) // Obtenemos catálogo de productos
            ])

            const listaSuc = Array.isArray(resSuc) ? resSuc : (resSuc?.data || resSuc?.datos || [])
            setSucursales(listaSuc)

            const listaProv = Array.isArray(resProv) ? resProv : (resProv?.data || resProv?.datos || resProv?.rows || [])
            setProveedores(listaProv)

            const listaCompras = Array.isArray(resHistorial) ? resHistorial : (resHistorial?.data || resHistorial?.datos || resHistorial?.rows || [])
            setCompras(listaCompras)

            const listaExist = Array.isArray(resExist) ? resExist : (resExist?.data || resExist?.datos || resExist?.rows || [])
            // Filtramos a existencias únicas (variantes únicas) para el selector
            const unicas = []
            const map = new Map()
            listaExist.forEach(item => {
                if (!map.has(item.variante_id)) {
                    map.set(item.variante_id, true)
                    unicas.push(item)
                }
            })
            setExistencias(unicas)

            if (listaSuc.length > 0 && !formCompra.sucursal_id) {
                setFormCompra((prev) => ({ ...prev, sucursal_id: String(listaSuc[0].id) }))
            }
        } catch (err) {
            console.error('Error al cargar datos de compras:', err)
            toast.error('No se pudo cargar la información necesaria.')
        } finally {
            setCargando(false)
        }
    }, [formCompra.sucursal_id])

    useEffect(() => {
        cargarDatosIniciales()
    }, [cargarDatosIniciales])

    const handleRegistrarCompra = async (e) => {
        e.preventDefault()
        if (!formCompra.sucursal_id || !formCompra.variante_id || !formCompra.proveedor_id || formCompra.cantidad <= 0 || formCompra.costo_unitario < 0) {
            toast.error('Complete todos los campos obligatorios.')
            return
        }

        setGuardando(true)
        try {
            await inventarioService.registrarEntradaCompra({
                sucursal_id: formCompra.sucursal_id,
                proveedor_id: formCompra.proveedor_id,
                variante_id: formCompra.variante_id,
                cantidad: formCompra.cantidad,
                costo_unitario: formCompra.costo_unitario,
                motivo: formCompra.motivo ? `Factura/Doc: ${formCompra.motivo}` : 'Ingreso de compra'
            })

            toast.success('Compra registrada e inventario actualizado exitosamente.')
            setModalCrearAbierto(false)
            setFormCompra((prev) => ({ ...prev, variante_id: '', cantidad: 1, costo_unitario: 0, motivo: '' }))
            cargarDatosIniciales()
        } catch (err) {
            console.error('Error al registrar compra:', err)
            toast.error(err.response?.data?.error?.mensaje || 'Error al procesar la entrada de compra')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto" translate="no">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <ShoppingCart className="text-emerald-600" /> Entradas por Compra
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Registro de ingresos de mercadería e incremento de inventario.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setModalCrearAbierto(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 transition-colors"
                    >
                        <Plus size={15} /> Registrar Nueva Compra
                    </button>
                    <button
                        onClick={cargarDatosIniciales}
                        disabled={cargando}
                        className="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-xs font-medium hover:bg-muted"
                    >
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Refrescar
                    </button>
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="border-b px-5 py-4 bg-muted/20">
                    <h2 className="font-semibold text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600" /> Historial de Compras
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/60 border-b text-xs font-medium text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Sucursal</th>
                                <th className="px-4 py-3">Producto (SKU)</th>
                                <th className="px-4 py-3 text-center">Cantidad</th>
                                <th className="px-4 py-3 text-right">Costo Unitario</th>
                                <th className="px-4 py-3 text-right">Costo Total</th>
                                <th className="px-4 py-3">Referencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                            {cargando ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-emerald-600" />
                                        Cargando historial...
                                    </td>
                                </tr>
                            ) : compras.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                                        <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
                                        No hay entradas por compra registradas.
                                    </td>
                                </tr>
                            ) : (
                                compras.map((m) => {
                                    const costoU = safeNumber(m.costo_unitario)
                                    const cant = safeNumber(m.cantidad)
                                    const total = costoU * cant
                                    return (
                                        <tr key={m.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 font-medium">
                                                {new Date(m.createdAt || m.created_at || m.fecha).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {m.sucursal?.nombre || `Sucursal #${m.sucursal_id}`}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-foreground">{m.variante?.producto?.nombre || m.producto_nombre || 'Producto'}</div>
                                                <div className="font-mono text-[10px] text-muted-foreground">SKU: {m.variante?.sku || m.sku || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-emerald-600">
                                                +{cant} u.
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                Q {costoU.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-foreground">
                                                Q {total.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate" title={m.motivo}>
                                                {m.motivo || 'N/A'}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Registrar Compra */}
            {modalCrearAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
                                <Truck size={18} /> Ingresar Mercadería por Compra
                            </h2>
                            <button onClick={() => setModalCrearAbierto(false)} className="text-muted-foreground hover:text-foreground">
                                <Search size={18} className="opacity-0" />{/* Placeholder for alignment if needed */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <form onSubmit={handleRegistrarCompra} className="p-5 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">Sucursal Destino</label>
                                    <select
                                        value={formCompra.sucursal_id}
                                        onChange={(e) => setFormCompra({ ...formCompra, sucursal_id: e.target.value })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        {sucursales.map((s) => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">Proveedor Obligatorio</label>
                                    <select
                                        value={formCompra.proveedor_id}
                                        onChange={(e) => setFormCompra({ ...formCompra, proveedor_id: e.target.value })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        <option value="">Seleccione proveedor...</option>
                                        {proveedores.map((p) => (
                                            <option key={p.id} value={p.id}>{p.nombre || p.razon_social}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-medium text-muted-foreground mb-1">Producto / Variante a Ingresar</label>
                                <select
                                    value={formCompra.variante_id}
                                    onChange={(e) => setFormCompra({ ...formCompra, variante_id: e.target.value })}
                                    className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    <option value="">Selecciona el producto...</option>
                                    {existencias.map((ex) => {
                                        const prodNombre = ex.variante?.producto?.nombre || ex.producto_nombre || 'Producto'
                                        const sku = ex.variante?.sku || ex.sku || 'N/A'
                                        return (
                                            <option key={ex.variante_id || ex.id} value={ex.variante_id || ex.id}>
                                                {prodNombre} (SKU: {sku})
                                            </option>
                                        )
                                    })}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">Cantidad Comprada</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formCompra.cantidad}
                                        onChange={(e) => setFormCompra({ ...formCompra, cantidad: Math.max(1, Number(e.target.value)) })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring font-bold text-emerald-600"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">Costo Unitario (Q)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={formCompra.costo_unitario}
                                        onChange={(e) => setFormCompra({ ...formCompra, costo_unitario: Math.max(0, Number(e.target.value)) })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring font-semibold"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-medium text-muted-foreground mb-1">No. Factura / Referencia (Opcional)</label>
                                <input
                                    type="text"
                                    value={formCompra.motivo}
                                    onChange={(e) => setFormCompra({ ...formCompra, motivo: e.target.value })}
                                    placeholder="Ej. Factura Serie A - 00124"
                                    className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-4 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalCrearAbierto(false)}
                                    className="rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={guardando}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {guardando ? 'Registrando...' : 'Confirmar Ingreso a Bodega'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}