"use strict";

const { body, param } = require("express-validator");

//  crearValidator 
const crearValidator = [
    body("nombre")
        .trim()
        .notEmpty()
        .withMessage("El nombre de la temporada es obligatorio")
        .isLength({ max: 80 }) // Basado en Sequelize.STRING(80)[cite: 15]
        .withMessage("El nombre no puede superar 80 caracteres"),

    body("anio")
        .notEmpty()
        .withMessage("El año es obligatorio")
        .isInt({ min: 1900, max: 2100 }) // Validando el SMALLINT con un rango lógico[cite: 15]
        .withMessage("El año debe ser un número entero válido (ej. 2024)")
        .toInt(),

    body("descripcion")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 }) // Basado en Sequelize.STRING(250)[cite: 15]
        .withMessage("La descripción no puede superar 250 caracteres")
];

//  actualizarValidator 
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

    body("anio")
        .optional()
        .isInt({ min: 1900, max: 2100 })
        .withMessage("El año debe ser un número entero válido")
        .toInt(),

    body("descripcion")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 })
        .withMessage("La descripción no puede superar 250 caracteres")
];

module.exports = { crearValidator, actualizarValidator };