import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import carritoService from '@/services/carrito.service'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { usuario } = useAuth()
  const [carrito, setCarrito] = useState(null)
  const [cargando, setCargando] = useState(false)

  const recargar = useCallback(async () => {
    if (!usuario) { setCarrito(null); return }
    setCargando(true)
    try {
      const res = await carritoService.obtener()
      setCarrito(res.data)
    } catch {
      setCarrito(null)
    } finally {
      setCargando(false)
    }
  }, [usuario])

  useEffect(() => { recargar() }, [recargar])

  const totalItems = carrito?.carrito_detalles?.reduce((acc, d) => acc + d.cantidad, 0) ?? 0

  return (
    <CartContext.Provider value={{ carrito, totalItems, cargando, recargar }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
