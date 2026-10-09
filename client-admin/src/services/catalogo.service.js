import api from './api'

// Sanitiza los parámetros de búsqueda eliminando valores vacíos o indefinidos
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

// Mapeo dinámico de la pestaña a la ruta del backend
const ENDPOINTS = {
  categorias: '/categorias',
  marcas: '/marcas',
  temporadas: '/temporadas',
  tallas: '/tallas',
  colores: '/colors',
}

export const listar = async (tipo, params) => {
  const endpoint = ENDPOINTS[tipo]
  const { data } = await api.get(endpoint, { params: limpiarParams(params) })
  return data
}

export const obtenerPorId = async (tipo, id) => {
  const endpoint = ENDPOINTS[tipo]
  const { data } = await api.get(`${endpoint}/${id}`)
  return data
}

export const crear = async (tipo, payload) => {
  const endpoint = ENDPOINTS[tipo]
  const { data } = await api.post(endpoint, payload)
  return data
}

export const actualizar = async (tipo, id, payload) => {
  const endpoint = ENDPOINTS[tipo]
  const { data } = await api.put(`${endpoint}/${id}`, payload)
  return data
}

export const desactivar = async (tipo, id) => {
  const endpoint = ENDPOINTS[tipo]
  const { data } = await api.delete(`${endpoint}/${id}`)
  return data
}

export const catalogoService = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
}

export default catalogoService