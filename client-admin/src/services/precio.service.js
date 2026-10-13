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

export const listarPrecios = async (params) => {
  const { data } = await api.get('/precios', { params: limpiarParams(params) })
  return data
}

export const listarPreciosPorVariante = async (varianteId, params) => {
  const { data } = await api.get(`/variantes/${varianteId}/precios`, {
    params: limpiarParams(params),
  })
  return data
}

export const obtenerPrecio = async (id) => {
  const { data } = await api.get(`/precios/${id}`)
  return data
}

export const crearPrecio = async (payload) => {
  const { data } = await api.post('/precios', payload)
  return data
}

export const actualizarPrecio = async (id, payload) => {
  const { data } = await api.put(`/precios/${id}`, payload)
  return data
}

export const caducarPrecio = async (id) => {
  const { data } = await api.delete(`/precios/${id}`)
  return data
}

export const precioService = {
  listarPrecios,
  listarPreciosPorVariante,
  obtenerPrecio,
  crearPrecio,
  actualizarPrecio,
  caducarPrecio,
}

export default precioService