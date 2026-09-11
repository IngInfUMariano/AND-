"use strict";

const { body, param } = require("express-validator");

//  crearValidator 
const crearValidator = [
  body("sku")
    .trim()
    .notEmpty()
    .withMessage("El SKU es obligatorio")
    .isLength({ max: 40 }) // Basado en Sequelize.STRING(40)[cite: 16]
    .withMessage("El SKU no puede superar 40 caracteres"),

  body("codigo_barras")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 }) // Basado en Sequelize.STRING(50)[cite: 16]
    .withMessage("El código de barras no puede superar 50 caracteres"),

  body("producto_id")
    .notEmpty()
    .withMessage("El producto_id es obligatorio")
    .isInt({ min: 1 })
    .withMessage("producto_id debe ser un entero positivo")
    .toInt(),

  body("talla_id")
    .notEmpty()
    .withMessage("El talla_id es obligatorio")
    .isInt({ min: 1 })
    .withMessage("talla_id debe ser un entero positivo")
    .toInt(),

  body("color_id")
    .notEmpty()
    .withMessage("El color_id es obligatorio")
    .isInt({ min: 1 })
    .withMessage("color_id debe ser un entero positivo")
    .toInt()
];

//  actualizarValidator 
// Únicamente se valida lo que el servicio permite actualizar (codigo_barras).
// El SKU es inmutable[cite: 16], por lo tanto, no se acepta en el PUT.
const actualizarValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("El id debe ser un entero positivo")
    .toInt(),

  body("codigo_barras")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("El código de barras no puede superar 50 caracteres")
];

module.exports = { crearValidator, actualizarValidator };