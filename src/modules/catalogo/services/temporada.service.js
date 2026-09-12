"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

// Columnas por las que se puede ordenar en la lista pública.
const SORTABLES = ["nombre", "anio", "created_at", "activo"];

//  listar 
// Devuelve una página de temporadas con filtros opcionales.
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    // Búsqueda de texto libre en nombre o descripción
    if (query.q) {
        where[Op.or] = [
            { nombre: { [Op.iLike]: `%${query.q}%` } },
            { descripcion: { [Op.iLike]: `%${query.q}%` } }
        ];
    }

    // Filtro exacto por año[cite: 15]
    if (query.anio) {
        where.anio = query.anio;
    }

    // Filtro de activo: el default es "solo activos"[cite: 15]
    if (query.activo === "false") {
        where.activo = false;
    } else if (query.activo === "todos") {
        // Sin filtro
    } else {
        where.activo = true;
    }

    const { rows, count } = await db.temporada.findAndCountAll({
        where,
        limit,
        offset,
        // Si no se especificó ?sort=, ordenar por año descendente y luego nombre
        order: order.length ? order : [["anio", "desc"], ["nombre", "asc"]]
    });

    return { rows, count, page, limit };
};

//  obtener 
const obtener = async (id) => {
    const temporada = await db.temporada.findByPk(id);

    if (!temporada) throw new AppError("Temporada no encontrada", 404);
    return temporada;
};

//  crear 
// La unicidad de la combinación "nombre" + "anio" se delega a la BD mediante el índice único[cite: 15].
// Si se viola, Sequelize lanzará un UniqueConstraintError.
const crear = async (datos) => {
    const { nombre, anio, descripcion } = datos;
    return db.temporada.create({ nombre, anio, descripcion });
};

//  actualizar 
const actualizar = async (id, datos) => {
    const temporada = await db.temporada.findByPk(id);
    if (!temporada) throw new AppError("Temporada no encontrada", 404);

    // Whitelist explícita
    const campos = {};
    if ("nombre" in datos) campos.nombre = datos.nombre;
    if ("anio" in datos) campos.anio = datos.anio;
    if ("descripcion" in datos) campos.descripcion = datos.descripcion;

    return temporada.update(campos);
};

//  desactivar 
// Baja lógica: activo = false[cite: 15]. NUNCA se elimina el registro.
// Regla de negocio: no se puede desactivar una temporada que esté en uso por productos activos[cite: 15].
const desactivar = async (id) => {
    const temporada = await db.temporada.findByPk(id);
    if (!temporada) throw new AppError("Temporada no encontrada", 404);

    const productosActivos = await db.producto.count({
        where: { temporada_id: id, activo: true }
    });

    if (productosActivos > 0) {
        throw AppError.reglaNegocio(
            "No se puede desactivar una temporada con productos activos",
            [`La temporada está asignada a ${productosActivos} producto(s) en circulación`]
        );
    }

    await temporada.update({ activo: false });
    // 204 sin cuerpo
};

module.exports = { listar, obtener, crear, actualizar, desactivar };