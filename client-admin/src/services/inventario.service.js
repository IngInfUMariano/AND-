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

// NUEVO MÉTODO: Consumir endpoint de proveedores
export const listarProveedores = async () => {
    const { data } = await api.get('/proveedores')
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

export const anularTraslado = async (id, payload) => {
    const { data } = await api.post(`/traslados/${id}/anular`, payload)
    return data
}

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

export const listarMermas = async (params = {}) => {
    const { data } = await api.get("/movimientos", {
        params: { ...params, tipo: "SALIDA_MERMA" }
    });
    return data;
};

export const registrarMerma = async (payload) => {
    const body = {
        tipo: "SALIDA_MERMA",
        cantidad: Number(payload.cantidad),
        motivo: payload.motivo,
        variante_id: Number(payload.variante_id),
        sucursal_id: Number(payload.sucursal_id)
    };
    const { data } = await api.post("/movimientos", body);
    return data;
};

export const resolverMerma = async (id, payload) => {
    const { data } = await api.patch(`/movimientos/${id}`, payload);
    return data;
};

// NUEVO MÉTODO: Registrar la compra con proveedor_id
export const registrarEntradaCompra = async (payload) => {
    const body = {
        tipo: "ENTRADA_COMPRA",
        cantidad: Number(payload.cantidad),
        costo_unitario: Number(payload.costo_unitario),
        variante_id: Number(payload.variante_id),
        sucursal_id: Number(payload.sucursal_id),
        proveedor_id: payload.proveedor_id ? Number(payload.proveedor_id) : null,
        motivo: payload.motivo || "Ingreso por Compra"
    };
    const { data } = await api.post("/movimientos", body);
    return data;
};

export const listarPedidos = async (params) => {
    const { data } = await api.get('/pedidos', { params: limpiarParams(params) })
    return data
}

export const cambiarEstadoPedido = async (id, payload) => {
    const { data } = await api.patch(`/pedidos/${id}/estado`, payload)
    return data
}

export const anularPedido = async (id, payload) => {
    const { data } = await api.post(`/pedidos/${id}/anular`, payload)
    return data
}

export const listarComprobantes = async (params) => {
    const { data } = await api.get('/comprobantes', { params: limpiarParams(params) })
    return data
}

export const obtenerDetalleComprobante = async (id) => {
    const { data } = await api.get(`/comprobantes/${id}`)
    return data
}

export const inventarioService = {
    listar,
    listarSucursales,
    listarProveedores,
    obtenerKardex,
    listarTraslados,
    obtenerTrasladoPorId,
    despacharTraslado,
    crearTraslado,
    recibirTraslado,
    anularTraslado,
    listarTrasladoDetalles,
    obtenerTrasladoDetallePorId,
    registrarRecepcionItem,
    listarMermas,
    registrarMerma,
    resolverMerma,
    registrarEntradaCompra,
    listarPedidos,
    cambiarEstadoPedido,
    anularPedido,
    listarComprobantes,
    obtenerDetalleComprobante
}

export default inventarioService