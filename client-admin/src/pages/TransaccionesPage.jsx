import { useState, useEffect } from 'react'
import {
    CreditCard, Users, Wallet, Filter, RefreshCw, X,
    ArrowRightLeft, FileText, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { transaccionService } from '@/services/transaccion.service'
import { useAuth } from '@/context/AuthContext'

const formatQ = (val) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(val) || 0)
const formatDate = (dateString) => {
    if (!dateString) return '-'
    const d = new Date(dateString)
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function TransaccionesPage() {
    const { usuario } = useAuth()
    const nombreUsuario = usuario?.nombres || usuario?.nombre || usuario?.email || 'Administrador'

    const [activa, setActiva] = useState('STRIPE')
    const [cargando, setCargando] = useState(false)

    const [filtros, setFiltros] = useState({
        fecha_desde: '',
        fecha_hasta: '',
        estado: '',
        cliente_id: ''
    })

    const [clientes, setClientes] = useState([])
    const [pedidosCliente, setPedidosCliente] = useState([])
    const [transacciones, setTransacciones] = useState([])
    const [estadoCuenta, setEstadoCuenta] = useState(null)

    const [modalReembolso, setModalReembolso] = useState(null)
    const [motivoReembolso, setMotivoReembolso] = useState('')

    // Estados para el abono estilo cajero y referencia
    const [centavosStr, setCentavosStr] = useState('')
    const [formAbono, setFormAbono] = useState({ referencia: '', pedido_id: '' })

    useEffect(() => {
        cargarMayoristas()
    }, [])

    useEffect(() => {
        cargarDatos()
    }, [activa, filtros.fecha_desde, filtros.fecha_hasta, filtros.estado, filtros.cliente_id])

    useEffect(() => {
        if (filtros.cliente_id) {
            cargarPedidosMayorista(filtros.cliente_id)
        } else {
            setPedidosCliente([])
        }
    }, [filtros.cliente_id])

    const cargarMayoristas = async () => {
        try {
            const res = await transaccionService.listarMayoristas()
            if (Array.isArray(res)) setClientes(res)
        } catch (error) {
            console.error('Error al cargar mayoristas:', error)
            toast.error('No se pudo cargar el listado de clientes mayoristas.')
        }
    }

    const cargarPedidosMayorista = async (clienteId) => {
        try {
            const res = await transaccionService.listarPedidosCliente(clienteId)
            if (Array.isArray(res)) setPedidosCliente(res)
        } catch (error) {
            console.error('Error al cargar pedidos del cliente', error)
        }
    }

    const cargarDatos = async () => {
        setCargando(true)
        try {
            if (activa === 'STRIPE') {
                const res = await transaccionService.listarPagos(filtros)
                setTransacciones(res?.rows || (Array.isArray(res) ? res : []))
            } else if (activa === 'ESTADO_CUENTA' && filtros.cliente_id) {
                const res = await transaccionService.obtenerEstadoCuenta(filtros.cliente_id, filtros)
                setEstadoCuenta(res)
            }
        } catch (error) {
            console.error('Error al cargar datos financieros:', error)
            toast.error('Error al sincronizar los datos financieros.')
        } finally {
            setCargando(false)
        }
    }

    const handleReembolso = async (e) => {
        e.preventDefault()
        if (!motivoReembolso.trim()) return toast.error('Debe ingresar un motivo para el reembolso.')

        try {
            await transaccionService.reembolsarPago(modalReembolso.id, { motivo: motivoReembolso })
            toast.success('Reembolso procesado exitosamente.')
            setModalReembolso(null)
            setMotivoReembolso('')
            cargarDatos()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Error al procesar el reembolso.')
        }
    }

    // Cálculos para el abono estilo cajero
    const montoNumerico = centavosStr ? Number(centavosStr) / 100 : 0
    const deudaActual = estadoCuenta?.cliente?.credito_utilizado ? Number(estadoCuenta.cliente.credito_utilizado) : 0

    const handleMontoChange = (e) => {
        // Solo permite números, eliminando letras y caracteres especiales
        const soloDigitos = e.target.value.replace(/\D/g, '')
        setCentavosStr(soloDigitos)
    }

    const handleAbonoSubmit = async (e) => {
        e.preventDefault()
        if (!filtros.cliente_id) return toast.error('Seleccione un cliente mayorista en los filtros.')

        if (montoNumerico <= 0) {
            return toast.error('Debe ingresar un monto válido mayor a cero.')
        }

        if (deudaActual > 0 && montoNumerico > deudaActual) {
            return toast.error(`El abono (Q${montoNumerico.toFixed(2)}) no puede superar la deuda actual (${formatQ(deudaActual)}).`)
        }

        try {
            await transaccionService.registrarAbono(filtros.cliente_id, {
                monto: montoNumerico,
                referencia: formAbono.referencia ? formAbono.referencia.trim() : null,
                pedido_id: formAbono.pedido_id ? Number(formAbono.pedido_id) : null
            })
            toast.success('Abono registrado correctamente.')
            setCentavosStr('')
            setFormAbono({ referencia: '', pedido_id: '' })
            setActiva('ESTADO_CUENTA')
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Error al registrar el abono.')
        }
    }

    // Convertimos a funciones normales para evitar la recarga del DOM
    const renderFiltros = () => (
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-wrap items-end gap-4 mb-6" translate="no">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-1">
                <Filter size={16} className="text-primary" /> Filtros:
            </div>

            <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Desde
                <input type="date" className="h-9 rounded-lg border px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    value={filtros.fecha_desde} onChange={e => setFiltros({ ...filtros, fecha_desde: e.target.value })} />
            </label>

            <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Hasta
                <input type="date" className="h-9 rounded-lg border px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    value={filtros.fecha_hasta} onChange={e => setFiltros({ ...filtros, fecha_hasta: e.target.value })} />
            </label>

            {activa === 'STRIPE' && (
                <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Estado de transacción
                    <select className="h-9 rounded-lg border px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                        value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
                        <option value="">Todos</option>
                        <option value="EXITOSA">Exitosa</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="REEMBOLSADA">Reembolsada</option>
                        <option value="RECHAZADA">Rechazada</option>
                    </select>
                </label>
            )}

            {(activa === 'ESTADO_CUENTA' || activa === 'ABONOS') && (
                <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase text-muted-foreground tracking-wider min-w-[220px]">
                    Cliente Mayorista (Obligatorio)
                    <select className="h-9 rounded-lg border px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                        value={filtros.cliente_id} onChange={e => setFiltros({ ...filtros, cliente_id: e.target.value })}>
                        <option value="">Seleccione un cliente...</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre || c.razon_social || `Cliente ${c.id}`}</option>
                        ))}
                    </select>
                </label>
            )}

            <div className="flex gap-2 ml-auto pb-0.5">
                <button type="button" onClick={() => setFiltros({ fecha_desde: '', fecha_hasta: '', estado: '', cliente_id: '' })}
                    className="h-9 flex items-center gap-1.5 rounded-lg border px-4 text-xs font-bold text-foreground hover:bg-muted/40 transition-colors">
                    <X size={14} /> Limpiar
                </button>
                <button type="button" onClick={cargarDatos} disabled={cargando}
                    className="h-9 flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                    <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>
        </div>
    )

    const renderStripe = () => (
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm" translate="no">
            <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                    <thead className="bg-muted/30 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <tr>
                            <th className="px-5 py-4">Fecha</th>
                            <th className="px-5 py-4">ID Transacción</th>
                            <th className="px-5 py-4">Pedido</th>
                            <th className="px-5 py-4">Tipo</th>
                            <th className="px-5 py-4">Estado</th>
                            <th className="px-5 py-4 text-right">Monto</th>
                            <th className="px-5 py-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                        {transacciones.length === 0 ? (
                            <tr><td colSpan="7" className="px-5 py-10 text-center text-muted-foreground font-medium">No se encontraron transacciones para los filtros seleccionados.</td></tr>
                        ) : transacciones.map(tx => {
                            const error = ['RECHAZADA', 'ANULADA'].includes(tx.estado)
                            const exito = ['EXITOSA', 'REEMBOLSADA'].includes(tx.estado)
                            return (
                                <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-5 py-3.5 text-muted-foreground font-medium">{formatDate(tx.fecha)}</td>
                                    <td className="px-5 py-3.5 font-mono text-[11px] text-foreground">{tx.id_externo}</td>
                                    <td className="px-5 py-3.5 font-bold text-primary">#{tx.pedido?.numero || tx.pedido_id}</td>
                                    <td className="px-5 py-3.5 font-bold text-foreground">{tx.tipo}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={`px-2.5 py-1 rounded-[4px] font-bold text-[9px] border ${error ? 'border-rose-200 bg-rose-500/10 text-rose-700' : exito ? 'border-emerald-200 bg-emerald-500/10 text-emerald-700' : 'border-amber-200 bg-amber-500/10 text-amber-700'}`}>
                                            {tx.estado}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-black text-foreground">{formatQ(tx.monto)}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        {tx.tipo === 'PAGO' && tx.estado === 'EXITOSA' && (
                                            <button type="button" onClick={() => setModalReembolso(tx)} className="text-[10px] font-bold border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors">
                                                Reembolsar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )

    const renderEstadoCuenta = () => {
        if (!filtros.cliente_id) {
            return (
                <div className="border-2 border-dashed rounded-2xl p-16 text-center flex flex-col items-center justify-center text-muted-foreground" translate="no">
                    <Users size={48} className="mb-4 opacity-20" />
                    <p className="font-bold text-foreground">Seleccione un cliente mayorista</p>
                    <p className="text-xs mt-1">Utilice el filtro de la parte superior para buscar y cargar el estado de cuenta.</p>
                </div>
            )
        }

        if (!estadoCuenta || !estadoCuenta.cliente) {
            return <div className="p-12 text-center text-muted-foreground text-xs font-medium" translate="no">Cargando estado de cuenta...</div>
        }

        const { cliente, movimientos = [] } = estadoCuenta

        return (
            <div className="flex flex-col gap-6" translate="no">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-card border rounded-2xl p-6 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Límite Otorgado</p>
                        <h3 className="text-3xl font-black text-blue-600">{formatQ(cliente.limite_credito)}</h3>
                    </div>
                    <div className="bg-card border rounded-2xl p-6 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Deuda Actual (Utilizado)</p>
                        <h3 className="text-3xl font-black text-rose-600">{formatQ(cliente.credito_utilizado)}</h3>
                    </div>
                    <div className="bg-card border rounded-2xl p-6 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Crédito Disponible</p>
                        <h3 className="text-3xl font-black text-emerald-600">{formatQ(cliente.disponible)}</h3>
                    </div>
                </div>

                <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b bg-muted/20 font-bold text-sm text-foreground">Historial de Movimientos (Plazos y Abonos)</div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap text-sm">
                            <thead className="bg-muted/10 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-4">Fecha</th>
                                    <th className="px-5 py-4">Tipo</th>
                                    <th className="px-5 py-4">Referencia / Pedido</th>
                                    <th className="px-5 py-4 text-right">Monto</th>
                                    <th className="px-5 py-4 text-right">Saldo Resultante</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-xs">
                                {movimientos.length === 0 ? (
                                    <tr><td colSpan="5" className="px-5 py-10 text-center text-muted-foreground font-medium">El cliente no tiene movimientos registrados.</td></tr>
                                ) : movimientos.map(mov => (
                                    <tr key={mov.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-3.5 text-muted-foreground font-medium">{formatDate(mov.fecha)}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`px-2.5 py-1 rounded-[4px] font-bold text-[9px] border ${mov.tipo === 'CARGO' ? 'border-rose-200 bg-rose-500/10 text-rose-700' : 'border-emerald-200 bg-emerald-500/10 text-emerald-700'}`}>
                                                {mov.tipo}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-foreground font-medium">{mov.referencia || `Pedido #${mov.pedido?.numero || mov.pedido_id}`}</td>
                                        <td className={`px-5 py-3.5 text-right font-black ${mov.tipo === 'CARGO' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {mov.tipo === 'CARGO' ? '+' : '-'}{formatQ(mov.monto)}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">{formatQ(mov.saldo_resultante)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

    const renderAbono = () => (
        <div className="max-w-xl mx-auto bg-card border rounded-2xl p-8 shadow-sm" translate="no">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2 text-foreground"><Wallet className="text-primary" /> Registrar Abono Manual</h2>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">Registre un pago recibido de forma externa (ej. depósito bancario o efectivo) para reducir la deuda de un cliente mayorista en el sistema.</p>

            {filtros.cliente_id && (
                <div className="mb-6 p-3 bg-muted/40 border rounded-xl flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider">Deuda Actual del Cliente:</span>
                    <span className="font-black text-rose-600">{formatQ(deudaActual)}</span>
                </div>
            )}

            {!filtros.cliente_id ? (
                <div className="p-4 bg-amber-500/10 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold flex items-center gap-3">
                    <AlertTriangle size={18} className="shrink-0" /> Primero debe seleccionar un cliente mayorista en el área de filtros.
                </div>
            ) : (
                <form onSubmit={handleAbonoSubmit} className="flex flex-col gap-5">
                    <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Monto Recibido (Estilo Cajero) *
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            required
                            className="h-12 rounded-xl border px-4 text-lg font-black text-foreground outline-none focus:ring-2 focus:ring-primary/30 tracking-wide text-right"
                            value={centavosStr ? formatQ(montoNumerico) : ''}
                            onChange={handleMontoChange}
                            placeholder="Q 0.00"
                        />
                        <span className="text-[10px] text-muted-foreground font-normal normal-case mt-0.5">Escriba los números directamente sin puntos (ej. 10000 para Q100.00).</span>
                    </label>

                    <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Referencia de Pago
                        <input
                            type="text"
                            autoComplete="off"
                            className="h-11 rounded-xl border px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                            value={formAbono.referencia}
                            onChange={e => setFormAbono({ ...formAbono, referencia: e.target.value })}
                            placeholder="Número de boleta, transferencia o cheque"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Pedido Asociado (Opcional)
                        <select
                            className="h-11 rounded-xl border px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                            value={formAbono.pedido_id}
                            onChange={e => setFormAbono({ ...formAbono, pedido_id: e.target.value })}
                        >
                            <option value="">-- Sin pedido específico (Abono general) --</option>
                            {pedidosCliente.map(p => (
                                <option key={p.id} value={p.id}>
                                    Pedido #{p.numero || p.id} — Total: {formatQ(p.total)} ({p.estado})
                                </option>
                            ))}
                        </select>
                    </label>

                    <button type="submit" className="mt-4 h-11 w-full rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm">
                        Confirmar y Aplicar Abono
                    </button>
                </form>
            )}
        </div>
    )

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto min-h-screen" translate="no">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Gestión de Transacciones</h1>
                    <p className="text-sm text-muted-foreground mt-1">Control operativo de pagos y cuentas por cobrar autorizado para <span className="font-semibold text-primary">{nombreUsuario}</span>.</p>
                </div>
            </div>

            {renderFiltros()}

            <div className="flex border-b mb-6 overflow-x-auto hide-scrollbar">
                <button type="button" onClick={() => setActiva('STRIPE')}
                    className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activa === 'STRIPE' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}>
                    <CreditCard size={18} /> Pagos en Línea (Stripe)
                </button>
                <button type="button" onClick={() => setActiva('ESTADO_CUENTA')}
                    className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activa === 'ESTADO_CUENTA' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}>
                    <FileText size={18} /> Estado de Cuenta (Plazos)
                </button>
                <button type="button" onClick={() => setActiva('ABONOS')}
                    className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activa === 'ABONOS' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}>
                    <ArrowRightLeft size={18} /> Registrar Abono Manual
                </button>
            </div>

            {cargando && activa !== 'ESTADO_CUENTA' ? (
                <div className="p-16 flex flex-col items-center justify-center text-muted-foreground">
                    <RefreshCw className="animate-spin text-primary opacity-50 mb-4" size={36} />
                    <p className="text-sm font-medium">Sincronizando información financiera...</p>
                </div>
            ) : (
                <div className="animate-in fade-in duration-300">
                    {activa === 'STRIPE' && renderStripe()}
                    {activa === 'ESTADO_CUENTA' && renderEstadoCuenta()}
                    {activa === 'ABONOS' && renderAbono()}
                </div>
            )}

            {modalReembolso && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b bg-muted/20 flex justify-between items-center">
                            <h3 className="font-bold text-foreground">Reembolsar Transacción</h3>
                            <button type="button" onClick={() => setModalReembolso(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleReembolso} className="p-6 flex flex-col gap-5">
                            <div className="bg-rose-500/10 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-bold leading-relaxed">
                                Atención: Se procederá a reembolsar <span className="text-rose-900 font-black">{formatQ(modalReembolso.monto)}</span> a la tarjeta del cliente vinculada a la transacción {modalReembolso.id_externo}. Esta operación en Stripe no puede deshacerse.
                            </div>
                            <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
                                Motivo interno del reembolso *
                                <textarea required rows="3" className="rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                    value={motivoReembolso} onChange={e => setMotivoReembolso(e.target.value)} placeholder="Especifique la razón para el registro de auditoría" />
                            </label>
                            <div className="flex justify-end gap-3 mt-3">
                                <button type="button" onClick={() => setModalReembolso(null)} className="px-5 py-2.5 text-xs font-bold border rounded-xl hover:bg-muted/40 text-foreground transition-colors">Cancelar</button>
                                <button type="submit" className="px-5 py-2.5 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-sm">Confirmar Reembolso</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}