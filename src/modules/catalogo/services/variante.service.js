"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["sku", "existencia_minima", "created_at", "activo"];

// listar
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.q) {
        where[Op.or] = [
            { sku: { [Op.iLike]: `%${query.q}%` } },
            { codigo_barras: { [Op.iLike]: `%${query.q}%` } }
        ];
    }

    if (query.producto_id) where.producto_id = query.producto_id;
    if (query.talla_id) where.talla_id = query.talla_id;
    if (query.color_id) where.color_id = query.color_id;

    if (query.activo === "false") {
        where.activo = false;
    } else if (query.activo === "todos") {
        // Sin filtro
    } else {
        where.activo = true;
    }

    const { rows, count } = await db.variante.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["sku", "asc"]],
        include: [
            { model: db.producto, attributes: ["id", "nombre", "codigo"] },
            { model: db.talla, attributes: ["id", "codigo", "descripcion"] },
            { model: db.color, attributes: ["id", "nombre"] }
        ]
    });

    return { rows, count, page, limit };
};

// obtener
const obtener = async (id) => {
    const variante = await db.variante.findByPk(id, {
        include: [
            { model: db.producto, attributes: ["id", "nombre", "codigo"] },
            { model: db.talla, attributes: ["id", "codigo", "descripcion"] },
            { model: db.color, attributes: ["id", "nombre"] },
            {
                model: db.precio,
                where: { vigente_hasta: null },
                required: false,
                attributes: ["id", "tipo", "monto"]
            }
        ]
    });

    if (!variante) throw new AppError("Variante no encontrada", 404);
    return variante;
};

// crear
const crear = async (datos) => {
    const { sku, codigo_barras, producto_id, talla_id, color_id, existencia_minima } = datos;
    return db.variante.create({ sku, codigo_barras, producto_id, talla_id, color_id, existencia_minima });
};

// actualizar
const actualizar = async (id, datos) => {
    const variante = await db.variante.findByPk(id);
    if (!variante) throw new AppError("Variante no encontrada", 404);

    const campos = {};
    if ("codigo_barras" in datos) campos.codigo_barras = datos.codigo_barras;
    if ("existencia_minima" in datos) campos.existencia_minima = datos.existencia_minima;

    return variante.update(campos);
};

// desactivar
const desactivar = async (id) => {
    const variante = await db.variante.findByPk(id);
    if (!variante) throw new AppError("Variante no encontrada", 404);

    const existencias = await db.existencia.count({
        where: { variante_id: id }
    });

    if (existencias > 0) {
        throw AppError.reglaNegocio(
            "No se puede desactivar una variante con existencias registradas",
            [`La variante tiene registros de inventario en ${existencias} sucursal(es)`]
        );
    }

    await variante.update({ activo: false });
};

module.exports = { listar, obtener, crear, actualizar, desactivar };