import api from './api'

const listarProductos = (params) => api.get('/productos', { params }).then(r => r.data)
const obtenerProducto = (id) => api.get(`/productos/${id}`).then(r => r.data)
const listarVariantesProducto = (productoId) => api.get(`/productos/${productoId}/variantes`).then(r => r.data)
const listarCategorias = () => api.get('/categorias').then(r => r.data)
const listarMarcas = () => api.get('/marcas').then(r => r.data)
const listarTallas = () => api.get('/tallas').then(r => r.data)
const listarColores = () => api.get('/colores').then(r => r.data)

export default { listarProductos, obtenerProducto, listarVariantesProducto, listarCategorias, listarMarcas, listarTallas, listarColores }
