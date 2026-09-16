"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["id", "cantidad_despachada", "cantidad_recibida", "created_at"];

//  listar 
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.traslado_id) where.traslado_id = query.traslado_id;
    if (query.variante_id) where.variante_id = query.variante_id;

    const { rows, count } = await db.traslado_detalle.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["id", "ASC"]],
        include: [
            {
                model: db.traslado,
                attributes: ["id", "numero", "estado", "fecha_despacho", "fecha_recepcion"]
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
    const detalle = await db.traslado_detalle.findByPk(id, {
        include: [
            {
                model: db.traslado,
                attributes: ["id", "numero", "estado", "sucursal_origen_id", "sucursal_destino_id"]
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

    if (!detalle) throw new AppError("Detalle de traslado no encontrado", 404);
    return detalle;
};

//  registrarRecepcionItem 
// Registra la cantidad realmente recibida y la observación de discrepancia por ítem.
const registrarRecepcionItem = async (id, datos) => {
    const { cantidad_recibida, observacion_diferencia } = datos;

    return db.sequelize.transaction(async (t) => {
        const detalle = await db.traslado_detalle.findByPk(id, {
            include: [{ model: db.traslado,
                required: true
             }],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!detalle) throw new AppError("Detalle de traslado no encontrado", 404);

        if (detalle.traslado.estado !== "EN_TRANSITO") {
            throw AppError.reglaNegocio(
                `No se puede registrar recepción en un traslado en estado ${detalle.traslado.estado}`
            );
        }

        // Si la cantidad recibida difiere de la despachada, exigimos justificación
        if (cantidad_recibida !== detalle.cantidad_despachada && !observacion_diferencia) {
            throw AppError.reglaNegocio(
                "Debe proporcionar una observación de diferencia cuando la cantidad recibida no coincide con la despachada"
            );
        }

        await detalle.update(
            {
                cantidad_recibida,
                observacion_diferencia: observacion_diferencia || null
            },
            { transaction: t }
        );

        return detalle;
    });
};

module.exports = { listar, obtener, registrarRecepcionItem };