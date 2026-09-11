// correlativo.validator.js — validación de entrada para correlativos.

"use strict";

const { body, param } = require("express-validator");

const TIPOS_DOCUMENTO_PERMITIDOS = ["ENTRADA", "SALIDA", "TRASLADO"];

//  crearValidator 
const crearValidator = [
    body("sucursal_id")
        .notEmpty()
        .withMessage("El sucursal_id es obligatorio")
        .isInt({ min: 1 })
        .withMessage("El sucursal_id debe ser un entero positivo")
        .toInt(),

    body("tipo_documento")
        .notEmpty()
        .withMessage("El tipo de documento es obligatorio")
        .isIn(TIPOS_DOCUMENTO_PERMITIDOS)
        .withMessage(`El tipo de documento debe ser uno de: ${TIPOS_DOCUMENTO_PERMITIDOS.join(", ")}`),

    body("serie")
        .notEmpty()
        .withMessage("La serie es obligatoria")
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage("La serie debe tener entre 1 y 10 caracteres"),

    body("ultimo_numero")
        .optional()
        .isInt({ min: 0 })
        .withMessage("El último número debe ser un entero mayor o igual a 0")
        .toInt()
];

//  actualizarValidator 
const actualizarValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El id del correlativo debe ser un entero positivo")
        .toInt(),

    body("serie")
        .optional()
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage("La serie debe tener entre 1 y 10 caracteres"),

    body("ultimo_numero")
        .optional()
        .isInt({ min: 0 })
        .withMessage("El último número debe ser un entero mayor o igual a 0")
        .toInt()
];

module.exports = { crearValidator, actualizarValidator };