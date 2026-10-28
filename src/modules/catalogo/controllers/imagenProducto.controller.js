"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const ImagenProductoService = require("../services/imagenProducto.service");
const { subirBuffer } = require("../../../core/utils/cloudinary");

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

// POST /api/imagen-productos/upload (multipart/form-data)
const subirImagen = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: { mensaje: "No se recibió ningún archivo de imagen" } });
    }

    const productoId = Number(req.body.producto_id);
    if (!productoId || isNaN(productoId)) {
        return res.status(400).json({ error: { mensaje: "ID de producto no válido" } });
    }

    const esPrincipalBool = req.body.es_principal === "true" || req.body.es_principal === true;

    // 1. Limpia las imágenes anteriores en Cloudinary y BD si la nueva se sube como principal
    if (esPrincipalBool) {
        await ImagenProductoService.limpiarImagenesProducto(productoId);
    }

    // 2. Subir buffer a Cloudinary
    const resultado = await subirBuffer(req.file.buffer, {
        folder: "productos",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        transformation: [{ quality: "auto", fetch_format: "auto" }],
    });

    // 3. Crear el nuevo registro en la base de datos
    const imagen = await ImagenProductoService.crear({
        url: resultado.secure_url,
        producto_id: productoId,
        color_id: req.body.color_id ? Number(req.body.color_id) : null,
        es_principal: esPrincipalBool,
        orden: req.body.orden ? Number(req.body.orden) : 0,
    });

    creado(res, { ...imagen.toJSON(), cloudinary_id: resultado.public_id });
});

module.exports = { listar, obtener, crear, actualizar, desactivar, subirImagen };