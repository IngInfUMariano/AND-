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

export const listarPagos = async (params) => {
    // Excluimos cliente_id para Stripe ya que no filtra por cliente de esta forma
    const { cliente_id, ...rest } = params || {}
    const { data } = await api.get('/pagos/transacciones', { params: limpiarParams(rest) })
    return data?.data || data
}

export const reembolsarPago = async (id, payload) => {
    const { data } = await api.post(`/pagos/${id}/reembolso`, payload)
    return data?.data || data
}

export const obtenerEstadoCuenta = async (clienteId, params) => {
    const { data } = await api.get(`/clientes/${clienteId}/estado-cuenta`, { params: limpiarParams(params) })
    return data?.data || data
}

export const registrarAbono = async (clienteId, payload) => {
    const { data } = await api.post(`/clientes/${clienteId}/abonos`, payload)
    return data?.data || data
}

export const listarMayoristas = async (params) => {
    const { data } = await api.get('/clientes', { params: limpiarParams({ ...params, tipo: 'MAYORISTA', limit: 500 }) })
    const payload = data?.data || data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.rows)) return payload.rows
    if (Array.isArray(payload?.datos)) return payload.datos
    return []
}

export const listarPedidosCliente = async (clienteId) => {
    const { data } = await api.get('/pedidos', { params: { cliente_id: clienteId, limit: 100 } })
    const payload = data?.data || data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.rows)) return payload.rows
    if (Array.isArray(payload?.datos)) return payload.datos
    return []
}

export const transaccionService = {
    listarPagos,
    reembolsarPago,
    obtenerEstadoCuenta,
    registrarAbono,
    listarMayoristas,
    listarPedidosCliente
}

export default transaccionService