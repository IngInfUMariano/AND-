"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/movimientoInventario.controller.js");
    const router = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar = require("../../../core/middlewares/validar");
    const { crearValidator } = require("../validators/movimientoInventario.validator");

    // Todas las operaciones de movimientos son privadas
    router.use(verifyToken, onlyApp("interno"));

    // Lectura del historial / kardex
    router.get("/", hasRole("ADMIN", "GERENTE", "BODEGUERO"), controlador.listar);
    router.get("/:id", hasRole("ADMIN", "GERENTE", "BODEGUERO"), controlador.obtener);

    // Registro manual de ajuste/movimiento (No existen rutas PUT o DELETE)
    router.post(
        "/",
        hasRole("ADMIN", "GERENTE", "BODEGUERO"),
        crearValidator,
        validar,
        controlador.crear
    );

    app.use("/api/movimientos-inventario", router);
};