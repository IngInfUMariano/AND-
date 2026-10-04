import { useState } from 'react'
import { Search, SlidersHorizontal, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'

const CATEGORIAS = ['Camisetas', 'Pantalones', 'Chaquetas', 'Accesorios', 'Calzado']
const MARCAS = ['Nike', 'Adidas', 'Puma', 'Fila', 'Reebok']

const MOCK_PRODUCTOS = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  nombre: `Producto ${String.fromCharCode(65 + i)}`,
  categoria: CATEGORIAS[i % CATEGORIAS.length],
  marca: MARCAS[i % MARCAS.length],
  precio: (19.99 + i * 5).toFixed(2),
  stock: i % 3 !== 0,
}))

export default function Catalogo() {
  const [busqueda, setBusqueda] = useState('')
  const [categoriasActivas, setCategoriasActivas] = useState([])
  const [marcasActivas, setMarcasActivas] = useState([])
  const [filtrosVisibles, setFiltrosVisibles] = useState(true)

  const toggleCategoria = (cat) =>
    setCategoriasActivas(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )

  const toggleMarca = (marca) =>
    setMarcasActivas(prev =>
      prev.includes(marca) ? prev.filter(m => m !== marca) : [...prev, marca]
    )

  const productosFiltrados = MOCK_PRODUCTOS.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = categoriasActivas.length === 0 || categoriasActivas.includes(p.categoria)
    const coincideMarca = marcasActivas.length === 0 || marcasActivas.includes(p.marca)
    return coincideBusqueda && coincideCategoria && coincideMarca
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        <p className="text-sm text-muted-foreground">{productosFiltrados.length} productos</p>
      </div>

      {/* Barra superior */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setFiltrosVisibles(v => !v)}
          className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
        >
          <SlidersHorizontal size={15} />
          Filtros
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filtros */}
        {filtrosVisibles && (
          <aside className="w-48 shrink-0 space-y-6">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Categoría
              </p>
              <div className="space-y-1.5">
                {CATEGORIAS.map(cat => (
                  <label key={cat} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={categoriasActivas.includes(cat)}
                      onChange={() => toggleCategoria(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Marca
              </p>
              <div className="space-y-1.5">
                {MARCAS.map(marca => (
                  <label key={marca} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={marcasActivas.includes(marca)}
                      onChange={() => toggleMarca(marca)}
                    />
                    {marca}
                  </label>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Grid de productos */}
        <div className="flex-1">
          {productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <p className="text-lg font-medium">Sin resultados</p>
              <p className="text-sm">Intenta con otros filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {productosFiltrados.map(p => (
                <div key={p.id} className="overflow-hidden rounded-lg border transition-shadow hover:shadow-md">
                  {/* Imagen placeholder */}
                  <div className="flex aspect-square items-center justify-center bg-muted text-xs text-muted-foreground">
                    Imagen
                  </div>
                  <div className="space-y-2 p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{p.categoria} · {p.marca}</p>
                      <p className="text-sm font-medium leading-tight">{p.nombre}</p>
                    </div>
                    <p className="text-base font-semibold">${p.precio}</p>
                    <button
                      disabled={!p.stock}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      <ShoppingCart size={13} />
                      {p.stock ? 'Agregar' : 'Sin stock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          <div className="mt-6 flex items-center justify-center gap-1">
            <button disabled className="rounded-md border p-2 transition-colors hover:bg-muted disabled:opacity-50">
              <ChevronLeft size={16} />
            </button>
            <button className="rounded-md border bg-primary px-3 py-1.5 text-sm text-primary-foreground">1</button>
            <button className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted">2</button>
            <button className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted">3</button>
            <button className="rounded-md border p-2 transition-colors hover:bg-muted">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
