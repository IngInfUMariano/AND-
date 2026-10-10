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

const ENDPOINTS = {
  categorias: '/categorias',
  marcas: '/marcas',
  temporadas: '/temporadas',
  tallas: '/tallas',
  colores: '/colores', // <-- Confirmado en color.route.js
}

export const listar = async (tipo, params) => {
  const endpoint = ENDPOINTS[tipo] || `/${tipo}`
  const { data } = await api.get(endpoint, { params: limpiarParams(params) })
  return data
}

export const obtenerPorId = async (tipo, id) => {
  const endpoint = ENDPOINTS[tipo] || `/${tipo}`
  const { data } = await api.get(`${endpoint}/${id}`)
  return data
}

export const crear = async (tipo, payload) => {
  const endpoint = ENDPOINTS[tipo] || `/${tipo}`
  const { data } = await api.post(endpoint, payload)
  return data
}

export const actualizar = async (tipo, id, payload) => {
  const endpoint = ENDPOINTS[tipo] || `/${tipo}`
  const { data } = await api.put(`${endpoint}/${id}`, payload)
  return data
}

export const desactivar = async (tipo, id) => {
  const endpoint = ENDPOINTS[tipo] || `/${tipo}`
  const { data } = await api.delete(`${endpoint}/${id}`)
  return data
}

export const catalogoService = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
  eliminar: desactivar,
}

export default catalogoService