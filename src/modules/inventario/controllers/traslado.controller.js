"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, paginado } = require("../../../core/utils/respuesta");
const TrasladoService = require("../services/traslado.service");

// GET /api/traslados
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await TrasladoService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/traslados/:id
const obtener = asyncHandler(async (req, res) => {
    const traslado = await TrasladoService.obtener(req.params.id);
    ok(res, traslado);
});

// POST /api/traslados
const crear = asyncHandler(async (req, res) => {
    const despachadoPor = req.usuario.id;
    const traslado = await TrasladoService.crear(req.body, despachadoPor);
    creado(res, traslado);
});

// POST /api/traslados/:id/recibir
const recibir = asyncHandler(async (req, res) => {
    const recibidoPor = req.usuario.id;
    const { observaciones } = req.body;
    const traslado = await TrasladoService.recibir(req.params.id, recibidoPor, observaciones);
    ok(res, traslado);
});

// POST /api/traslados/:id/anular
const anular = asyncHandler(async (req, res) => {
    const usuarioId = req.usuario.id;
    const { observaciones } = req.body;
    const traslado = await TrasladoService.anular(req.params.id, usuarioId, observaciones);
    ok(res, traslado);
});

module.exports = { listar, obtener, crear, recibir, anular };