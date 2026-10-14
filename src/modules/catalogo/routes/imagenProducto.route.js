"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/imagenProducto.controller.js");
    const router      = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar  = require("../../../core/middlewares/validar");
    const upload   = require("../../../core/middlewares/upload");
    const { crearValidator, actualizarValidator } = require("../validators/imagenProducto.validator");

    router.get("/",    controlador.listar);
    router.get("/:id", controlador.obtener);

    // POST /api/imagen-productos/upload  — sube archivo a Cloudinary y crea el registro
    router.post(
        "/upload",
        verifyToken, onlyApp("interno"), hasRole("ADMIN", "GERENTE"),
        upload.single("imagen"),
        controlador.subirImagen
    );

    router.post(
        "/",
        verifyToken, onlyApp("interno"), hasRole("ADMIN", "GERENTE"),
        crearValidator, validar,
        controlador.crear
    );

    router.put(
        "/:id",
        verifyToken, onlyApp("interno"), hasRole("ADMIN", "GERENTE"),
        actualizarValidator, validar,
        controlador.actualizar
    );

    router.delete(
        "/:id",
        verifyToken, onlyApp("interno"), hasRole("ADMIN"),
        controlador.desactivar
    );

    app.use("/api/imagen-productos", router);
};