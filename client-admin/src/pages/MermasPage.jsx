import { useState, useEffect, useCallback } from 'react'
import { AlertOctagon, Plus, RefreshCw, X, ShieldAlert, CheckCircle2, Clock, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import inventarioService from '@/services/inventario.service'

const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val))

export default function MermasPage() {
    const [mermas, setMermas] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [existencias, setExistencias] = useState([])
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [pestanaActiva, setPestanaActiva] = useState('PENDIENTES') // 'PENDIENTES' | 'HISTORIAL'

    const [mermaResolver, setMermaResolver] = useState(null)
    const [informeResolucion, setInformeResolucion] = useState({
        clasificacion: 'DAÑO_TRANSPORTE',
        observaciones: ''
    })

    const [formMerma, setFormMerma] = useState({
        sucursal_id: '',
        variante_id: '',
        cantidad: 1,
        motivo: ''
    })

    const [modalCrearAbierto, setModalCrearAbierto] = useState(false)

    const cargarDatosIniciales = useCallback(async () => {
        try {
            setCargando(true)
            const [resSuc, resMermas] = await Promise.all([
                inventarioService.listarSucursales(),
                inventarioService.listarMermas().catch(() => [])
            ])

            const listaSuc = Array.isArray(resSuc) ? resSuc : (resSuc?.data || resSuc?.datos || [])
            setSucursales(listaSuc)
            if (listaSuc.length > 0 && !formMerma.sucursal_id) {
                setFormMerma((prev) => ({ ...prev, sucursal_id: String(listaSuc[0].id) }))
            }

            const listaMermas = Array.isArray(resMermas) ? resMermas : (resMermas?.data || resMermas?.datos || resMermas?.rows || [])
            setMermas(listaMermas)
        } catch (err) {
            console.error('Error al cargar datos de mermas:', err)
            toast.error('No se pudo obtener el historial de mermas')
        } finally {
            setCargando(false)
        }
    }, [formMerma.sucursal_id])

    useEffect(() => {
        cargarDatosIniciales()
    }, [cargarDatosIniciales])

    const cargarExistenciasSucursal = useCallback(async (sucId) => {
        if (!sucId) {
            setExistencias([])
            return
        }
        try {
            const res = await inventarioService.listar({ sucursal_id: sucId, limit: 500 })
            const lista = Array.isArray(res) ? res : (res?.data || res?.datos || res?.rows || [])
            setExistencias(lista)
        } catch (err) {
            console.error('Error al cargar existencias:', err)
            setExistencias([])
        }
    }, [])

    useEffect(() => {
        if (formMerma.sucursal_id) {
            cargarExistenciasSucursal(formMerma.sucursal_id)
        }
    }, [formMerma.sucursal_id, cargarExistenciasSucursal])

    const handleRegistrarMermaDirecta = async (e) => {
        e.preventDefault()
        if (!formMerma.sucursal_id || !formMerma.variante_id || formMerma.cantidad <= 0 || !formMerma.motivo.trim()) {
            toast.error('Complete todos los campos obligatorios.')
            return
        }

        setGuardando(true)
        try {
            await inventarioService.registrarMerma({
                sucursal_id: Number(formMerma.sucursal_id),
                variante_id: Number(formMerma.variante_id),
                cantidad: Number(formMerma.cantidad),
                motivo: formMerma.motivo.trim()
            })

            toast.success('Merma registrada en movimientos y descontada del inventario.')
            setModalCrearAbierto(false)
            setFormMerma((prev) => ({ ...prev, variante_id: '', cantidad: 1, motivo: '' }))
            cargarDatosIniciales()
        } catch (err) {
            console.error('Error al registrar merma:', err)
            toast.error(err.response?.data?.error?.mensaje || 'Error al procesar la merma')
        } finally {
            setGuardando(false)
        }
    }

    const handleResolverMermaTraslado = async (e) => {
        e.preventDefault()
        if (!mermaResolver || !informeResolucion.observaciones.trim()) {
            toast.error('Debe detallar el informe de la merma.')
            return
        }

        setGuardando(true)
        try {
            await inventarioService.resolverMerma(mermaResolver.id, {
                motivo: `${informeResolucion.clasificacion}: ${informeResolucion.observaciones.trim()}`
            })

            toast.success('Informe de merma actualizado.')
            setMermaResolver(null)
            setInformeResolucion({ clasificacion: 'DAÑO_TRANSPORTE', observaciones: '' })
            cargarDatosIniciales()
        } catch (err) {
            console.error('Error al resolver merma:', err)
            toast.error('Error al actualizar la merma')
        } finally {
            setGuardando(false)
        }
    }

    // Lógica flexible para clasificar entre Pendientes (Traslados) e Historial Resuelto
    const mermasFiltradas = mermas.filter((m) => {
        const est = String(m.estado || '').toUpperCase()
        const mot = String(m.motivo || '').toUpperCase()

        const esMermaTraslado = mot.includes('TRASLADO') || mot.includes('FALTANTE') || mot.includes('RECEPCIÓN') || mot.includes('RECEPCION') || est === 'PENDIENTE'
        const estaResuelto = est === 'RESUELTO' || est === 'PROCESADO' || (mot.includes('DAÑO_TRANSPORTE') || mot.includes('PRENDA_ROTA'))

        if (pestanaActiva === 'PENDIENTES') {
            return esMermaTraslado && !estaResuelto
        } else {
            return !esMermaTraslado || estaResuelto
        }
    })

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto" translate="no">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <AlertOctagon className="text-destructive" /> Control y Clasificación de Mermas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Registro de mermas directas y desajustes de inventario
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setModalCrearAbierto(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-destructive px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-destructive/90"
                    >
                        <Plus size={15} /> Registrar Merma Directa
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

            <div className="flex border-b text-xs font-medium">
                <button
                    onClick={() => setPestanaActiva('PENDIENTES')}
                    className={`px-4 py-2.5 border-b-2 flex items-center gap-2 ${pestanaActiva === 'PENDIENTES' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Clock size={15} /> Por Resolver (Traslados)
                </button>
                <button
                    onClick={() => setPestanaActiva('HISTORIAL')}
                    className={`px-4 py-2.5 border-b-2 flex items-center gap-2 ${pestanaActiva === 'HISTORIAL' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <CheckCircle2 size={15} /> Historial de Mermas Registradas
                </button>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/60 border-b text-xs font-medium text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">ID / Fecha</th>
                                <th className="px-4 py-3">Sucursal</th>
                                <th className="px-4 py-3">Producto / Variante (SKU)</th>
                                <th className="px-4 py-3 text-center">Cantidad</th>
                                <th className="px-4 py-3">Motivo / Observación</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                            {cargando ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-primary" />
                                        Cargando registro de mermas...
                                    </td>
                                </tr>
                            ) : mermasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                                        <ShieldAlert size={32} className="mx-auto mb-2 opacity-40" />
                                        No hay mermas registradas en esta sección.
                                    </td>
                                </tr>
                            ) : (
                                mermasFiltradas.map((m) => (
                                    <tr key={m.id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3 font-semibold">
                                            #{m.id}
                                            <div className="text-[10px] text-muted-foreground font-normal">
                                                {new Date(m.createdAt || m.created_at || m.fecha).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {m.sucursal?.nombre || `Sucursal #${m.sucursal_id}`}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-foreground">{m.variante?.producto?.nombre || m.producto_nombre || 'Producto'}</div>
                                            <div className="font-mono text-[11px] text-muted-foreground">SKU: {m.variante?.sku || m.sku || 'N/A'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-destructive">
                                            -{safeNumber(m.cantidad)} u.
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {m.motivo || 'Sin motivo especificado'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {pestanaActiva === 'PENDIENTES' ? (
                                                <button
                                                    onClick={() => setMermaResolver(m)}
                                                    className="inline-flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-amber-600"
                                                >
                                                    <FileText size={13} /> Completar Informe
                                                </button>
                                            ) : (
                                                <span className="text-emerald-600 font-semibold text-[11px]">Registrado</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Completar Informe de Merma por Traslado */}
            {mermaResolver && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <FileText size={18} className="text-primary" /> Completar Informe de Merma #{mermaResolver.id}
                            </h2>
                            <button onClick={() => setMermaResolver(null)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleResolverMermaTraslado} className="p-5 space-y-4 text-xs">
                            <div>
                                <label className="block font-medium text-muted-foreground mb-1">Clasificación de la Pérdida</label>
                                <select
                                    value={informeResolucion.clasificacion}
                                    onChange={(e) => setInformeResolucion({ ...informeResolucion, clasificacion: e.target.value })}
                                    className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring font-semibold"
                                >
                                    <option value="DAÑO_TRANSPORTE">Daño durante el Transporte</option>
                                    <option value="PRENDA_ROTA">Prenda Rota / Defectuosa</option>
                                    <option value="PERDIDA_ROBO">Pérdida / Extravío en Tránsito</option>
                                    <option value="ERROR_CONTEO_ORIGEN">Error de Conteo en Origen</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-muted-foreground mb-1">Informe / Detalle Obligatorio</label>
                                <textarea
                                    value={informeResolucion.observaciones}
                                    onChange={(e) => setInformeResolucion({ ...informeResolucion, observaciones: e.target.value })}
                                    placeholder="Detalle los motivos..."
                                    className="w-full rounded-lg border bg-background p-2 outline-none focus:ring-2 focus:ring-ring h-24"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setMermaResolver(null)}
                                    className="rounded-lg border px-4 py-2 font-medium hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={guardando || !informeResolucion.observaciones.trim()}
                                    className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {guardando ? 'Guardando...' : 'Guardar Informe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Registrar Merma Directa */}
            {modalCrearAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-destructive flex items-center gap-2">
                                <AlertOctagon size={18} /> Registrar Merma Directa en Inventario
                            </h2>
                            <button onClick={() => setModalCrearAbierto(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleRegistrarMermaDirecta} className="p-5 space-y-4 text-xs">
                            <div>
                                <label className="block font-medium text-muted-foreground mb-1">Sucursal</label>
                                <select
                                    value={formMerma.sucursal_id}
                                    onChange={(e) => setFormMerma({ ...formMerma, sucursal_id: e.target.value, variante_id: '' })}
                                    className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    {sucursales.map((s) => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-muted-foreground mb-1">Producto / Variante en Stock</label>
                                <select
                                    value={formMerma.variante_id}
                                    onChange={(e) => setFormMerma({ ...formMerma, variante_id: e.target.value })}
                                    className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    <option value="">Selecciona un producto...</option>
                                    {existencias.map((ex) => {
                                        const prodNombre = ex.variante?.producto?.nombre || ex.producto_nombre || 'Producto'
                                        const sku = ex.variante?.sku || ex.sku || 'N/A'
                                        const stock = safeNumber(ex.cantidad_fisica ?? ex.cantidad)
                                        return (
                                            <option key={ex.variante_id || ex.id} value={ex.variante_id || ex.id}>
                                                {prodNombre} (SKU: {sku}) - Disponible: {stock} u.
                                            </option>
                                        )
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-muted-foreground mb-1">Cantidad a dar de baja</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={formMerma.cantidad}
                                    onChange={(e) => setFormMerma({ ...formMerma, cantidad: Math.max(1, Number(e.target.value)) })}
                                    className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-muted-foreground mb-1">Motivo Obligatorio</label>
                                <textarea
                                    value={formMerma.motivo}
                                    onChange={(e) => setFormMerma({ ...formMerma, motivo: e.target.value })}
                                    placeholder="Ej. Empaque dañado durante traslado interno..."
                                    className="w-full rounded-lg border bg-background p-2 outline-none focus:ring-2 focus:ring-ring h-20"
                                    required
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
                                    disabled={guardando}
                                    className="rounded-lg bg-destructive px-4 py-2 font-semibold text-white hover:bg-destructive/90 disabled:opacity-50"
                                >
                                    {guardando ? 'Registrando...' : 'Confirmar y Descontar Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}