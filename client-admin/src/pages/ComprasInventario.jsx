import { useState, useEffect, useCallback, useMemo } from 'react'
import { ShoppingCart, Plus, RefreshCw, Truck, CheckCircle2, X, Package, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import inventarioService from '@/services/inventario.service'
import productoService from '@/services/producto.service'

const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val))

const lista = (res) =>
    Array.isArray(res) ? res
        : Array.isArray(res?.data) ? res.data
            : Array.isArray(res?.datos) ? res.datos
                : Array.isArray(res?.rows) ? res.rows
                    : []

// Helpers de existencias (una fila por variante + sucursal)
const sucursalDe = (e) => String(e.sucursal_id ?? e.sucursal?.id ?? '')
const fisicaDe = (e) => safeNumber(e.cantidad_fisica ?? e.cantidad)
const disponibleDe = (e) =>
    e.disponible !== undefined && e.disponible !== null
        ? safeNumber(e.disponible)
        : Math.max(0, fisicaDe(e) - safeNumber(e.cantidad_comprometida))

const etiquetaVariante = (v) => {
    const detalle = [v.talla?.codigo, v.color?.nombre].filter(Boolean).join(' / ')
    return `${v.producto?.nombre || 'Producto'}${detalle ? ` · ${detalle}` : ''} (SKU: ${v.sku || 'N/A'})`
}

export default function ComprasInventarioPage() {
    const [compras, setCompras] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [existencias, setExistencias] = useState([]) // Stock por variante y sucursal
    const [catalogo, setCatalogo] = useState([]) // Variantes disponibles para ingresar (incluye productos sin stock previo)
    const [busquedaProd, setBusquedaProd] = useState('')
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)

    const [modalCrearAbierto, setModalCrearAbierto] = useState(false)

    const FORM_VACIO = { sucursal_id: '', proveedor_id: '', variante_id: '', cantidad: '', costo_unitario: '', motivo: '' }
    const [formCompra, setFormCompra] = useState(FORM_VACIO)
    const [tocados, setTocados] = useState({})
    const [intentado, setIntentado] = useState(false)

    const cargarDatosIniciales = useCallback(async () => {
        try {
            setCargando(true)

            // Cargar sucursales, proveedores y el historial de compras
            const [resSuc, resProv, resHistorial, resExist, resVars] = await Promise.all([
                inventarioService.listarSucursales(),
                inventarioService.listarProveedores().catch(() => []),
                inventarioService.obtenerKardex({ tipo: 'ENTRADA_COMPRA' }).catch(() => []),
                inventarioService.listar({ limit: 1000 }).catch(() => []), // Stock actual por sucursal
                productoService.listarVariantes({ limit: 1000 }).catch(() => []) // Catálogo completo de variantes
            ])

            const listaSuc = Array.isArray(resSuc) ? resSuc : (resSuc?.data || resSuc?.datos || [])
            setSucursales(listaSuc)

            const listaProv = Array.isArray(resProv) ? resProv : (resProv?.data || resProv?.datos || resProv?.rows || [])
            setProveedores(listaProv)

            const listaCompras = Array.isArray(resHistorial) ? resHistorial : (resHistorial?.data || resHistorial?.datos || resHistorial?.rows || [])
            setCompras(listaCompras)

            const listaExist = Array.isArray(resExist) ? resExist : (resExist?.data || resExist?.datos || resExist?.rows || [])
            setExistencias(listaExist)

            // Selector de productos: se arma desde el CATÁLOGO de variantes, no desde existencias.
            // Un producto recién creado (inactivo, sin stock) no tiene filas de existencia todavía,
            // así que solo así puede recibir su primer ingreso.
            const listaVars = lista(resVars)
            if (listaVars.length > 0) {
                setCatalogo(listaVars.map((v) => ({
                    id: String(v.id),
                    etiqueta: etiquetaVariante(v),
                    inactivo: v.producto?.activo === false
                })))
            } else {
                // Respaldo: comportamiento anterior (solo variantes que ya tienen existencias)
                const vistos = new Set()
                const unicas = []
                listaExist.forEach((ex) => {
                    const id = String(ex.variante_id ?? ex.id)
                    if (vistos.has(id)) return
                    vistos.add(id)
                    unicas.push({
                        id,
                        etiqueta: `${ex.variante?.producto?.nombre || ex.producto_nombre || 'Producto'} (SKU: ${ex.variante?.sku || ex.sku || 'N/A'})`,
                        inactivo: false
                    })
                })
                setCatalogo(unicas)
            }

            if (listaSuc.length > 0) {
                setFormCompra((prev) => (prev.sucursal_id ? prev : { ...prev, sucursal_id: String(listaSuc[0].id) }))
            }
        } catch (err) {
            console.error('Error al cargar datos de compras:', err)
            toast.error('No se pudo cargar la información necesaria.')
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        cargarDatosIniciales()
    }, [cargarDatosIniciales])

    const opcionesProducto = useMemo(() => {
        const q = busquedaProd.trim().toLowerCase()
        return q ? catalogo.filter((o) => o.etiqueta.toLowerCase().includes(q) || o.id === formCompra.variante_id) : catalogo
    }, [catalogo, busquedaProd, formCompra.variante_id])

    const productoElegido = useMemo(
        () => catalogo.find((o) => o.id === String(formCompra.variante_id)) || null,
        [catalogo, formCompra.variante_id]
    )

    // Stock de la variante elegida en la sucursal destino
    const stockInfo = useMemo(() => {
        if (!formCompra.variante_id) return null
        const propia = existencias.find(
            (e) => String(e.variante_id) === String(formCompra.variante_id) && sucursalDe(e) === String(formCompra.sucursal_id)
        )
        return {
            tieneRegistro: Boolean(propia),
            fisica: propia ? fisicaDe(propia) : 0,
            disponible: propia ? disponibleDe(propia) : 0
        }
    }, [existencias, formCompra.variante_id, formCompra.sucursal_id])

    // ── Validaciones ─────────────────────────────────────────────────────────
    const errores = useMemo(() => {
        const e = {}
        const cant = Number(formCompra.cantidad)
        const costo = Number(formCompra.costo_unitario)
        const ref = formCompra.motivo.trim()

        if (!formCompra.sucursal_id) e.sucursal_id = 'Seleccione la sucursal destino.'
        else if (sucursales.length > 0 && !sucursales.some((s) => String(s.id) === String(formCompra.sucursal_id)))
            e.sucursal_id = 'La sucursal seleccionada no es válida.'

        if (!formCompra.proveedor_id) e.proveedor_id = 'Seleccione el proveedor.'
        else if (!proveedores.some((p) => String(p.id) === String(formCompra.proveedor_id)))
            e.proveedor_id = 'El proveedor seleccionado no es válido.'

        if (!formCompra.variante_id) e.variante_id = 'Seleccione el producto a ingresar.'
        else if (!catalogo.some((o) => o.id === String(formCompra.variante_id)))
            e.variante_id = 'El producto seleccionado no es válido.'

        if (formCompra.cantidad === '') e.cantidad = 'Ingrese la cantidad comprada.'
        else if (!Number.isInteger(cant) || cant < 1) e.cantidad = 'La cantidad debe ser un entero mayor o igual a 1.'
        else if (cant > 100000) e.cantidad = 'La cantidad no puede superar 100,000 unidades.'

        if (formCompra.costo_unitario === '') e.costo_unitario = 'Ingrese el costo unitario.'
        else if (!(costo > 0)) e.costo_unitario = 'El costo unitario debe ser mayor a Q 0.00.'
        else if (costo > 1000000) e.costo_unitario = 'El costo unitario es demasiado alto.'

        if (!ref) e.motivo = 'Ingrese el número de factura o referencia.'
        else if (ref.length < 3) e.motivo = 'La referencia debe tener al menos 3 caracteres.'
        else if (ref.length > 100) e.motivo = 'La referencia no puede superar 100 caracteres.'
        else if (
            formCompra.variante_id &&
            compras.some(
                (m) =>
                    String(m.variante_id ?? m.variante?.id) === String(formCompra.variante_id) &&
                    String(m.sucursal_id ?? m.sucursal?.id) === String(formCompra.sucursal_id) &&
                    String(m.motivo || '').trim().toLowerCase() === `factura/doc: ${ref}`.toLowerCase()
            )
        ) e.motivo = 'Ya existe un ingreso de este producto con esa factura en esta sucursal.'

        return e
    }, [formCompra, sucursales, proveedores, catalogo, compras])

    const hayErrores = Object.keys(errores).length > 0
    const mostrarError = (campo) => ((intentado || tocados[campo]) ? errores[campo] : undefined)
    const tocar = (campo) => setTocados((prev) => ({ ...prev, [campo]: true }))
    const claseInput = (campo) =>
        `w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring ${mostrarError(campo) ? 'border-rose-500 focus:ring-rose-300' : ''}`

    const totalCompra = safeNumber(formCompra.cantidad) * safeNumber(formCompra.costo_unitario)

    const abrirModal = () => {
        setFormCompra({ ...FORM_VACIO, sucursal_id: formCompra.sucursal_id || (sucursales[0] ? String(sucursales[0].id) : '') })
        setTocados({})
        setIntentado(false)
        setBusquedaProd('')
        setModalCrearAbierto(true)
    }

    const cerrarModal = useCallback(() => {
        if (!guardando) setModalCrearAbierto(false)
    }, [guardando])

    // Popup: Escape cierra y el fondo no se desplaza mientras está abierto
    useEffect(() => {
        if (!modalCrearAbierto) return undefined
        const onKey = (ev) => { if (ev.key === 'Escape') cerrarModal() }
        document.addEventListener('keydown', onKey)
        const previo = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = previo
        }
    }, [modalCrearAbierto, cerrarModal])

    const handleRegistrarCompra = async (e) => {
        e.preventDefault()
        if (guardando) return
        setIntentado(true)

        if (hayErrores) {
            toast.error(Object.values(errores)[0])
            setTimeout(() => document.querySelector('[data-error]')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 0)
            return
        }

        setGuardando(true)
        try {
            await inventarioService.registrarEntradaCompra({
                sucursal_id: formCompra.sucursal_id,
                proveedor_id: formCompra.proveedor_id,
                variante_id: formCompra.variante_id,
                cantidad: Number(formCompra.cantidad),
                costo_unitario: Number(Number(formCompra.costo_unitario).toFixed(2)),
                motivo: `Factura/Doc: ${formCompra.motivo.trim()}`
            })

            toast.success('Compra registrada e inventario actualizado exitosamente.')
            setModalCrearAbierto(false)
            setFormCompra((prev) => ({ ...FORM_VACIO, sucursal_id: prev.sucursal_id }))
            setTocados({})
            setIntentado(false)
            cargarDatosIniciales()
        } catch (err) {
            console.error('Error al registrar compra:', err)
            const det = err.response?.data?.error?.detalles
            toast.error(
                err.response?.data?.error?.mensaje ||
                (Array.isArray(det) && det.length ? String(det[0]?.mensaje || det[0]) : null) ||
                'Error al procesar la entrada de compra'
            )
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
                        onClick={abrirModal}
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

            {/* Modal: Registrar Compra (popup con scroll interno) */}
            {modalCrearAbierto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onMouseDown={(ev) => { if (ev.target === ev.currentTarget) cerrarModal() }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Ingresar mercadería por compra"
                        className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        <div className="shrink-0 flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
                                <Truck size={18} /> Ingresar Mercadería por Compra
                            </h2>
                            <button
                                type="button"
                                onClick={cerrarModal}
                                aria-label="Cerrar"
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleRegistrarCompra} noValidate className="flex min-h-0 flex-1 flex-col text-xs">
                            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-medium text-muted-foreground mb-1">Sucursal Destino *</label>
                                        <select
                                            value={formCompra.sucursal_id}
                                            onChange={(e) => setFormCompra({ ...formCompra, sucursal_id: e.target.value })}
                                            onBlur={() => tocar('sucursal_id')}
                                            aria-label="Sucursal"
                                            className={claseInput('sucursal_id')}
                                        >
                                            <option value="">Seleccione sucursal...</option>
                                            {sucursales.map((s) => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                        {mostrarError('sucursal_id') && <p data-error className="mt-1 text-[11px] text-rose-600">{errores.sucursal_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block font-medium text-muted-foreground mb-1">Proveedor *</label>
                                        <select
                                            value={formCompra.proveedor_id}
                                            onChange={(e) => setFormCompra({ ...formCompra, proveedor_id: e.target.value })}
                                            onBlur={() => tocar('proveedor_id')}
                                            aria-label="Proveedor"
                                            className={claseInput('proveedor_id')}
                                        >
                                            <option value="">Seleccione proveedor...</option>
                                            {proveedores.map((p) => (
                                                <option key={p.id} value={p.id}>{p.nombre || p.razon_social}</option>
                                            ))}
                                        </select>
                                        {mostrarError('proveedor_id') && <p data-error className="mt-1 text-[11px] text-rose-600">{errores.proveedor_id}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">Producto / Variante a Ingresar *</label>
                                    <input
                                        type="text"
                                        value={busquedaProd}
                                        onChange={(e) => setBusquedaProd(e.target.value)}
                                        placeholder="Buscar por nombre, talla, color o SKU..."
                                        aria-label="Buscar producto"
                                        className="mb-2 w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <select
                                        value={formCompra.variante_id}
                                        onChange={(e) => setFormCompra({ ...formCompra, variante_id: e.target.value })}
                                        onBlur={() => tocar('variante_id')}
                                        aria-label="Producto"
                                        className={claseInput('variante_id')}
                                    >
                                        <option value="">Selecciona el producto...</option>
                                        {opcionesProducto.map((o) => (
                                            <option key={o.id} value={o.id}>
                                                {o.etiqueta}{o.inactivo ? ' — INACTIVO' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {mostrarError('variante_id') && <p data-error className="mt-1 text-[11px] text-rose-600">{errores.variante_id}</p>}
                                </div>

                                {stockInfo && (
                                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2" data-testid="panel-stock">
                                        <div className="flex items-center gap-2 font-semibold text-foreground">
                                            <Package size={14} className="text-emerald-600" />
                                            Stock actual en {sucursales.find((s) => String(s.id) === String(formCompra.sucursal_id))?.nombre || 'la sucursal'}
                                        </div>
                                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                            <span className="text-2xl font-bold text-foreground">{stockInfo.fisica}</span>
                                            <span className="text-muted-foreground">
                                                {' '}físico · {stockInfo.disponible} disponible{stockInfo.disponible === 1 ? '' : 's'}
                                                {!stockInfo.tieneRegistro && ' (aún sin registro en esta sucursal)'}
                                            </span>
                                        </div>
                                        {productoElegido?.inactivo && (
                                            <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                                                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                                Este producto está inactivo. Después de cargar stock y definir su precio, actívalo desde Productos.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-medium text-muted-foreground mb-1">Cantidad Comprada *</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            placeholder="Ej. 40"
                                            value={formCompra.cantidad}
                                            onChange={(e) => setFormCompra({ ...formCompra, cantidad: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                            onBlur={() => tocar('cantidad')}
                                            aria-label="Cantidad"
                                            className={`${claseInput('cantidad')} font-bold text-emerald-600`}
                                        />
                                        {mostrarError('cantidad') && <p data-error className="mt-1 text-[11px] text-rose-600">{errores.cantidad}</p>}
                                    </div>
                                    <div>
                                        <label className="block font-medium text-muted-foreground mb-1">Costo Unitario (Q) *</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            placeholder="Ej. 120.00"
                                            value={formCompra.costo_unitario}
                                            onChange={(e) => {
                                                const v = e.target.value.replace(',', '.')
                                                if (/^\d{0,7}(\.\d{0,2})?$/.test(v)) setFormCompra({ ...formCompra, costo_unitario: v })
                                            }}
                                            onBlur={() => tocar('costo_unitario')}
                                            aria-label="Costo unitario"
                                            className={`${claseInput('costo_unitario')} font-semibold`}
                                        />
                                        {mostrarError('costo_unitario') && <p data-error className="mt-1 text-[11px] text-rose-600">{errores.costo_unitario}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-medium text-muted-foreground mb-1">No. Factura / Referencia *</label>
                                    <input
                                        type="text"
                                        maxLength={100}
                                        value={formCompra.motivo}
                                        onChange={(e) => setFormCompra({ ...formCompra, motivo: e.target.value })}
                                        onBlur={() => tocar('motivo')}
                                        placeholder="Ej. Factura Serie A - 00124"
                                        aria-label="Factura"
                                        className={claseInput('motivo')}
                                    />
                                    {mostrarError('motivo') && <p data-error className="mt-1 text-[11px] text-rose-600">{errores.motivo}</p>}
                                </div>

                                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/20" data-testid="total-compra">
                                    <span className="font-medium text-muted-foreground">Total de la compra</span>
                                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">Q {totalCompra.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="shrink-0 flex items-center justify-end gap-2 border-t bg-muted/20 px-5 py-3">
                                <button
                                    type="button"
                                    onClick={cerrarModal}
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