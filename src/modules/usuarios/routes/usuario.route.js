// usuario.route.js — endpoints CRUD para usuarios internos.
// Todos los endpoints requieren: token válido + app "interno" + perfil ADMIN.

"use strict";

module.exports = (app) => {
  const ctrl   = require("../controllers/usuario.controller.js");
  const router = require("express").Router();

  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar = require("../../../core/middlewares/validar");
  const { crearValidator, actualizarValidator } = require("../validators/usuario.validator");

  // Cadena de middlewares comunes a todos los endpoints de este módulo.
  // Solo ADMIN puede gestionar usuarios internos (API.md §7 módulo auth).
  const proteger = [verifyToken, onlyApp("interno"), hasRole("ADMIN")];

  router.get(   "/",    ...proteger,                                  ctrl.listar);
  router.get(   "/:id", ...proteger,                                  ctrl.obtener);
  router.post(  "/",    ...proteger, crearValidator,     validar,     ctrl.crear);
  router.put(   "/:id", ...proteger, actualizarValidator, validar,    ctrl.actualizar);
  router.delete("/:id", ...proteger,                                  ctrl.desactivar);

  app.use("/api/usuarios", router);
};
