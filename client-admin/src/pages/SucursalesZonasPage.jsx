import { useState, useEffect, useCallback } from 'react'
import {
    Building2,
    Truck,
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    X,
    Check,
    MapPin,
    Calendar,
    Phone,
    DollarSign,
    Store,
    Warehouse
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

const DEPARTAMENTOS_GUATEMALA = [
    "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso",
    "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa",
    "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos",
    "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa"
]

export default function SucursalesZonasPage() {
    const [tabActiva, setTabActiva] = useState('sucursales') // 'sucursales' | 'zonas'
    const [cargando, setCargando] = useState(false)

    // Datos
    const [sucursales, setSucursales] = useState([])
    const [zonas, setZonas] = useState([])

    // Modales
    const [modalSucursal, setModalSucursal] = useState(false)
    const [modalZona, setModalZona] = useState(false)

    // Formularios
    const [formSucursal, setFormSucursal] = useState({
        id: null,
        codigo: '',
        nombre: '',
        direccion: '',
        telefono: '',
        es_bodega_central: false,
        vende_en_linea: true
    })

    const [formZona, setFormZona] = useState({
        id: null,
        nombre: '',
        costo: 0,
        dias_estimados: 2,
        departamentos: [],
        activo: true
    })

    // Cargar datos
    const cargarDatos = useCallback(async () => {
        setCargando(true)
        try {
            if (tabActiva === 'sucursales') {
                const res = await api.get('/sucursales?activo=todos')
                const rows = res.data?.rows || res.data?.data || res.data || []
                setSucursales(Array.isArray(rows) ? rows : [])
            } else {
                const res = await api.get('/zonas-envio?activo=todos')
                const rows = res.data?.rows || res.data?.data || res.data || []
                setZonas(Array.isArray(rows) ? rows : [])
            }
        } catch (err) {
            console.error(err)
            toast.error('Error al obtener datos del servidor')
        } finally {
            setCargando(false)
        }
    }, [tabActiva])

    useEffect(() => {
        cargarDatos()
    }, [cargarDatos])

    // --- ACCIONES SUCURSAL ---
    const abrirModalSucursal = (suc = null) => {
        if (suc) {
            setFormSucursal({
                id: suc.id,
                codigo: suc.codigo,
                nombre: suc.nombre,
                direccion: suc.direccion || '',
                telefono: suc.telefono || '',
                es_bodega_central: !!suc.es_bodega_central,
                vende_en_linea: !!suc.vende_en_linea
            })
        } else {
            setFormSucursal({
                id: null,
                codigo: '',
                nombre: '',
                direccion: '',
                telefono: '',
                es_bodega_central: false,
                vende_en_linea: true
            })
        }
        setModalSucursal(true)
    }

    const guardarSucursal = async (e) => {
        e.preventDefault()
        try {
            if (formSucursal.id) {
                await api.put(`/sucursales/${formSucursal.id}`, formSucursal)
                toast.success('Sucursal actualizada exitosamente')
            } else {
                await api.post('/sucursales', formSucursal)
                toast.success('Sucursal creada exitosamente')
            }
            setModalSucursal(false)
            cargarDatos()
        } catch (err) {
            console.error(err)
            toast.error(err.response?.data?.error?.mensaje || 'Error al guardar sucursal')
        }
    }

    const desactivarSucursal = async (id) => {
        if (!confirm('¿Estás seguro de que deseas desactivar esta sucursal?')) return
        try {
            await api.delete(`/sucursales/${id}`)
            toast.success('Sucursal desactivada correctamente')
            cargarDatos()
        } catch (err) {
            toast.error(err.response?.data?.error?.mensaje || 'No se pudo desactivar la sucursal')
        }
    }

    // --- ACCIONES ZONAS ---
    const abrirModalZona = (z = null) => {
        if (z) {
            const deps = typeof z.departamentos === 'string'
                ? z.departamentos.split(',').map(d => d.trim()).filter(Boolean)
                : (Array.isArray(z.departamentos) ? z.departamentos : [])
            setFormZona({
                id: z.id,
                nombre: z.nombre,
                costo: z.costo,
                dias_estimados: z.dias_estimados || 1,
                departamentos: deps,
                activo: !!z.activo
            })
        } else {
            setFormZona({
                id: null,
                nombre: '',
                costo: 0,
                dias_estimados: 2,
                departamentos: [],
                activo: true
            })
        }
        setModalZona(true)
    }

    const toggleDepartamento = (dep) => {
        setFormZona(prev => {
            const existe = prev.departamentos.includes(dep)
            return {
                ...prev,
                departamentos: existe
                    ? prev.departamentos.filter(d => d !== dep)
                    : [...prev.departamentos, dep]
            }
        })
    }

    const guardarZona = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                ...formZona,
                departamentos: formZona.departamentos.join(',')
            }

            if (formZona.id) {
                await api.put(`/zonas-envio/${formZona.id}`, payload)
                toast.success('Zona de envío actualizada')
            } else {
                await api.post('/zonas-envio', payload)
                toast.success('Zona de envío creada')
            }
            setModalZona(false)
            cargarDatos()
        } catch (err) {
            toast.error(err.response?.data?.error?.mensaje || 'Error al guardar zona de envío')
        }
    }

    const desactivarZona = async (id) => {
        if (!confirm('¿Desactivar esta zona de envío?')) return
        try {
            await api.delete(`/zonas-envio/${id}`)
            toast.success('Zona desactivada')
            cargarDatos()
        } catch (err) {
            toast.error('No se pudo desactivar la zona de envío')
        }
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto" translate="no">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Building2 className="text-primary" /> Configuración de Sucursales y Envíos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Administración corporativa de puntos de venta, bodegas y zonas con tarifas de entrega.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={cargarDatos}
                        disabled={cargando}
                        className="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-xs font-medium hover:bg-muted"
                    >
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Refrescar
                    </button>
                    <button
                        onClick={() => tabActiva === 'sucursales' ? abrirModalSucursal() : abrirModalZona()}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow"
                    >
                        <Plus size={16} /> {tabActiva === 'sucursales' ? 'Nueva Sucursal' : 'Nueva Zona de Envío'}
                    </button>
                </div>
            </div>

            {/* Pestañas */}
            <div className="flex border-b gap-4">
                <button
                    onClick={() => setTabActiva('sucursales')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${tabActiva === 'sucursales'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Store size={16} /> Sucursales y Puntos de Venta
                </button>
                <button
                    onClick={() => setTabActiva('zonas')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${tabActiva === 'zonas'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Truck size={16} /> Zonas y Tarifas de Envío
                </button>
            </div>

            {/* CONTENIDO 1: SUCURSALES */}
            {tabActiva === 'sucursales' && (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/60 border-b text-xs font-medium text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Código / Nombre</th>
                                <th className="px-4 py-3">Dirección</th>
                                <th className="px-4 py-3">Teléfono</th>
                                <th className="px-4 py-3 text-center">Tipo</th>
                                <th className="px-4 py-3 text-center">Tienda en Línea</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                            {cargando ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-primary" />
                                        Cargando sucursales...
                                    </td>
                                </tr>
                            ) : sucursales.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                                        No hay sucursales registradas.
                                    </td>
                                </tr>
                            ) : (
                                sucursales.map((s) => (
                                    <tr key={s.id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3 font-semibold">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono bg-muted px-2 py-0.5 rounded text-[10px] text-muted-foreground">{s.codigo}</span>
                                                <span className="text-foreground">{s.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{s.direccion || '—'}</td>
                                        <td className="px-4 py-3 font-mono">{s.telefono || '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            {s.es_bodega_central ? (
                                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full font-bold text-[10px] border border-amber-200">
                                                    <Warehouse size={12} /> Bodega Central
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded-full font-bold text-[10px] border border-blue-200">
                                                    <Store size={12} /> Sucursal Estándar
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold">
                                            {s.vende_en_linea ? <span className="text-emerald-600">Sí</span> : <span className="text-muted-foreground">No</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${s.activo ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>
                                                {s.activo ? 'ACTIVO' : 'INACTIVO'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => abrirModalSucursal(s)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                                                    <Edit size={15} />
                                                </button>
                                                {s.activo && (
                                                    <button onClick={() => desactivarSucursal(s.id)} className="p-1.5 hover:bg-rose-50 rounded text-rose-600">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CONTENIDO 2: ZONAS DE ENVÍO */}
            {tabActiva === 'zonas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {cargando ? (
                        <div className="col-span-full py-16 text-center text-muted-foreground">Cargando zonas de envío...</div>
                    ) : zonas.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-muted-foreground border rounded-xl bg-card">No hay zonas configuradas.</div>
                    ) : (
                        zonas.map((z) => {
                            const deps = typeof z.departamentos === 'string'
                                ? z.departamentos.split(',').filter(Boolean)
                                : []

                            return (
                                <div key={z.id} className="bg-card border rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4">
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                                                <MapPin size={18} className="text-primary" /> {z.nombre}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${z.activo ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>
                                                {z.activo ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between text-xs border-y py-2.5 my-3">
                                            <div>
                                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Tarifa de Envío</span>
                                                <span className="font-black text-emerald-600 text-sm">Q {Number(z.costo).toFixed(2)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Tiempo Estimado</span>
                                                <span className="font-bold text-foreground">{z.dias_estimados || 1} días hábiles</span>
                                            </div>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-1.5">
                                                Cobertura ({deps.length} Departamentos)
                                            </span>
                                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                                                {deps.length === 0 ? (
                                                    <span className="text-xs text-muted-foreground italic">Cobertura general</span>
                                                ) : (
                                                    deps.map((d, i) => (
                                                        <span key={i} className="bg-muted px-2 py-0.5 rounded text-[10px] font-medium">
                                                            {d.trim()}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 border-t pt-3">
                                        <button onClick={() => abrirModalZona(z)} className="inline-flex items-center gap-1 text-xs border px-3 py-1.5 rounded-lg font-semibold hover:bg-muted">
                                            <Edit size={13} /> Editar
                                        </button>
                                        {z.activo && (
                                            <button onClick={() => desactivarZona(z.id)} className="inline-flex items-center gap-1 text-xs text-rose-600 border border-rose-200 bg-rose-50 px-3 py-1.5 rounded-lg font-semibold hover:bg-rose-100">
                                                <Trash2 size={13} /> Desactivar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* MODAL SUCURSAL */}
            {modalSucursal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <Building2 size={18} className="text-primary" /> {formSucursal.id ? 'Editar Sucursal' : 'Nueva Sucursal'}
                            </h2>
                            <button onClick={() => setModalSucursal(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={guardarSucursal} className="p-5 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-foreground mb-1">Código Prefijo (Inmutable)</label>
                                    <input
                                        type="text"
                                        disabled={!!formSucursal.id}
                                        value={formSucursal.codigo}
                                        onChange={(e) => setFormSucursal({ ...formSucursal, codigo: e.target.value.toUpperCase() })}
                                        placeholder="Ej. SUC-01"
                                        className="w-full rounded-lg border bg-background px-3 py-2 font-mono font-bold text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-foreground mb-1">Nombre Comercial</label>
                                    <input
                                        type="text"
                                        value={formSucursal.nombre}
                                        onChange={(e) => setFormSucursal({ ...formSucursal, nombre: e.target.value })}
                                        placeholder="Ej. Sucursal Central"
                                        className="w-full rounded-lg border bg-background px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Dirección Física</label>
                                <input
                                    type="text"
                                    value={formSucursal.direccion}
                                    onChange={(e) => setFormSucursal({ ...formSucursal, direccion: e.target.value })}
                                    placeholder="Dirección completa..."
                                    className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Teléfono de Contacto</label>
                                <input
                                    type="text"
                                    value={formSucursal.telefono}
                                    onChange={(e) => setFormSucursal({ ...formSucursal, telefono: e.target.value })}
                                    placeholder="Ej. +502 2222-3333"
                                    className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formSucursal.es_bodega_central}
                                        onChange={(e) => setFormSucursal({ ...formSucursal, es_bodega_central: e.target.checked })}
                                        className="rounded border-muted-foreground"
                                    />
                                    <span className="font-semibold text-foreground">Es Bodega Central (Origen de Traslados)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formSucursal.vende_en_linea}
                                        onChange={(e) => setFormSucursal({ ...formSucursal, vende_en_linea: e.target.checked })}
                                        className="rounded border-muted-foreground"
                                    />
                                    <span className="font-semibold text-foreground">Habilitada para ventas en tienda en línea</span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button type="button" onClick={() => setModalSucursal(false)} className="rounded-lg border px-4 py-2 font-medium hover:bg-muted">
                                    Cancelar
                                </button>
                                <button type="submit" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90">
                                    Guardar Sucursal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ZONA DE ENVÍO */}
            {modalZona && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <Truck size={18} className="text-primary" /> {formZona.id ? 'Editar Zona de Envío' : 'Nueva Zona de Envío'}
                            </h2>
                            <button onClick={() => setModalZona(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={guardarZona} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                            <div>
                                <label className="block font-semibold text-foreground mb-1">Nombre de la Zona</label>
                                <input
                                    type="text"
                                    value={formZona.nombre}
                                    onChange={(e) => setFormZona({ ...formZona, nombre: e.target.value })}
                                    placeholder="Ej. Zona Metropolitana / Región Occidente"
                                    className="w-full rounded-lg border bg-background px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-foreground mb-1">Costo de Envío (Q)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formZona.costo}
                                        onChange={(e) => setFormZona({ ...formZona, costo: Number(e.target.value) })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-foreground mb-1">Días Estimados de Entrega</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formZona.dias_estimados}
                                        onChange={(e) => setFormZona({ ...formZona, dias_estimados: Number(e.target.value) })}
                                        className="w-full rounded-lg border bg-background px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">
                                    Seleccionar Cobertura por Departamentos ({formZona.departamentos.length} seleccionados)
                                </label>
                                <div className="border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto bg-muted/20 custom-scrollbar">
                                    {DEPARTAMENTOS_GUATEMALA.map((dep) => {
                                        const seleccionado = formZona.departamentos.includes(dep)
                                        return (
                                            <button
                                                key={dep}
                                                type="button"
                                                onClick={() => toggleDepartamento(dep)}
                                                className={`p-2 rounded border text-left flex items-center justify-between transition-all ${seleccionado ? 'bg-primary/10 border-primary font-bold text-primary' : 'bg-background hover:border-muted-foreground'
                                                    }`}
                                            >
                                                <span className="truncate">{dep}</span>
                                                {seleccionado && <Check size={14} />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button type="button" onClick={() => setModalZona(false)} className="rounded-lg border px-4 py-2 font-medium hover:bg-muted">
                                    Cancelar
                                </button>
                                <button type="submit" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90">
                                    Guardar Zona
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}