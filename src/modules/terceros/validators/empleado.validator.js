// empleado.validator.js — reglas de validación de entrada para empleados.
"use strict";

const { body, param } = require("express-validator");

const crearValidator = [
  body("codigo")
    .trim().notEmpty().withMessage("El código es obligatorio")
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("nombres")
    .trim().notEmpty().withMessage("Los nombres son obligatorios")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("apellidos")
    .trim().notEmpty().withMessage("Los apellidos son obligatorios")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("dpi")
    .trim().notEmpty().withMessage("El DPI es obligatorio")
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("puesto")
    .trim().notEmpty().withMessage("El puesto es obligatorio")
    .isLength({ max: 80 }).withMessage("Máximo 80 caracteres"),

  body("sucursal_id")
    .notEmpty().withMessage("sucursal_id es obligatorio")
    .isInt({ min: 1 }).withMessage("Debe ser un entero positivo")
    .toInt(),

  body("fecha_ingreso")
    .notEmpty().withMessage("La fecha de ingreso es obligatoria")
    .isDate().withMessage("Formato inválido (YYYY-MM-DD)"),

  body("telefono")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("email")
    .optional({ nullable: true }).trim()
    .isEmail().withMessage("Formato de email inválido")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),
];

const actualizarValidator = [
  param("id").isInt({ min: 1 }).withMessage("id debe ser entero positivo").toInt(),

  body("nombres")
    .optional().trim().notEmpty().withMessage("Los nombres no pueden estar vacíos")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("apellidos")
    .optional().trim().notEmpty().withMessage("Los apellidos no pueden estar vacíos")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("dpi")
    .optional().trim().notEmpty().withMessage("El DPI no puede estar vacío")
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("puesto")
    .optional().trim().notEmpty().withMessage("El puesto no puede estar vacío")
    .isLength({ max: 80 }).withMessage("Máximo 80 caracteres"),

  body("sucursal_id")
    .optional()
    .isInt({ min: 1 }).withMessage("Debe ser un entero positivo")
    .toInt(),

  body("fecha_ingreso")
    .optional()
    .isDate().withMessage("Formato inválido (YYYY-MM-DD)"),

  body("telefono")
    .optional({ nullable: true }).trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("email")
    .optional({ nullable: true }).trim()
    .isEmail().withMessage("Formato de email inválido")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),
];

const cambiarSucursalValidator = [
  param("id").isInt({ min: 1 }).withMessage("id debe ser entero positivo").toInt(),

  body("sucursal_id")
    .notEmpty().withMessage("sucursal_id es obligatorio")
    .isInt({ min: 1 }).withMessage("Debe ser un entero positivo")
    .toInt(),
];

module.exports = { crearValidator, actualizarValidator, cambiarSucursalValidator };
