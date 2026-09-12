"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido } = require("../../../core/utils/respuesta");
const CarritoService = require("../services/carrito.service");
const db = require("../../../loaders/models.loader");

// Helper interno para obtener el ID y tipo del cliente autenticado
const _obtenerDatosCliente = async (req) => {
  const usuarioId = req.user?.id || req.usuario?.id;
  const cliente = await db.cliente.findOne({ where: { usuario_id: usuarioId } });

  if (!cliente) {
    return {
      clienteId: usuarioId,
      tipoCliente: "MINORISTA"
    };
  }

  return {
    clienteId: cliente.id,
    tipoCliente: cliente.tipo || "MINORISTA"
  };
};

// GET /api/pedidos/carrito
const obtenerCarrito = asyncHandler(async (req, res) => {
  const { clienteId } = await _obtenerDatosCliente(req);
  const carrito = await CarritoService.obtenerCarrito(clienteId);
  ok(res, carrito);
});

// POST /api/pedidos/carrito/items
const agregarItem = asyncHandler(async (req, res) => {
  const { clienteId, tipoCliente } = await _obtenerDatosCliente(req);
  const resultado = await CarritoService.agregarItem(clienteId, req.body, tipoCliente);

  creado(res, {
    detalle: resultado.detalle,
    advertencia: resultado.advertencia
  });
});

// PUT /api/pedidos/carrito/items/:itemId
const actualizarCantidad = asyncHandler(async (req, res) => {
  const { clienteId } = await _obtenerDatosCliente(req);
  const item = await CarritoService.actualizarCantidad(
    clienteId,
    req.params.itemId,
    req.body.cantidad
  );
  ok(res, item);
});

// DELETE /api/pedidos/carrito/items/:itemId
const eliminarItem = asyncHandler(async (req, res) => {
  const { clienteId } = await _obtenerDatosCliente(req);
  await CarritoService.eliminarItem(clienteId, req.params.itemId);
  sinContenido(res);
});

// DELETE /api/pedidos/carrito
const vaciarCarrito = asyncHandler(async (req, res) => {
  const { clienteId } = await _obtenerDatosCliente(req);
  await CarritoService.vaciarCarrito(clienteId);
  sinContenido(res);
});

// POST /api/pedidos/carrito/revalidar (RF-PED-03)
const revalidarCarrito = asyncHandler(async (req, res) => {
  const { clienteId } = await _obtenerDatosCliente(req);
  const resultado = await CarritoService.revalidarCarrito(clienteId);
  ok(res, resultado);
});

module.exports = {
  obtenerCarrito,
  agregarItem,
  actualizarCantidad,
  eliminarItem,
  vaciarCarrito,
  revalidarCarrito
};