"use strict";

module.exports = (app) => {
  const asyncHandler = require("../../../core/utils/asyncHandler");
  const { paginado, ok, creado } = require("../../../core/utils/respuesta");
  const db = require("../../../loaders/models.loader");
  const { parsearPaginacion } = require("../../../core/utils/paginacion");
  const zonaService = require("../services/zonaEnvio.service");
  const { verifyToken, onlyApp, hasRole } = require("../../../core/middlewares/authJwt");
  const router = require("express").Router();

  const SORTABLES = ["nombre", "costo", "dias_estimados"];

  router.get("/", asyncHandler(async (req, res) => {
    const { limit, offset, order, page } = parsearPaginacion(req.query, SORTABLES);
    const where = {};
    if (req.query.activo === "false")       where.activo = false;
    else if (req.query.activo !== "todos")  where.activo = true;

    const { rows, count } = await db.zona_envio.findAndCountAll({
      where,
      limit,
      offset,
      order: order.length ? order : [["nombre", "asc"]]
    });
    paginado(res, rows, count, page, limit);
  }));

  router.post("/", verifyToken, onlyApp("interno"), hasRole("ADMIN"), asyncHandler(async (req, res) => {
    const zona = await zonaService.crear(req.body);
    creado(res, zona);
  }));

  router.put("/:id", verifyToken, onlyApp("interno"), hasRole("ADMIN"), asyncHandler(async (req, res) => {
    const zona = await zonaService.actualizar(req.params.id, req.body);
    ok(res, zona);
  }));

  router.delete("/:id", verifyToken, onlyApp("interno"), hasRole("ADMIN"), asyncHandler(async (req, res) => {
    await zonaService.desactivar(req.params.id);
    ok(res, { mensaje: "Zona de envío desactivada correctamente" });
  }));

  app.use("/api/zonas-envio", router);
};