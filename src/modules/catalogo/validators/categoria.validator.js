// categoria.validator.js — reglas de validación de entrada para el recurso categorías.
//
// Por qué se valida en el servidor y no solo ocultando botones en el frontend:
//   Cualquier persona con curl o Postman puede saltarse la interfaz gráfica.
//   Si las reglas solo están en el frontend, un atacante puede crear categorías
//   con nombre vacío, IDs inválidos o inyecciones. El servidor es la última
//   línea de defensa y siempre debe validar independientemente del cliente.
//
// Cómo funciona con el middleware validar.js:
//   Cada array de checks se coloca ANTES de validar en la cadena de la ruta.
//   express-validator acumula los errores; validar.js los evalúa y responde 400
//   si hay alguno. Si no hay errores, la ejecución pasa al controlador.

"use strict";

const { body, param } = require("express-validator");

// ─── crearValidator ───────────────────────────────────────────────────────────
// Reglas para POST /api/categorias
const crearValidator = [
  body("nombre")
    .trim()
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .isLength({ max: 80 })
    .withMessage("El nombre no puede superar 80 caracteres"),

  body("descripcion")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 250 })
    .withMessage("La descripción no puede superar 250 caracteres"),

  body("categoria_padre_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("categoria_padre_id debe ser un entero positivo")
    .toInt()
];

// ─── actualizarValidator ──────────────────────────────────────────────────────
// Reglas para PUT /api/categorias/:id
// Todos los campos son opcionales: se actualiza solo lo que se envía.
const actualizarValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("El id debe ser un entero positivo")
    .toInt(),

  body("nombre")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("El nombre no puede estar vacío")
    .isLength({ max: 80 })
    .withMessage("El nombre no puede superar 80 caracteres"),

  body("descripcion")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 250 })
    .withMessage("La descripción no puede superar 250 caracteres"),

  body("categoria_padre_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("categoria_padre_id debe ser un entero positivo")
    .toInt()
];

module.exports = { crearValidator, actualizarValidator };
