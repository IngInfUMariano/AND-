// bitacora.route.js — endpoint de consulta de auditoría.
// Solo ADMIN del portal interno puede leer la bitácora.

"use strict";

module.exports = (app) => {
  const ctrl   = require("../controllers/bitacora.controller.js");
  const router = require("express").Router();

  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");

  router.get("/", verifyToken, onlyApp("interno"), hasRole("ADMIN"), ctrl.listar);

  app.use("/api/bitacora", router);
};
