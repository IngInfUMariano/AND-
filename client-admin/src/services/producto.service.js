import api from './api'

const limpiarParams = (params) => {
  if (!params) return {}
  const resultado = {}
  Object.keys(params).forEach((key) => {
    const val = params[key]
    if (val !== '' && val !== null && val !== undefined) {
      resultado[key] = val
    }
  })
  return resultado
}

// ─── Productos ─────────────────────────────────────────────────────────────
export const listarProductos = async (params) => {
  const { data } = await api.get('/productos', { params: limpiarParams(params) })
  return data
}

export const obtenerProducto = async (id) => {
  const { data } = await api.get(`/productos/${id}`)
  return data
}

export const crearProducto = async (payload) => {
  const { data } = await api.post('/productos', payload)
  return data
}

export const actualizarProducto = async (id, payload) => {
  const { data } = await api.put(`/productos/${id}`, payload)
  return data
}

export const desactivarProducto = async (id) => {
  const { data } = await api.delete(`/productos/${id}`)
  return data
}

// ─── Variantes ─────────────────────────────────────────────────────────────
export const listarVariantesPorProducto = async (productoId) => {
  const { data } = await api.get(`/productos/${productoId}/variantes`)
  return data
}

export const crearVariante = async (payload) => {
  const { data } = await api.post('/variantes', payload)
  return data
}

export const actualizarVariante = async (id, payload) => {
  const { data } = await api.put(`/variantes/${id}`, payload)
  return data
}

export const desactivarVariante = async (id) => {
  const { data } = await api.delete(`/variantes/${id}`)
  return data
}

// ─── Precios e Imágenes ────────────────────────────────────────────────────
export const crearPrecio = async (payload) => {
  const { data } = await api.post('/precios', payload)
  return data
}

export const subirImagenProducto = async (payload) => {
  const { data } = await api.post('/imagen-productos', payload)
  return data
}

export const productoService = {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  desactivarProducto,
  listarVariantesPorProducto,
  crearVariante,
  actualizarVariante,
  desactivarVariante,
  crearPrecio,
  subirImagenProducto,
}

export default productoService