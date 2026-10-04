import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/routes/ProtectedRoute'
import TiendaLayout from '@/layouts/TiendaLayout'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Catalogo from '@/pages/Catalogo'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<TiendaLayout />}>
            <Route index element={<Home />} />
            <Route path="productos" element={<Catalogo />} />
            {/* Las rutas públicas (catálogo) van aquí sin ProtectedRoute */}

            <Route
              path="mis-pedidos"
              element={
                <ProtectedRoute>
                  <div>Mis pedidos</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="carrito"
              element={
                <ProtectedRoute>
                  <div>Carrito</div>
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
