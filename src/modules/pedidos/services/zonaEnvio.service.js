"use strict";

const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");

const crear = async (datos) => {
    const { nombre, costo, dias_estimados, departamentos, activo } = datos;
    return await db.zona_envio.create({
        nombre,
        costo,
        dias_estimados,
        departamentos,
        activo: activo !== undefined ? activo : true
    });
};

const actualizar = async (id, datos) => {
    const zona = await db.zona_envio.findByPk(id);
    if (!zona) throw new AppError("Zona de envío no encontrada", 404);

    const campos = {};
    if ("nombre" in datos) campos.nombre = datos.nombre;
    if ("costo" in datos) campos.costo = datos.costo;
    if ("dias_estimados" in datos) campos.dias_estimados = datos.dias_estimados;
    if ("departamentos" in datos) campos.departamentos = datos.departamentos;
    if ("activo" in datos) campos.activo = datos.activo;

    return await zona.update(campos);
};

const desactivar = async (id) => {
    const zona = await db.zona_envio.findByPk(id);
    if (!zona) throw new AppError("Zona de envío no encontrada", 404);
    await zona.update({ activo: false });
};

module.exports = { crear, actualizar, desactivar };