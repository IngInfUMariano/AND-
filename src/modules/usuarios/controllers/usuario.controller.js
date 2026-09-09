// usuario.controller.js — traduce HTTP ↔ servicio para el CRUD de usuarios internos.

"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const UsuarioService = require("../services/usuario.service");

const obtenerIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  req.ip;

// GET /api/usuarios
const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await UsuarioService.listar(req.query);
  paginado(res, rows, count, page, limit);
});

// GET /api/usuarios/:id
const obtener = asyncHandler(async (req, res) => {
  ok(res, await UsuarioService.obtener(req.params.id));
});

// POST /api/usuarios
const crear = asyncHandler(async (req, res) => {
  const datos = await UsuarioService.crear(req.body, req.usuario.id, obtenerIp(req));
  creado(res, datos);
});

// PUT /api/usuarios/:id
const actualizar = asyncHandler(async (req, res) => {
  const datos = await UsuarioService.actualizar(
    req.params.id, req.body, req.usuario.id, obtenerIp(req)
  );
  ok(res, datos);
});

// DELETE /api/usuarios/:id  (baja lógica → 204)
const desactivar = asyncHandler(async (req, res) => {
  await UsuarioService.desactivar(req.params.id, req.usuario.id, obtenerIp(req));
  sinContenido(res);
});

module.exports = { listar, obtener, crear, actualizar, desactivar };
