"use strict";

const { body, param } = require("express-validator");

//  recepcionItemValidator 
const recepcionItemValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El id del detalle de traslado debe ser un entero positivo")
        .toInt(),

    body("cantidad_recibida")
        .notEmpty()
        .withMessage("La cantidad recibida es obligatoria")
        .isInt({ min: 0 })
        .withMessage("La cantidad recibida debe ser un entero mayor o igual a 0")
        .toInt(),

    body("observacion_diferencia")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 })
        .withMessage("La observación de diferencia no puede superar 250 caracteres")
];

module.exports = { recepcionItemValidator };