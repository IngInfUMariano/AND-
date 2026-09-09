// auth.controller.js — traduce HTTP ↔ servicio para los endpoints de autenticación.
//
// Cada método: leer del req → llamar al servicio → responder. Sin lógica de negocio.
// La IP se lee aquí (capa HTTP) y se pasa al servicio para el registro en bitácora.

"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado } = require("../../../core/utils/respuesta");
const AuthService    = require("../services/auth.service");

// Extrae la IP real del cliente considerando proxies inversos (nginx, load balancer).
const obtenerIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  req.ip;

// POST /api/auth/interno
const loginInterno = asyncHandler(async (req, res) => {
  const datos = await AuthService.loginInterno(req.body.email, req.body.password, obtenerIp(req));
  ok(res, datos);
});

// POST /api/auth/tienda
const loginTienda = asyncHandler(async (req, res) => {
  const datos = await AuthService.loginTienda(req.body.email, req.body.password, obtenerIp(req));
  ok(res, datos);
});

// POST /api/auth/registro
const registro = asyncHandler(async (req, res) => {
  const datos = await AuthService.registro(req.body, obtenerIp(req));
  creado(res, datos);
});

// POST /api/auth/recuperar
const recuperar = asyncHandler(async (req, res) => {
  const datos = await AuthService.recuperar(req.body.email, obtenerIp(req));
  ok(res, datos);
});

// POST /api/auth/restablecer
const restablecer = asyncHandler(async (req, res) => {
  const datos = await AuthService.restablecer(req.body.token, req.body.password, obtenerIp(req));
  ok(res, datos);
});

// PUT /api/auth/password  (requiere autenticación)
const cambiarPassword = asyncHandler(async (req, res) => {
  const datos = await AuthService.cambiarPassword(
    req.usuario.id,
    req.body.password_actual,
    req.body.password_nuevo,
    obtenerIp(req)
  );
  ok(res, datos);
});

// GET /api/auth/perfil  (requiere autenticación)
const obtenerPerfil = asyncHandler(async (req, res) => {
  const datos = await AuthService.obtenerPerfil(req.usuario.id);
  ok(res, datos);
});

module.exports = {
  loginInterno,
  loginTienda,
  registro,
  recuperar,
  restablecer,
  cambiarPassword,
  obtenerPerfil
};
