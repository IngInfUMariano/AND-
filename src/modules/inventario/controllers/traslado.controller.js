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

// POST /api/traslados (Crea solicitud en estado PENDIENTE)
const crear = asyncHandler(async (req, res) => {
    const solicitadoPor = req.usuario.id;
    const traslado = await TrasladoService.crear(req.body, solicitadoPor);
    creado(res, traslado);
});

// POST /api/traslados/:id/despachar (Confirma salida física en bodega y pasa a EN_TRANSITO)
const despachar = asyncHandler(async (req, res) => {
    const usuarioId = req.usuario.id;
    const traslado = await TrasladoService.despachar(req.params.id, usuarioId);
    ok(res, traslado);
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

module.exports = { listar, obtener, crear, despachar, recibir, anular };