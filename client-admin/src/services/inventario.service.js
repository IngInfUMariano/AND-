import api from "./api"

export const inventarioService = {
    listar: async (params = {}) => {
        const {data} = await api.get('/existencias', {params})
        return data
    },

    listarSucursales: async () => {
        const {data} = await api.get('/sucursales')
        return data
    }
}