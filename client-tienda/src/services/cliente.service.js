import api from './api'

const obtenerPerfil = () => api.get('/auth/perfil').then(r => r.data)
const listarDirecciones = () => api.get('/mis-direcciones').then(r => r.data)
const crearDireccion = (datos) => api.post('/mis-direcciones', datos).then(r => r.data)
const actualizarDireccion = (id, datos) => api.put(`/mis-direcciones/${id}`, datos).then(r => r.data)
const eliminarDireccion = (id) => api.delete(`/mis-direcciones/${id}`)
const obtenerCredito = () => api.get('/mi-credito').then(r => r.data)

export default { obtenerPerfil, listarDirecciones, crearDireccion, actualizarDireccion, eliminarDireccion, obtenerCredito }
