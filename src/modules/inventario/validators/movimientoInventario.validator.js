"use strict";

const { body } = require("express-validator");

const TIPOS_PERMITIDOS = [
    "ENTRADA_COMPRA",
    "ENTRADA_DEVOLUCION",
    "ENTRADA_TRASLADO",
    "SALDO_INICIAL",
    "AJUSTE_POSITIVO",
    "SALIDA_VENTA",
    "SALIDA_MERMA",
    "SALIDA_DEVOLUCION",
    "SALIDA_TRASLADO",
    "AJUSTE_NEGATIVO"
];

//  crearValidator 
const crearValidator = [
    body("tipo")
        .notEmpty()
        .withMessage("El tipo de movimiento es obligatorio")
        .isIn(TIPOS_PERMITIDOS)
        .withMessage(`El tipo debe ser uno de los siguientes: ${TIPOS_PERMITIDOS.join(", ")}`),

    body("cantidad")
        .notEmpty()
        .withMessage("La cantidad es obligatoria")
        .isInt({ min: 1 })
        .withMessage("La cantidad debe ser un entero positivo mayor o igual a 1")
        .toInt(),

    body("variante_id")
        .notEmpty()
        .withMessage("El variante_id es obligatorio")
        .isInt({ min: 1 })
        .withMessage("El variante_id debe ser un entero positivo")
        .toInt(),

    body("sucursal_id")
        .notEmpty()
        .withMessage("El sucursal_id es obligatorio")
        .isInt({ min: 1 })
        .withMessage("El sucursal_id debe ser un entero positivo")
        .toInt(),

    body("costo_unitario")
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage("El costo unitario debe ser un número positivo mayor o igual a 0")
        .toFloat(),

    body("referencia_tipo")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 30 })
        .withMessage("El campo referencia_tipo no puede superar los 30 caracteres"),

    body("referencia_id")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("El referencia_id debe ser un entero positivo")
        .toInt(),

    body("comprobante_id")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("El comprobante_id debe ser un entero positivo")
        .toInt(),

    body("motivo")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 250 })
        .withMessage("El motivo no puede superar 250 caracteres")
];

module.exports = { crearValidator };