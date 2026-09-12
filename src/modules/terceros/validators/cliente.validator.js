// cliente.validator.js — reglas de validación de entrada para clientes y direcciones.
"use strict";

const { body, param } = require("express-validator");

// ─── clientes ─────────────────────────────────────────────────────────────────

const crearValidator = [
  body("nombre")
    .trim().notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("email")
    .trim().notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Formato de email inválido")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("tipo")
    .optional()
    .isIn(["MINORISTA", "MAYORISTA"]).withMessage("Debe ser MINORISTA o MAYORISTA"),

  body("nombre_comercial")
    .optional({ nullable: true }).trim()
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("nit")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("telefono")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("direccion_fiscal")
    .optional({ nullable: true }).trim()
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("contacto_nombre")
    .optional({ nullable: true }).trim()
    .isLength({ max: 120 }).withMessage("Máximo 120 caracteres"),

  body("estado")
    .optional()
    .isIn(["PENDIENTE", "APROBADO", "RECHAZADO"]).withMessage("Estado inválido"),

  body("limite_credito")
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: "0,2" }).withMessage("Debe ser un decimal con máximo 2 decimales")
    .toFloat(),

  body("plazo_credito_dias")
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage("Debe ser un entero no negativo")
    .toInt(),
];

const actualizarValidator = [
  param("id").isInt({ min: 1 }).withMessage("id debe ser entero positivo").toInt(),

  body("nombre")
    .optional().trim().notEmpty().withMessage("El nombre no puede estar vacío")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("email")
    .optional().trim()
    .isEmail().withMessage("Formato de email inválido")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("tipo")
    .optional()
    .isIn(["MINORISTA", "MAYORISTA"]).withMessage("Debe ser MINORISTA o MAYORISTA"),

  body("nombre_comercial")
    .optional({ nullable: true }).trim()
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("nit")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("telefono")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("direccion_fiscal")
    .optional({ nullable: true }).trim()
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("contacto_nombre")
    .optional({ nullable: true }).trim()
    .isLength({ max: 120 }).withMessage("Máximo 120 caracteres"),

  body("limite_credito")
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: "0,2" }).withMessage("Debe ser un decimal con máximo 2 decimales")
    .toFloat(),

  body("plazo_credito_dias")
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage("Debe ser un entero no negativo")
    .toInt(),
];

// ─── aprobación / rechazo ─────────────────────────────────────────────────────

const aprobarValidator = [
  param("id").isInt({ min: 1 }).withMessage("id debe ser entero positivo").toInt(),

  body("limite_credito")
    .notEmpty().withMessage("limite_credito es obligatorio")
    .isDecimal({ decimal_digits: "0,2" }).withMessage("Debe ser un decimal con máximo 2 decimales")
    .toFloat()
    .custom((v) => v >= 0).withMessage("No puede ser negativo"),

  body("plazo_credito_dias")
    .notEmpty().withMessage("plazo_credito_dias es obligatorio")
    .isInt({ min: 0 }).withMessage("Debe ser un entero no negativo")
    .toInt(),
];

const rechazarValidator = [
  param("id").isInt({ min: 1 }).withMessage("id debe ser entero positivo").toInt(),

  body("motivo")
    .trim().notEmpty().withMessage("El motivo de rechazo es obligatorio")
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),
];

// ─── direcciones ──────────────────────────────────────────────────────────────

const crearDireccionValidator = [
  body("alias")
    .trim().notEmpty().withMessage("El alias es obligatorio")
    .isLength({ max: 50 }).withMessage("Máximo 50 caracteres"),

  body("destinatario")
    .trim().notEmpty().withMessage("El destinatario es obligatorio")
    .isLength({ max: 120 }).withMessage("Máximo 120 caracteres"),

  body("direccion")
    .trim().notEmpty().withMessage("La dirección es obligatoria")
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("municipio")
    .trim().notEmpty().withMessage("El municipio es obligatorio")
    .isLength({ max: 80 }).withMessage("Máximo 80 caracteres"),

  body("departamento")
    .trim().notEmpty().withMessage("El departamento es obligatorio")
    .isLength({ max: 80 }).withMessage("Máximo 80 caracteres"),

  body("referencia")
    .optional({ nullable: true }).trim()
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("telefono")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("zona_envio_id")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("zona_envio_id debe ser entero positivo")
    .toInt(),

  body("es_predeterminada")
    .optional()
    .isBoolean().withMessage("Debe ser true o false")
    .toBoolean(),
];

const actualizarDireccionValidator = [
  param("id").isInt({ min: 1 }).withMessage("id debe ser entero positivo").toInt(),
  param("did").isInt({ min: 1 }).withMessage("did debe ser entero positivo").toInt(),

  body("alias")
    .optional().trim().notEmpty().withMessage("El alias no puede estar vacío")
    .isLength({ max: 50 }).withMessage("Máximo 50 caracteres"),

  body("destinatario")
    .optional().trim().notEmpty().withMessage("El destinatario no puede estar vacío")
    .isLength({ max: 120 }).withMessage("Máximo 120 caracteres"),

  body("direccion")
    .optional().trim().notEmpty().withMessage("La dirección no puede estar vacía")
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("municipio")
    .optional().trim().notEmpty()
    .isLength({ max: 80 }).withMessage("Máximo 80 caracteres"),

  body("departamento")
    .optional().trim().notEmpty()
    .isLength({ max: 80 }).withMessage("Máximo 80 caracteres"),

  body("referencia")
    .optional({ nullable: true }).trim()
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("telefono")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("zona_envio_id")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("zona_envio_id debe ser entero positivo")
    .toInt(),

  body("es_predeterminada")
    .optional()
    .isBoolean().withMessage("Debe ser true o false")
    .toBoolean(),
];

const actualizarMiDireccionValidator = [
  param("did").isInt({ min: 1 }).withMessage("did debe ser entero positivo").toInt(),

  body("alias")
    .optional().trim().notEmpty().withMessage("El alias no puede estar vacío")
    .isLength({ max: 50 }).withMessage("Máximo 50 caracteres"),

  body("destinatario")
    .optional().trim().notEmpty().withMessage("El destinatario no puede estar vacío")
    .isLength({ max: 120 }).withMessage("Máximo 120 caracteres"),

  body("direccion")
    .optional().trim().notEmpty().withMessage("La dirección no puede estar vacía")
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("municipio")
    .optional().trim().notEmpty()
    .isLength({ max: 80 }).withMessage("Máximo 80 caracteres"),

  body("departamento")
    .optional().trim().notEmpty()
    .isLength({ max: 80 }).withMessage("Máximo 80 caracteres"),

  body("referencia")
    .optional({ nullable: true }).trim()
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("telefono")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("zona_envio_id")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("zona_envio_id debe ser entero positivo")
    .toInt(),

  body("es_predeterminada")
    .optional()
    .isBoolean().withMessage("Debe ser true o false")
    .toBoolean(),
];

module.exports = {
  crearValidator, actualizarValidator,
  aprobarValidator, rechazarValidator,
  crearDireccionValidator, actualizarDireccionValidator, actualizarMiDireccionValidator,
};
