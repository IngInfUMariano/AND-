"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");
const { cloudinary } = require("../../../core/utils/cloudinary");

const SORTABLES = ["orden", "created_at", "es_principal"];

// Helper seguro para extraer el public_id completo de Cloudinary (incluyendo subcarpetas)
const extraerPublicIdFromUrl = (url) => {
    if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return null;
    try {
        const partes = url.split("/");
        const idxUpload = partes.indexOf("upload");
        if (idxUpload === -1) return null;

        // Extrae todo lo posterior a /upload/
        const resto = partes.slice(idxUpload + 1);
        // Si hay tag de versión (v1234567), se descarta
        if (resto[0] && /^v\d+$/.test(resto[0])) {
            resto.shift();
        }
        const pathConExt = resto.join("/");
        return pathConExt.substring(0, pathConExt.lastIndexOf("."));
    } catch (error) {
        console.error("Error extrayendo public_id de Cloudinary:", error);
        return null;
    }
};

const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);
    const where = {};    

    if (query.producto_id) where.producto_id = query.producto_id;
    if (query.color_id) where.color_id = query.color_id;
    if (query.es_principal !== undefined) where.es_principal = query.es_principal === 'true';

    const { rows, count } = await db.imagen_producto.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["producto_id", "asc"], ["orden", "asc"]],
        include: [
            { model: db.producto, as: "producto", attributes: ["id", "nombre"] },
            { model: db.color, as: "color", attributes: ["id", "nombre"] }
        ]
    });
    return { rows, count, page, limit };
};

const obtener = async (id) => {
    const imagenProducto = await db.imagen_producto.findByPk(id, {
        include: [
            { model: db.producto, as: "producto", attributes: ["id", "nombre"] },
            { model: db.color, as: "color", attributes: ["id", "nombre"] }
        ]
    });
    if (!imagenProducto) throw new AppError("Imagen de producto no encontrada", 404);
    return imagenProducto;
};

// Elimina las imágenes previas asociadas a un producto tanto en Cloudinary como en PostgreSQL
const limpiarImagenesProducto = async (productoId) => {
    if (!productoId) return;

    // 1. Obtener todas las imágenes registradas en BD para este producto
    const imagenesExistentes = await db.imagen_producto.findAll({
        where: { producto_id: productoId }
    });

    for (const img of imagenesExistentes) {
        const publicId = extraerPublicIdFromUrl(img.url);
        
        // 2. Intentar eliminar del CDN (no detiene la ejecución si falla)
        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.warn(`No se pudo eliminar en Cloudinary: ${err.message}`);
            }
        }
        
        // 3. OBLIGATORIO: Borrar el registro en PostgreSQL siempre
        await img.destroy();
    }
};
const crear = async (datos) => {
    const { url, orden, es_principal, producto_id, color_id } = datos;
    return await db.imagen_producto.create({ url, orden, es_principal, producto_id, color_id });
};

const actualizar = async (id, datos) => {
    const imagenProducto = await db.imagen_producto.findByPk(id);
    if (!imagenProducto) throw new AppError("Imagen de producto no encontrada", 404);
    
    const campos = {};
    if ("url" in datos) campos.url = datos.url;
    if ("orden" in datos) campos.orden = datos.orden;
    if ("es_principal" in datos) campos.es_principal = datos.es_principal;
    if ("producto_id" in datos) campos.producto_id = datos.producto_id;
    if ("color_id" in datos) campos.color_id = datos.color_id;
    return await imagenProducto.update(campos);
};

const eliminar = async (id) => {
    const imagenProducto = await db.imagen_producto.findByPk(id);
    if (!imagenProducto) throw new AppError("Imagen de producto no encontrada", 404);

    const publicId = extraerPublicIdFromUrl(imagenProducto.url);
    if (publicId) {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (err) {
            console.error("Error destruyendo imagen en Cloudinary:", err);
        }
    }
    return await imagenProducto.destroy();
};

module.exports = { 
    listar, 
    obtener, 
    crear, 
    actualizar, 
    eliminar, 
    limpiarImagenesProducto, 
    extraerPublicIdFromUrl 
};