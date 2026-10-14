import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import ProtectedRoute from '@/routes/ProtectedRoute'
import TiendaLayout from '@/layouts/TiendaLayout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Registro from '@/pages/Registro'
import Catalogo from '@/pages/Catalogo'
import ProductoDetalle from '@/pages/ProductoDetalle'
import Carrito from '@/pages/Carrito'
import Checkout from '@/pages/Checkout'
import Pago from '@/pages/Pago'
import MisPedidos from '@/pages/MisPedidos'
import PedidoDetalle from '@/pages/PedidoDetalle'
import MiCuenta from '@/pages/MiCuenta'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster position="top-right" />
          <Routes>

            {/* ── Páginas sin TiendaLayout ── */}
            <Route path="/" element={<Home />} />
            <Route path="/productos" element={<Catalogo />} />
            <Route path="/carrito" element={<ProtectedRoute><Carrito /></ProtectedRoute>} />
            <Route path="/cuenta" element={<ProtectedRoute><MiCuenta /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />

            {/* ── Páginas con TiendaLayout ── */}
            <Route element={<TiendaLayout />}>
              <Route path="productos/:id" element={<ProductoDetalle />} />
              <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="pago/:pedidoId" element={<ProtectedRoute><Pago /></ProtectedRoute>} />
              <Route path="pedidos" element={<ProtectedRoute><MisPedidos /></ProtectedRoute>} />
              <Route path="pedidos/:id" element={<ProtectedRoute><PedidoDetalle /></ProtectedRoute>} />
              <Route path="mis-pedidos" element={<Navigate to="/pedidos" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
