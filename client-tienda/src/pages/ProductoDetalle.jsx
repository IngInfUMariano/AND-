import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import catalogoService from '@/services/catalogo.service'
import carritoService from '@/services/carrito.service'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

const getPrecio = (variante, tipoCliente) => {
  const precios = variante?.precios ?? []
  const tipo = tipoCliente === 'MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'
  return precios.find(p => p.tipo === tipo)?.monto ?? precios[0]?.monto ?? null
}

export default function ProductoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { recargar } = useCart()

  const [producto, setProducto] = useState(null)
  const [variantes, setVariantes] = useState([])
  const [cargando, setCargando] = useState(true)

  const [tallaSeleccionada, setTallaSeleccionada] = useState(null)
  const [colorSeleccionado, setColorSeleccionado] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [agregando, setAgregando] = useState(false)

  useEffect(() => {
    Promise.all([
      catalogoService.obtenerProducto(id),
      catalogoService.listarVariantesProducto(id),
    ]).then(([prod, vars]) => {
      setProducto(prod.data)
      setVariantes(vars.data ?? [])
    }).catch(() => toast.error('No se pudo cargar el producto'))
      .finally(() => setCargando(false))
  }, [id])

  const tallas = [...new Map(variantes.map(v => [v.talla?.id, v.talla])).values()].filter(Boolean)
  const colores = [...new Map(variantes.map(v => [v.color?.id, v.color])).values()].filter(Boolean)

  const varianteActual = variantes.find(
    v => v.talla?.id === tallaSeleccionada && v.color?.id === colorSeleccionado
  )

  const precio = varianteActual ? getPrecio(varianteActual, usuario?.tipo_cliente) : null

  const agregarAlCarrito = async () => {
    if (!usuario) { navigate('/login'); return }
    if (!varianteActual) { toast.error('Selecciona talla y color'); return }

    setAgregando(true)
    try {
      await carritoService.agregar(varianteActual.id, cantidad)
      await recargar()
      toast.success('Producto agregado al carrito')
    } catch (err) {
      const msg = err.response?.data?.error?.mensaje ?? 'Error al agregar al carrito'
      toast.error(msg)
    } finally {
      setAgregando(false)
    }
  }

  if (cargando) return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">Cargando...</div>
  )

  if (!producto) return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">Producto no encontrado</div>
  )

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Volver
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Imagen */}
        <div className="flex aspect-square items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          Imagen del producto
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">{producto.categoria?.nombre} · {producto.marca?.nombre}</p>
            <h1 className="mt-1 text-2xl font-semibold">{producto.nombre}</h1>
            {producto.descripcion && (
              <p className="mt-2 text-sm text-muted-foreground">{producto.descripcion}</p>
            )}
          </div>

          {precio !== null && (
            <p className="text-2xl font-bold">Q {parseFloat(precio).toFixed(2)}</p>
          )}

          {/* Selector de talla */}
          {tallas.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Talla</p>
              <div className="flex flex-wrap gap-2">
                {tallas.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTallaSeleccionada(t.id)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      tallaSeleccionada === t.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {t.codigo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selector de color */}
          {colores.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Color</p>
              <div className="flex flex-wrap gap-2">
                {colores.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setColorSeleccionado(c.id)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      colorSeleccionado === c.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div>
            <p className="mb-2 text-sm font-medium">Cantidad</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCantidad(q => Math.max(1, q - 1))}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium">{cantidad}</span>
              <button
                onClick={() => setCantidad(q => q + 1)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={agregarAlCarrito}
            disabled={agregando || !varianteActual}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <ShoppingCart size={16} />
            {agregando ? 'Agregando...' : 'Agregar al carrito'}
          </button>

          {varianteActual === undefined && tallaSeleccionada && colorSeleccionado && (
            <p className="text-xs text-destructive">Esta combinación no está disponible</p>
          )}
        </div>
      </div>
    </div>
  )
}
