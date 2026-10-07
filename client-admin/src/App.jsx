import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RoleRoute from '@/routes/RoleRoute'
import AdminLayout from '@/layouts/AdminLayout'

// Páginas
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Inventario from '@/pages/Inventario'
import Despachos from '@/pages/Despachos'
import Recepciones from '@/pages/Recepciones'
import Referencia from '@/pages/Referencia'

// Componente provisional para módulos pendientes o sin permisos
function ModuloEnDesarrollo({ titulo }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <h2 className="text-xl font-semibold text-foreground">{titulo}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta sección se encuentra actualmente en desarrollo.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Ruta Pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas Protegidas dentro de AdminLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Existencias y Movimientos */}
            <Route path="existencias" element={<Inventario />} />
            <Route
              path="movimientos"
              element={<ModuloEnDesarrollo titulo="Movimientos / Kardex General" />}
            />

            {/* Despachos (Salidas por Traslado) */}
            <Route
              path="despachos"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                  <Despachos />
                </RoleRoute>
              }
            />
            <Route
              path="despachos/:trasladoIdParam"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                  <Despachos />
                </RoleRoute>
              }
            />

            {/* Recepciones (Entradas por Traslado) */}
            <Route
              path="recepciones"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                  <Recepciones />
                </RoleRoute>
              }
            />
            <Route
              path="recepciones/:trasladoIdParam"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                  <Recepciones />
                </RoleRoute>
              }
            />

            {/* Módulos Pendientes de Desarrollo */}
            <Route path="traslados" element={<ModuloEnDesarrollo titulo="Traslados" />} />
            <Route path="comprobantes" element={<ModuloEnDesarrollo titulo="Comprobantes" />} />
            <Route path="clientes" element={<ModuloEnDesarrollo titulo="Clientes" />} />
            <Route path="empleados" element={<ModuloEnDesarrollo titulo="Empleados" />} />
            <Route path="proveedores" element={<ModuloEnDesarrollo titulo="Proveedores" />} />
            <Route path="productos" element={<ModuloEnDesarrollo titulo="Productos" />} />
            <Route path="categorias" element={<ModuloEnDesarrollo titulo="Categorías" />} />
            <Route path="marcas" element={<ModuloEnDesarrollo titulo="Marcas" />} />
            <Route path="pedidos" element={<ModuloEnDesarrollo titulo="Pedidos" />} />
            <Route path="transacciones" element={<ModuloEnDesarrollo titulo="Transacciones" />} />
            <Route path="reportes" element={<ModuloEnDesarrollo titulo="Reportes" />} />

            {/* Dev / Referencia */}
            <Route path="referencia" element={<Referencia />} />

            {/* Error de Permisos */}
            <Route path="403" element={<ModuloEnDesarrollo titulo="403 - Acceso Denegado" />} />
          </Route>

          {/* Redirección para cualquier ruta desconocida */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}