import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RoleRoute from '@/routes/RoleRoute'
import Inventario from '@/pages/Inventario'

export default function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/inventario"
                element={
                    <ProtectedRoute>
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGA']}>
                            <Inventario />
                        </RoleRoute>
                    </ProtectedRoute>
                }
            />
        </Routes>
    )
}