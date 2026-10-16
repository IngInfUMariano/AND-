import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Clock,
  ShieldAlert,
  CreditCard,
  Building2,
  Check,
  Ban,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clienteService from '@/services/cliente.service'

const TIPOS_CLIENTE = [
  { id: 'MINORISTA', label: 'Venta Minorista', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' },
  { id: 'MAYORISTA', label: 'Venta Mayorista', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' },
]

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')

  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 8

  // Modales
  const [modalAbierto, setModalAbierto] = useState(false)
  const [clienteEditar, setClienteEditar] = useState(null)
  
  // Formulario Crear / Editar
  const [formData, setFormData] = useState({
    tipo: 'MINORISTA',
    nombre: '',
    nombre_comercial: '',
    nit: 'CF',
    email: '',
    telefono: '',
    direccion_fiscal: '',
    contacto_nombre: '',
    estado: 'APROBADO',
    limite_credito: '0',
    plazo_credito_dias: '0',
  })
  const [guardando, setGuardando] = useState(false)

  // Modal Aprobación / Rechazo Mayorista
  const [modalAprobacion, setModalAprobacion] = useState({ abierto: false, cliente: null, accion: '' })
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [creditoAprobacion, setCreditoAprobacion] = useState({ limite: '5000', plazo: '30' })
  const [procesandoAccion, setProcesandoAccion] = useState(false)

  useEffect(() => {
    cargarClientes()
  }, [])

  const cargarClientes = async () => {
    setLoading(true)
    try {
      const res = await clienteService.listarClientes({ activo: 'todos' })
      let lista = []
      if (Array.isArray(res)) {
        lista = res
      } else if (Array.isArray(res?.rows)) {
        lista = res.rows
      } else if (Array.isArray(res?.datos)) {
        lista = res.datos
      } else if (Array.isArray(res?.data)) {
        lista = res.data
      }
      setClientes(lista)
    } catch (error) {
      toast.error('Error al cargar la lista de clientes')
      setClientes([])
    } finally {
      setLoading(false)
    }
  }

  // Métricas
  const totalPendientes = useMemo(
    () => clientes.filter((c) => c.estado === 'PENDIENTE').length,
    [clientes]
  )
  const totalAprobados = useMemo(
    () => clientes.filter((c) => c.estado === 'APROBADO').length,
    [clientes]
  )

  // Filtrado reactivo local
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const termino = busqueda.toLowerCase()
      const cumpleBusqueda =
        c.nombre?.toLowerCase().includes(termino) ||
        c.codigo?.toLowerCase().includes(termino) ||
        c.nit?.toLowerCase().includes(termino) ||
        c.email?.toLowerCase().includes(termino) ||
        c.nombre_comercial?.toLowerCase().includes(termino)

      const cumpleTipo = !filtroTipo || c.tipo === filtroTipo

      const cumpleEstado =
        filtroEstado === 'TODOS' ||
        (filtroEstado === 'PENDIENTE' && c.estado === 'PENDIENTE') ||
        (filtroEstado === 'APROBADO' && c.estado === 'APROBADO') ||
        (filtroEstado === 'INACTIVO' && (!c.activo || c.estado === 'INACTIVO'))

      return cumpleBusqueda && cumpleTipo && cumpleEstado
    })
  }, [clientes, busqueda, filtroTipo, filtroEstado])

  const totalPaginas = Math.ceil(clientesFiltrados.length / itemsPorPagina) || 1
  const clientesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina
    return clientesFiltrados.slice(inicio, inicio + itemsPorPagina)
  }, [clientesFiltrados, paginaActual])

  const abrirModalCrear = () => {
    setClienteEditar(null)
    setFormData({
      tipo: 'MINORISTA',
      nombre: '',
      nombre_comercial: '',
      nit: 'CF',
      email: '',
      telefono: '',
      direccion_fiscal: '',
      contacto_nombre: '',
      estado: 'APROBADO',
      limite_credito: '0',
      plazo_credito_dias: '0',
    })
    setModalAbierto(true)
  }

  const abrirModalEditar = (c) => {
    setClienteEditar(c)
    setFormData({
      tipo: c.tipo || 'MINORISTA',
      nombre: c.nombre || '',
      nombre_comercial: c.nombre_comercial || '',
      nit: c.nit || 'CF',
      email: c.email || '',
      telefono: c.telefono || '',
      direccion_fiscal: c.direccion_fiscal || '',
      contacto_nombre: c.contacto_nombre || '',
      estado: c.estado || 'APROBADO',
      limite_credito: c.limite_credito ? String(c.limite_credito) : '0',
      plazo_credito_dias: c.plazo_credito_dias ? String(c.plazo_credito_dias) : '0',
    })
    setModalAbierto(true)
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!formData.nombre.trim()) return toast.error('El nombre del cliente es requerido')
    if (!formData.email.trim()) return toast.error('El email es requerido')

    setGuardando(true)
    try {
      const payload = {
        ...formData,
        limite_credito: Number(formData.limite_credito),
        plazo_credito_dias: Number(formData.plazo_credito_dias),
      }

      if (clienteEditar) {
        await clienteService.actualizarCliente(clienteEditar.id, payload)
        toast.success('Cliente actualizado correctamente')
      } else {
        await clienteService.crearCliente(payload)
        toast.success('Cliente registrado correctamente')
      }

      setModalAbierto(false)
      cargarClientes()
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.mensaje ||
        error?.response?.data?.message ||
        'Error al guardar la información del cliente'
      )
    } finally {
      setGuardando(false)
    }
  }

  const handleDesactivar = async (c) => {
    if (!confirm(`¿Deseas dar de baja lógica al cliente "${c.nombre}"?`)) return
    try {
      await clienteService.desactivarCliente(c.id)
      toast.success('Cliente desactivado correctamente')
      cargarClientes()
    } catch (error) {
      const detalles = error?.response?.data?.error?.detalles?.[0]
      toast.error(detalles || error?.response?.data?.error?.mensaje || 'Error al desactivar cliente')
    }
  }

  const procesarSolicitud = async () => {
    if (!modalAprobacion.cliente) return
    setProcesandoAccion(true)
    try {
      if (modalAprobacion.accion === 'aprobar') {
        await clienteService.aprobarCliente(modalAprobacion.cliente.id, {
          limite_credito: Number(creditoAprobacion.limite),
          plazo_credito_dias: Number(creditoAprobacion.plazo),
        })
        toast.success('Solicitud aprobada con línea de crédito configurada')
      } else {
        if (!motivoRechazo.trim()) {
          setProcesandoAccion(false)
          return toast.error('Ingresa un motivo de rechazo')
        }
        await clienteService.rechazarCliente(modalAprobacion.cliente.id, motivoRechazo)
        toast.success('Solicitud rechazada correctamente')
      }
      setModalAprobacion({ abierto: false, cliente: null, accion: '' })
      cargarClientes()
    } catch (error) {
      toast.error(error?.response?.data?.error?.mensaje || 'Error al procesar la solicitud')
    } finally {
      setProcesandoAccion(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Directorio de Clientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra clientes minoristas, mayoristas, aprobaciones de crédito y condiciones comerciales.
          </p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Clientes
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{clientes.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Solicitudes Pendientes
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalPendientes}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Aprobados / Activos
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalAprobados}</p>
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
              placeholder="Buscar por NIT, código, nombre o email..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPaginaActual(1)
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filtroTipo}
              onChange={(e) => {
                setFiltroTipo(e.target.value)
                setPaginaActual(1)
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Todos los Tipos</option>
              {TIPOS_CLIENTE.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              {[
                { key: 'TODOS', label: 'Todos' },
                { key: 'PENDIENTE', label: 'Pendientes' },
                { key: 'APROBADO', label: 'Aprobados' },
                { key: 'INACTIVO', label: 'Inactivos' },
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => {
                    setFiltroEstado(v.key)
                    setPaginaActual(1)
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                    filtroEstado === v.key
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <button
              onClick={cargarClientes}
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
                <th className="px-6 py-3.5">Cliente</th>
                <th className="px-6 py-3.5">Tipo</th>
                <th className="px-6 py-3.5">Contacto</th>
                <th className="px-6 py-3.5">Crédito (Q)</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Cargando directorio de clientes...
                  </td>
                </tr>
              ) : clientesPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                clientesPaginados.map((c) => {
                  const tipoObj = TIPOS_CLIENTE.find((t) => t.id === c.tipo)
                  const estaInactivo = !c.activo || c.estado === 'INACTIVO'

                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      {/* Código / NIT */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {c.codigo}
                        </span>
                        <br />
                        <span className="text-slate-400">NIT: {c.nit || 'CF'}</span>
                      </td>

                      {/* Nombre & Comercial */}
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {c.nombre}
                        {c.nombre_comercial && (
                          <p className="text-xs font-normal text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" />
                            {c.nombre_comercial}
                          </p>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tipoObj?.badge || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {tipoObj?.label || c.tipo}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td className="px-6 py-4 text-xs">
                        <p className="font-medium text-slate-700 dark:text-slate-300">{c.email}</p>
                        <p className="text-slate-400">{c.telefono || 'Sin teléfono'}</p>
                      </td>

                      {/* Crédito */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <p className="font-bold text-slate-900 dark:text-white">
                          Q.{Number(c.limite_credito || 0).toFixed(2)}
                        </p>
                        {Number(c.credito_utilizado) > 0 && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400">
                            Uso: Q.{Number(c.credito_utilizado).toFixed(2)}
                          </p>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 text-xs">
                        {c.estado === 'PENDIENTE' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            <Clock className="h-3 w-3" /> Pendiente
                          </span>
                        ) : c.estado === 'RECHAZADO' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                            <Ban className="h-3 w-3" /> Rechazado
                          </span>
                        ) : estaInactivo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Inactivo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Aprobado
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.estado === 'PENDIENTE' && (
                            <>
                              <button
                                onClick={() =>
                                  setModalAprobacion({ abierto: true, cliente: c, accion: 'aprobar' })
                                }
                                title="Aprobar Solicitud Mayorista"
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setMotivoRechazo('')
                                  setModalAprobacion({ abierto: true, cliente: c, accion: 'rechazar' })
                                }}
                                title="Rechazar Solicitud"
                                className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => abrirModalEditar(c)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDesactivar(c)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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

      {/* Modal Crear / Editar Cliente */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {clienteEditar ? 'Editar Información del Cliente' : 'Nuevo Cliente'}
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
                    Tipo de Cliente *
                  </label>
                  <select
                    required
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {TIPOS_CLIENTE.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    NIT / Documento
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 12345678-9 o CF"
                    value={formData.nit}
                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Nombre o Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo del cliente"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
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
                    placeholder="Contacto principal"
                    value={formData.contacto_nombre}
                    onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="cliente@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="5555-5555"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Dirección Fiscal
                  </label>
                  <input
                    type="text"
                    placeholder="Dirección fiscal registrada"
                    value={formData.direccion_fiscal}
                    onChange={(e) => setFormData({ ...formData, direccion_fiscal: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Condiciones de Crédito */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Límite de Crédito (Q)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.limite_credito}
                    onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Plazo de Crédito (Días)
                  </label>
                  <input
                    type="number"
                    value={formData.plazo_credito_dias}
                    onChange={(e) => setFormData({ ...formData, plazo_credito_dias: e.target.value })}
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
                  {guardando ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Aprobación / Rechazo Mayorista */}
      {modalAprobacion.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {modalAprobacion.accion === 'aprobar' ? 'Aprobar Solicitud Mayorista' : 'Rechazar Solicitud'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Cliente: <span className="font-semibold text-slate-700 dark:text-slate-200">{modalAprobacion.cliente?.nombre}</span>
            </p>

            {modalAprobacion.accion === 'aprobar' ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Límite de Crédito Autorizado (Q)
                  </label>
                  <input
                    type="number"
                    value={creditoAprobacion.limite}
                    onChange={(e) => setCreditoAprobacion({ ...creditoAprobacion, limite: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Plazo de Pago (Días)
                  </label>
                  <input
                    type="number"
                    value={creditoAprobacion.plazo}
                    onChange={(e) => setCreditoAprobacion({ ...creditoAprobacion, plazo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Motivo de Rechazo *
                </label>
                <textarea
                  rows={3}
                  placeholder="Escribe la razón para rechazar la solicitud..."
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAprobacion({ abierto: false, cliente: null, accion: '' })}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoAccion}
                onClick={procesarSolicitud}
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm ${
                  modalAprobacion.accion === 'aprobar'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {procesandoAccion ? 'Procesando...' : modalAprobacion.accion === 'aprobar' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}