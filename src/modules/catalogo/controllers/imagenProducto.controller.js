"use strict";

const asyncHandler     = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const ImagenProductoService = require("../services/imagenProducto.service");
const { subirBuffer }  = require("../../../core/utils/cloudinary");

const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await ImagenProductoService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

const obtener = asyncHandler(async (req, res) => {
    const imagenProducto = await ImagenProductoService.obtener(req.params.id);
    ok(res, imagenProducto);
});

const crear = asyncHandler(async (req, res) => {
    const imagenProducto = await ImagenProductoService.crear(req.body);
    creado(res, imagenProducto);
});

const actualizar = asyncHandler(async (req, res) => {
    const imagenProducto = await ImagenProductoService.actualizar(req.params.id, req.body);
    ok(res, imagenProducto);
});

const desactivar = asyncHandler(async (req, res) => {
    await ImagenProductoService.eliminar(req.params.id);
    sinContenido(res);
});

// POST /api/imagen-productos/upload  (multipart/form-data)
// Campos: imagen (file), producto_id (number), color_id? (number), es_principal? (bool), orden? (number)
const subirImagen = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: { mensaje: "No se recibió ningún archivo de imagen" } });
    }

    const resultado = await subirBuffer(req.file.buffer, {
        folder:         "productos",
        resource_type:  "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        transformation: [{ quality: "auto", fetch_format: "auto" }],
    });

    const productoId   = Number(req.body.producto_id);
    const colorId      = req.body.color_id ? Number(req.body.color_id) : null;
    const esPrincipal  = req.body.es_principal === "true" || req.body.es_principal === true;

    // (1) Si la nueva será la principal, localizar la(s) principal(es) anterior(es)
    const anteriores = esPrincipal
        ? await ImagenProductoService.buscarPrincipales(productoId, colorId)
        : [];

    // (2) Guardar la nueva
    const imagen = await ImagenProductoService.crear({
        url:          resultado.secure_url,
        producto_id:  productoId,
        color_id:     colorId,
        es_principal: esPrincipal,
        orden:        req.body.orden       ? Number(req.body.orden)       : 0,
    });

    // (3) Eliminar las anteriores (registro + archivo en Cloudinary)
    await ImagenProductoService.descartar(anteriores);

    creado(res, { ...imagen.toJSON(), cloudinary_id: resultado.public_id });
});

module.exports = { listar, obtener, crear, actualizar, desactivar, subirImagen };