"use strict";

const { body, param } = require("express-validator");

//  crearValidator 
const crearValidator = [
    body("variante_id")
        .notEmpty()
        .withMessage("El variante_id es obligatorio")
        .isInt({ min: 1 })
        .withMessage("El variante_id debe ser un entero positivo")
        .toInt(),

    body("sucursal_id")
        .notEmpty()
        .withMessage("El sucursal_id es obligatorio")
        .isInt({ min: 1 })
        .withMessage("El sucursal_id debe ser un entero positivo")
        .toInt(),

    body("existencia_minima")
        .optional()
        .isInt({ min: 0 })
        .withMessage("La existencia mínima debe ser un número entero mayor o igual a 0")
        .toInt()
];

//  actualizarValidator 
const actualizarValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El id debe ser un entero positivo")
        .toInt(),

    body("existencia_minima")
        .optional()
        .isInt({ min: 0 })
        .withMessage("La existencia mínima debe ser un número entero mayor o igual a 0")
        .toInt()
];

module.exports = { crearValidator, actualizarValidator };