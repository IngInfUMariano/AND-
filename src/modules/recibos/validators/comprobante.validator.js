"use strict";

const { body, param } = require("express-validator");

const TIPOS_PERMITIDOS = ["ENTRADA", "SALIDA"];
const SUBTIPOS_PERMITIDOS = ["COMPRA", "MERMA", "VENTA", "TRASLADO", "DEVOLUCION", "AJUSTE"];

//  crearValidator 
const crearValidator = [
    body("sucursal_id")
        .notEmpty()
        .withMessage("El sucursal_id es obligatorio")
        .isInt({ min: 1 })
        .withMessage("El sucursal_id debe ser un entero positivo")
        .toInt(),

    body("tipo")
        .notEmpty()
        .withMessage("El tipo es obligatorio")
        .isIn(TIPOS_PERMITIDOS)
        .withMessage(`El tipo debe ser uno de: ${TIPOS_PERMITIDOS.join(", ")}`),

    body("subtipo")
        .notEmpty()
        .withMessage("El subtipo es obligatorio")
        .isIn(SUBTIPOS_PERMITIDOS)
        .withMessage(`El subtipo debe ser uno de: ${SUBTIPOS_PERMITIDOS.join(", ")}`),

    body("documento_externo")
        .optional()
        .trim()
        .isLength({ max: 40 })
        .withMessage("El documento externo no puede superar los 40 caracteres"),

    body("observaciones")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Las observaciones no pueden superar los 500 caracteres"),

    body("proveedor_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El proveedor_id debe ser un entero positivo")
        .toInt(),

    body("cliente_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El cliente_id debe ser un entero positivo")
        .toInt(),

    body("pedido_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El pedido_id debe ser un entero positivo")
        .toInt(),

    body("traslado_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El traslado_id debe ser un entero positivo")
        .toInt(),

    body("detalles")
        .isArray({ min: 1 })
        .withMessage("Debe proporcionar un arreglo 'detalles' con al menos un elemento"),

    body("detalles.*.variante_id")
        .notEmpty()
        .withMessage("El variante_id del detalle es obligatorio")
        .isInt({ min: 1 })
        .withMessage("El variante_id debe ser un entero positivo")
        .toInt(),

    body("detalles.*.sku")
        .notEmpty()
        .withMessage("El SKU del detalle es obligatorio")
        .trim()
        .isLength({ max: 40 })
        .withMessage("El SKU no puede superar los 40 caracteres"),

    body("detalles.*.descripcion")
        .notEmpty()
        .withMessage("La descripción del detalle es obligatoria")
        .trim()
        .isLength({ max: 200 })
        .withMessage("La descripción no puede superar los 200 caracteres"),

    body("detalles.*.cantidad")
        .notEmpty()
        .withMessage("La cantidad del detalle es obligatoria")
        .isInt({ min: 1 })
        .withMessage("La cantidad debe ser un entero mayor o igual a 1")
        .toInt(),

    body("detalles.*.costo_unitario")
        .notEmpty()
        .withMessage("El costo unitario es obligatorio")
        .isFloat({ min: 0 })
        .withMessage("El costo unitario debe ser un número decimal mayor o igual a 0")
        .toFloat()
];

//  anularValidator 
const anularValidator = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El id del comprobante debe ser un entero positivo")
        .toInt(),

    body("motivo_anulacion")
        .notEmpty()
        .withMessage("El motivo de anulación es obligatorio")
        .trim()
        .isLength({ min: 5, max: 250 })
        .withMessage("El motivo de anulación debe tener entre 5 y 250 caracteres")
];

module.exports = { crearValidator, anularValidator };