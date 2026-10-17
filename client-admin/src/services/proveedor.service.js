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

export const listarProveedores = async (params) => {
  const { data } = await api.get('/proveedores', { params: limpiarParams(params) })
  return data
}

export const obtenerProveedor = async (id) => {
  const { data } = await api.get(`/proveedores/${id}`)
  return data
}

export const crearProveedor = async (payload) => {
  const { data } = await api.post('/proveedores', payload)
  return data
}

export const actualizarProveedor = async (id, payload) => {
  const { data } = await api.put(`/proveedores/${id}`, payload)
  return data
}

export const desactivarProveedor = async (id) => {
  const { data } = await api.delete(`/proveedores/${id}`)
  return data
}

export const listarProductosProveedor = async (id) => {
  const { data } = await api.get(`/proveedores/${id}/productos`)
  return data
}

export const proveedorService = {
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
  desactivarProveedor,
  listarProductosProveedor,
}

export default proveedorService