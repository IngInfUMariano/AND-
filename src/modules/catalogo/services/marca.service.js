"use strict";

const { Op }           = require("sequelize");
const db               = require("../../../loaders/models.loader");
const AppError         = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["nombre", "created_at", "activo"];

const listar = async (query) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

  const where = {};

  if (query.q) {
    where[Op.or] = [
      { nombre:      { [Op.iLike]: `%${query.q}%` } },
      { descripcion: { [Op.iLike]: `%${query.q}%` } }
    ];
  }

  if (query.activo === "false") {
    where.activo = false;
  } else if (query.activo === "todos") {
  } else {
    where.activo = true;
  }

  const { rows, count } = await db.marca.findAndCountAll({
    where,
    limit,
    offset,
    order: order.length ? order : [["nombre", "asc"]]
    });
    return { rows, count, page, limit };
};

const obtener = async (id) => {
    const marca = await db.marca.findByPk(id);
    if (!marca) throw new AppError("No se encontró la marca", 404);
    return marca;
};

const crear = async (data) => {
    const { nombre, descripcion } = data;
    const marca = await db.marca.create({ nombre, descripcion });
    return marca;
};

const actualizar = async (id, data) => {
    const marca = await db.marca.findByPk(id);
    if (!marca) throw new AppError("No se encontró la marca", 404);
    const campos = {};
        if ("nombre" in data) campos.nombre = data.nombre;
        if ("descripcion" in data) campos.descripcion = data.descripcion;

        return marca.update(campos);
};

const desactivar = async (id) => {
    const marca = await db.marca.findByPk(id);
    if (!marca) throw new AppError("No se encontró la marca", 404);
    const productosActivos = await db.producto.count({
        where: {
            marca_id: id,
            activo: true
        }
    });
    if (productosActivos > 0) {
        throw new AppError("No se puede desactivar la marca porque tiene productos activos", 400);
    }
    return marca.update({ activo: false }); 
}

module.exports = { listar, obtener, crear, actualizar, desactivar };