import { useState, useEffect, useMemo } from 'react'
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Building2,
  Mail,
  Phone,
  UserCheck,
  MapPin,
  Clock,
  CreditCard,
} from 'lucide-react'
import toast from 'react-hot-toast'
import proveedorService from '@/services/proveedor.service'

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')

  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 8

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [proveedorEditar, setProveedorEditar] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [formData, setFormData] = useState({
    codigo: '',
    razon_social: '',
    nombre_comercial: '',
    nit: 'CF',
    direccion: '',
    contacto_nombre: '',
    telefono: '',
    email: '',
    condiciones_pago: 'Contado',
    plazo_entrega_dias: '3',
  })

  useEffect(() => {
    cargarProveedores()
  }, [])

  const cargarProveedores = async () => {
    setLoading(true)
    try {
      const res = await proveedorService.listarProveedores({ activo: 'todos' })
      const lista = Array.isArray(res)
        ? res
        : Array.isArray(res?.rows)
        ? res.rows
        : Array.isArray(res?.datos)
        ? res.datos
        : Array.isArray(res?.data)
        ? res.data
        : []
      setProveedores(lista)
    } catch (error) {
      toast.error('Error al cargar la lista de proveedores')
      setProveedores([])
    } finally {
      setLoading(false)
    }
  }

  // Métricas
  const totalActivos = useMemo(
    () => proveedores.filter((p) => p.activo ?? true).length,
    [proveedores]
  )
  const totalInactivos = useMemo(
    () => proveedores.length - totalActivos,
    [proveedores, totalActivos]
  )

  // Filtrado reactivo
  const proveedoresFiltrados = useMemo(() => {
    return proveedores.filter((prov) => {
      const q = busqueda.toLowerCase()
      const cumpleBusqueda =
        prov.razon_social?.toLowerCase().includes(q) ||
        prov.nombre_comercial?.toLowerCase().includes(q) ||
        prov.codigo?.toLowerCase().includes(q) ||
        prov.nit?.toLowerCase().includes(q) ||
        prov.contacto_nombre?.toLowerCase().includes(q) ||
        prov.email?.toLowerCase().includes(q)

      const estadoActivo = prov.activo ?? true
      const cumpleEstado =
        filtroEstado === 'TODOS' ||
        (filtroEstado === 'ACTIVO' && estadoActivo) ||
        (filtroEstado === 'INACTIVO' && !estadoActivo)

      return cumpleBusqueda && cumpleEstado
    })
  }, [proveedores, busqueda, filtroEstado])

  const totalPaginas = Math.ceil(proveedoresFiltrados.length / itemsPorPagina) || 1
  const proveedoresPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina
    return proveedoresFiltrados.slice(inicio, inicio + itemsPorPagina)
  }, [proveedoresFiltrados, paginaActual])

  const abrirModalCrear = () => {
    setProveedorEditar(null)
    setFormData({
      codigo: `PROV-${Date.now().toString().slice(-4)}`,
      razon_social: '',
      nombre_comercial: '',
      nit: 'CF',
      direccion: '',
      contacto_nombre: '',
      telefono: '',
      email: '',
      condiciones_pago: 'Contado',
      plazo_entrega_dias: '3',
    })
    setModalAbierto(true)
  }

  const abrirModalEditar = (prov) => {
    setProveedorEditar(prov)
    setFormData({
      codigo: prov.codigo || '',
      razon_social: prov.razon_social || '',
      nombre_comercial: prov.nombre_comercial || '',
      nit: prov.nit || 'CF',
      direccion: prov.direccion || '',
      contacto_nombre: prov.contacto_nombre || '',
      telefono: prov.telefono || '',
      email: prov.email || '',
      condiciones_pago: prov.condiciones_pago || 'Contado',
      plazo_entrega_dias: prov.plazo_entrega_dias ? String(prov.plazo_entrega_dias) : '0',
    })
    setModalAbierto(true)
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!formData.codigo.trim()) return toast.error('El código de proveedor es obligatorio')
    if (!formData.razon_social.trim()) return toast.error('La razón social es obligatoria')
    if (!formData.nit.trim()) return toast.error('El NIT es obligatorio')

    setGuardando(true)
    try {
      const payload = {
        ...formData,
        plazo_entrega_dias: Number(formData.plazo_entrega_dias || 0),
      }

      if (proveedorEditar) {
        await proveedorService.actualizarProveedor(proveedorEditar.id, payload)
        toast.success('Datos del proveedor actualizados')
      } else {
        await proveedorService.crearProveedor(payload)
        toast.success('Proveedor registrado correctamente')
      }

      setModalAbierto(false)
      cargarProveedores()
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.mensaje ||
          error?.response?.data?.message ||
          'Error al guardar la información del proveedor'
      )
    } finally {
      setGuardando(false)
    }
  }

  const handleDesactivar = async (prov) => {
    if (!confirm(`¿Deseas dar de baja lógica al proveedor "${prov.razon_social}"?`)) {
      return
    }
    try {
      await proveedorService.desactivarProveedor(prov.id)
      toast.success('Proveedor desactivado correctamente')
      cargarProveedores()
    } catch (error) {
      const detalles = error?.response?.data?.error?.detalles?.[0]
      toast.error(
        detalles || error?.response?.data?.error?.mensaje || 'Error al desactivar proveedor'
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Directorio de Proveedores
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra proveedores de insumos, compras de mercancía y condiciones comerciales.
          </p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Proveedores
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{proveedores.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Activos</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalActivos}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Inactivos</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalInactivos}</p>
          </div>
        </div>
      </div>

      {/* Contenedor Tabla */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, NIT, razón social, contacto o email..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPaginaActual(1)
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              {['TODOS', 'ACTIVO', 'INACTIVO'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setFiltroEstado(st)
                    setPaginaActual(1)
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                    filtroEstado === st
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  {st === 'TODOS' ? 'Todos' : st === 'ACTIVO' ? 'Activos' : 'Inactivos'}
                </button>
              ))}
            </div>

            <button
              onClick={cargarProveedores}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3.5">Código / NIT</th>
                <th className="px-6 py-3.5">Proveedor</th>
                <th className="px-6 py-3.5">Contacto</th>
                <th className="px-6 py-3.5">Condiciones Comercial</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Cargando catálogo de proveedores...
                  </td>
                </tr>
              ) : proveedoresPaginados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron proveedores registrados.
                  </td>
                </tr>
              ) : (
                proveedoresPaginados.map((prov) => {
                  const estadoActivo = prov.activo ?? true

                  return (
                    <tr
                      key={prov.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      {/* Código / NIT */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {prov.codigo}
                        </span>
                        <br />
                        <span className="text-slate-400">NIT: {prov.nit || 'CF'}</span>
                      </td>

                      {/* Razón Social + Comercial */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {prov.razon_social}
                        </p>
                        {prov.nombre_comercial && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" />
                            {prov.nombre_comercial}
                          </p>
                        )}
                      </td>

                      {/* Contacto */}
                      <td className="px-6 py-4 text-xs">
                        <p className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-slate-400" />
                          {prov.contacto_nombre || 'Sin contacto directo'}
                        </p>
                        {prov.email && (
                          <p className="text-slate-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {prov.email}
                          </p>
                        )}
                        {prov.telefono && (
                          <p className="text-slate-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {prov.telefono}
                          </p>
                        )}
                      </td>

                      {/* Condiciones Comercial */}
                      <td className="px-6 py-4 text-xs">
                        <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1 font-medium">
                          <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                          {prov.condiciones_pago || 'Contado'}
                        </p>
                        <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          Entrega: {prov.plazo_entrega_dias || 0} días
                        </p>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            estadoActivo
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                              : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                          }`}
                        >
                          {estadoActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirModalEditar(prov)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDesactivar(prov)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Proveedor */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {proveedorEditar ? 'Editar Datos del Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Código de Proveedor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. PROV-0001"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    NIT *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 9876543-2 o CF"
                    value={formData.nit}
                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Distribuidora Textil S.A."
                    value={formData.razon_social}
                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={formData.nombre_comercial}
                    onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Nombre de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={formData.contacto_nombre}
                    onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="2222-2222"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="ventas@proveedor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Condiciones de Pago
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Contado, Crédito 30 días"
                    value={formData.condiciones_pago}
                    onChange={(e) => setFormData({ ...formData, condiciones_pago: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Plazo Entrega (Días)
                  </label>
                  <input
                    type="number"
                    placeholder="3"
                    value={formData.plazo_entrega_dias}
                    onChange={(e) => setFormData({ ...formData, plazo_entrega_dias: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Dirección
                  </label>
                  <input
                    type="text"
                    placeholder="Dirección física o fiscal"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {guardando ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}