"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["serie", "tipo_documento", "ultimo_numero", "created_at"];

const TIPOS_DOCUMENTO = ["ENTRADA", "SALIDA", "TRASLADO"];

//  listar 
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.sucursal_id) where.sucursal_id = query.sucursal_id;
    if (query.tipo_documento) where.tipo_documento = query.tipo_documento;
    if (query.serie) where.serie = { [Op.iLike]: `%${query.serie}%` };

    const { rows, count } = await db.correlativo.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["id", "ASC"]],
        include: [
            { model: db.sucursal, attributes: ["id", "codigo", "nombre"] }
        ]
    });

    return { rows, count, page, limit };
};

//  obtener 
const obtener = async (id) => {
    const correlativo = await db.correlativo.findByPk(id, {
        include: [
            { model: db.sucursal, attributes: ["id", "codigo", "nombre"] }
        ]
    });

    if (!correlativo) throw new AppError("Configuración de correlativo no encontrada", 404);
    return correlativo;
};

//  crear 
const crear = async (datos) => {
    const { sucursal_id, tipo_documento, serie, ultimo_numero } = datos;

    if (!TIPOS_DOCUMENTO.includes(tipo_documento)) {
        throw AppError.validacion(`El tipo de documento debe ser uno de: ${TIPOS_DOCUMENTO.join(", ")}`);
    }

    const sucursal = await db.sucursal.findByPk(sucursal_id);
    if (!sucursal) throw new AppError("La sucursal especificada no existe", 404);

    // Validar unicidad (sucursal_id, tipo_documento)
    const existente = await db.correlativo.findOne({
        where: { sucursal_id, tipo_documento }
    });

    if (existente) {
        throw AppError.reglaNegocio(
            `Ya existe un correlativo configurado para la sucursal ID ${sucursal_id} y tipo '${tipo_documento}'`
        );
    }

    const correlativo = await db.correlativo.create({
        sucursal_id,
        tipo_documento,
        serie: serie.toUpperCase().trim(),
        ultimo_numero: ultimo_numero || 0
    });

    return correlativo;
};

//  actualizar 
const actualizar = async (id, datos) => {
    const { serie, ultimo_numero } = datos;

    const correlativo = await db.correlativo.findByPk(id);
    if (!correlativo) throw new AppError("Configuración de correlativo no encontrada", 404);

    if (ultimo_numero !== undefined && ultimo_numero < correlativo.ultimo_numero) {
        throw AppError.reglaNegocio(
            "No se puede reducir el último número correlativo para evitar la duplicidad de comprobantes emitidos",
            [`Número actual: ${correlativo.ultimo_numero}, solicitado: ${ultimo_numero}`]
        );
    }

    await correlativo.update({
        ...(serie && { serie: serie.toUpperCase().trim() }),
        ...(ultimo_numero !== undefined && { ultimo_numero })
    });

    return correlativo;
};

//  generarSiguienteNumero 
// Función invocada por los servicios de inventario, traslados o comprobantes.
// Totalmente aislada del estado de pago de las transacciones.
const generarSiguienteNumero = async (sucursal_id, tipo_documento, transaction = null) => {
    const ejecutar = async (t) => {
        const correlativo = await db.correlativo.findOne({
            where: { sucursal_id, tipo_documento },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!correlativo) {
            throw AppError.reglaNegocio(
                `No existe un correlativo configurado para el tipo '${tipo_documento}' en la sucursal ID ${sucursal_id}`
            );
        }

        const nuevoNumero = correlativo.ultimo_numero + 1;

        await correlativo.update(
            { ultimo_numero: nuevoNumero },
            { transaction: t }
        );

        const numeroFormateado = String(nuevoNumero).padStart(8, "0");
        const documentoCompleto = `${correlativo.serie}-${numeroFormateado}`;

        return {
            serie: correlativo.serie,
            numero: nuevoNumero,
            documentoCompleto
        };
    };

    if (transaction) {
        return await ejecutar(transaction);
    } else {
        return await db.sequelize.transaction(async (t) => await ejecutar(t));
    }
};

module.exports = {
    listar,
    obtener,
    crear,
    actualizar,
    generarSiguienteNumero
};