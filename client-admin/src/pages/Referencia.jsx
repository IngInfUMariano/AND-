import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'

const MOCK_FILAS = [
  { id: 1, nombre: 'Elemento A', descripcion: 'Descripción breve del elemento A', estado: 'activo' },
  { id: 2, nombre: 'Elemento B', descripcion: 'Descripción breve del elemento B', estado: 'inactivo' },
  { id: 3, nombre: 'Elemento C', descripcion: 'Descripción breve del elemento C', estado: 'activo' },
  { id: 4, nombre: 'Elemento D', descripcion: 'Descripción breve del elemento D', estado: 'activo' },
  { id: 5, nombre: 'Elemento E', descripcion: 'Descripción breve del elemento E', estado: 'inactivo' },
]

export default function Referencia() {
  const [filas, setFilas] = useState(MOCK_FILAS)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modal, setModal] = useState(null) // null | { modo: 'nuevo' } | { modo: 'editar', fila }

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const filasFiltradas = filas.filter(f => {
    const coincideBusqueda = f.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado = filtroEstado === 'todos' || f.estado === filtroEstado
    return coincideBusqueda && coincideEstado
  })

  const abrirNuevo = () => {
    reset({ nombre: '', descripcion: '', estado: 'activo' })
    setModal({ modo: 'nuevo' })
  }

  const abrirEditar = (fila) => {
    reset(fila)
    setModal({ modo: 'editar', fila })
  }

  const cerrarModal = () => setModal(null)

  const onSubmit = (datos) => {
    if (modal.modo === 'nuevo') {
      setFilas(prev => [...prev, { ...datos, id: Date.now() }])
    } else {
      setFilas(prev => prev.map(f => f.id === modal.fila.id ? { ...f, ...datos } : f))
    }
    cerrarModal()
  }

  const eliminar = (id) => setFilas(prev => prev.filter(f => f.id !== id))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Módulo de referencia</h1>
          <p className="text-sm text-muted-foreground">Plantilla CRUD — copiar para cada módulo del panel</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Todos</option>
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
            {filasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Sin resultados
                </td>
              </tr>
            ) : (
              filasFiltradas.map(fila => (
                <tr key={fila.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{fila.id}</td>
                  <td className="px-4 py-3 font-medium">{fila.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fila.descripcion}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      fila.estado === 'activo'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {fila.estado}
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
                        title="Eliminar"
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
          <button className="rounded-md border px-3 py-1.5 transition-colors hover:bg-muted">2</button>
          <button className="rounded-md border px-3 py-1.5 transition-colors hover:bg-muted">
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => e.target === e.currentTarget && cerrarModal()}
        >
          <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">
                {modal.modo === 'nuevo' ? 'Nuevo elemento' : 'Editar elemento'}
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

              <div>
                <label className="mb-1 block text-sm font-medium">Estado</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  {...register('estado')}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
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
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
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
