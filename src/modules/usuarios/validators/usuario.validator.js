// usuario.validator.js — validaciones de entrada para el CRUD de usuarios internos.

"use strict";

const { body, param } = require("express-validator");

const PERFILES_INTERNOS = ["ADMIN", "GERENTE", "BODEGUERO", "VENDEDOR"];

// ─── crearValidator ───────────────────────────────────────────────────────────
const crearValidator = [
  body("email")
    .trim()
    .toLowerCase()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Debe ser un email válido"),

  body("password")
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isLength({ min: 8 }).withMessage("La contraseña debe tener al menos 8 caracteres"),

  body("perfil")
    .notEmpty().withMessage("El perfil es obligatorio")
    .isIn(PERFILES_INTERNOS)
    .withMessage(`El perfil debe ser uno de: ${PERFILES_INTERNOS.join(", ")}`),

  body("empleado_id")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("empleado_id debe ser un entero positivo")
    .toInt(),

  body("sucursal_id")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("sucursal_id debe ser un entero positivo")
    .toInt()
];

// ─── actualizarValidator ──────────────────────────────────────────────────────
const actualizarValidator = [
  param("id")
    .isInt({ min: 1 }).withMessage("El id debe ser un entero positivo")
    .toInt(),

  body("email")
    .optional()
    .trim()
    .toLowerCase()
    .isEmail().withMessage("Debe ser un email válido"),

  body("perfil")
    .optional()
    .isIn(PERFILES_INTERNOS)
    .withMessage(`El perfil debe ser uno de: ${PERFILES_INTERNOS.join(", ")}`),

  body("empleado_id")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("empleado_id debe ser un entero positivo")
    .toInt(),

  body("sucursal_id")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("sucursal_id debe ser un entero positivo")
    .toInt(),

  body("email_verificado")
    .optional()
    .isBoolean().withMessage("email_verificado debe ser true o false")
    .toBoolean()
];

module.exports = { crearValidator, actualizarValidator };
