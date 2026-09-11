"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

// Columnas por las que se puede ordenar en la lista pública.
const SORTABLES = ["nombre", "created_at", "activo"];

const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};
    if (query.q) {
        where[Op.or] = [
            { codigo: { [Op.iLike]: `%${query.q}%` } },
            { nombre: { [Op.iLike]: `%${query.q}%` } },
            { descripcion: { [Op.iLike]: `%${query.q}%` } }
        ];
    }

    if (query.genero) where.genero = query.genero;
    if (query.categoria_id) where.categoria_id = query.categoria_id;
    if (query.marca_id) where.marca_id = query.marca_id;
    if (query.temporada_id) where.temporada_id = query.temporada_id;

    if (query.activo === "false") {
        where.activo = false;
    } else if (query.activo === "todos") {
    } else {
        where.activo = true;
    }

    const { rows, count } = await db.producto.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["nombre", "asc"]],
        include: [
            {
                model: db.categoria, attributes: ["id", "nombre"],
                model: db.marca, attributes: ["id", "nombre"],
                model: db.temporada, attributes: ["id", "nombre"]
            }
        ]
    });
    return { rows, count, page, limit };

    const obtener = async (id) => {
        const producto = await db.producto.findByPk(id, {
            include: [
                { model: db.categoria, attributes: ["id", "nombre"] },
                { model: db.marca, attributes: ["id", "nombre"] },
                { model: db.temporada, attributes: ["id", "nombre"] },
                { model: db.imagen_producto, attributes: ["id", "url", "es_principal"], separate: true, order: [['order', 'ASC']] }
            ]
        });

        if (!producto) throw new AppError("No se encontró el producto", 404);
        return producto;
    };

    const crear = async (data) => {
        const { codigo, nombre, descripcion, genero, activo, categoria_id, marca_id, temporada_id } = data;
        return db.producto.create({ codigo, nombre, descripcion, genero, activo, categoria_id, marca_id, temporada_id });
    };

    const actualizar = async (id, data) => {
        const producto = await db.producto.findByPk(id);
        if (!producto) throw new AppError("No se encontró el producto", 404);

        const campos = {};

        if ("codigo" in data) campos.codigo = data.codigo;
        if ("nombre" in data) campos.nombre = data.nombre;
        if ("descripcion" in data) campos.descripcion = data.descripcion;
        if ("genero" in data) campos.genero = data.genero;
        if ("activo" in data) campos.activo = data.activo;
        if ("categoria_id" in data) campos.categoria_id = data.categoria_id;
        if ("marca_id" in data) campos.marca_id = data.marca_id;
        if ("temporada_id" in data) campos.temporada_id = data.temporada_id;

        return producto.update(campos);
    };

    const desactivar = async (id) => {
        const producto = await db.producto.findByPk(id);
        if (!producto) throw new AppError("No se encontró el producto", 404);

        const variantesActivas = await db.variante.count({
            where: { producto_id: id, activo: true }
        });

        if (variantesActivas > 0) {
            throw AppError.reglaNegocio(
                "No se puede desactivar un producto con variantes activas",
                [`El producto tiene ${variantesActivas} variante(s) de inventario en circulación`]
            );
        }

        await producto.update({ activo: false });
        // 204 sin cuerpo
    };

    module.exports = { listar, obtener, crear, actualizar, desactivar };


}