"use strict";

const { body, param } = require("express-validator");

//  crearValidator 
const crearValidator = [
    body("codigo")
        .trim()
        .notEmpty()
        .withMessage("El código de la talla es obligatorio")
        .isLength({ max: 10 }) // Basado en Sequelize.STRING(10)[cite: 14]
        .withMessage("El código no puede superar 10 caracteres"),

    body("descripcion")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 50 }) // Basado en Sequelize.STRING(50)[cite: 14]
        .withMessage("La descripción no puede superar 50 caracteres"),

    body("orden")
        .notEmpty()
        .withMessage("El número de orden es obligatorio para organizar las tallas (ej. 1 para XS, 2 para S, etc.)")
        .isInt() // Validando el SMALLINT[cite: 14]
        .withMessage("El orden debe ser un número entero")
        .toInt()
];

//  actualizarValidator 
const actualizarValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El id debe ser un entero positivo")
        .toInt(),

    body("codigo")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("El código no puede estar vacío")
        .isLength({ max: 10 })
        .withMessage("El código no puede superar 10 caracteres"),

    body("descripcion")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 50 })
        .withMessage("La descripción no puede superar 50 caracteres"),

    body("orden")
        .optional()
        .isInt()
        .withMessage("El orden debe ser un número entero")
        .toInt()
];

module.exports = { crearValidator, actualizarValidator };