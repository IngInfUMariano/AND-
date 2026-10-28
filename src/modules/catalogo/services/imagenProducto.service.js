"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const {parsearPaginacion} = require("../../../core/utils/paginacion");

const SORTABLES = ["orden", "created_at", "es_principal"];

// ─── Cloudinary ──────────────────────────────────────────────────────────────
// El modelo no guarda el public_id, pero siempre se puede deducir de la URL:
//   https://res.cloudinary.com/<cloud>/image/upload/v1712345678/productos/abc123.webp
//   → public_id = "productos/abc123"
const publicIdDesdeUrl = (url) => {
    if (!url || !url.includes("/upload/")) return null;
    let ruta = url.split("/upload/")[1].split("?")[0];
    ruta = ruta.replace(/^(?:[^/]+,[^/]+\/)+/, ""); // transformaciones tipo "q_auto,f_auto/"
    ruta = ruta.replace(/^v\d+\//, "");              // versión
    ruta = ruta.replace(/\.[^./]+$/, "");             // extensión
    return decodeURIComponent(ruta);
};

// Borra el archivo en Cloudinary. Nunca lanza: si falla solo se registra,
// para no bloquear la operación principal (la imagen nueva ya quedó guardada).
const borrarArchivoRemoto = async (url) => {
    const publicId = publicIdDesdeUrl(url);
    if (!publicId) return false;
    try {
        const { v2: cloudinary } = require("cloudinary");
        const r = await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
        return r.result === "ok";
    } catch (e) {
        console.error(`[imagen-producto] No se pudo borrar ${publicId} de Cloudinary:`, e.message);
        return false;
    }
};

// Paso 1 del reemplazo: imagen(es) principal(es) actual(es) del producto (y color, si aplica)
const buscarPrincipales = async (producto_id, color_id = null) => {
    return db.imagen_producto.findAll({
        where: { producto_id, color_id: color_id ?? null, es_principal: true }
    });
};

// Paso 3 del reemplazo: elimina registro + archivo de las imágenes reemplazadas
const descartar = async (imagenes) => {
    for (const img of imagenes) {
        const url = img.url;
        await img.destroy();
        await borrarArchivoRemoto(url);
    }
};

const listar = async (query) => {
    const {limit, offset, order, page} = parsearPaginacion(query, SORTABLES);
    
    const where = {};    

    if (query.producto_id) where.producto_id = query.producto_id;
    if (query.color_id) where.color_id = query.color_id;
    if (query.es_principal !== undefined) where.es_principal = query.es_principal === 'true';


    const {rows, count} = await db.imagen_producto.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order :[["producto_id", "asc"], ["orden", "asc"]],
        include: [
            {
                model: db.producto,
                as: "producto",
                attributes: ["id", "nombre"]
            },
            {
                model: db.color,
                as: "color",
                attributes: ["id", "nombre"]
            }
        ]
    });
    return { rows, count, page, limit };
};

const obtener = async (id) => {
    const imagenProducto = await db.imagen_producto.findByPk(id, {
        include: [
            {
                model: db.producto,
                as: "producto",
                attributes: ["id", "nombre"]
            },
            {
                model: db.color,
                as: "color",
                attributes: ["id", "nombre"]
            }
        ]
    });
    if (!imagenProducto) throw new AppError("Imagen de producto no encontrada", 404);
    return imagenProducto;
};

const crear = async (datos) => {
    const {url, orden, es_principal, producto_id, color_id} = datos;
    return await db.imagen_producto.create({url, orden, es_principal, producto_id, color_id});
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
    const url = imagenProducto.url;
    await imagenProducto.destroy();
    await borrarArchivoRemoto(url); // evita archivos huérfanos en Cloudinary
};

module.exports = { listar, obtener, crear, actualizar, eliminar, buscarPrincipales, descartar, borrarArchivoRemoto, publicIdDesdeUrl };