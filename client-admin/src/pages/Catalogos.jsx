import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, X, Tags, Layers, Calendar, Ruler, Palette, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { catalogoService } from '../services/catalogo.service'

const TABS = [
  { id: 'categorias', label: 'Categorías', icon: Layers, singular: 'Categoría' },
  { id: 'marcas', label: 'Marcas', icon: Tags, singular: 'Marca' },
  { id: 'temporadas', label: 'Temporadas', icon: Calendar, singular: 'Temporada' },
  { id: 'tallas', label: 'Tallas', icon: Ruler, singular: 'Talla' },
  { id: 'colores', label: 'Colores', icon: Palette, singular: 'Color' },
]

export default function Catalogos() {
  const [tabActiva, setTabActiva] = useState('categorias')
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modal, setModal] = useState(null) // null | { modo: 'nuevo' } | { modo: 'editar', fila }

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const infoTabActual = TABS.find(t => t.id === tabActiva)

  // Cargar datos desde la API
  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const data = await catalogoService.listar(tabActiva)
      setFilas(data?.rows || [])
    } catch (error) {
      console.error(`Error al cargar ${tabActiva}:`, error)
      setFilas([])
    } finally {
      setCargando(false)
    }
  }, [tabActiva])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const cambiarTab = (tabId) => {
    setTabActiva(tabId)
    setBusqueda('')
    setFiltroEstado('todos')
  }

  // Filtrado local por búsqueda y estado
  const filasFiltradas = filas.filter(f => {
    const nombre = f.nombre || f.descripcion || ''
    const coincideBusqueda = nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado = filtroEstado === 'todos' || 
      (filtroEstado === 'activo' ? f.activo !== false : f.activo === false)
    return coincideBusqueda && coincideEstado
  })

  const abrirNuevo = () => {
    reset({ nombre: '', descripcion: '', activo: true })
    setModal({ modo: 'nuevo' })
  }

  const abrirEditar = (fila) => {
    reset({
      nombre: fila.nombre || '',
      descripcion: fila.descripcion || '',
      activo: fila.activo !== undefined ? fila.activo : true
    })
    setModal({ modo: 'editar', fila })
  }

  const cerrarModal = () => setModal(null)

  const onSubmit = async (datos) => {
    setGuardando(true)
    try {
      if (modal.modo === 'nuevo') {
        await catalogoService.crear(tabActiva, datos)
      } else {
        await catalogoService.actualizar(tabActiva, modal.fila.id, datos)
      }
      cerrarModal()
      cargarDatos()
    } catch (error) {
      console.error(`Error al guardar en ${tabActiva}:`, error)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Estás seguro de que deseas desactivar este elemento?')) return
    try {
      await catalogoService.desactivar(tabActiva, id)
      cargarDatos()
    } catch (error) {
      console.error(`Error al desactivar registro de ${tabActiva}:`, error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestión de Catálogos</h1>
          <p className="text-sm text-muted-foreground">Administración de categorías, marcas, temporadas, tallas y colores</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Nuevo {infoTabActual?.singular}
        </button>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex border-b">
        {TABS.map(tab => {
          const Icon = tab.icon
          const esActiva = tabActiva === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => cambiarTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                esActiva
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={`Buscar en ${infoTabActual?.label.toLowerCase()}...`}
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descripción</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Cargando {infoTabActual?.label.toLowerCase()}...
                  </div>
                </td>
              </tr>
            ) : filasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Sin registros disponibles
                </td>
              </tr>
            ) : (
              filasFiltradas.map(fila => (
                <tr key={fila.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{fila.id}</td>
                  <td className="px-4 py-3 font-medium">{fila.nombre || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fila.descripcion || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      fila.activo !== false
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {fila.activo !== false ? 'activo' : 'inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(fila)}
                        className="rounded p-1.5 transition-colors hover:bg-muted"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => eliminar(fila.id)}
                        className="rounded p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                        title="Desactivar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Mostrando {filasFiltradas.length} de {filas.length} elementos</span>
        <div className="flex gap-1">
          <button disabled className="rounded-md border px-3 py-1.5 transition-colors hover:bg-muted disabled:opacity-50">
            Anterior
          </button>
          <button className="rounded-md border bg-primary px-3 py-1.5 text-primary-foreground">1</button>
          <button className="rounded-md border px-3 py-1.5 transition-colors hover:bg-muted">
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal Reutilizable */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => e.target === e.currentTarget && cerrarModal()}
        >
          <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">
                {modal.modo === 'nuevo' ? `Nuevo ${infoTabActual?.singular}` : `Editar ${infoTabActual?.singular}`}
              </h2>
              <button onClick={cerrarModal} className="rounded p-1 transition-colors hover:bg-muted">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium">Nombre</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  {...register('nombre', { required: 'El nombre es obligatorio' })}
                />
                {errors.nombre && (
                  <p className="mt-1 text-xs text-destructive">{errors.nombre.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Descripción</label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  {...register('descripcion')}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {guardando && <Loader2 size={15} className="animate-spin" />}
                  {modal.modo === 'nuevo' ? 'Crear' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}