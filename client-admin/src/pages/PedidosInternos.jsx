import { useState, useEffect, useCallback } from 'react'
import {
    Package,
    Truck,
    RefreshCw,
    Plus,
    X,
    ShoppingBag,
    ClipboardCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import inventarioService from '@/services/inventario.service'
import api from '@/services/api'

const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val))

// Helper para extraer arreglos de respuestas paginadas de Sequelize o Axios
const normalizarArreglo = (res) => {
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    if (Array.isArray(res?.rows)) return res.rows
    if (Array.isArray(res?.datos)) return res.datos
    return []
}

export default function PedidosInternos() {
    const [pedidos, setPedidos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [procesando, setProcesando] = useState(false)
    const [filtroEstado, setFiltroEstado] = useState('PAGADO')

    // Modales de Operación
    const [modalNuevoPedido, setModalNuevoPedido] = useState(false)
    const [modalVerificar, setModalVerificar] = useState(false)
    const [modalDespacho, setModalDespacho] = useState(false)

    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)

    // Formulario de Nuevo Pedido (Vendedor)
    const [clientes, setClientes] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [existencias, setExistencias] = useState([])
    const [formNuevo, setFormNuevo] = useState({
        cliente_id: '',
        sucursal_id: '',
        tipo_entrega: 'ENVIO',
        metodo_pago: 'EFECTIVO',
        direccion_envio: '',
        observaciones: '',
        items: []
    })

    // Items agregados temporalmente
    const [itemTemp, setItemTemp] = useState({ variante_id: '', cantidad: 1, precio_unitario: 0 })

    // Estado para Verificación de Empaque (Bodeguero)
    const [checklistItems, setChecklistItems] = useState({})

    // Estado para Despacho y Guía Externa
    const [datosDespacho, setDatosDespacho] = useState({
        transportista: 'Cargo Expreso',
        numero_guia: '',
        observaciones: ''
    })

    // Cargar Pedidos de la API de forma segura
    const cargarPedidos = useCallback(async () => {
        try {
            setCargando(true)
            const params = { estado: filtroEstado }
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
    }, [filtroEstado])

    // Cargar datos secundarios para la creación presencial
    const cargarDatosCreacion = async () => {
        try {
            const [resCli, resSuc] = await Promise.all([
                api.get('/terceros/cliente').catch(() => api.get('/clientes')).catch(() => ({ data: [] })),
                inventarioService.listarSucursales().catch(() => [])
            ])

            const listCli = normalizarArreglo(resCli)
            const listSuc = normalizarArreglo(resSuc)

            setClientes(listCli)
            setSucursales(listSuc)

            if (listSuc.length > 0) {
                setFormNuevo(prev => ({ ...prev, sucursal_id: String(listSuc[0].id) }))
                cargarExistenciasSucursal(listSuc[0].id)
            }
        } catch (err) {
            console.error('Error al cargar clientes/sucursales:', err)
            setClientes([])
            setSucursales([])
        }
    }

    const cargarExistenciasSucursal = async (sucId) => {
        if (!sucId) return
        try {
            const res = await inventarioService.listar({ sucursal_id: sucId, limit: 300 })
            setExistencias(normalizarArreglo(res))
        } catch (err) {
            console.error('Error al cargar existencias:', err)
            setExistencias([])
        }
    }

    useEffect(() => {
        cargarPedidos()
    }, [cargarPedidos])

    const abrirModalNuevoPedido = () => {
        cargarDatosCreacion()
        setFormNuevo({
            cliente_id: '',
            sucursal_id: '',
            tipo_entrega: 'ENVIO',
            metodo_pago: 'EFECTIVO',
            direccion_envio: '',
            observaciones: '',
            items: []
        })
        setModalNuevoPedido(true)
    }

    const agregarItemAlPedido = () => {
        if (!itemTemp.variante_id || itemTemp.cantidad <= 0) {
            toast.error('Selecciona un producto y cantidad válida')
            return
        }

        const exEncontrada = existencias.find(e => String(e.variante_id || e.id) === String(itemTemp.variante_id))
        const prodNombre = exEncontrada?.variante?.producto?.nombre || exEncontrada?.producto_nombre || 'Producto'
        const sku = exEncontrada?.variante?.sku || exEncontrada?.sku || 'SKU-N/A'
        const precio = safeNumber(itemTemp.precio_unitario) || safeNumber(exEncontrada?.variante?.precio || 50)

        const existeIndex = formNuevo.items.findIndex(i => String(i.variante_id) === String(itemTemp.variante_id))
        if (existeIndex >= 0) {
            const nuevos = [...formNuevo.items]
            nuevos[existeIndex].cantidad += Number(itemTemp.cantidad)
            nuevos[existeIndex].subtotal = nuevos[existeIndex].cantidad * nuevos[existeIndex].precio_unitario
            setFormNuevo({ ...formNuevo, items: nuevos })
        } else {
            setFormNuevo({
                ...formNuevo,
                items: [
                    ...formNuevo.items,
                    {
                        variante_id: itemTemp.variante_id,
                        nombre: prodNombre,
                        sku: sku,
                        cantidad: Number(itemTemp.cantidad),
                        precio_unitario: precio,
                        subtotal: Number(itemTemp.cantidad) * precio
                    }
                ]
            })
        }

        setItemTemp({ variante_id: '', cantidad: 1, precio_unitario: 0 })
    }

    const eliminarItemPedido = (idx) => {
        const filtrados = formNuevo.items.filter((_, i) => i !== idx)
        setFormNuevo({ ...formNuevo, items: filtrados })
    }

    const calcularTotalNuevoPedido = () => {
        return formNuevo.items.reduce((acc, curr) => acc + curr.subtotal, 0)
    }

    // Registrar Pedido Presencial en Sistema
    const handleGuardarNuevoPedido = async (e) => {
        e.preventDefault()
        if (formNuevo.items.length === 0) {
            toast.error('Debes agregar al menos un producto al pedido.')
            return
        }

        setProcesando(true)
        try {
            const payload = {
                cliente_id: formNuevo.cliente_id ? Number(formNuevo.cliente_id) : null,
                sucursal_id: Number(formNuevo.sucursal_id),
                canal: 'INTERNO',
                tipo_cliente: 'MINORISTA',
                entrega_tipo: formNuevo.tipo_entrega,
                forma_pago: formNuevo.metodo_pago,
                entrega_direccion: formNuevo.direccion_envio || 'Venta Presencial en Tienda',
                observaciones: formNuevo.observaciones,
                detalles: formNuevo.items.map(i => ({
                    variante_id: Number(i.variante_id),
                    cantidad: i.cantidad,
                    precio_unitario: i.precio_unitario
                }))
            }

            const res = await api.post('/pedidos', payload)
            const idCreado = res?.data?.id || res?.id

            if (idCreado && formNuevo.metodo_pago !== 'CREDITO') {
                await api.patch(`/pedidos/${idCreado}/estado`, {
                    estado: 'PAGADO',
                    observacion: 'Pago cobrado en caja presencial'
                }).catch(() => { })
            }

            toast.success('Pedido registrado y procesado con éxito.')
            setModalNuevoPedido(false)
            cargarPedidos()
        } catch (err) {
            console.error('Error al crear pedido:', err)
            toast.error(err?.response?.data?.error?.mensaje || 'No se pudo crear el pedido presencial.')
        } finally {
            setProcesando(false)
        }
    }

    // Modal de Verificación / Empaque (Bodega)
    const abrirModalVerificacion = (pedido) => {
        setPedidoSeleccionado(pedido)
        const mapa = {}
        const items = normalizarArreglo(pedido.detalles || pedido.items)
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
            toast.error('Debes verificar y marcar todos los ítems antes de despachar.')
            return
        }
        setModalVerificar(false)
        setDatosDespacho({ transportista: 'Cargo Expreso', numero_guia: '', observaciones: '' })
        setModalDespacho(true)
    }

    // Confirmación Final de Despacho + Registro de Guía Externa
    const confirmarDespachoConGuia = async (e) => {
        e.preventDefault()
        if (!pedidoSeleccionado) return
        if (!datosDespacho.numero_guia.trim()) {
            toast.error('El número de guía de envío es obligatorio.')
            return
        }

        setProcesando(true)
        try {
            const obsCompleta = `[${datosDespacho.transportista} - Guía: ${datosDespacho.numero_guia.trim()}] ${datosDespacho.observaciones.trim()}`.trim()

            await api.patch(`/pedidos/${pedidoSeleccionado.id}/estado`, {
                estado: 'DESPACHADO',
                observacion: obsCompleta
            })

            toast.success(`Pedido #${pedidoSeleccionado.numero || pedidoSeleccionado.id} despachado. Guía: ${datosDespacho.numero_guia}`)
            setModalDespacho(false)
            setPedidoSeleccionado(null)
            cargarPedidos()
        } catch (err) {
            console.error('Error al despachar:', err)
            toast.error(err?.response?.data?.error?.mensaje || 'Error al completar el despacho.')
        } finally {
            setProcesando(false)
        }
    }

    const listaDetallesSeleccionados = normalizarArreglo(pedidoSeleccionado?.detalles || pedidoSeleccionado?.items)

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto" translate="no">
            {/* Header Módulo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Truck className="text-primary" /> Gestión, Salidas y Despacho de Pedidos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Registro presencial, empaque de mercancía y asignación de guías de paquetería (Cargo Expreso / Forza).
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={abrirModalNuevoPedido}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
                    >
                        <Plus size={15} /> Crear Pedido Presencial
                    </button>

                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="rounded-lg border bg-card px-3.5 py-2 text-xs font-bold text-foreground outline-none cursor-pointer"
                    >
                        <option value="REGISTRADO">Registrados</option>
                        <option value="PENDIENTE_PAGO">Pendientes de Pago</option>
                        <option value="PAGADO">Pagados / Para Preparar</option>
                        <option value="EN_PREPARACION">En Empaque / Bodega</option>
                        <option value="DESPACHADO">Despachados</option>
                    </select>

                    <button
                        onClick={cargarPedidos}
                        disabled={cargando}
                        className="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-xs font-medium hover:bg-muted"
                    >
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Refrescar
                    </button>
                </div>
            </div>

            {/* Tabla de Pedidos */}
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
                                <th className="px-4 py-3 text-right">Acciones de Salida / Bodega</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                            {cargando ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-primary" />
                                        Cargando lista de pedidos...
                                    </td>
                                </tr>
                            ) : pedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                        <Package size={32} className="mx-auto mb-2 opacity-40" />
                                        No hay pedidos en este estado.
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
                                            {p.cliente?.nombre || 'Cliente Venta Directa'}
                                            <div className="text-[10px] text-muted-foreground">NIT: {p.cliente?.nit || 'C/F'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold">{p.canal || 'INTERNO'}</span> / <span className="text-muted-foreground">{p.tipo_cliente || 'MINORISTA'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-foreground">
                                            Q {safeNumber(p.total).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                                                {p.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {p.estado === 'PAGADO' || p.estado === 'EN_PREPARACION' ? (
                                                <button
                                                    onClick={() => abrirModalVerificacion(p)}
                                                    className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                                                >
                                                    <ClipboardCheck size={14} /> Verificar e Ingresar Guía
                                                </button>
                                            ) : (
                                                <span className="text-muted-foreground font-medium text-[11px]">Procesado</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal 1: Registrar Pedido Presencial (Vendedor Mostrador) */}
            {modalNuevoPedido && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <ShoppingBag size={18} className="text-primary" /> Crear Pedido Presencial en Sucursal
                            </h2>
                            <button onClick={() => setModalNuevoPedido(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleGuardarNuevoPedido} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-muted-foreground mb-1">Cliente (Opcional)</label>
                                    <select
                                        value={formNuevo.cliente_id}
                                        onChange={(e) => setFormNuevo({ ...formNuevo, cliente_id: e.target.value })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Cliente Consumidor Final (CF)</option>
                                        {(Array.isArray(clientes) ? clientes : []).map((c) => (
                                            <option key={c.id} value={c.id}>{c.nombre} (NIT: {c.nit || 'CF'})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-muted-foreground mb-1">Sucursal de Atención</label>
                                    <select
                                        value={formNuevo.sucursal_id}
                                        onChange={(e) => {
                                            setFormNuevo({ ...formNuevo, sucursal_id: e.target.value })
                                            cargarExistenciasSucursal(e.target.value)
                                        }}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        {(Array.isArray(sucursales) ? sucursales : []).map((s) => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-muted-foreground mb-1">Tipo de Entrega</label>
                                    <select
                                        value={formNuevo.tipo_entrega}
                                        onChange={(e) => setFormNuevo({ ...formNuevo, tipo_entrega: e.target.value })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring font-semibold"
                                    >
                                        <option value="ENVIO">Envío por Paquetera</option>
                                        <option value="RETIRO_SUCURSAL">Retiro Presencial en Sucursal</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-muted-foreground mb-1">Método de Pago</label>
                                    <select
                                        value={formNuevo.metodo_pago}
                                        onChange={(e) => setFormNuevo({ ...formNuevo, metodo_pago: e.target.value })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring font-semibold"
                                    >
                                        <option value="EFECTIVO">Efectivo en Caja</option>
                                        <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                        <option value="EN_LINEA">Tarjeta de Crédito / Débito</option>
                                        <option value="CREDITO">Línea de Crédito Mayorista</option>
                                    </select>
                                </div>
                            </div>

                            {/* Agregar Productos al Carrito */}
                            <div className="border rounded-lg p-3 space-y-3 bg-muted/10">
                                <h4 className="font-bold text-foreground">Agregar Productos al Pedido:</h4>
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-6">
                                        <select
                                            value={itemTemp.variante_id}
                                            onChange={(e) => {
                                                const idSel = e.target.value
                                                const ex = (Array.isArray(existencias) ? existencias : []).find(x => String(x.variante_id || x.id) === String(idSel))
                                                setItemTemp({
                                                    ...itemTemp,
                                                    variante_id: idSel,
                                                    precio_unitario: safeNumber(ex?.variante?.precio || 50)
                                                })
                                            }}
                                            className="w-full rounded-lg border bg-background px-2 py-1.5 outline-none text-xs"
                                        >
                                            <option value="">Seleccione producto en stock...</option>
                                            {(Array.isArray(existencias) ? existencias : []).map((ex) => (
                                                <option key={ex.variante_id || ex.id} value={ex.variante_id || ex.id}>
                                                    {ex.variante?.producto?.nombre || ex.producto_nombre || 'Producto'} (Stock: {safeNumber(ex.cantidad_fisica ?? ex.cantidad)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min={1}
                                            value={itemTemp.cantidad}
                                            onChange={(e) => setItemTemp({ ...itemTemp, cantidad: Math.max(1, Number(e.target.value)) })}
                                            placeholder="Cant."
                                            className="w-full rounded-lg border bg-background px-2 py-1.5 text-center font-bold text-xs"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min={0}
                                            value={itemTemp.precio_unitario}
                                            onChange={(e) => setItemTemp({ ...itemTemp, precio_unitario: Number(e.target.value) })}
                                            placeholder="Precio"
                                            className="w-full rounded-lg border bg-background px-2 py-1.5 text-center font-bold text-xs"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <button
                                            type="button"
                                            onClick={agregarItemAlPedido}
                                            className="w-full bg-primary text-primary-foreground py-1.5 rounded-lg font-bold hover:bg-primary/90 text-xs"
                                        >
                                            + Agregar
                                        </button>
                                    </div>
                                </div>

                                {/* Tabla de Ítems Agregados */}
                                {formNuevo.items.length > 0 && (
                                    <div className="border rounded bg-background overflow-hidden">
                                        <table className="w-full text-left text-[11px]">
                                            <thead className="bg-muted text-muted-foreground border-b font-semibold">
                                                <tr>
                                                    <th className="px-2 py-1">Producto</th>
                                                    <th className="px-2 py-1 text-center">Cant.</th>
                                                    <th className="px-2 py-1 text-center">Precio</th>
                                                    <th className="px-2 py-1 text-center">Subtotal</th>
                                                    <th className="px-2 py-1 text-right">Quitar</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {formNuevo.items.map((it, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-2 py-1 font-semibold">{it.nombre}</td>
                                                        <td className="px-2 py-1 text-center font-bold">{it.cantidad}</td>
                                                        <td className="px-2 py-1 text-center">Q {it.precio_unitario.toFixed(2)}</td>
                                                        <td className="px-2 py-1 text-center font-bold">Q {it.subtotal.toFixed(2)}</td>
                                                        <td className="px-2 py-1 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => eliminarItemPedido(idx)}
                                                                className="text-destructive font-bold hover:underline"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="p-2 bg-muted/20 text-right font-bold text-xs border-t">
                                            Total Pedido: Q {calcularTotalNuevoPedido().toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Dirección de Envío (Si aplica)</label>
                                <input
                                    type="text"
                                    value={formNuevo.direccion_envio}
                                    onChange={(e) => setFormNuevo({ ...formNuevo, direccion_envio: e.target.value })}
                                    placeholder="Ej. 4ta Calle 3-12 Zona 1, Guatemala..."
                                    className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setModalNuevoPedido(false)}
                                    className="rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={procesando || formNuevo.items.length === 0}
                                    className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {procesando ? 'Guardando...' : 'Confirmar y Cobrar Pedido'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Verificación de Empaque y Checklist (Bodeguero) */}
            {modalVerificar && pedidoSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <ClipboardCheck size={18} className="text-emerald-600" /> Verificación y Checklist de Salida (Bodega)
                            </h2>
                            <button onClick={() => setModalVerificar(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div className="bg-emerald-500/10 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs">
                                <strong>Pedido #{pedidoSeleccionado.numero || pedidoSeleccionado.id}</strong> — Marque cada ítem a medida que lo empaque físicamente.
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
                            <button
                                onClick={() => setModalVerificar(false)}
                                className="rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={pasarADespachoDirecto}
                                disabled={!todosVerificados()}
                                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Proceder a Registrar Guía de Paquetería
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 3: Asignación de Guía Externa y Despacho */}
            {modalDespacho && pedidoSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <Truck size={18} className="text-primary" /> Registrar Guía Externa — Pedido {pedidoSeleccionado.numero || `#${pedidoSeleccionado.id}`}
                            </h2>
                            <button onClick={() => setModalDespacho(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={confirmarDespachoConGuia} className="p-5 space-y-4 text-xs">
                            <div className="bg-muted/30 p-3 rounded-lg border space-y-1">
                                <div><strong>Cliente:</strong> {pedidoSeleccionado.cliente?.nombre || 'Consumidor Final'}</div>
                                <div><strong>Dirección:</strong> {pedidoSeleccionado.entrega_direccion || 'Retiro en Sucursal'}</div>
                                <div><strong>Total:</strong> Q {safeNumber(pedidoSeleccionado.total).toFixed(2)}</div>
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Empresa de Envío / Transportista</label>
                                <select
                                    value={datosDespacho.transportista}
                                    onChange={(e) => setDatosDespacho({ ...datosDespacho, transportista: e.target.value })}
                                    className="w-full rounded-lg border bg-background px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="Cargo Expreso">Cargo Expreso</option>
                                    <option value="Forza Delivery">Forza Delivery</option>
                                    <option value="GuateEx">GuateEx</option>
                                    <option value="Entrega Local / Propia">Entrega Local / Propia</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-foreground mb-1">
                                    Número de Guía de Envío (Externo) <span className="text-destructive">*</span>
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
                                <label className="block font-semibold text-muted-foreground mb-1">Observaciones de Salida (Opcional)</label>
                                <textarea
                                    value={datosDespacho.observaciones}
                                    onChange={(e) => setDatosDespacho({ ...datosDespacho, observaciones: e.target.value })}
                                    placeholder="Detalles sobre el empaque..."
                                    className="w-full rounded-lg border bg-background p-2 outline-none focus:ring-2 focus:ring-ring h-20"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setModalDespacho(false)}
                                    className="rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={procesando || !datosDespacho.numero_guia.trim()}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {procesando ? 'Despachando...' : 'Confirmar Despacho y Guardar Guía'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}