"use strict";

const asyncHandler     = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido } = require("../../../core/utils/respuesta");
const CarritoService   = require("../services/carrito.service");

// GET /api/pedidos/carrito
const obtenerCarrito = asyncHandler(async (req, res) => {
  // Asume que el middleware de auth inyecta el usuario/cliente en req.user
  const carrito = await CarritoService.obtenerCarrito(req.user.id);
  ok(res, carrito);
});

// POST /api/pedidos/carrito/items
const agregarItem = asyncHandler(async (req, res) => {
  const item = await CarritoService.agregarItem(req.user.id, req.body);
  creado(res, item);
});

// PUT /api/pedidos/carrito/items/:itemId
const actualizarCantidad = asyncHandler(async (req, res) => {
  const item = await CarritoService.actualizarCantidad(
    req.user.id, 
    req.params.itemId, 
    req.body.cantidad
  );
  ok(res, item);
});

// DELETE /api/pedidos/carrito/items/:itemId
const eliminarItem = asyncHandler(async (req, res) => {
  await CarritoService.eliminarItem(req.user.id, req.params.itemId);
  sinContenido(res);
});

// DELETE /api/pedidos/carrito
const vaciarCarrito = asyncHandler(async (req, res) => {
  await CarritoService.vaciarCarrito(req.user.id);
  sinContenido(res);
});

module.exports = {
  obtenerCarrito,
  agregarItem,
  actualizarCantidad,
  eliminarItem,
  vaciarCarrito
};