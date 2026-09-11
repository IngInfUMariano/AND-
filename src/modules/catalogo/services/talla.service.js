"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

// Columnas por las que se puede ordenar en la lista pública.
const SORTABLES = ["codigo", "orden", "created_at", "activo"];

//  listar 
// Devuelve una página de tallas con filtros opcionales.
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    // Búsqueda de texto libre
    if (query.q) {
        where[Op.or] = [
            { codigo: { [Op.iLike]: `%${query.q}%` } },
            { descripcion: { [Op.iLike]: `%${query.q}%` } }
        ];
    }

    // Filtro de activo: el default es "solo activos"[cite: 14]
    if (query.activo === "false") {
        where.activo = false;
    } else if (query.activo === "todos") {
        // Sin filtro
    } else {
        where.activo = true;
    }

    const { rows, count } = await db.talla.findAndCountAll({
        where,
        limit,
        offset,
        // Si no se especificó ?sort=, ordenar por el campo 'orden' numérico de menor a mayor[cite: 14]
        order: order.length ? order : [["orden", "asc"]]
    });

    return { rows, count, page, limit };
};

//  obtener 
const obtener = async (id) => {
    const talla = await db.talla.findByPk(id);

    if (!talla) throw new AppError("Talla no encontrada", 404);
    return talla;
};

//  crear 
// La unicidad del código (ej. "M", "XL") se delega a la BD mediante el índice único[cite: 14].
const crear = async (datos) => {
    const { codigo, descripcion, orden } = datos;
    return db.talla.create({ codigo, descripcion, orden });
};

//  actualizar 
const actualizar = async (id, datos) => {
    const talla = await db.talla.findByPk(id);
    if (!talla) throw new AppError("Talla no encontrada", 404);

    // Whitelist explícita
    const campos = {};
    if ("codigo" in datos) campos.codigo = datos.codigo;
    if ("descripcion" in datos) campos.descripcion = datos.descripcion;
    if ("orden" in datos) campos.orden = datos.orden;

    return talla.update(campos);
};

//  desactivar 
// Baja lógica: activo = false[cite: 14]. NUNCA se elimina el registro.
// Regla de negocio: no se puede desactivar una talla que esté en uso por variantes activas[cite: 14].
const desactivar = async (id) => {
    const talla = await db.talla.findByPk(id);
    if (!talla) throw new AppError("Talla no encontrada", 404);

    const variantesActivas = await db.variante.count({
        where: { talla_id: id, activo: true }
    });

    if (variantesActivas > 0) {
        throw AppError.reglaNegocio(
            "No se puede desactivar una talla con variantes activas",
            [`La talla está asignada a ${variantesActivas} variante(s) en circulación`]
        );
    }

    await talla.update({ activo: false });
    // 204 sin cuerpo
};

module.exports = { listar, obtener, crear, actualizar, desactivar };