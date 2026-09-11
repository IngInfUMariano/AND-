"use strict";

const db = requiere("../../../loaders/models.loader");
const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const MarcaService = require("../services/marca.service");

const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await MarcaService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

const obtener = asyncHandler(async (req, res) => {
    const marca = await MarcaService.obtener(req.params.id);
    ok(res, marca);
});

const crear = asyncHandler(async (req, res) => {
    const marca = await MarcaService.crear(req.body);
    creado(res, marca);
});

const actualizar = asyncHandler(async (req, res) => {
    const marca = await MarcaService.actualizar(req.params.id, req.body);
    ok(res, marca);
});

const desactivar = asyncHandler(async (req, res) => {
    await MarcaService.desactivar(req.params.id);
    sinContenido(res);
});

module.exports = { listar, obtener, crear, actualizar, desactivar };    