"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, paginado } = require("../../../core/utils/respuesta");
const ComprobanteService = require("../services/comprobante.service");

// GET /api/comprobantes
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await ComprobanteService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/comprobantes/:id
const obtener = asyncHandler(async (req, res) => {
    const comprobante = await ComprobanteService.obtener(req.params.id);
    ok(res, comprobante);
});

// POST /api/comprobantes
const crear = asyncHandler(async (req, res) => {
    const usuario_id = req.usuario.id;
    const comprobante = await ComprobanteService.crear(req.body, usuario_id);
    creado(res, comprobante);
});

// POST /api/comprobantes/:id/anular
const anular = asyncHandler(async (req, res) => {
    const usuario_id = req.usuario.id;
    const comprobante = await ComprobanteService.anular(req.params.id, req.body, usuario_id);
    ok(res, comprobante);
});

module.exports = { listar, obtener, crear, anular };