"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const {parsearPaginacion} = require("../../../core/utils/paginacion");

const SORTABLES = ["orden", "created_at", "es_principal"];

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
    return await imagenProducto.destroy();
};

module.exports = { listar, obtener, crear, actualizar, eliminar };