"use strict";

const { param, query } = require("express-validator");

//  obtenerValidator 
const obtenerValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("El id del detalle de comprobante debe ser un entero positivo")
    .toInt()
];

module.exports = { obtenerValidator };