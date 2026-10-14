import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RoleRoute from '@/routes/RoleRoute'

// Layout
import AdminLayout from '@/layouts/AdminLayout'

// Páginas
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Inventario from '@/pages/Inventario'
import EntradasInventario from '@/pages/EntradasInventario'
import Despachos from '@/pages/Despachos'
import Recepciones from '@/pages/Recepciones'
import Traslado from '@/pages/TrasladosPage'
import MermasPage from '@/pages/MermasPage'
import Referencia from '@/pages/Referencia'
import Pedidos from '@/pages/PedidosInternos'

// Componente auxiliar para módulos en desarrollo o sin permisos
function ModuloEnDesarrollo({ titulo }) {
    return (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <h2 className="text-xl font-semibold">{titulo}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Esta sección no está disponible o no tienes permisos para acceder.</p>
        </div>
    )
}

export default function AppRoutes() {
    return (
        <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas dentro del Layout Principal */}
            <Route
                element={
                    <ProtectedRoute>
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Inventario, Existencias y Movimientos */}
                <Route
                    path="/existencias"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO', 'VENDEDOR']}>
                            <Inventario />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/inventario"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO', 'VENDEDOR']}>
                            <Inventario />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/movimientos"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                            <Inventario />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/inventario/entradas"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                            <EntradasInventario />
                        </RoleRoute>
                    }
                />

                {/* Despachos */}
                <Route
                    path="/despachos"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                            <Despachos />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/despachos/:trasladoIdParam"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                            <Despachos />
                        </RoleRoute>
                    }
                />

                {/* Recepciones */}
                <Route
                    path="/recepciones"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                            <Recepciones />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/recepciones/:trasladoIdParam"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                            <Recepciones />
                        </RoleRoute>
                    }
                />

                {/* Traslados */}
                <Route
                    path="/traslados"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                            <Traslado />
                        </RoleRoute>
                    }
                />

                {/* Módulo de Mermas */}
                <Route
                    path="/mermas"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                            <MermasPage />
                        </RoleRoute>
                    }
                />
                
                {/* Módulo de Pedidos Internos */}
                <Route
                    path="/pedidos"
                    element={
                        <RoleRoute roles={['ADMIN', 'GERENTE', 'VENDEDOR', 'BODEGUERO']}>
                            <Pedidos />
                        </RoleRoute>
                    }
                />
                {/* Módulos en desarrollo del menú */}
                <Route path="/clientes" element={<ModuloEnDesarrollo titulo="Clientes" />} />
                <Route path="/empleados" element={<ModuloEnDesarrollo titulo="Empleados" />} />
                <Route path="/proveedores" element={<ModuloEnDesarrollo titulo="Proveedores" />} />
                <Route path="/productos" element={<ModuloEnDesarrollo titulo="Productos" />} />
                <Route path="/categorias" element={<ModuloEnDesarrollo titulo="Categorías" />} />
                <Route path="/marcas" element={<ModuloEnDesarrollo titulo="Marcas" />} />
                <Route path="/comprobantes" element={<ModuloEnDesarrollo titulo="Comprobantes" />} />
                
                <Route path="/transacciones" element={<ModuloEnDesarrollo titulo="Transacciones" />} />
                <Route path="/reportes" element={<ModuloEnDesarrollo titulo="Reportes" />} />
                <Route path="/referencia" element={<Referencia />} />

                {/* Error de permisos 403 */}
                <Route path="/403" element={<ModuloEnDesarrollo titulo="403 - Acceso Denegado" />} />
            </Route>

            {/* Si la ruta no existe y está logueado, redirige al Dashboard en lugar de Login */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}