"use strict";

const asyncHandler   = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const PedidoService  = require("../services/pedido.service");

// GET /api/pedidos
// Permite listar pedidos con filtros y paginación (por sucursal, cliente, estado, etc.)
const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await PedidoService.listar(req.query, req.user);
  paginado(res, rows, count, page, limit);
});

// GET /api/pedidos/:id
const obtener = asyncHandler(async (req, res) => {
  const pedido = await PedidoService.obtener(req.params.id, req.user);
  ok(res, pedido);
});

// POST /api/pedidos (Checkout desde carrito)
const crear = asyncHandler(async (req, res) => {
  const pedido = await PedidoService.crear(req.user.id, req.body);
  creado(res, pedido);
});

// POST /api/pedidos/masivo (Carga masiva CSV para mayoristas)
const cargarMasivo = asyncHandler(async (req, res) => {
  const resultado = await PedidoService.cargarMasivo(req.user.id, req.file);
  creado(res, resultado);
});

// PATCH /api/pedidos/:id/estado (Transiciones del ciclo de vida del pedido)
const cambiarEstado = asyncHandler(async (req, res) => {
  const pedido = await PedidoService.cambiarEstado(
    req.params.id, 
    req.body.estado, 
    req.body.observacion, 
    req.user
  );
  ok(res, pedido);
});

// POST /api/pedidos/:id/anular (Anulación de pedido)
const anular = asyncHandler(async (req, res) => {
  const pedido = await PedidoService.anular(
    req.params.id, 
    req.body.motivo, 
    req.user
  );
  ok(res, pedido);
});

const generarHojaRecoleccion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await pedidoService.generarHojaRecoleccion(id);
  return respuestaExito(res, "Hoja de recolección generada con éxito", data);
});

module.exports = {
  listar,
  obtener,
  crear,
  cargarMasivo,
  cambiarEstado,
  anular,
  generarHojaRecoleccion
};