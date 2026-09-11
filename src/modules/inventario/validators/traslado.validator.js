"use strict";

const { body, param } = require("express-validator");

//  crearValidator 
const crearValidator = [
    body("sucursal_origen_id")
        .notEmpty()
        .withMessage("La sucursal de origen es obligatoria")
        .isInt({ min: 1 })
        .withMessage("sucursal_origen_id debe ser un entero positivo")
        .toInt(),

    body("sucursal_destino_id")
        .notEmpty()
        .withMessage("La sucursal de destino es obligatoria")
        .isInt({ min: 1 })
        .withMessage("sucursal_destino_id debe ser un entero positivo")
        .custom((value, { req }) => {
            if (value === req.body.sucursal_origen_id) {
                throw new Error("La sucursal de destino no puede ser la misma que la de origen");
            }
            return true;
        })
        .toInt(),

    body("observaciones")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 })
        .withMessage("Las observaciones no pueden superar 250 caracteres"),

    body("detalles")
        .isArray({ min: 1 })
        .withMessage("El traslado debe contener al menos un ítem en los detalles"),

    body("detalles.*.variante_id")
        .notEmpty()
        .withMessage("Cada ítem debe incluir un variante_id")
        .isInt({ min: 1 })
        .withMessage("variante_id debe ser un entero positivo")
        .toInt(),

    body("detalles.*.cantidad")
        .notEmpty()
        .withMessage("Cada ítem debe incluir una cantidad")
        .isInt({ min: 1 })
        .withMessage("La cantidad trasladada debe ser un entero positivo mayor o igual a 1")
        .toInt()
];

//  recibirValidator 
const recibirValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El id del traslado debe ser un entero positivo")
        .toInt(),

    body("observaciones")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 })
        .withMessage("Las observaciones no pueden superar 250 caracteres")
];

//  anularValidator 
const anularValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El id del traslado debe ser un entero positivo")
        .toInt(),

    body("observaciones")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 })
        .withMessage("Las observaciones de anulación no pueden superar 250 caracteres")
];

module.exports = { crearValidator, recibirValidator, anularValidator };