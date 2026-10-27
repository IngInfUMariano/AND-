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
import Catalogos from '@/pages/Catalogos'
import Productos from '@/pages/Productos'
import Precios from '@/pages/Precios'
import Clientes from '@/pages/Clientes'
import Empleados from '@/pages/Empleados'
import Proveedores from '@/pages/Proveedores'
import Movimiento from '@/pages/MovimientosPage'
import Traslado from '@/pages/TrasladosPage'
import MermasPage from '@/pages/MermasPage'
import Pedidos from '@/pages/PedidosInternos'
import Comprobantes from '@/pages/ComprobantesPage'
import EntradasInventario from '@/pages/EntradasInventario' 
import ComprasInventario from '@/pages/ComprasInventario'
import InformesPage from '@/pages/InformePage' 
import DashboardPage from '@/pages/DashboardPage'

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
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0a0a0a',
              color: '#fafafa',
              borderRadius: '2px',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '13px',
              fontFamily: "'Geist Variable', sans-serif",
              padding: '10px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            },
            success: { iconTheme: { primary: '#fafafa', secondary: '#0a0a0a' } },
            error:   { iconTheme: { primary: '#fafafa', secondary: '#0a0a0a' } },
          }}
        />
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
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="precios" element={<Precios />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="proveedores" element={<Proveedores />} />

            {/* Existencias y Movimientos */}
            <Route path="existencias" element={<Inventario />} />
            <Route path="movimientos" element={<Movimiento />} />
            <Route path="traslados" element={<Traslado />} />

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

            {/* Módulos de Productos y Catálogos */}
            <Route path="productos" element={<Productos />} />
            <Route path="catalogos" element={<Catalogos />} />
            <Route path="categorias" element={<Catalogos />} />
            <Route path="marcas" element={<Catalogos />} />
            
            {/* RUTA AÑADIDA: Entradas y Conteo General */}
            <Route
              path="entradas"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                  <EntradasInventario />
                </RoleRoute>
              }
            />

            {/* Módulo de Mermas y Pérdidas */}
            <Route
              path="mermas"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE', 'BODEGUERO']}>
                  <MermasPage />
                </RoleRoute>
              }
            />

            {/* Módulo de Pedidos Internos */}
            <Route
              path="pedidos"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE', 'VENDEDOR', 'BODEGUERO']}>
                  <Pedidos />
                </RoleRoute>
              }
            />

            {/* Modulo de Comprobantes */}
            <Route
              path="comprobantes"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE', 'VENDEDOR', 'BODEGUERO']}>
                  <Comprobantes />
                </RoleRoute>
              }
            />

            {/* Modulo de compra de inventario */ }
            <Route
              path="compras"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE']}>
                  <ComprasInventario />
                </RoleRoute>
              }
            />
            
            {/* Modulo de Informes */}
            <Route
              path="informes"
              element={
                <RoleRoute roles={['ADMIN', 'GERENTE']}>
                  <InformesPage />
                </RoleRoute>
              }
            />

            <Route 
              path="dashboard" 
              element={
                <DashboardPage />
              } 
            />

            {/* Módulos Pendientes de Desarrollo */}
            <Route path="transacciones" element={<ModuloEnDesarrollo titulo="Transacciones" />} />
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