import api from './api'

const crear = (datos) => api.post('/pedidos', datos).then(r => r.data)
const listar = (params) => api.get('/pedidos', { params }).then(r => r.data)
const obtener = (id) => api.get(`/pedidos/${id}`).then(r => r.data)
const listarSucursales = () => api.get('/sucursales').then(r => r.data)
const listarZonasEnvio = () => api.get('/zonas-envio').then(r => r.data)

export default { crear, listar, obtener, listarSucursales, listarZonasEnvio }
