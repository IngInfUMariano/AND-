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

export const listarEmpleados = async (params) => {
  const { data } = await api.get('/empleados', { params: limpiarParams(params) })
  return data
}

export const obtenerEmpleado = async (id) => {
  const { data } = await api.get(`/empleados/${id}`)
  return data
}

export const crearEmpleado = async (payload) => {
  const { data } = await api.post('/empleados', payload)
  return data
}

export const actualizarEmpleado = async (id, payload) => {
  const { data } = await api.put(`/empleados/${id}`, payload)
  return data
}

export const desactivarEmpleado = async (id) => {
  const { data } = await api.delete(`/empleados/${id}`)
  return data
}

export const cambiarSucursal = async (id, sucursal_id) => {
  const { data } = await api.put(`/empleados/${id}/sucursal`, { sucursal_id })
  return data
}

export const empleadoService = {
  listarEmpleados,
  obtenerEmpleado,
  crearEmpleado,
  actualizarEmpleado,
  desactivarEmpleado,
  cambiarSucursal,
}

export default empleadoService