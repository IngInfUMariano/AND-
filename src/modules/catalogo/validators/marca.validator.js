"use strict";

const {body, param} = require("express-validator");

const crearValidator = [
    body("nombre")
        .trim()
        .notEmpty()
        .withMessage("El nombre es obligatorio")
        .isLength({max: 80})
        .withMessage("El nombre no puede superar 80 caracteres"),

    body("descripcion")
        .optional({nullable: true})
        .trim()
        .isLength({max: 250})
        .withMessage("La descripción no puede superar 250 caracteres"),
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

    body("descripcion")
        .optional({nullable: true})
        .trim()
        .isLength({max: 250})
        .withMessage("La descripción no puede superar 250 caracteres"),
];

module.exports = {crearValidator, actualizarValidator};