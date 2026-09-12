"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["cantidad_fisica", "cantidad_comprometida", "existencia_minima", "costo_promedio", "created_at"];

//  listar 
// Consulta existencias con soporte para alertas de bajo stock y filtros por sucursal/variante.
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.sucursal_id) where.sucursal_id = query.sucursal_id;
    if (query.variante_id) where.variante_id = query.variante_id;

    // Filtro de alerta: existencias con stock por debajo o igual al mínimo
    if (query.bajo_minimo === "true") {
        where.cantidad_fisica = { [Op.lte]: db.Sequelize.col("existencia_minima") };
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
                attributes: ["id", "sku", "codigo_barras"],
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

//  obtener 
const obtener = async (id) => {
    const existencia = await db.existencia.findByPk(id, {
        include: [
            { model: db.sucursal, attributes: ["id", "codigo", "nombre"] },
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

    if (!existencia) throw new AppError("Registro de existencia no encontrado", 404);
    return existencia;
};

//  crear 
// Inicializa un registro de existencia para una combinación variante + sucursal.
const crear = async (datos) => {
    const { variante_id, sucursal_id, existencia_minima } = datos;

    // Verificar si la sucursal y variante existen
    const sucursal = await db.sucursal.findByPk(sucursal_id);
    if (!sucursal) throw new AppError("La sucursal especificada no existe", 404);

    const variante = await db.variante.findByPk(variante_id);
    if (!variante) throw new AppError("La variante especificada no existe", 404);

    // La BD previene duplicados mediante índice único (variante_id, sucursal_id)
    return db.existencia.create({
        variante_id,
        sucursal_id,
        existencia_minima: existencia_minima || 0,
        cantidad_fisica: 0,
        cantidad_comprometida: 0,
        costo_promedio: 0
    });
};

//  actualizar 
// Solo se permite parametrizar configuraciones de gestión como la 'existencia_minima'.
// Las cantidades físicas y costos son inmutables mediante PUT directo.
const actualizar = async (id, datos) => {
    const existencia = await db.existencia.findByPk(id);
    if (!existencia) throw new AppError("Registro de existencia no encontrado", 404);

    const campos = {};
    if ("existencia_minima" in datos) campos.existencia_minima = datos.existencia_minima;

    return existencia.update(campos);
};

module.exports = { listar, obtener, crear, actualizar };