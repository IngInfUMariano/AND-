"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/trasladoDetalle.controller.js");
    const router = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar = require("../../../core/middlewares/validar");
    const { recepcionItemValidator } = require("../validators/trasladoDetalle.validator");

    // Rutas privadas exclusivas para la app interna
    router.use(verifyToken, onlyApp("interno"));

    // Consultas de renglones de traslado
    router.get("/", hasRole("ADMIN", "GERENTE", "BODEGA"), controlador.listar);
    router.get("/:id", hasRole("ADMIN", "GERENTE", "BODEGA"), controlador.obtener);

    // Registro/confirmación de cantidad recibida a nivel de ítem
    router.patch(
        "/:id/recepcion",
        hasRole("ADMIN", "GERENTE", "BODEGA"),
        recepcionItemValidator,
        validar,
        controlador.registrarRecepcionItem
    );

    app.use("/api/traslado-detalles", router);
};