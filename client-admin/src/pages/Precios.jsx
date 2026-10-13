import { useState, useEffect, useMemo } from 'react'
import {
  DollarSign,
  Plus,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import precioService from '@/services/precio.service'
import productoService from '@/services/producto.service'

const TIPOS_PRECIO = [
  { id: 'MINORISTA', label: 'Venta Minorista', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  { id: 'MAYORISTA', label: 'Venta Mayorista', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' },
  { id: 'COSTO', label: 'Precio Costo', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  { id: 'OFERTA', label: 'Promoción / Oferta', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
]

export default function Precios() {
  const [precios, setPrecios] = useState([])
  const [productos, setProductos] = useState([])
  const [variantesDisponibles, setVariantesDisponibles] = useState([])

  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroVigencia, setFiltroVigencia] = useState('true')

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 8

  // Modal Crear/Ajustar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('')
  const [formData, setFormData] = useState({
    variante_id: '',
    tipo: 'MINORISTA',
    monto: '',
  })
  const [guardando, setGuardando] = useState(false)

  // Estado para el Modal Flotante de Confirmación de Caducidad
  const [precioACaducar, setPrecioACaducar] = useState(null)
  const [caducando, setCaducando] = useState(false)

  useEffect(() => {
    cargarAuxiliares()
    cargarPrecios()
  }, [])

  const cargarAuxiliares = async () => {
    try {
      const resProds = await productoService.listarProductos({ activo: 'todos' })
      const listaProds = Array.isArray(resProds)
        ? resProds
        : Array.isArray(resProds?.datos)
        ? resProds.datos
        : Array.isArray(resProds?.data)
        ? resProds.data
        : Array.isArray(resProds?.rows)
        ? resProds.rows
        : []
      setProductos(listaProds)
    } catch (e) {
      toast.error('Error al cargar la lista de productos')
    }
  }

  const cargarPrecios = async () => {
    setLoading(true)
    try {
      const res = await precioService.listarPrecios({ vigente: filtroVigencia })
      const lista = Array.isArray(res)
        ? res
        : Array.isArray(res?.datos)
        ? res.datos
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.rows)
        ? res.rows
        : []
      setPrecios(lista)
    } catch (error) {
      toast.error('Error al cargar la lista de precios')
      setPrecios([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarPrecios()
  }, [filtroVigencia])

  // Carga variantes al seleccionar un producto en el modal
  useEffect(() => {
    if (!productoSeleccionadoId) {
      setVariantesDisponibles([])
      return
    }
    const cargarVars = async () => {
      try {
        const resVars = await productoService.listarVariantesPorProducto(productoSeleccionadoId)
        const listaVars = Array.isArray(resVars)
          ? resVars
          : Array.isArray(resVars?.datos)
          ? resVars.datos
          : Array.isArray(resVars?.data)
          ? resVars.data
          : Array.isArray(resVars?.rows)
          ? resVars.rows
          : []
        setVariantesDisponibles(listaVars)
        if (listaVars.length > 0) {
          setFormData((prev) => ({ ...prev, variante_id: listaVars[0].id }))
        }
      } catch (e) {
        setVariantesDisponibles([])
      }
    }
    cargarVars()
  }, [productoSeleccionadoId])

  // Métricas
  const totalVigentes = useMemo(
    () => precios.filter((p) => p.vigente_hasta === null).length,
    [precios]
  )
  const totalCaducados = useMemo(
    () => precios.filter((p) => p.vigente_hasta !== null).length,
    [precios]
  )

  // Filtrado
  const preciosFiltrados = useMemo(() => {
    return precios.filter((p) => {
      const skuVariante = p.variante?.sku || ''
      const emailUsuario = p.registrador?.email || ''
      const cumpleBusqueda =
        skuVariante.toLowerCase().includes(busqueda.toLowerCase()) ||
        emailUsuario.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(p.monto).includes(busqueda)

      const cumpleTipo = !filtroTipo || p.tipo === filtroTipo

      return cumpleBusqueda && cumpleTipo
    })
  }, [precios, busqueda, filtroTipo])

  // Paginación
  const totalPaginas = Math.ceil(preciosFiltrados.length / itemsPorPagina) || 1
  const preciosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina
    return preciosFiltrados.slice(inicio, inicio + itemsPorPagina)
  }, [preciosFiltrados, paginaActual])

  const abrirModalCrear = () => {
    setFormData({
      variante_id: '',
      tipo: 'MINORISTA',
      monto: '',
    })
    setProductoSeleccionadoId(productos[0]?.id || '')
    setModalAbierto(true)
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!formData.variante_id) return toast.error('Seleccione una variante')
    if (!formData.monto || Number(formData.monto) <= 0) {
      return toast.error('Ingrese un monto válido mayor a 0')
    }

    setGuardando(true)
    try {
      await precioService.crearPrecio({
        tipo: formData.tipo,
        monto: Number(formData.monto),
        variante_id: Number(formData.variante_id),
      })
      toast.success('Precio registrado correctamente')
      setModalAbierto(false)
      cargarPrecios()
    } catch (error) {
      toast.error(error?.response?.data?.error?.mensaje || error?.response?.data?.message || 'Error al guardar el precio')
    } finally {
      setGuardando(false)
    }
  }

  // Ejecuta la caducación desde el Pop-up Flotante
  const confirmarCaducidad = async () => {
    if (!precioACaducar) return
    setCaducando(true)
    try {
      await precioService.caducarPrecio(precioACaducar.id)
      toast.success('Precio caducado correctamente')
      setPrecioACaducar(null)
      cargarPrecios()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al caducar el precio')
    } finally {
      setCaducando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tarifario & Gestión de Precios
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra precios de venta, costos y promociones con historial de vigencia.
          </p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Precio / Ajuste</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Registros Totales
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{precios.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Precios Vigentes
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalVigentes}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="rounded-xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Históricos / Caducados
            </p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalCaducados}</p>
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
              placeholder="Buscar por SKU, registrado por o monto..."
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
              {TIPOS_PRECIO.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              {[
                { key: 'true', label: 'Vigentes' },
                { key: 'false', label: 'Caducados' },
                { key: 'todos', label: 'Todos' },
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => setFiltroVigencia(v.key)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                    filtroVigencia === v.key
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <button
              onClick={cargarPrecios}
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
                <th className="px-6 py-3.5">SKU Variante</th>
                <th className="px-6 py-3.5">Tipo</th>
                <th className="px-6 py-3.5">Monto</th>
                <th className="px-6 py-3.5">Vigente Desde</th>
                <th className="px-6 py-3.5">Vigente Hasta</th>
                <th className="px-6 py-3.5">Registrado Por</th>
                <th className="px-6 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Cargando tarifario...
                  </td>
                </tr>
              ) : preciosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron precios registrados.
                  </td>
                </tr>
              ) : (
                preciosPaginados.map((p) => {
                  const esVigente = p.vigente_hasta === null
                  const tipoObj = TIPOS_PRECIO.find((t) => t.id === p.tipo)

                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-900 dark:text-white">
                        {p.variante?.sku || `Var #${p.variante_id}`}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tipoObj?.badge || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {tipoObj?.label || p.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        Q.{Number(p.monto).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{p.vigente_desde}</td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {esVigente ? (
                          <span className="text-emerald-600 font-semibold dark:text-emerald-400">
                            Activo
                          </span>
                        ) : (
                          <span className="text-slate-400">{p.vigente_hasta}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {p.registrador?.email || `#${p.registrado_por}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {esVigente && (
                          <button
                            onClick={() => setPrecioACaducar(p)}
                            title="Caducar Precio Actual"
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>Caducar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Nuevo Precio */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Registrar / Ajustar Precio
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Seleccionar Producto *
                </label>
                <select
                  required
                  value={productoSeleccionadoId}
                  onChange={(e) => setProductoSeleccionadoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Seleccione un producto</option>
                  {productos.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nombre} ({prod.codigo || `#${prod.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Variante (SKU) *
                </label>
                <select
                  required
                  value={formData.variante_id}
                  onChange={(e) => setFormData({ ...formData, variante_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {variantesDisponibles.length === 0 ? (
                    <option value="">Sin variantes disponibles para este producto</option>
                  ) : (
                    variantesDisponibles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.sku} - Stock: {v.stock}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Tipo de Precio *
                </label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {TIPOS_PRECIO.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Monto (Q) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
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
                  {guardando ? 'Guardando...' : 'Guardar Precio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Pop-up Flotante de Confirmación para Caducar */}
      {precioACaducar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ¿Caducar Precio?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SKU: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{precioACaducar.variante?.sku}</span>
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600 dark:text-slate-300">
              ¿Deseas dar por caducado el precio de tipo{' '}
              <span className="font-semibold">{precioACaducar.tipo}</span> por un monto de{' '}
              <span className="font-bold text-slate-900 dark:text-white">Q.{Number(precioACaducar.monto).toFixed(2)}</span>?
              Esta acción marcará su fecha de fin como hoy.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrecioACaducar(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={caducando}
                onClick={confirmarCaducidad}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {caducando ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>{caducando ? 'Caducando...' : 'Sí, Caducar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}