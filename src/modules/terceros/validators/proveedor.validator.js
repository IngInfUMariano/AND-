// proveedor.validator.js — reglas de validación de entrada para proveedores.
"use strict";

const { body, param } = require("express-validator");

const crearValidator = [
  body("codigo")
    .trim().notEmpty().withMessage("El código es obligatorio")
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("razon_social")
    .trim().notEmpty().withMessage("La razón social es obligatoria")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("nombre_comercial")
    .optional({ nullable: true }).trim()
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("nit")
    .trim().notEmpty().withMessage("El NIT es obligatorio")
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("direccion")
    .optional({ nullable: true }).trim()
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("contacto_nombre")
    .optional({ nullable: true }).trim()
    .isLength({ max: 120 }).withMessage("Máximo 120 caracteres"),

  body("telefono")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("email")
    .optional({ nullable: true }).trim()
    .isEmail().withMessage("Formato de email inválido")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("condiciones_pago")
    .optional({ nullable: true }).trim()
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("plazo_entrega_dias")
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage("Debe ser un entero no negativo")
    .toInt(),
];

const actualizarValidator = [
  param("id").isInt({ min: 1 }).withMessage("id debe ser entero positivo").toInt(),

  body("razon_social")
    .optional().trim().notEmpty().withMessage("La razón social no puede estar vacía")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("nombre_comercial")
    .optional({ nullable: true }).trim()
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("nit")
    .optional().trim().notEmpty().withMessage("El NIT no puede estar vacío")
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("direccion")
    .optional({ nullable: true }).trim()
    .isLength({ max: 250 }).withMessage("Máximo 250 caracteres"),

  body("contacto_nombre")
    .optional({ nullable: true }).trim()
    .isLength({ max: 120 }).withMessage("Máximo 120 caracteres"),

  body("telefono")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("email")
    .optional({ nullable: true }).trim()
    .isEmail().withMessage("Formato de email inválido")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),

  body("condiciones_pago")
    .optional({ nullable: true }).trim()
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("plazo_entrega_dias")
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage("Debe ser un entero no negativo")
    .toInt(),
];

const asociarProductoValidator = [
  param("id").isInt({ min: 1 }).withMessage("id de proveedor debe ser entero positivo").toInt(),

  body("producto_id")
    .notEmpty().withMessage("producto_id es obligatorio")
    .isInt({ min: 1 }).withMessage("producto_id debe ser entero positivo")
    .toInt(),

  body("costo_compra")
    .notEmpty().withMessage("costo_compra es obligatorio")
    .isDecimal({ decimal_digits: "0,2" }).withMessage("Debe ser un decimal válido con máximo 2 decimales")
    .toFloat(),

  body("codigo_proveedor")
    .optional({ nullable: true }).trim()
    .isLength({ max: 40 }).withMessage("Máximo 40 caracteres"),

  body("es_principal")
    .optional({ nullable: true })
    .isBoolean().withMessage("Debe ser true o false")
    .toBoolean(),
];

module.exports = { crearValidator, actualizarValidator, asociarProductoValidator };
