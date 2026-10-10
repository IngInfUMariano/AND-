import { useState, useEffect, useMemo } from 'react'
import {
  FolderTree,
  Tag,
  Calendar,
  Ruler,
  Palette,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  PackageCheck,
  RefreshCw,
  Layers,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import catalogoService from '@/services/catalogo.service'

const TABS = [
  { id: 'categorias', label: 'Categorías', icon: FolderTree, singular: 'Categoría' },
  { id: 'marcas', label: 'Marcas', icon: Tag, singular: 'Marca' },
  { id: 'temporadas', label: 'Temporadas', icon: Calendar, singular: 'Temporada' },
  { id: 'tallas', label: 'Tallas', icon: Ruler, singular: 'Talla' },
  { id: 'colores', label: 'Colores', icon: Palette, singular: 'Color' },
]

// Presets de Categorías comunes
const GRUPOS_CATEGORIAS = [
  {
    grupo: 'Categorías Principales',
    categorias: [
      { nombre: 'Ropa', descripcion: 'Artículos generales de vestir' },
      { nombre: 'Calzado', descripcion: 'Todo tipo de calzado deportivo y casual' },
      { nombre: 'Accesorios', descripcion: 'Complementos, gorras, mochilas y cinchos' },
    ],
  },
  {
    grupo: 'Subcategorías Populares',
    categorias: [
      { nombre: 'Ropa Deportiva', descripcion: 'Ropa para actividad física y entrenamiento' },
      { nombre: 'Pantalones', descripcion: 'Jeans, pantalonetas y pantalones vestir/cargo' },
      { nombre: 'Camisetas y Polos', descripcion: 'Camisetas, playeras y polos casuales' },
      { nombre: 'Chaquetas y Abrigos', descripcion: 'Chumpas, sudaderas y abrigos' },
    ],
  },
]

// Presets de Marcas populares agrupadas por segmento
const GRUPOS_MARCAS = [
  {
    categoria: 'Deportivas / Urbanas',
    marcas: [
      { nombre: 'Adidas', descripcion: 'Indumentaria deportiva de alto desempeño' },
      { nombre: 'Nike', descripcion: 'Calzado y ropa deportiva de alto rendimiento' },
      { nombre: 'Puma', descripcion: 'Calzado y vestimenta deportiva y casual' },
      { nombre: 'Under Armour', descripcion: 'Ropa y accesorios deportivos tecnológicos' },
    ],
  },
  {
    categoria: 'Casual / Denim',
    marcas: [
      { nombre: "Levi's", descripcion: 'Especialistas en tela denim y pantalones jeans' },
      { nombre: 'Tommy Hilfiger', descripcion: 'Estilo clásico americano y ropa casual' },
      { nombre: 'Zara', descripcion: 'Moda rápida y tendencias urbanas contemporáneas' },
    ],
  },
  {
    categoria: 'Genericas / Propias',
    marcas: [
      { nombre: 'Generica', descripcion: 'Productos sin marca específica o importación' },
      { nombre: 'Marca Propia', descripcion: 'Línea de confección o marca exclusiva de la casa' },
    ],
  },
]

// Grupos organizados de tallas por tipo
const GRUPOS_TALLAS = [
  {
    titulo: 'Ropa',
    tallas: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  },
  {
    titulo: 'Pantalón / Calzado',
    tallas: ['28', '30', '32', '34', '36', '38', '40', '42'],
  },
  {
    titulo: 'Especiales',
    tallas: ['Única', 'Estándar'],
  },
]

// Presets y años para el generador rápido de temporadas
const TEMPORADAS_PREDEFINIDAS = [
  'Primavera / Verano',
  'Otoño / Invierno',
  'Navidad / Fin de Año',
  'Back to School',
  'Atemporal / Todo el Año',
]

const ANIOS_TEMPORADA = ['2026', '2027', '2028']

// Helper para extraer el booleano del estado de forma estricta
const obtenerEstadoBooleano = (item) => {
  if (typeof item?.estado === 'boolean') return item.estado
  if (typeof item?.activo === 'boolean') return item.activo
  if (typeof item?.is_active === 'boolean') return item.is_active
  if (item?.estado !== undefined && item?.estado !== null) return Boolean(item.estado)
  if (item?.activo !== undefined && item?.activo !== null) return Boolean(item.activo)
  return true
}

export default function Catalogos() {
  const [tabActiva, setTabActiva] = useState('categorias')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  // Filtros y Búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 8

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [itemEditar, setItemEditar] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    hex: '#000000',
    estado: true,
  })
  const [guardando, setGuardando] = useState(false)

  const tabActualInfo = TABS.find((t) => t.id === tabActiva)

  // Cargar datos al cambiar de pestaña
  useEffect(() => {
    cargarDatos()
    setBusqueda('')
    setFiltroEstado('TODOS')
    setPaginaActual(1)
  }, [tabActiva])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const res = await catalogoService.listar(tabActiva, { incluirInactivos: true, todos: true })
      
      const lista = Array.isArray(res)
        ? res
        : Array.isArray(res?.datos)
        ? res.datos
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.rows)
        ? res.rows
        : Array.isArray(res?.filas)
        ? res.filas
        : []

      setItems(lista)
    } catch (error) {
      toast.error(`Error al cargar ${tabActualInfo.label.toLowerCase()}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Métricas
  const totalActivos = useMemo(() => items.filter((i) => obtenerEstadoBooleano(i)).length, [items])
  const totalInactivos = useMemo(() => items.length - totalActivos, [items, totalActivos])

  // Filtrado de elementos
  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      const nombreItem = item.nombre || item.codigo || ''
      const cumpleBusqueda =
        nombreItem.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        (tabActiva === 'colores' && item.hex?.toLowerCase().includes(busqueda.toLowerCase()))

      const estadoItem = obtenerEstadoBooleano(item)
      const cumpleEstado =
        filtroEstado === 'TODOS' ||
        (filtroEstado === 'ACTIVO' && estadoItem) ||
        (filtroEstado === 'INACTIVO' && !estadoItem)

      return cumpleBusqueda && cumpleEstado
    })
  }, [items, busqueda, filtroEstado, tabActiva])

  // Paginación calculada
  const totalPaginas = Math.ceil(itemsFiltrados.length / itemsPorPagina) || 1
  const itemsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina
    return itemsFiltrados.slice(inicio, inicio + itemsPorPagina)
  }, [itemsFiltrados, paginaActual])

  // Modal handlers
  const abrirModalCrear = () => {
    setItemEditar(null)
    setFormData({
      nombre: '',
      descripcion: '',
      hex: '#000000',
      estado: true,
    })
    setModalAbierto(true)
  }

  const abrirModalEditar = (item) => {
    setItemEditar(item)
    const estadoActual = obtenerEstadoBooleano(item)

    setFormData({
      nombre: item.nombre || item.codigo || '',
      descripcion: item.descripcion || '',
      hex: item.hex || '#000000',
      estado: estadoActual,
    })
    setModalAbierto(true)
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!formData.nombre.trim()) {
      return toast.error('El nombre es obligatorio')
    }

    setGuardando(true)

    let payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      estado: Boolean(formData.estado),
      activo: Boolean(formData.estado),
    }

    if (tabActiva === 'colores') {
      payload.hex = formData.hex
    } else if (tabActiva === 'tallas') {
      payload = {
        codigo: formData.nombre,
        descripcion: formData.descripcion || formData.nombre,
        estado: Boolean(formData.estado),
        activo: Boolean(formData.estado),
      }
    } else if (tabActiva === 'temporadas') {
      const matchAnio = formData.nombre.match(/\d{4}/)
      const anioExtraido = matchAnio ? parseInt(matchAnio[0]) : new Date().getFullYear()
      payload = {
        nombre: formData.nombre,
        anio: anioExtraido,
        descripcion: formData.descripcion,
        estado: Boolean(formData.estado),
        activo: Boolean(formData.estado),
      }
    }

    try {
      if (itemEditar) {
        await catalogoService.actualizar(tabActiva, itemEditar.id, payload)

        const estadoAnterior = obtenerEstadoBooleano(itemEditar)
        if (estadoAnterior && !formData.estado) {
          try {
            await catalogoService.desactivar(tabActiva, itemEditar.id)
          } catch (e) {
            // Silencioso si la API prefiere baja lógica por PUT
          }
        }

        // Actualización optimista de estado
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemEditar.id
              ? {
                  ...item,
                  ...payload,
                  estado: formData.estado,
                  activo: formData.estado,
                }
              : item
          )
        )

        toast.success(
          `${tabActualInfo.singular} actualizada (${formData.estado ? 'Activo' : 'Inactivo'})`
        )
      } else {
        await catalogoService.crear(tabActiva, payload)
        toast.success(`${tabActualInfo.singular} creada correctamente`)
        cargarDatos()
      }
      setModalAbierto(false)
    } catch (error) {
      if (error?.response?.status === 409) {
        toast.error(`Ya existe un registro con el nombre "${formData.nombre}"`)
      } else {
        toast.error(error?.response?.data?.message || 'Error al guardar el registro')
      }
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (item) => {
    const itemId = typeof item === 'object' ? item.id : item
    const itemNombre = typeof item === 'object' ? (item.nombre || item.codigo) : ''

    if (!confirm(`¿Estás seguro de desactivar ${tabActualInfo.singular.toLowerCase()} "${itemNombre}"?`)) return

    try {
      await catalogoService.eliminar(tabActiva, itemId)
      toast.success(`${tabActualInfo.singular} desactivada correctamente`)
      cargarDatos()
    } catch (error) {
      try {
        await catalogoService.actualizar(tabActiva, itemId, { estado: false, activo: false })
        toast.success(`${tabActualInfo.singular} desactivada correctamente`)
        cargarDatos()
      } catch (errActualizar) {
        toast.error(error?.response?.data?.message || 'Error al desactivar el registro')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gestión de Catálogos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra categorías, marcas, temporadas, tallas y colores de forma centralizada.
          </p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo {tabActualInfo.singular}</span>
        </button>
      </div>

      {/* Cards de Métricas (KPIs) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total {tabActualInfo.label}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{items.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Activos
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalActivos}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Inactivos
            </p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalInactivos}</p>
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5 dark:border-slate-800 dark:bg-slate-950">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const esActiva = tabActiva === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                esActiva
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${esActiva ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Contenedor Principal de Tabla y Filtros */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          {/* Búsqueda */}
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Buscar en ${tabActualInfo.label.toLowerCase()}...`}
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPaginaActual(1)
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-sm transition-all focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros tipo Toggle & Refresh */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
              {['TODOS', 'ACTIVO', 'INACTIVO'].map((estado) => (
                <button
                  key={estado}
                  onClick={() => {
                    setFiltroEstado(estado)
                    setPaginaActual(1)
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    filtroEstado === estado
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {estado === 'TODOS' ? 'Todos' : estado === 'ACTIVO' ? 'Activos' : 'Inactivos'}
                </button>
              ))}
            </div>

            <button
              onClick={cargarDatos}
              title="Recargar datos"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3.5">ID</th>
                <th className="px-6 py-3.5">{tabActiva === 'tallas' ? 'Código / Talla' : 'Nombre'}</th>
                {tabActiva === 'colores' && <th className="px-6 py-3.5">Muestra / HEX</th>}
                <th className="px-6 py-3.5">Descripción</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={tabActiva === 'colores' ? 6 : 5} className="py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Cargando {tabActualInfo.label.toLowerCase()}...</span>
                    </div>
                  </td>
                </tr>
              ) : itemsPaginados.length === 0 ? (
                <tr>
                  <td colSpan={tabActiva === 'colores' ? 6 : 5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">
                        <PackageCheck className="h-8 w-8" />
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        No se encontraron registros
                      </p>
                      <p className="text-xs text-slate-400">
                        {busqueda
                          ? 'Prueba ajustando el término de búsqueda o los filtros.'
                          : `Aún no hay ${tabActualInfo.label.toLowerCase()} registradas.`}
                      </p>
                      {!busqueda && (
                        <button
                          onClick={abrirModalCrear}
                          className="mt-2 text-xs font-semibold text-slate-900 underline dark:text-white"
                        >
                          + Crear la primera
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                itemsPaginados.map((item) => {
                  const estadoActivo = obtenerEstadoBooleano(item)
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-400">
                        #{item.id}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {item.nombre || item.codigo}
                      </td>

                      {/* Muestra visual para colores */}
                      {tabActiva === 'colores' && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-5 w-5 rounded-full border border-slate-300 shadow-inner dark:border-slate-700"
                              style={{ backgroundColor: item.hex || '#ffffff' }}
                            />
                            <span className="font-mono text-xs text-slate-500">
                              {item.hex || 'N/A'}
                            </span>
                          </div>
                        </td>
                      )}

                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {item.descripcion || <span className="italic text-slate-300">Sin descripción</span>}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            estadoActivo
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              estadoActivo ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {estadoActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirModalEditar(item)}
                            title="Editar"
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(item)}
                            title="Desactivar / Eliminar"
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
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

        {/* Paginación */}
        {itemsFiltrados.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando <span className="font-semibold text-slate-700 dark:text-slate-200">{itemsPaginados.length}</span> de{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{itemsFiltrados.length}</span> resultados
            </p>

            <div className="flex items-center gap-1">
              <button
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Anterior
              </button>
              <span className="px-3 text-xs font-medium text-slate-500">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {itemEditar ? `Editar ${tabActualInfo.singular}` : `Nueva ${tabActualInfo.singular}`}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardar} className="space-y-4 p-6">
              
              {/* Sección Selección Rápida si es Pestaña Categorías */}
              {tabActiva === 'categorias' && !itemEditar && (
                <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sugerencias de Categorías
                  </span>

                  <div className="space-y-2">
                    {GRUPOS_CATEGORIAS.map((g) => (
                      <div key={g.grupo} className="space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {g.grupo}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.categorias.map((c) => {
                            const esSeleccionada = formData.nombre === c.nombre
                            return (
                              <button
                                key={c.nombre}
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    nombre: esSeleccionada ? '' : c.nombre,
                                    descripcion: esSeleccionada ? '' : c.descripcion,
                                  })
                                }
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                  esSeleccionada
                                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {c.nombre}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Selección Rápida si es Pestaña Marcas */}
              {tabActiva === 'marcas' && !itemEditar && (
                <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sugerencias de Marcas Comerciales
                  </span>

                  <div className="space-y-2">
                    {GRUPOS_MARCAS.map((grupo) => (
                      <div key={grupo.categoria} className="space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {grupo.categoria}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {grupo.marcas.map((m) => {
                            const esSeleccionada = formData.nombre === m.nombre
                            return (
                              <button
                                key={m.nombre}
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    nombre: esSeleccionada ? '' : m.nombre,
                                    descripcion: esSeleccionada ? '' : m.descripcion,
                                  })
                                }
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                  esSeleccionada
                                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {m.nombre}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Selección Rápida si es Pestaña Tallas */}
              {tabActiva === 'tallas' && !itemEditar && (
                <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Selección rápida de Talla
                  </span>

                  <div className="space-y-2">
                    {GRUPOS_TALLAS.map((grupo) => (
                      <div key={grupo.titulo} className="space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {grupo.titulo}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {grupo.tallas.map((tallaVal) => {
                            const esSeleccionada = formData.nombre === tallaVal
                            return (
                              <button
                                key={tallaVal}
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    nombre: esSeleccionada ? '' : tallaVal,
                                  })
                                }
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                  esSeleccionada
                                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {tallaVal}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Generador Rápido si es Pestaña Temporadas */}
              {tabActiva === 'temporadas' && !itemEditar && (
                <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Generador Rápido de Temporada
                  </span>

                  <div className="space-y-2">
                    {/* Colección */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Colección
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {TEMPORADAS_PREDEFINIDAS.map((col) => {
                          const anioActual = new Date().getFullYear()
                          const nombreSugerido = `${col} ${anioActual}`
                          const esSeleccionada = formData.nombre === nombreSugerido

                          return (
                            <button
                              key={col}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  nombre: esSeleccionada ? '' : nombreSugerido,
                                })
                              }
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                esSeleccionada
                                  ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {col}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Modificadores de Año */}
                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Año
                      </p>
                      <div className="flex gap-1.5">
                        {ANIOS_TEMPORADA.map((anio) => (
                          <button
                            key={anio}
                            type="button"
                            onClick={() => {
                              if (formData.nombre) {
                                const baseNombre = formData.nombre.replace(/\d{4}/g, '').trim()
                                setFormData({ ...formData, nombre: `${baseNombre} ${anio}`.trim() })
                              } else {
                                setFormData({ ...formData, nombre: `Temporada ${anio}` })
                              }
                            }}
                            className="rounded-lg border border-slate-200/80 bg-white px-3 py-1 text-xs font-mono font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {anio}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {tabActiva === 'tallas' ? 'Código / Talla *' : 'Nombre *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    tabActiva === 'categorias'
                      ? 'Ej. Ropa, Ropa Deportiva, Calzado...'
                      : tabActiva === 'marcas'
                      ? 'Ej. Adidas, Nike o Escriba una personal...'
                      : tabActiva === 'tallas'
                      ? 'Ej. S, M, L o Escriba una personalizada...'
                      : tabActiva === 'colores'
                      ? 'Ej. Azul Marino'
                      : tabActiva === 'temporadas'
                      ? 'Ej. Primavera / Verano 2026'
                      : 'Ej. Colección Exclusiva'
                  }
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Input Código HEX (Solo si es pestaña Colores) */}
              {tabActiva === 'colores' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Código de Color (HEX)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.hex}
                      onChange={(e) => setFormData({ ...formData, hex: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 p-1 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      placeholder="#000000"
                      value={formData.hex}
                      onChange={(e) => setFormData({ ...formData, hex: e.target.value })}
                      className="flex-1 font-mono rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Descripción opcional..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="estado"
                  checked={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="estado" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Registro Activo
                </label>
              </div>

              {/* Botones de Acción Modal */}
              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {guardando && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>{guardando ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}