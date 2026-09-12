// pago.controller.js — traduce HTTP ↔ servicio para el módulo de pagos.
//
// El controlador no tiene lógica de negocio: solo extrae datos de req,
// llama al servicio y responde con los helpers de respuesta.js.
// El webhook es el único método que responde directamente con res.json()
// porque su formato de respuesta (para Stripe) no sigue la convención ok/creado.

"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, paginado } = require("../../../core/utils/respuesta");
const PagoService  = require("../services/pago.service");

// GET /api/pagos/formas-pago/:pedidoId
const obtenerFormasPago = asyncHandler(async (req, res) => {
  const resultado = await PagoService.obtenerFormasPago(
    req.params.pedidoId,
    req.usuario.id
  );
  ok(res, resultado);
});

// POST /api/pagos/intencion
const crearIntencion = asyncHandler(async (req, res) => {
  const resultado = await PagoService.crearIntencion(
    req.body.pedido_id,
    req.usuario.id
  );
  creado(res, resultado);
});

// POST /api/pagos/webhook  (body crudo — no usar ok/creado)
const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const resultado = await PagoService.procesarWebhook(
    req.body,
    signature,
    req.ip
  );
  // Stripe espera exactamente este formato con status 200
  res.status(200).json(resultado);
});

// GET /api/pagos/transacciones
const listarTransacciones = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await PagoService.listarTransacciones(req.query);
  paginado(res, rows, count, page, limit);
});

// POST /api/pagos/:id/reembolso
const reembolsar = asyncHandler(async (req, res) => {
  const tx = await PagoService.reembolsar(
    req.params.id,
    req.body
  );
  creado(res, tx);
});

// POST /api/pagos/credito/:pedidoId
const pagarConCredito = asyncHandler(async (req, res) => {
  const resultado = await PagoService.pagarConCredito(
    req.params.pedidoId,
    req.usuario.id
  );
  creado(res, resultado);
});

// POST /api/clientes/:id/abonos
const registrarAbono = asyncHandler(async (req, res) => {
  const movimiento = await PagoService.registrarAbono(
    req.params.id,
    req.body,
    req.usuario.id
  );
  creado(res, movimiento);
});

// GET /api/clientes/:id/estado-cuenta
const obtenerEstadoCuenta = asyncHandler(async (req, res) => {
  const resultado = await PagoService.obtenerEstadoCuenta(
    req.params.id,
    req.query
  );
  ok(res, resultado);
});

module.exports = {
  obtenerFormasPago,
  crearIntencion,
  webhook,
  listarTransacciones,
  reembolsar,
  pagarConCredito,
  registrarAbono,
  obtenerEstadoCuenta,
};
