// auth.route.js — endpoints de autenticación y gestión de sesión propia.
//
// Rutas públicas: login, registro, recuperar, restablecer (no requieren token).
// Rutas protegidas: perfil y cambiar-contraseña (requieren token válido).
//
// No se aplica onlyApp() en /perfil y /password porque cualquier usuario
// autenticado (interno o de tienda) puede consultar su propio perfil y
// cambiar su propia contraseña.

"use strict";

module.exports = (app) => {
  const ctrl   = require("../controllers/auth.controller.js");
  const router = require("express").Router();

  const { verifyToken }                  = require("../../../core/middlewares/authJwt");
  const validar                          = require("../../../core/middlewares/validar");
  const {
    loginValidator,
    registroValidator,
    recuperarValidator,
    restablecerValidator,
    cambiarPasswordValidator
  } = require("../validators/auth.validator");

  // ── Rutas públicas ────────────────────────────────────────────────────────
  router.post("/interno",     loginValidator,          validar, ctrl.loginInterno);
  router.post("/tienda",      loginValidator,          validar, ctrl.loginTienda);
  router.post("/registro",    registroValidator,       validar, ctrl.registro);
  router.post("/recuperar",   recuperarValidator,      validar, ctrl.recuperar);
  router.post("/restablecer", restablecerValidator,    validar, ctrl.restablecer);

  // ── Rutas protegidas ──────────────────────────────────────────────────────
  router.get("/perfil",       verifyToken,                      ctrl.obtenerPerfil);
  router.put("/password",     verifyToken, cambiarPasswordValidator, validar, ctrl.cambiarPassword);

  app.use("/api/auth", router);
};
