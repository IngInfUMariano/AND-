import api from './api'

const obtener = () => api.get('/carrito').then(r => r.data)
const agregar = (variante_id, cantidad) => api.post('/carrito/items', { variante_id, cantidad }).then(r => r.data)
const actualizarCantidad = (itemId, cantidad) => api.put(`/carrito/items/${itemId}`, { cantidad }).then(r => r.data)
const eliminarItem = (itemId) => api.delete(`/carrito/items/${itemId}`)
const vaciar = () => api.delete('/carrito')
const revalidar = () => api.post('/carrito/revalidar').then(r => r.data)

export default { obtener, agregar, actualizarCantidad, eliminarItem, vaciar, revalidar }
