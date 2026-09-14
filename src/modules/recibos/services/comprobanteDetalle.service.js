"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["id", "sku", "cantidad", "costo_unitario", "subtotal", "created_at"];

//  listar 
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.comprobante_id) where.comprobante_id = query.comprobante_id;
    if (query.variante_id) where.variante_id = query.variante_id;
    if (query.sku) where.sku = { [Op.iLike]: `%${query.sku}%` };

    const { rows, count } = await db.comprobante_detalle.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["id", "ASC"]],
        include: [
            {
                model: db.comprobante,
                attributes: ["id", "numero", "tipo", "subtipo", "fecha", "anulado"]
            },
            {
                model: db.variante,
                attributes: ["id", "sku", "codigo_barras"],
                include: [
                    { model: db.producto, attributes: ["id", "nombre"] },
                    { model: db.talla, attributes: ["id", "codigo"] },
                    { model: db.color, attributes: ["id", "nombre"] }
                ]
            }
        ]
    });

    return { rows, count, page, limit };
};

//  obtener 
const obtener = async (id) => {
    const detalle = await db.comprobante_detalle.findByPk(id, {
        include: [
            {
                model: db.comprobante,
                attributes: ["id", "numero", "tipo", "subtipo", "fecha", "sucursal_id"]
            },
            {
                model: db.variante,
                attributes: ["id", "sku", "codigo_barras"],
                include: [
                    { model: db.producto, attributes: ["id", "nombre"] },
                    { model: db.talla, attributes: ["id", "codigo"] },
                    { model: db.color, attributes: ["id", "nombre"] }
                ]
            }
        ]
    });

    if (!detalle) throw new AppError("Detalle de comprobante no encontrado", 404);
    return detalle;
};

module.exports = { listar, obtener };