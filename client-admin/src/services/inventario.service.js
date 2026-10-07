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

export const listar = async (params) => {
    const { data } = await api.get('/existencias', { params: limpiarParams(params) })
    return data
}

export const listarSucursales = async () => {
    const { data } = await api.get('/sucursales')
    return data
}

// Endpoint real del backend para el kardex de movimientos
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
    const { data } = await api.post(`/traslados/${id}/despachar`, payload)
    return data
}

export const recibirTraslado = async (id, payload) => {
    const { data } = await api.post(`/traslados/${id}/recibir`, payload)
    return data
}

export const inventarioService = {
    listar,
    listarSucursales,
    obtenerKardex,
    listarTraslados,
    obtenerTrasladoPorId,
    despacharTraslado,
    recibirTraslado,
}

export default inventarioService