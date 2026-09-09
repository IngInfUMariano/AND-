// auth.validator.js — validaciones de entrada para los endpoints de autenticación.
//
// Valida formato y presencia de campos. La lógica de "si el email existe" o
// "si la contraseña es correcta" vive en el servicio, no aquí.

"use strict";

const { body } = require("express-validator");

// ─── loginValidator ───────────────────────────────────────────────────────────
// Reglas compartidas para /interno y /tienda.
// normalizeEmail() se omite porque transforma ana.morales@gmail.com en
// anamorales@gmail.com (elimina puntos en cuentas Gmail), rompiendo la búsqueda.
const loginValidator = [
  body("email")
    .trim()
    .toLowerCase()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Debe ser un email válido"),

  body("password")
    .notEmpty().withMessage("La contraseña es obligatoria")
];

// ─── registroValidator ────────────────────────────────────────────────────────
// Reglas para POST /api/auth/registro (cliente minorista de la tienda).
const registroValidator = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 150 }).withMessage("El nombre no puede superar 150 caracteres"),

  body("email")
    .trim()
    .toLowerCase()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Debe ser un email válido"),

  body("password")
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isLength({ min: 8 }).withMessage("La contraseña debe tener al menos 8 caracteres"),

  body("telefono")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 }).withMessage("El teléfono no puede superar 20 caracteres")
];

// ─── recuperarValidator ───────────────────────────────────────────────────────
// Reglas para POST /api/auth/recuperar.
const recuperarValidator = [
  body("email")
    .trim()
    .toLowerCase()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Debe ser un email válido")
];

// ─── restablecerValidator ─────────────────────────────────────────────────────
// Reglas para POST /api/auth/restablecer.
const restablecerValidator = [
  body("token")
    .trim()
    .notEmpty().withMessage("El token de recuperación es obligatorio"),

  body("password")
    .notEmpty().withMessage("La nueva contraseña es obligatoria")
    .isLength({ min: 8 }).withMessage("La contraseña debe tener al menos 8 caracteres")
];

// ─── cambiarPasswordValidator ─────────────────────────────────────────────────
// Reglas para PUT /api/auth/password.
const cambiarPasswordValidator = [
  body("password_actual")
    .notEmpty().withMessage("La contraseña actual es obligatoria"),

  body("password_nuevo")
    .notEmpty().withMessage("La nueva contraseña es obligatoria")
    .isLength({ min: 8 }).withMessage("La contraseña debe tener al menos 8 caracteres")
];

module.exports = {
  loginValidator,
  registroValidator,
  recuperarValidator,
  restablecerValidator,
  cambiarPasswordValidator
};
