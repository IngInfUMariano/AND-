"use strict";

module.exports = (app) => {
  const asyncHandler = require("../../../core/utils/asyncHandler");
  const { paginado }  = require("../../../core/utils/respuesta");
  const db            = require("../../../loaders/models.loader");
  const { parsearPaginacion } = require("../../../core/utils/paginacion");
  const router        = require("express").Router();

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

  app.use("/api/zonas-envio", router);
};
