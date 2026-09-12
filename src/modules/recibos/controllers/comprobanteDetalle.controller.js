"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, paginado } = require("../../../core/utils/respuesta");
const ComprobanteDetalleService = require("../services/comprobanteDetalle.service");

// GET /api/comprobante-detalles
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await ComprobanteDetalleService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/comprobante-detalles/:id
const obtener = asyncHandler(async (req, res) => {
    const detalle = await ComprobanteDetalleService.obtener(req.params.id);
    ok(res, detalle);
});

module.exports = { listar, obtener };