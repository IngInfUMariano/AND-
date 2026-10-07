"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["cantidad_fisica", "cantidad_comprometida", "costo_promedio", "created_at"];

// listar
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.sucursal_id) where.sucursal_id = query.sucursal_id;
    if (query.variante_id) where.variante_id = query.variante_id;

    // Filtro de alerta: existencias con stock por debajo o igual al mínimo definido en la variante
    if (query.bajo_minimo === "true") {
        where.cantidad_fisica = { [Op.lte]: db.Sequelize.col("variante.existencia_minima") };
    }

    const { rows, count } = await db.existencia.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["created_at", "desc"]],
        include: [
            {
                model: db.sucursal,
                attributes: ["id", "codigo", "nombre"]
            },
            {
                model: db.variante,
                attributes: ["id", "sku", "codigo_barras", "existencia_minima"],
                include: [
                    { model: db.producto, attributes: ["id", "nombre", "codigo"] },
                    { model: db.talla, attributes: ["id", "codigo"] },
                    { model: db.color, attributes: ["id", "nombre"] }
                ]
            }
        ]
    });

    return { rows, count, page, limit };
};

// obtener
const obtener = async (id) => {
    const existencia = await db.existencia.findByPk(id, {
        include: [
            { model: db.sucursal, attributes: ["id", "codigo", "nombre"] },
            {
                model: db.variante,
                attributes: ["id", "sku", "codigo_barras", "existencia_minima"],
                include: [
                    { model: db.producto, attributes: ["id", "nombre"] },
                    { model: db.talla, attributes: ["id", "codigo"] },
                    { model: db.color, attributes: ["id", "nombre"] }
                ]
            }
        ]
    });

    if (!existencia) throw new AppError("Registro de existencia no encontrado", 404);
    return existencia;
};

// crear
const crear = async (datos) => {
    const { variante_id, sucursal_id } = datos;

    const sucursal = await db.sucursal.findByPk(sucursal_id);
    if (!sucursal) throw new AppError("La sucursal especificada no existe", 404);

    const variante = await db.variante.findByPk(variante_id);
    if (!variante) throw new AppError("La variante especificada no existe", 404);

    return db.existencia.create({
        variante_id,
        sucursal_id,
        cantidad_fisica: 0,
        cantidad_comprometida: 0,
        costo_promedio: 0
    });
};

// actualizar
const actualizar = async (id, datos) => {
    const existencia = await db.existencia.findByPk(id);
    if (!existencia) throw new AppError("Registro de existencia no encontrado", 404);

    const campos = {};

    return existencia.update(campos);
};

module.exports = { listar, obtener, crear, actualizar };