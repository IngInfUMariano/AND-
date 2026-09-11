"use strict";

const { body, param } = require("express-validator");

//  crearValidator 
const crearValidator = [
    body("codigo")
        .trim()
        .notEmpty()
        .withMessage("El código del producto es obligatorio")
        .isLength({ max: 30 }) // Basado en Sequelize.STRING(30)[cite: 13]
        .withMessage("El código no puede superar 30 caracteres"),

    body("nombre")
        .trim()
        .notEmpty()
        .withMessage("El nombre del producto es obligatorio")
        .isLength({ max: 150 }) // Basado en Sequelize.STRING(150)[cite: 13]
        .withMessage("El nombre no puede superar 150 caracteres"),

    body("descripcion")
        .optional({ nullable: true })
        .trim(),

    body("genero")
        .optional()
        .isIn(["HOMBRE", "MUJER", "NINO", "UNISEX"]) // Validando el ENUM[cite: 13]
        .withMessage("El género debe ser HOMBRE, MUJER, NINO o UNISEX"),

    body("categoria_id")
        .notEmpty()
        .withMessage("La categoría es obligatoria")
        .isInt({ min: 1 })
        .withMessage("categoria_id debe ser un entero positivo")
        .toInt(),

    body("marca_id")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("marca_id debe ser un entero positivo")
        .toInt(),

    body("temporada_id")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("temporada_id debe ser un entero positivo")
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
        .withMessage("El código del producto no puede estar vacío")
        .isLength({ max: 30 })
        .withMessage("El código no puede superar 30 caracteres"),

    body("nombre")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("El nombre no puede estar vacío")
        .isLength({ max: 150 })
        .withMessage("El nombre no puede superar 150 caracteres"),

    body("descripcion")
        .optional({ nullable: true })
        .trim(),

    body("genero")
        .optional()
        .isIn(["HOMBRE", "MUJER", "NINO", "UNISEX"])
        .withMessage("El género debe ser HOMBRE, MUJER, NINO o UNISEX"),

    body("categoria_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("categoria_id debe ser un entero positivo")
        .toInt(),

    body("marca_id")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("marca_id debe ser un entero positivo")
        .toInt(),

    body("temporada_id")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("temporada_id debe ser un entero positivo")
        .toInt()
];

module.exports = { crearValidator, actualizarValidator };