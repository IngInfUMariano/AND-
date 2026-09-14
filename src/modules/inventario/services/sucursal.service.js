"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["codigo", "nombre", "created_at", "activo"];

//  listar 
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.q) {
        where[Op.or] = [
            { codigo: { [Op.iLike]: `%${query.q}%` } },
            { nombre: { [Op.iLike]: `%${query.q}%` } }
        ];
    }

    // Filtros operativos específicos de sucursal[cite: 17]
    if (query.es_bodega_central !== undefined) where.es_bodega_central = query.es_bodega_central === 'true';
    if (query.vende_en_linea !== undefined) where.vende_en_linea = query.vende_en_linea === 'true';

    if (query.activo === "false") {
        where.activo = false;
    } else if (query.activo === "todos") {
        // Sin filtro
    } else {
        where.activo = true;
    }

    const { rows, count } = await db.sucursal.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["nombre", "asc"]]
    });

    return { rows, count, page, limit };
};

//  obtener 
const obtener = async (id) => {
    const sucursal = await db.sucursal.findByPk(id);

    if (!sucursal) throw new AppError("Sucursal no encontrada", 404);
    return sucursal;
};

//  crear 
// La unicidad del código está protegida por el índice en BD[cite: 17].
const crear = async (datos) => {
    const { codigo, nombre, direccion, telefono, es_bodega_central, vende_en_linea } = datos;
    return db.sucursal.create({ codigo, nombre, direccion, telefono, es_bodega_central, vende_en_linea });
};

//  actualizar 
// Regla de Negocio: El "codigo" es inmutable porque se usa para correlativos[cite: 17]. No se actualiza.
const actualizar = async (id, datos) => {
    const sucursal = await db.sucursal.findByPk(id);
    if (!sucursal) throw new AppError("Sucursal no encontrada", 404);

    const campos = {};
    if ("nombre" in datos) campos.nombre = datos.nombre;
    if ("direccion" in datos) campos.direccion = datos.direccion;
    if ("telefono" in datos) campos.telefono = datos.telefono;
    if ("es_bodega_central" in datos) campos.es_bodega_central = datos.es_bodega_central;
    if ("vende_en_linea" in datos) campos.vende_en_linea = datos.vende_en_linea;

    return sucursal.update(campos);
};

//  desactivar 
// Regla de Negocio: No se puede desactivar una sucursal si tiene inventario físico 
// mayor a 0 o empleados activos asignados[cite: 17].
const desactivar = async (id) => {
    const sucursal = await db.sucursal.findByPk(id);
    if (!sucursal) throw new AppError("Sucursal no encontrada", 404);

    // 1. Validar existencias físicas[cite: 17]
    // Asumimos que el modelo existencia tiene un campo 'cantidad' o similar.
    const existenciasPositivas = await db.existencia.count({
        where: { sucursal_id: id, cantidad_fisica: { [Op.gt]: 0 } }
    });

    if (existenciasPositivas > 0) {
        throw AppError.reglaNegocio(
            "No se puede desactivar la sucursal porque aún posee inventario",
            [`Se encontraron ${existenciasPositivas} variante(s) con existencias mayores a 0. Traslade o ajuste el inventario primero.`]
        );
    }

    // 2. Validar personal asignado[cite: 17]
    const empleadosActivos = await db.empleado.count({
        where: { sucursal_id: id, activo: true }
    });

    if (empleadosActivos > 0) {
        throw AppError.reglaNegocio(
            "No se puede desactivar la sucursal porque tiene personal asignado",
            [`Existen ${empleadosActivos} empleado(s) activo(s) vinculados a esta sucursal.`]
        );
    }

    await sucursal.update({ activo: false });
};

module.exports = { listar, obtener, crear, actualizar, desactivar };