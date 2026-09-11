"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

// Columnas por las que se puede ordenar en la lista pública.
const SORTABLES = ["sku", "created_at", "activo"];

//  listar 
// Devuelve una página de variantes con filtros opcionales.
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    // Búsqueda de texto libre por SKU o código de barras
    if (query.q) {
        where[Op.or] = [
            { sku: { [Op.iLike]: `%${query.q}%` } },
            { codigo_barras: { [Op.iLike]: `%${query.q}%` } }
        ];
    }

    if (query.producto_id) where.producto_id = query.producto_id;
    if (query.talla_id) where.talla_id = query.talla_id;
    if (query.color_id) where.color_id = query.color_id;

    // Filtro de activo: el default es "solo activos"[cite: 16]
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
        // Si no se especificó ?sort=, ordenar por SKU alfabéticamente
        order: order.length ? order : [["sku", "asc"]],
        include: [
            { model: db.producto, attributes: ["id", "nombre", "codigo"] },
            { model: db.talla, attributes: ["id", "codigo", "descripcion"] },
            { model: db.color, attributes: ["id", "nombre"] }
        ]
    });

    return { rows, count, page, limit };
};

//  obtener 
const obtener = async (id) => {
    const variante = await db.variante.findByPk(id, {
        include: [
            { model: db.producto, attributes: ["id", "nombre", "codigo"] },
            { model: db.talla, attributes: ["id", "codigo", "descripcion"] },
            { model: db.color, attributes: ["id", "nombre"] },
            // Solo incluimos el precio actual vigente[cite: 16]
            {
                model: db.precio,
                where: { vigente_hasta: null },
                required: false, // LEFT JOIN para no excluir variantes sin precio asignado
                attributes: ["id", "tipo", "monto"]
            }
        ]
    });

    if (!variante) throw new AppError("Variante no encontrada", 404);
    return variante;
};

//  crear 
// Crea una nueva variante.
// La unicidad de la combinación producto_id + talla_id + color_id, así como del 
// SKU y código de barras, se delega a los índices únicos de la base de datos[cite: 16].
const crear = async (datos) => {
    const { sku, codigo_barras, producto_id, talla_id, color_id } = datos;
    return db.variante.create({ sku, codigo_barras, producto_id, talla_id, color_id });
};

//  actualizar 
// Regla de negocio: El SKU es inmutable y no se puede actualizar[cite: 16]. 
// La combinación producto/talla/color tampoco debe cambiar ya que define el SKU.
const actualizar = async (id, datos) => {
    const variante = await db.variante.findByPk(id);
    if (!variante) throw new AppError("Variante no encontrada", 404);

    // Whitelist explícita: SOLO permitimos actualizar el código de barras.
    const campos = {};
    if ("codigo_barras" in datos) campos.codigo_barras = datos.codigo_barras;

    return variante.update(campos);
};

//  desactivar 
// Baja lógica: activo = false[cite: 16]. NUNCA se elimina el registro físico.
// Regla de negocio: No se puede desactivar una variante si tiene existencias en sucursales[cite: 16].
const desactivar = async (id) => {
    const variante = await db.variante.findByPk(id);
    if (!variante) throw new AppError("Variante no encontrada", 404);

    // Verificamos si existe algún registro de inventario (existencia) asociado[cite: 16]
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
    // 204 sin cuerpo
};

module.exports = { listar, obtener, crear, actualizar, desactivar };