import { useState, useEffect, useMemo } from 'react'
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  X,
  Briefcase,
  Building,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import empleadoService from '@/services/empleado.service'
import catalogoService from '@/services/catalogo.service'

export default function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroSucursal, setFiltroSucursal] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')

  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 8

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [empleadoEditar, setEmpleadoEditar] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [formData, setFormData] = useState({
    codigo: '',
    nombres: '',
    apellidos: '',
    dpi: '',
    sucursal_id: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    telefono: '',
    email: '',
    perfil: 'VENDEDOR',
    password: '',
  })

  useEffect(() => {
    cargarAuxiliares()
    cargarEmpleados()
  }, [])

  const cargarAuxiliares = async () => {
    try {
      const res = await catalogoService.listar('sucursales', { activo: 'todos' })
      const lista = Array.isArray(res)
        ? res
        : Array.isArray(res?.datos)
        ? res.datos
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.rows)
        ? res.rows
        : []
      setSucursales(lista)
    } catch (e) {
      toast.error('Error al cargar la lista de sucursales')
    }
  }

  const cargarEmpleados = async () => {
    setLoading(true)
    try {
      const res = await empleadoService.listarEmpleados({ activo: 'todos' })
      const lista = Array.isArray(res)
        ? res
        : Array.isArray(res?.rows)
        ? res.rows
        : Array.isArray(res?.datos)
        ? res.datos
        : Array.isArray(res?.data)
        ? res.data
        : []
      setEmpleados(lista)
    } catch (error) {
      toast.error('Error al cargar la lista de empleados')
      setEmpleados([])
    } finally {
      setLoading(false)
    }
  }

  // Métricas
  const totalActivos = useMemo(
    () => empleados.filter((e) => e.activo ?? true).length,
    [empleados]
  )
  const totalVendedores = useMemo(
    () => empleados.filter((e) => (e.activo ?? true) && e.usuario?.perfil === 'VENDEDOR').length,
    [empleados]
  )
  const nuevosEsteMes = useMemo(() => {
    const hoy = new Date()
    return empleados.filter((e) => {
      if (!e.fecha_ingreso) return false
      const fi = new Date(e.fecha_ingreso)
      return fi.getFullYear() === hoy.getFullYear() && fi.getMonth() === hoy.getMonth()
    }).length
  }, [empleados])

  // Filtrado reactivo
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((emp) => {
      const q = busqueda.toLowerCase()
      const cumpleBusqueda =
        emp.nombres?.toLowerCase().includes(q) ||
        emp.apellidos?.toLowerCase().includes(q) ||
        emp.codigo?.toLowerCase().includes(q) ||
        emp.dpi?.toLowerCase().includes(q) ||
        emp.puesto?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q)

      const cumpleSucursal =
        !filtroSucursal || String(emp.sucursal_id) === String(filtroSucursal)

      const estadoActivo = emp.activo ?? true
      const cumpleEstado =
        filtroEstado === 'TODOS' ||
        (filtroEstado === 'ACTIVO' && estadoActivo) ||
        (filtroEstado === 'INACTIVO' && !estadoActivo)

      return cumpleBusqueda && cumpleSucursal && cumpleEstado
    })
  }, [empleados, busqueda, filtroSucursal, filtroEstado])

  const totalPaginas = Math.ceil(empleadosFiltrados.length / itemsPorPagina) || 1
  const empleadosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina
    return empleadosFiltrados.slice(inicio, inicio + itemsPorPagina)
  }, [empleadosFiltrados, paginaActual])

  const abrirModalCrear = () => {
    setEmpleadoEditar(null)
    const fechaHoy = new Date().toISOString().split('T')[0]
    setFormData({
      codigo: `EMP-${Date.now().toString().slice(-4)}`,
      nombres: '',
      apellidos: '',
      dpi: '',
      sucursal_id: sucursales[0]?.id || '',
      fecha_ingreso: fechaHoy,
      telefono: '',
      email: '',
      perfil: 'VENDEDOR',
      password: '',
    })
    setModalAbierto(true)
  }

  const abrirModalEditar = (emp) => {
    setEmpleadoEditar(emp)
    setFormData({
      codigo: emp.codigo || '',
      nombres: emp.nombres || '',
      apellidos: emp.apellidos || '',
      dpi: emp.dpi || '',
      sucursal_id: emp.sucursal_id || '',
      fecha_ingreso: emp.fecha_ingreso ? String(emp.fecha_ingreso).split('T')[0] : '',
      telefono: emp.telefono || '',
      email: emp.email || '',
      perfil: emp.usuario?.perfil || 'VENDEDOR',
      password: '',
    })
    setModalAbierto(true)
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!formData.codigo.trim()) return toast.error('El código es obligatorio')
    if (!formData.nombres.trim() || !formData.apellidos.trim()) {
      return toast.error('Nombres y apellidos son requeridos')
    }
    if (!formData.dpi.trim()) return toast.error('El DPI es obligatorio')
    if (!formData.sucursal_id) return toast.error('Selecciona una sucursal')
    if (!empleadoEditar) {
      if (!formData.email.trim()) return toast.error('El email es obligatorio')
      if (!formData.password.trim()) return toast.error('La contraseña inicial es obligatoria')
      if (formData.password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres')
    }

    setGuardando(true)
    try {
      const payload = {
        ...formData,
        sucursal_id: Number(formData.sucursal_id),
      }

      if (empleadoEditar) {
        await empleadoService.actualizarEmpleado(empleadoEditar.id, payload)
        toast.success('Datos de empleado actualizados')
      } else {
        await empleadoService.crearEmpleado(payload)
        toast.success('Empleado registrado correctamente')
      }

      setModalAbierto(false)
      cargarEmpleados()
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.mensaje ||
          error?.response?.data?.message ||
          'Error al guardar la información del empleado'
      )
    } finally {
      setGuardando(false)
    }
  }

  const handleDesactivar = async (emp) => {
    if (!confirm(`¿Deseas dar de baja lógica al empleado "${emp.nombres} ${emp.apellidos}"?`)) {
      return
    }
    try {
      await empleadoService.desactivarEmpleado(emp.id)
      toast.success('Empleado desactivado correctamente')
      cargarEmpleados()
    } catch (error) {
      const detalles = error?.response?.data?.error?.detalles?.[0]
      toast.error(
        detalles || error?.response?.data?.error?.mensaje || 'Error al desactivar empleado'
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gestión de Empleados
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra personal interno, asignación a sucursales y puestos de trabajo.
          </p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nuevo Empleado</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">En Servicio</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalActivos}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Vendedores</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalVendedores}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Ingresados este mes</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{nuevosEsteMes}</p>
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
              placeholder="Buscar por código, DPI, nombres, puesto o email..."
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
              value={filtroSucursal}
              onChange={(e) => {
                setFiltroSucursal(e.target.value)
                setPaginaActual(1)
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Todas las Sucursales</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>

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
              onClick={cargarEmpleados}
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
                <th className="px-6 py-3.5">Código / DPI</th>
                <th className="px-6 py-3.5">Empleado</th>
                <th className="px-6 py-3.5">Rol</th>
                <th className="px-6 py-3.5">Sucursal</th>
                <th className="px-6 py-3.5">Contacto</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Cargando nómina de empleados...
                  </td>
                </tr>
              ) : empleadosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron empleados registrados.
                  </td>
                </tr>
              ) : (
                empleadosPaginados.map((emp) => {
                  const estadoActivo = emp.activo ?? true
                  const sucursalNombre =
                    emp.sucursal?.nombre ||
                    sucursales.find((s) => String(s.id) === String(emp.sucursal_id))?.nombre ||
                    'General'

                  const iniciales = `${emp.nombres?.[0] || ''}${emp.apellidos?.[0] || ''}`.toUpperCase()

                  return (
                    <tr
                      key={emp.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      {/* Código / DPI */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {emp.codigo}
                        </span>
                        <br />
                        <span className="text-slate-400">DPI: {emp.dpi}</span>
                      </td>

                      {/* Nombres + Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                            {iniciales || 'EM'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {emp.nombres} {emp.apellidos}
                            </p>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Ingreso: {emp.fecha_ingreso ? String(emp.fecha_ingreso).split('T')[0] : 'N/D'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                          <Briefcase className="h-3 w-3" />
                          {emp.usuario?.perfil || emp.puesto || '—'}
                        </span>
                      </td>

                      {/* Sucursal */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {sucursalNombre}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td className="px-6 py-4 text-xs">
                        {emp.email && (
                          <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {emp.email}
                          </p>
                        )}
                        {emp.telefono ? (
                          <p className="text-slate-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {emp.telefono}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic">Sin teléfono</span>
                        )}
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
                            onClick={() => abrirModalEditar(emp)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDesactivar(emp)}
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

      {/* Modal Crear / Editar Empleado */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {empleadoEditar ? 'Editar Datos de Empleado' : 'Nuevo Empleado'}
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
                    Código de Empleado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. EMP-0001"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    DPI *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 2540 12345 0101"
                    value={formData.dpi}
                    onChange={(e) => setFormData({ ...formData, dpi: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Primer y segundo nombre"
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Apellidos completos"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Rol de Acceso *
                  </label>
                  <select
                    required
                    value={formData.perfil}
                    onChange={(e) => setFormData({ ...formData, perfil: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="BODEGUERO">Bodeguero</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Sucursal Asignada *
                  </label>
                  <select
                    required
                    value={formData.sucursal_id}
                    onChange={(e) => setFormData({ ...formData, sucursal_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Seleccione Sucursal</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_ingreso}
                    onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className={empleadoEditar ? 'sm:col-span-2' : ''}>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Correo Electrónico {!empleadoEditar && '*'}
                  </label>
                  <input
                    type="email"
                    required={!empleadoEditar}
                    placeholder="empleado@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {!empleadoEditar && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                      Contraseña Inicial *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                )}
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
                  {guardando ? 'Guardando...' : 'Guardar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}