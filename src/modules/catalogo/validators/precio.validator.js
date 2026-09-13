"use strict";

const { body, param } = require("express-validator");

const crearValidator = [
    body("tipo")
    .notEmpty()
    .withMessage("El tipo es obligatorio")
    .isIn(["COSTO", "MINORISTA", "MAYORISTA", "OFERTA"])
    .withMessage("El tipo debe ser 'COSTO', 'MINORISTA', 'MAYORISTA' o 'OFERTA'"),

    body("monto")
    .notEmpty()
    .withMessage("El monto es obligatorio")
    .isFloat({ min: 0 })
    .withMessage("El monto debe ser un número mayor o igual a cero"),

    body("variante_id")
    .notEmpty()
    .withMessage("El ID de la variante es obligatorio")
    .isInt({ min: 1 })
    .withMessage("El ID de la variante debe ser un entero positivo")
    .toInt(),
];

const actualizarValidator = [
    param("id")
    .isInt({ min: 1 })
    .withMessage("El id debe ser un entero positivo")
    .toInt(),

    body("monto")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("El monto debe ser un número mayor o igual a cero"),

    body("vigente_desde")
    .optional()
    .isDate()
    .withMessage("vigente_desde debe ser una fecha válida (YYYY-MM-DD)"),

    body("vigente_hasta")
    .optional()
    .isDate()
    .withMessage("vigente_hasta debe ser una fecha válida (YYYY-MM-DD)"),
];

module.exports = { crearValidator, actualizarValidator };
    