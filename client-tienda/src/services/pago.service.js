import api from './api'

const obtenerFormas = (pedidoId) => api.get(`/pagos/formas-pago/${pedidoId}`).then(r => r.data)
const crearIntencion = (pedido_id) => api.post('/pagos/intencion', { pedido_id }).then(r => r.data)
const pagarConCredito = (pedidoId) => api.post(`/pagos/credito/${pedidoId}`).then(r => r.data)

export default { obtenerFormas, crearIntencion, pagarConCredito }
