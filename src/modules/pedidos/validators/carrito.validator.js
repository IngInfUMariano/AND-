"use strict";

const { body, param } = require("express-validator");

// Reglas para POST /api/carrito/items
const agregarItemValidator = [
  body("variante_id")
    .notEmpty()
    .withMessage("El variante_id es obligatorio")
    .isInt({ min: 1 })
    .withMessage("El variante_id debe ser un entero positivo")
    .toInt(),

  body("cantidad")
    .notEmpty()
    .withMessage("La cantidad es obligatoria")
    .isInt({ min: 1 })
    .withMessage("La cantidad debe ser al menos 1")
    .toInt()
];

// Reglas para PUT /api/carrito/items/:itemId
const actualizarCantidadValidator = [
  param("itemId")
    .isInt({ min: 1 })
    .withMessage("El itemId debe ser un entero positivo")
    .toInt(),

  body("cantidad")
    .notEmpty()
    .withMessage("La cantidad es obligatoria")
    .isInt({ min: 1 })
    .withMessage("La cantidad debe ser al menos 1")
    .toInt()
];

module.exports = {
  agregarItemValidator,
  actualizarCantidadValidator
};