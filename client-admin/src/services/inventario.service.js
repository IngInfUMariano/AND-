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

export const listar = async (params) => {
    const { data } = await api.get('/existencias', { params: limpiarParams(params) })
    return data
}

export const listarSucursales = async () => {
    const { data } = await api.get('/sucursales')
    return data
}

export const obtenerKardex = async (params) => {
    const { data } = await api.get('/movimientos', { params: limpiarParams(params) })
    return data
}

export const listarTraslados = async (params) => {
    const { data } = await api.get('/traslados', { params: limpiarParams(params) })
    return data
}

export const obtenerTrasladoPorId = async (id) => {
    const { data } = await api.get(`/traslados/${id}`)
    return data
}

export const despacharTraslado = async (id, payload) => {
    const endpoint = id ? `/traslados/${id}/despachar` : '/traslados'
    const { data } = await api.post(endpoint, payload)
    return data
}

export const crearTraslado = async (payload) => {
    const { data } = await api.post('/traslados', payload)
    return data
}

export const recibirTraslado = async (id, payload) => {
    const { data } = await api.post(`/traslados/${id}/recibir`, payload)
    return data
}

// 🟢 MÉTODOS PARA DETALLES DE TRASLADO (/api/traslado-detalles)
export const listarTrasladoDetalles = async (params) => {
    const { data } = await api.get('/traslado-detalles', { params: limpiarParams(params) })
    return data
}

export const obtenerTrasladoDetallePorId = async (id) => {
    const { data } = await api.get(`/traslado-detalles/${id}`)
    return data
}

export const registrarRecepcionItem = async (id, payload) => {
    const { data } = await api.patch(`/traslado-detalles/${id}/recepcion`, payload)
    return data
}

export const inventarioService = {
    listar,
    listarSucursales,
    obtenerKardex,
    listarTraslados,
    obtenerTrasladoPorId,
    despacharTraslado,
    crearTraslado,
    recibirTraslado,
    listarTrasladoDetalles,
    obtenerTrasladoDetallePorId,
    registrarRecepcionItem,
}

export default inventarioService