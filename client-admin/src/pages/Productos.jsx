import { useState, useEffect, useMemo } from 'react'
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Grid,
  Zap,
  Image as ImageIcon,
  ZoomIn,
} from 'lucide-react'
import toast from 'react-hot-toast'
import productoService from '@/services/producto.service'
import catalogoService from '@/services/catalogo.service'
import ImageUploader from '@/components/ImageUploader'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [marcas, setMarcas] = useState([])
  const [temporadas, setTemporadas] = useState([])
  const [tallas, setTallas] = useState([])
  const [colores, setColores] = useState([])

  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')

  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 8

  // Modales y Pestañas
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)
  const [productoCreadoId, setProductoCreadoId] = useState(null)
  const [pestañaModal, setPestañaModal] = useState('general') // 'general' | 'variantes' | 'imagen'

  // Modal para Ampliar Foto en Pop-up
  const [imagenModal, setImagenModal] = useState({ open: false, url: '', titulo: '' })

  // Formulario Producto Base
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria_id: '',
    marca_id: '',
    temporada_id: '',
    activo: true,
  })

  // Matriz de Variantes Generadas
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState([])
  const [coloresSeleccionados, setColoresSeleccionados] = useState([])
  const [precioBase, setPrecioBase] = useState('')
  const [stockBase, setStockBase] = useState('10')
  const [variantes, setVariantes] = useState([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarAuxiliares()
    cargarProductos()
  }, [])

  const cargarAuxiliares = async () => {
    try {
      const [catRes, marRes, tempRes, talRes, colRes] = await Promise.all([
        catalogoService.listar('categorias', { activo: 'todos' }),
        catalogoService.listar('marcas', { activo: 'todos' }),
        catalogoService.listar('temporadas', { activo: 'todos' }),
        catalogoService.listar('tallas', { activo: 'todos' }),
        catalogoService.listar('colores', { activo: 'todos' }),
      ])

      const normalizar = (res) =>
        Array.isArray(res)
          ? res
          : Array.isArray(res?.datos)
          ? res.datos
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.rows)
          ? res.rows
          : []

      setCategorias(normalizar(catRes))
      setMarcas(normalizar(marRes))
      setTemporadas(normalizar(tempRes))
      setTallas(normalizar(talRes))
      setColores(normalizar(colRes))
    } catch (e) {
      toast.error('Error al cargar catálogos requeridos')
    }
  }

  const cargarProductos = async () => {
    setLoading(true)
    try {
      const res = await productoService.listarProductos({ activo: 'todos' })
      const lista = Array.isArray(res)
        ? res
        : Array.isArray(res?.datos)
        ? res.datos
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.rows)
        ? res.rows
        : []

      setProductos(lista)
    } catch (error) {
      toast.error('Error al cargar productos')
      setProductos([])
    } finally {
      setLoading(false)
    }
  }

  // Extrae de forma defensiva la URL de la imagen del producto
  const obtenerUrlImagen = (prod) => {
    if (!prod) return null

    // 1. Array de imágenes asociadas
    if (prod.imagenes && Array.isArray(prod.imagenes) && prod.imagenes.length > 0) {
      const img = prod.imagenes.find((i) => i.es_principal) || prod.imagenes[0]
      return img?.url || img?.url_imagen || img?.path || null
    }

    if (prod.imagen_productos && Array.isArray(prod.imagen_productos) && prod.imagen_productos.length > 0) {
      const img = prod.imagen_productos.find((i) => i.es_principal) || prod.imagen_productos[0]
      return img?.url || img?.url_imagen || null
    }

    // 2. Propiedad de URL directa en el objeto producto
    if (prod.imagen_url) return prod.imagen_url
    if (prod.url_imagen) return prod.url_imagen
    if (prod.url) return prod.url

    return null
  }

  // Callback cuando ImageUploader completa la subida
  const handleImagenSubida = (imagenRecord) => {
    toast.success('Imagen guardada y asociada al catálogo')
    
    // Si viene la URL del registro devuelto por Cloudinary, la asignamos al estado local inmediatamente
    const urlCreada = imagenRecord?.url || imagenRecord?.url_imagen
    if (urlCreada && productoCreadoId) {
      setProductos((prev) =>
        prev.map((p) => {
          if (p.id === productoCreadoId) {
            const imagenesPrevias = p.imagenes || []
            return {
              ...p,
              imagen_url: urlCreada,
              imagenes: [{ url: urlCreada, es_principal: true }, ...imagenesPrevias],
            }
          }
          return p;
        })
      )
    }

    cargarProductos()
  }

  // Generador de Combinaciones Talla x Color
  const generarCombinaciones = () => {
    if (!formData.nombre.trim()) return toast.error('Ingrese un nombre de producto primero')
    if (tallasSeleccionadas.length === 0 || coloresSeleccionados.length === 0) {
      return toast.error('Seleccione al menos una Talla y un Color')
    }

    const nuevasVariantes = []
    const prefix = (formData.codigo || formData.nombre).substring(0, 3).toUpperCase()

    tallasSeleccionadas.forEach((tallaId) => {
      coloresSeleccionados.forEach((colorId) => {
        const tallaObj = tallas.find((t) => String(t.id) === String(tallaId))
        const colorObj = colores.find((c) => String(c.id) === String(colorId))

        const tallaCod = tallaObj?.codigo || tallaObj?.nombre || tallaId
        const colorNom = colorObj?.nombre || colorId
        const skuGenerado = `${prefix}-${tallaCod}-${colorNom.substring(0, 3).toUpperCase()}`

        nuevasVariantes.push({
          talla_id: tallaId,
          color_id: colorId,
          talla_nombre: tallaCod,
          color_nombre: colorNom,
          color_hex: colorObj?.hex || '#ffffff',
          sku: skuGenerado,
          precio_venta: precioBase || 0,
          stock: stockBase || 0,
          activo: true,
        })
      })
    })

    setVariantes(nuevasVariantes)
    toast.success(`${nuevasVariantes.length} variantes generadas`)
  }

  const toggleTalla = (id) => {
    setTallasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleColor = (id) => {
    setColoresSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Métricas y Filtrado
  const totalActivos = useMemo(
    () => productos.filter((p) => p.activo ?? p.estado ?? true).length,
    [productos]
  )
  const totalInactivos = useMemo(() => productos.length - totalActivos, [productos, totalActivos])

  const productosFiltrados = useMemo(() => {
    return productos.filter((prod) => {
      const cumpleBusqueda =
        prod.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        prod.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        prod.descripcion?.toLowerCase().includes(busqueda.toLowerCase())

      const cumpleCat =
        !filtroCategoria || String(prod.categoria_id) === String(filtroCategoria)

      const estadoActivo = prod.activo ?? prod.estado ?? true
      const cumpleEstado =
        filtroEstado === 'TODOS' ||
        (filtroEstado === 'ACTIVO' && estadoActivo) ||
        (filtroEstado === 'INACTIVO' && !estadoActivo)

      return cumpleBusqueda && cumpleCat && cumpleEstado
    })
  }, [productos, busqueda, filtroCategoria, filtroEstado])

  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina) || 1
  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina
    return productosFiltrados.slice(inicio, inicio + itemsPorPagina)
  }, [productosFiltrados, paginaActual])

  const abrirModalCrear = () => {
    setProductoEditar(null)
    setProductoCreadoId(null)
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria_id: categorias[0]?.id || '',
      marca_id: marcas[0]?.id || '',
      temporada_id: temporadas[0]?.id || '',
      activo: true,
    })
    setVariantes([])
    setTallasSeleccionadas([])
    setColoresSeleccionados([])
    setPrecioBase('')
    setStockBase('10')
    setPestañaModal('general')
    setModalAbierto(true)
  }

  const abrirModalEditar = async (prod) => {
    setProductoEditar(prod)
    setProductoCreadoId(prod.id)
    setFormData({
      codigo: prod.codigo || '',
      nombre: prod.nombre || '',
      descripcion: prod.descripcion || '',
      categoria_id: prod.categoria_id || '',
      marca_id: prod.marca_id || '',
      temporada_id: prod.temporada_id || '',
      activo: prod.activo ?? prod.estado ?? true,
    })

    try {
      const varsRes = await productoService.listarVariantesPorProducto(prod.id)
      const listaVars = Array.isArray(varsRes)
        ? varsRes
        : Array.isArray(varsRes?.datos)
        ? varsRes.datos
        : Array.isArray(varsRes?.data)
        ? varsRes.data
        : []
      setVariantes(listaVars)
    } catch (e) {
      setVariantes([])
    }

    setPestañaModal('general')
    setModalAbierto(true)
  }

  const handleGuardar = async (e) => {
    if (e) e.preventDefault()
    if (!formData.nombre.trim()) return toast.error('El nombre del producto es obligatorio')
    if (!formData.categoria_id) return toast.error('Seleccione una categoría')

    setGuardando(true)

    const codigoFinal =
      formData.codigo.trim() ||
      `${formData.nombre.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`

    const payload = {
      codigo: codigoFinal,
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      categoria_id: Number(formData.categoria_id),
      marca_id: formData.marca_id ? Number(formData.marca_id) : null,
      temporada_id: formData.temporada_id ? Number(formData.temporada_id) : null,
      activo: Boolean(formData.activo),
      estado: Boolean(formData.activo),
    }

    try {
      let prodId = productoEditar?.id
      if (productoEditar) {
        await productoService.actualizarProducto(productoEditar.id, payload)
        toast.success('Producto actualizado')
      } else {
        const nuevoProd = await productoService.crearProducto(payload)
        prodId = nuevoProd?.id || nuevoProd?.datos?.id || nuevoProd?.data?.id
        toast.success('Producto creado correctamente')
      }

      setProductoCreadoId(prodId)

      // Guardar variantes generadas
      if (prodId && variantes.length > 0) {
        for (const v of variantes) {
          if (!v.id) {
            await productoService.crearVariante({
              producto_id: prodId,
              talla_id: Number(v.talla_id),
              color_id: Number(v.color_id),
              sku: v.sku,
              stock: Number(v.stock),
              precio_venta: Number(v.precio_venta),
              activo: v.activo,
            })
          }
        }
      }

      cargarProductos()
      setPestañaModal('imagen')
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.mensaje ||
          error?.response?.data?.message ||
          'Error al guardar el producto'
      )
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (prod) => {
    if (!confirm(`¿Desactivar el producto "${prod.nombre}"?`)) return
    try {
      await productoService.desactivarProducto(prod.id)
      toast.success('Producto desactivado correctamente')
      cargarProductos()
    } catch (e) {
      toast.error('Error al desactivar el producto')
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Catálogo de Productos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestiona productos, precios, colores, tallas e imágenes del catálogo.
          </p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Productos
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{productos.length}</p>
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

      {/* Filtros y Tabla */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex flex-1 gap-2 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, nombre o descripción..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPaginaActual(1)
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value)
                setPaginaActual(1)
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Todas las Categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
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
              onClick={cargarProductos}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">Foto</th>
                <th className="px-6 py-3.5">Código</th>
                <th className="px-6 py-3.5">Producto</th>
                <th className="px-6 py-3.5">Categoría</th>
                <th className="px-6 py-3.5">Marca</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Cargando productos...
                  </td>
                </tr>
              ) : productosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron productos registrados.
                  </td>
                </tr>
              ) : (
                productosPaginados.map((prod) => {
                  const estadoActivo = prod.activo ?? prod.estado ?? true
                  const catNombre =
                    categorias.find((c) => String(c.id) === String(prod.categoria_id))?.nombre ||
                    'General'
                  const marcaNombre =
                    marcas.find((m) => String(m.id) === String(prod.marca_id))?.nombre || 'Genérica'

                  const imagenUrl = obtenerUrlImagen(prod)

                  return (
                    <tr
                      key={prod.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      {/* Columna Miniatura con Animación Hover + Clic para Abrir Pop-up */}
                      <td className="px-4 py-3 text-center">
                        {imagenUrl ? (
                          <div
                            onClick={() =>
                              setImagenModal({
                                open: true,
                                url: imagenUrl,
                                titulo: prod.nombre,
                              })
                            }
                            className="group relative h-10 w-10 mx-auto cursor-pointer overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-400 hover:shadow-md"
                            title="Haz clic para ampliar la imagen"
                          >
                            <img
                              src={imagenUrl}
                              alt={prod.nombre}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <ZoomIn className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">
                        {prod.codigo || `#${prod.id}`}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {prod.nombre}
                      </td>
                      <td className="px-6 py-4">{catNombre}</td>
                      <td className="px-6 py-4">{marcaNombre}</td>
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
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirModalEditar(prod)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(prod)}
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

      {/* Modal Configuración / Creación de Producto */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pestañas Modal */}
            <div className="flex border-b border-slate-100 px-6 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPestañaModal('general')}
                className={`py-3 text-sm font-semibold border-b-2 mr-6 ${
                  pestañaModal === 'general'
                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                    : 'border-transparent text-slate-400'
                }`}
              >
                1. Datos Generales
              </button>
              <button
                type="button"
                onClick={() => setPestañaModal('variantes')}
                className={`py-3 text-sm font-semibold border-b-2 mr-6 ${
                  pestañaModal === 'variantes'
                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                    : 'border-transparent text-slate-400'
                }`}
              >
                2. Variantes ({variantes.length})
              </button>
              <button
                type="button"
                onClick={() => setPestañaModal('imagen')}
                className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-1.5 ${
                  pestañaModal === 'imagen'
                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                    : 'border-transparent text-slate-400'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>3. Imagen del Producto</span>
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4 p-6">
              {pestañaModal === 'general' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                      Código de Producto (SKU Base)
                    </label>
                    <input
                      type="text"
                      placeholder="Opcional (se autogenera si está vacío)"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Camiseta Polo Classic"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                      Categoría *
                    </label>
                    <select
                      required
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Seleccione Categoría</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                      Marca
                    </label>
                    <select
                      value={formData.marca_id}
                      onChange={(e) => setFormData({ ...formData, marca_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Seleccione Marca</option>
                      {marcas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                      Descripción
                    </label>
                    <textarea
                      rows={3}
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="prodActivo"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="h-4 w-4 rounded text-slate-900"
                    />
                    <label htmlFor="prodActivo" className="text-sm font-medium">
                      Producto Activo
                    </label>
                  </div>
                </div>
              )}

              {pestañaModal === 'variantes' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                      <Grid className="h-4 w-4" />
                      <span>Selecciona Tallas y Colores Disponibles</span>
                    </div>

                    {/* Tallas */}
                    <div>
                      <span className="text-xs font-medium text-slate-500">Tallas:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {tallas.map((t) => {
                          const idStr = String(t.id)
                          const sel = tallasSeleccionadas.includes(idStr)
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleTalla(idStr)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                                sel
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {t.codigo || t.nombre}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Colores */}
                    <div>
                      <span className="text-xs font-medium text-slate-500">Colores:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {colores.map((c) => {
                          const idStr = String(c.id)
                          const sel = coloresSeleccionados.includes(idStr)
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleColor(idStr)}
                              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                                sel
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              <span
                                className="h-3 w-3 rounded-full border"
                                style={{ backgroundColor: c.hex || '#ffffff' }}
                              />
                              {c.nombre}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Valores Default */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500">
                          Precio Venta Base (Q)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={precioBase}
                          onChange={(e) => setPrecioBase(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500">
                          Stock Inicial
                        </label>
                        <input
                          type="number"
                          placeholder="10"
                          value={stockBase}
                          onChange={(e) => setStockBase(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:bg-slate-800"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={generarCombinaciones}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.99]"
                    >
                      <Zap className="h-4 w-4" />
                      <span>Generar Matriz Talla x Color</span>
                    </button>
                  </div>

                  {/* Lista de Variantes Resultantes */}
                  {variantes.length > 0 && (
                    <div className="overflow-x-auto max-h-48 border rounded-xl dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800">
                          <tr>
                            <th className="p-2">SKU</th>
                            <th className="p-2">Talla</th>
                            <th className="p-2">Color</th>
                            <th className="p-2">Precio (Q)</th>
                            <th className="p-2">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {variantes.map((v, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono">{v.sku}</td>
                              <td className="p-2">{v.talla_nombre || v.talla_id}</td>
                              <td className="p-2">{v.color_nombre || v.color_id}</td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={v.precio_venta}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setVariantes((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, precio_venta: val } : item
                                      )
                                    )
                                  }}
                                  className="w-16 rounded border px-1 py-0.5 text-xs dark:bg-slate-800"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setVariantes((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, stock: val } : item
                                      )
                                    )
                                  }}
                                  className="w-16 rounded border px-1 py-0.5 text-xs dark:bg-slate-800"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Pestaña Imagen del Producto */}
              {pestañaModal === 'imagen' && (
                <div className="py-4 space-y-4">
                  {productoCreadoId ? (
                    <ImageUploader
                      productoId={productoCreadoId}
                      esPrincipal={true}
                      onSubida={handleImagenSubida}
                      onError={(msg) => toast.error(msg)}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
                      <ImageIcon className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Primero debes guardar los Datos Generales del Producto
                      </p>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        Una vez guardado, el sistema generará el ID para vincular la imagen en Cloudinary.
                      </p>
                      <button
                        type="button"
                        disabled={guardando}
                        onClick={handleGuardar}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        {guardando ? 'Guardando...' : 'Guardar Producto Ahora'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {pestañaModal === 'imagen' ? 'Cerrar / Finalizar' : 'Cancelar'}
                </button>
                {pestañaModal !== 'imagen' && (
                  <button
                    type="submit"
                    disabled={guardando}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    {guardando ? 'Guardando...' : 'Guardar y Continuar'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Flotante Visor de Fotografía en Alta Resolución */}
      {imagenModal.open && (
        <div 
          onClick={() => setImagenModal({ open: false, url: '', titulo: '' })}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 transition-opacity"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-2xl w-full rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {imagenModal.titulo}
              </h3>
              <button
                onClick={() => setImagenModal({ open: false, url: '', titulo: '' })}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden max-h-[70vh]">
              <img
                src={imagenModal.url}
                alt={imagenModal.titulo}
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}