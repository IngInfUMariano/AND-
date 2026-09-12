// pago.validator.js — reglas de validación de entrada para el módulo de pagos.
//
// Los validadores solo verifican forma (tipos, rangos, presencia).
// Las reglas de negocio (crédito suficiente, pedido no pagado, etc.)
// se verifican en el servicio porque requieren consultar la BD.

"use strict";

const { body, param, query } = require("express-validator");

// ─── intencionValidator ───────────────────────────────────────────────────────
// POST /api/pagos/intencion
const intencionValidator = [
  body("pedido_id")
    .notEmpty().withMessage("pedido_id es obligatorio")
    .isInt({ min: 1 }).withMessage("pedido_id debe ser un entero positivo")
    .toInt(),
];

// ─── transaccionesValidator ───────────────────────────────────────────────────
// GET /api/pagos/transacciones — filtros opcionales
const transaccionesValidator = [
  query("pedido_id")
    .optional()
    .isInt({ min: 1 }).withMessage("pedido_id debe ser un entero positivo")
    .toInt(),
  query("estado")
    .optional()
    .isIn(["PENDIENTE", "EXITOSA", "RECHAZADA", "REEMBOLSADA"])
    .withMessage("estado inválido"),
  query("tipo")
    .optional()
    .isIn(["PAGO", "REEMBOLSO"])
    .withMessage("tipo inválido"),
  query("proveedor")
    .optional()
    .isIn(["STRIPE", "PAYPAL"])
    .withMessage("proveedor inválido"),
  query("fecha_desde")
    .optional()
    .isISO8601().withMessage("fecha_desde debe ser formato YYYY-MM-DD"),
  query("fecha_hasta")
    .optional()
    .isISO8601().withMessage("fecha_hasta debe ser formato YYYY-MM-DD"),
];

// ─── reembolsoValidator ───────────────────────────────────────────────────────
// POST /api/pagos/:id/reembolso
const reembolsoValidator = [
  param("id")
    .isInt({ min: 1 }).withMessage("id debe ser un entero positivo")
    .toInt(),
  body("motivo")
    .trim()
    .notEmpty().withMessage("El motivo del reembolso es obligatorio")
    .isLength({ max: 250 }).withMessage("El motivo no puede superar 250 caracteres"),
  body("monto")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 }).withMessage("monto debe ser mayor a 0")
    .toFloat(),
];

// ─── abonoValidator ───────────────────────────────────────────────────────────
// POST /api/clientes/:id/abonos
const abonoValidator = [
  param("id")
    .isInt({ min: 1 }).withMessage("id de cliente debe ser un entero positivo")
    .toInt(),
  body("monto")
    .notEmpty().withMessage("El monto del abono es obligatorio")
    .isFloat({ min: 0.01 }).withMessage("monto debe ser mayor a 0")
    .toFloat(),
  body("referencia")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage("La referencia no puede superar 100 caracteres"),
  body("pedido_id")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("pedido_id debe ser un entero positivo")
    .toInt(),
];

// ─── formasPagoValidator ──────────────────────────────────────────────────────
// GET /api/pagos/formas-pago/:pedidoId
const formasPagoValidator = [
  param("pedidoId")
    .isInt({ min: 1 }).withMessage("pedidoId debe ser un entero positivo")
    .toInt(),
];

// ─── creditoValidator ─────────────────────────────────────────────────────────
// POST /api/pagos/credito/:pedidoId
const creditoValidator = [
  param("pedidoId")
    .isInt({ min: 1 }).withMessage("pedidoId debe ser un entero positivo")
    .toInt(),
];

module.exports = {
  intencionValidator,
  transaccionesValidator,
  reembolsoValidator,
  abonoValidator,
  formasPagoValidator,
  creditoValidator,
};
