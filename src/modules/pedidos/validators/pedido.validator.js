
"use strict";

const { body, param } = require("express-validator");

const ESTADOS_VALIDOS = [
  "REGISTRADO",
  "PENDIENTE_PAGO",
  "PAGADO",
  "EN_PREPARACION",
  "DESPACHADO",
  "ENTREGADO",
  "ANULADO"
];

const crearPedidoValidator = [
  body("sucursal_id")
    .notEmpty().withMessage("La sucursal es obligatoria")
    .isInt({ min: 1 }).withMessage("sucursal_id debe ser un entero positivo")
    .toInt(),

  body("forma_pago")
    .optional()
    .isIn(["EN_LINEA", "CREDITO"]).withMessage("La forma de pago debe ser EN_LINEA o CREDITO"),

  body("entrega_tipo")
    .optional()
    .isIn(["ENVIO", "RETIRO_SUCURSAL"]).withMessage("El tipo de entrega debe ser ENVIO o RETIRO_SUCURSAL"),

  body("entrega_direccion")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 250 }).withMessage("La dirección de entrega no puede superar 250 caracteres"),

  body("observaciones")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage("Las observaciones no pueden superar 500 caracteres")
];

const cambiarEstadoValidator = [
  param("id")
    .isInt({ min: 1 }).withMessage("El id debe ser un entero positivo")
    .toInt(),

  body("estado")
    .notEmpty().withMessage("El nuevo estado es obligatorio")
    .customSanitizer(val => typeof val === "string" ? val.toUpperCase() : val)
    .isIn(ESTADOS_VALIDOS).withMessage(`El estado debe ser uno de los siguientes: ${ESTADOS_VALIDOS.join(", ")}`),

  body("observacion")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 250 }).withMessage("La observación no puede superar 250 caracteres")
];

const anularPedidoValidator = [
  param("id")
    .isInt({ min: 1 }).withMessage("El id debe ser un entero positivo")
    .toInt(),

  body("motivo")
    .trim()
    .notEmpty().withMessage("El motivo de la anulación es obligatorio")
    .isLength({ min: 5, max: 250 }).withMessage("El motivo debe contener entre 5 y 250 caracteres")
];

module.exports = {
  crearPedidoValidator,
  cambiarEstadoValidator,
  anularPedidoValidator
};