"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");


const SORTABLES = ["nombre", "created_at", "activo"];

const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.q) {
        where[Op.or] = [
            { nombre: { [Op.iLike]: `%${query.q}%` } },
        ];
    }

    if (query.activo === "false") {
        where.activo = false;
    } else if (query.activo === "todos") {
    } else {
        where.activo = true;
    }

    const { rows, count } = await db.color.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["nombre", "asc"]],
    });

    return { rows, count, page, limit };
};

const obtener = async (id) => {
    const color = await db.color.findByPk(id, {
        include: [
            {
                model: db.variante,
                attributes: ["id", "sku", "activo"]
            },
            {
                model: db.imagen_producto,
                attributes: ["id", "url"]
            }
        ]

    });
    if (!color) throw new AppError("No se encontró el color", 404);
    return color;
};

const crear = async (datos) => {
    const { nombre, hex, codigo_hex } = datos;
    const hexValor = hex || codigo_hex;

    return await db.color.create({ nombre, hex: hexValor });
};

const actualizar = async (id, datos) => {
    const color = await db.color.findByPk(id);
    if (!color) throw new AppError("No se encontró el color", 404);

    // --- CAMBIO: Mapeo explícito de campos permitidos ---
    const campos = {};
    if ("nombre" in datos) campos.nombre = datos.nombre;
    if ("hex" in datos || "codigo_hex" in datos) {
        campos.hex = datos.hex || datos.codigo_hex;
    }

    await color.update(campos);
    return color;
};

const desactivar = async (id) => {
    const color = await db.color.findByPk(id);
    if (!color) throw new AppError("No se encontró el color", 404);
    
    const variantesActivas = await db.variante.count({ where: { color_id: id, activo: true } });
    if (variantesActivas > 0) {
        throw new AppError("No se puede desactivar el color porque tiene variantes activas", 400);
    }

    await color.update({ activo: false });
};

module.exports = { listar, obtener, crear, actualizar, desactivar };
