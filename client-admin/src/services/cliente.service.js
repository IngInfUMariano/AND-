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

export const listarClientes = async (params) => {
  const { data } = await api.get('/clientes', { params: limpiarParams(params) })
  return data
}

export const listarPendientes = async (params) => {
  const { data } = await api.get('/clientes/pendientes', { params: limpiarParams(params) })
  return data
}

export const obtenerCliente = async (id) => {
  const { data } = await api.get(`/clientes/${id}`)
  return data
}

export const crearCliente = async (payload) => {
  const { data } = await api.post('/clientes', payload)
  return data
}

export const actualizarCliente = async (id, payload) => {
  const { data } = await api.put(`/clientes/${id}`, payload)
  return data
}

export const desactivarCliente = async (id) => {
  const { data } = await api.delete(`/clientes/${id}`)
  return data
}

export const aprobarCliente = async (id, payload) => {
  const { data } = await api.put(`/clientes/${id}/aprobar`, payload)
  return data
}

export const rechazarCliente = async (id, motivo) => {
  const { data } = await api.put(`/clientes/${id}/rechazar`, { motivo })
  return data
}

export const obtenerCredito = async (id) => {
  const { data } = await api.get(`/clientes/${id}/credito`)
  return data
}

export const clienteService = {
  listarClientes,
  listarPendientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  desactivarCliente,
  aprobarCliente,
  rechazarCliente,
  obtenerCredito,
}

export default clienteService