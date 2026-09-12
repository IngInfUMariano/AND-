"use strict";

const {body, param} = require("express-validator");

const crearValidator = [
    body("url")
        .trim()
        .notEmpty()
        .withMessage("La url es obligatoria")
        .isURL()
        .withMessage("La url no es válida")
        .isLength({ max: 500 })
        .withMessage("La url no puede superar 500 caracteres"),
    body("orden")
        .optional()
        .isInt({ min: 0 })
        .withMessage("El orden debe ser un entero positivo")
        .toInt(),
    body("es_principal")
        .optional()
        .isBoolean()
        .withMessage("es_principal debe ser un valor booleano")
        .toBoolean(),
    body("producto_id")
        .notEmpty()
        .withMessage("El producto_id es obligatorio")
        .isInt({ min: 1 })
        .withMessage("El producto_id debe ser un entero positivo")
        .toInt(),
    body("color_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El color_id debe ser un entero positivo")
        .toInt()
];

const actualizarValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El id debe ser un entero positivo")
        .toInt(),
    body("url")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("La url no puede estar vacía")
        .isURL()
        .withMessage("La url no es válida")
        .isLength({ max: 500 })
        .withMessage("La url no puede superar 500 caracteres"),
    body("orden")
        .optional()
        .isInt({ min: 0 })
        .withMessage("El orden debe ser un entero positivo")
        .toInt(),
    body("es_principal")
        .optional()
        .isBoolean()
        .withMessage("es_principal debe ser un valor booleano")
        .toBoolean(),
    body("producto_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El producto_id debe ser un entero positivo")
        .toInt(),
    body("color_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El color_id debe ser un entero positivo")
        .toInt()
];

module.exports = {crearValidator, actualizarValidator};