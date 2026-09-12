"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/comprobanteDetalle.controller.js");
    const router = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar = require("../../../core/middlewares/validar");
    const { obtenerValidator } = require("../validators/comprobanteDetalle.validator");

    // Rutas privadas exclusivas para la app interna
    router.use(verifyToken, onlyApp("interno"));

    // Consultas de renglones de comprobante
    router.get("/", hasRole("ADMIN", "GERENTE", "BODEGA"), controlador.listar);
    router.get(
        "/:id",
        hasRole("ADMIN", "GERENTE", "BODEGA"),
        obtenerValidator,
        validar,
        controlador.obtener
    );

    app.use("/api/comprobante-detalles", router);
};