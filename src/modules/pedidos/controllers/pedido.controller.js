"use strict";

const asyncHandler   = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const PedidoService  = require("../services/pedido.service");

// GET /api/pedidos
// Permite listar pedidos con filtros y paginación (por sucursal, cliente, estado, etc.)
const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await PedidoService.listar(req.query, req.usuario);
  paginado(res, rows, count, page, limit);
});

// GET /api/pedidos/:id
const obtener = asyncHandler(async (req, res) => {
  const pedido = await PedidoService.obtener(req.params.id, req.usuario);
  ok(res, pedido);
});

// POST /api/pedidos (Checkout desde carrito)
const crear = asyncHandler(async (req, res) => {
  const pedido = await PedidoService.crear(req.usuario.cliente_id, req.body);
  creado(res, pedido);
});


// POST /api/pedidos/masivo (Carga masiva CSV para mayoristas)
const cargarMasivo = asyncHandler(async (req, res) => {
  // Se obtiene la sucursal_id desde el body multipart/form-data
  const { sucursal_id, cliente_id } = req.body;
  
  // Si req.usuario.cliente_id existe (Tienda), se usa ese. 
  // Si es un operador de backoffice, puede venir en req.body.cliente_id.
  const targetClienteId = req.usuario.cliente_id || cliente_id || req.usuario.id;

  const resultado = await PedidoService.cargarMasivo(
    targetClienteId,
    req.file,
    sucursal_id
  );

  creado(res, resultado);
});

// PATCH /api/pedidos/:id/estado (Transiciones del ciclo de vida del pedido)
const cambiarEstado = asyncHandler(async (req, res) => {
  const pedido = await PedidoService.cambiarEstado(
    req.params.id,
    req.body.estado,
    req.body.observacion,
    req.usuario
  );
  ok(res, pedido);
});

// POST /api/pedidos/:id/anular (Anulación de pedido)
const anular = asyncHandler(async (req, res) => {
  const pedido = await PedidoService.anular(
    req.params.id,
    req.body.motivo,
    req.usuario
  );
  ok(res, pedido);
});

const generarHojaRecoleccion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await PedidoService.generarHojaRecoleccion(id);
  return ok(res, data);
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