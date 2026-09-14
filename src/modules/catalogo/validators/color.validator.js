"use strict";

const {body, param} = require("express-validator");

const crearValidator = [
    body("nombre")
        .trim()
        .notEmpty()
        .withMessage("El nombre es obligatorio")
        .isLength({max: 80})
        .withMessage("El nombre no puede superar 80 caracteres"),

    body("codigo_hex")
        .optional()
        .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .withMessage("El código hexadecimal debe tener un formato válido (ejemplo: #FF0000)")
];

const actualizarValidator = [
    param("id")
        .isInt({min: 1})
        .withMessage("El id debe ser un entero positivo")
        .toInt(),

    body("nombre")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("El nombre no puede estar vacío")
        .isLength({max: 80})
        .withMessage("El nombre no puede superar 80 caracteres"),

    body("codigo_hex")
        .optional()
        .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .withMessage("El código hexadecimal debe tener un formato válido (ejemplo: #FF0000)")
    ];

module.exports = {crearValidator, actualizarValidator};