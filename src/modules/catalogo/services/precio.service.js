"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

// Columnas por las que se puede ordenar en la lista pública.
// Las que no estén aquí se ignoran silenciosamente (ver parsearPaginacion).
const SORTABLES = ["nombre", "created_at", "activo"];

const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.variante_id) where.variante_id = query.variante_id;
    if (query.producto_id) where.producto_id = query.producto_id;

    if (query.vigente === "false") {
        where.vigente_hasta = { [Op.not]: null };
    } else if (query.vigente === "todos") {

    } else {
        where.vigente_hasta = null;
    }

    const { rows, count } = await db.precio.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["vigente_desde", "desc"]],
        include: [
            {
                model: db.variante,
                as: "variante",
                attributes: ["id", "sku"]
            },
            {
                model: db.usuario,
                as: "registrador",
                attributes: ["id", "nombre", "apellido"]
            }
        ]
    });
    return { rows, count, page, limit };
};

const obtener = async (id) => {
    const precio = await db.precio.findByPk(id, {
        include: [
            {
                model: db.variante,
                as: "variante",
                attributes: ["id", "sku"]
            },
            {
                model: db.usuario,
                as: "registrador",
                attributes: ["id", "nombre", "apellido"]
            }
        ]
    });
    if (!precio) throw new AppError("No se encontró el precio", 404);
    return precio;
};

const crear = async (data) => {
    const { tipo, monto, variante_id, registrador_id } = data;
    const hoy = new Date().toISOString().split("T")[0];

    return await db.sequelize.transaction(async (t) => {
        // buscar si ya existe un precio vigente para la variante y tipo
        const precioAnterior = await db.precio.findOne({
            where: {
                variante_id,
                tipo,
                vigente_hasta: null
            },
            transaction: t
        });
        //si existe un precio caducamos este y luego colocamos el nuevo precio
        if (precioAnterior) {
            await precioAnterior.update({ vigente_hasta: hoy }, { transaction: t });
        }

        return await db.precio.create({
            tipo,
            monto,
            variante_id,
            registrador_id,
            vigente_desde: hoy
        }, { transaction: t });
    });
}

const actualizar = async (id, data) => {
    const precio = await db.precio.findByPk(id);
    if (!precio) throw new AppError("No se encontró el precio", 404);

    const campos = {};
    if ("monto" in data) campos.monto = data.monto;
    if ("vigente_desde" in data) campos.vigente_desde = data.vigente_desde;
    if ("vigente_hasta" in data) campos.vigente_hasta = data.vigente_hasta;

    return precio.update(campos);
};

const caducar = async (id) => {
    const precio = await db.precio.findByPk(id);
    if (!precio) throw new AppError("No se encontró el precio", 404);

    if (precio.vigente_hasta !== null) {
        throw new AppError("El precio ya está caducado o cerrado", []);
    }
    const hoy = new Date().toISOString().split("T")[0];
    return precio.update({ vigente_hasta: hoy });
};

module.exports = { listar, obtener, crear, actualizar, caducar };