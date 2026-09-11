"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, paginado } = require("../../../core/utils/respuesta");
const TrasladoDetalleService = require("../services/trasladoDetalle.service");

// GET /api/traslado-detalles
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await TrasladoDetalleService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/traslado-detalles/:id
const obtener = asyncHandler(async (req, res) => {
    const detalle = await TrasladoDetalleService.obtener(req.params.id);
    ok(res, detalle);
});

// PATCH /api/traslado-detalles/:id/recepcion
const registrarRecepcionItem = asyncHandler(async (req, res) => {
    const detalle = await TrasladoDetalleService.registrarRecepcionItem(
        req.params.id,
        req.body
    );
    ok(res, detalle);
});

module.exports = { listar, obtener, registrarRecepcionItem };