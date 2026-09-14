"use strict";

const db               = require("../../../loaders/models.loader");
const asyncHandler     = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const ImagenProductoService = require("../services/imagenProducto.service");

const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await ImagenProductoService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

const obtener = asyncHandler(async (req, res) => {
    const imagenProducto = await ImagenProductoService.obtener(req.params.id);
    ok(res, imagenProducto);
});

const crear = asyncHandler(async (req, res) => {
    const imagenProducto = await ImagenProductoService.crear(req.body);
    creado(res, imagenProducto);
});

const actualizar = asyncHandler(async (req, res) => {
    const imagenProducto = await ImagenProductoService.actualizar(req.params.id, req.body);
    ok(res, imagenProducto);
});

const desactivar = asyncHandler(async (req, res) => {
    await ImagenProductoService.eliminar(req.params.id);
    sinContenido(res);
});

module.exports = { listar, obtener, crear, actualizar, desactivar };
