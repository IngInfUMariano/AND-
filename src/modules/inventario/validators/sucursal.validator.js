"use strict";

const { body, param } = require("express-validator");

//  crearValidator 
const crearValidator = [
    body("codigo")
        .trim()
        .notEmpty()
        .withMessage("El código de sucursal es obligatorio")
        .isLength({ max: 10 }) // Basado en Sequelize.STRING(10)[cite: 17]
        .withMessage("El código no puede superar 10 caracteres")
        .matches(/^[A-Z0-9]+$/)
        .withMessage("El código solo debe contener letras mayúsculas y números (para uso en correlativos)"),

    body("nombre")
        .trim()
        .notEmpty()
        .withMessage("El nombre es obligatorio")
        .isLength({ max: 100 }) // Basado en Sequelize.STRING(100)[cite: 17]
        .withMessage("El nombre no puede superar 100 caracteres"),

    body("direccion")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 }) // Basado en Sequelize.STRING(250)[cite: 17]
        .withMessage("La dirección no puede superar 250 caracteres"),

    body("telefono")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 20 }) // Basado en Sequelize.STRING(20)[cite: 17]
        .withMessage("El teléfono no puede superar 20 caracteres"),

    body("es_bodega_central")
        .optional()
        .isBoolean()
        .withMessage("es_bodega_central debe ser un valor booleano")
        .toBoolean(),

    body("vende_en_linea")
        .optional()
        .isBoolean()
        .withMessage("vende_en_linea debe ser un valor booleano")
        .toBoolean()
];

//  actualizarValidator 
const actualizarValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El id debe ser un entero positivo")
        .toInt(),

    // El campo "codigo" NO se incluye aquí porque es inmutable.

    body("nombre")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("El nombre no puede estar vacío")
        .isLength({ max: 100 })
        .withMessage("El nombre no puede superar 100 caracteres"),

    body("direccion")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 })
        .withMessage("La dirección no puede superar 250 caracteres"),

    body("telefono")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 20 })
        .withMessage("El teléfono no puede superar 20 caracteres"),

    body("es_bodega_central")
        .optional()
        .isBoolean()
        .withMessage("es_bodega_central debe ser un valor booleano")
        .toBoolean(),

    body("vende_en_linea")
        .optional()
        .isBoolean()
        .withMessage("vende_en_linea debe ser un valor booleano")
        .toBoolean()
];

module.exports = { crearValidator, actualizarValidator };