"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const PrecioService = require("../services/precio.service");

const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await PrecioService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

const listarPorVariante = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await PrecioService.listar({ ...req.query, variante_id: req.params.id });
    paginado(res, rows, count, page, limit);
});

const obtener = asyncHandler(async (req, res) => {
    const precio = await PrecioService.obtener(req.params.id);
    ok(res, precio);
});

const crear = asyncHandler(async (req, res) => {
    const precio = await PrecioService.crear(req.body);
    creado(res, precio);
});

const actualizar = asyncHandler(async (req, res) => {
    const precio = await PrecioService.actualizar(req.params.id, req.body);
    ok(res, precio);
});

const caducar = asyncHandler(async (req, res) => {
    const precio = await PrecioService.caducar(req.params.id);
    ok(res, precio);
});

module.exports = { listar, listarPorVariante, obtener, crear, actualizar, caducar };