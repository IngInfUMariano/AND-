"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["fecha", "cantidad", "tipo", "created_at"];

const TIPOS_ENTRADA = [
    "ENTRADA_COMPRA",
    "ENTRADA_DEVOLUCION",
    "ENTRADA_TRASLADO",
    "SALDO_INICIAL",
    "AJUSTE_POSITIVO"
];

const TIPOS_SALIDA = [
    "SALIDA_VENTA",
    "SALIDA_MERMA",
    "SALIDA_DEVOLUCION",
    "SALIDA_TRASLADO",
    "AJUSTE_NEGATIVO"
];

//  listar 
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.sucursal_id) where.sucursal_id = query.sucursal_id;
    if (query.variante_id) where.variante_id = query.variante_id;
    if (query.tipo) where.tipo = query.tipo;

    // Filtro por rango de fechas
    if (query.fecha_inicio || query.fecha_fin) {
        where.fecha = {};
        if (query.fecha_inicio) where.fecha[Op.gte] = new Date(query.fecha_inicio);
        if (query.fecha_fin) where.fecha[Op.lte] = new Date(query.fecha_fin);
    }

    const { rows, count } = await db.movimiento_inventario.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["fecha", "desc"]],
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
            },
            { model: db.usuario, attributes: ["id", "email"] }
        ]
    });

    return { rows, count, page, limit };
};

//  obtener 
const obtener = async (id) => {
    const movimiento = await db.movimiento_inventario.findByPk(id, {
        include: [
            { model: db.sucursal, attributes: ["id", "codigo", "nombre"] },
            {
                model: db.variante,
                attributes: ["id", "sku"],
                include: [
                    { model: db.producto, attributes: ["id", "nombre"] },
                    { model: db.talla, attributes: ["id", "codigo"] },
                    { model: db.color, attributes: ["id", "nombre"] }
                ]
            },
            { model: db.usuario, attributes: ["id", "email"] },
            { model: db.comprobante, attributes: ["id"] }
        ]
    });

    if (!movimiento) throw new AppError("Movimiento de inventario no encontrado", 404);
    return movimiento;
};

//  crear 
// Ejecuta el movimiento en una transacción atómica actualizando la existencia.
const crear = async (datos, usuario_id) => {
    const {
        tipo,
        cantidad,
        costo_unitario,
        variante_id,
        sucursal_id,
        referencia_tipo,
        referencia_id,
        comprobante_id,
        motivo
    } = datos;

    // Validación de motivo según regla de negocio
    if (["SALIDA_MERMA", "AJUSTE_POSITIVO", "AJUSTE_NEGATIVO"].includes(tipo) && !motivo) {
        throw AppError.reglaNegocio("El campo motivo es obligatorio para mermas y ajustes de inventario");
    }

    return db.sequelize.transaction(async (t) => {
        // 1. Obtener o inicializar la existencia con bloqueo de actualización
        let existencia = await db.existencia.findOne({
            where: { variante_id, sucursal_id },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!existencia) {
            // Si no existe el registro de inventario, se crea en 0
            existencia = await db.existencia.create(
                { variante_id, sucursal_id, cantidad_fisica: 0, cantidad_comprometida: 0, costo_promedio: 0 },
                { transaction: t }
            );
        }

        const saldoAnterior = existencia.cantidad_fisica;
        let saldoResultante = saldoAnterior;
        let nuevoCostoPromedio = Number(existencia.costo_promedio);

        const esEntrada = TIPOS_ENTRADA.includes(tipo);
        const esSalida = TIPOS_SALIDA.includes(tipo);

        if (!esEntrada && !esSalida) {
            throw AppError.reglaNegocio(`El tipo de movimiento '${tipo}' no es válido`);
        }

        // 2. Calcular nuevo saldo físico y verificar disponibilidad
        if (esEntrada) {
            saldoResultante = saldoAnterior + cantidad;

            // Recálculo de Costo Promedio Ponderado (CPP) si ingresa costo unitario
            if (costo_unitario !== undefined && costo_unitario !== null && saldoResultante > 0) {
                const costoUnitarioNum = Number(costo_unitario);
                const valorExistente = saldoAnterior * nuevoCostoPromedio;
                const valorEntrante = cantidad * costoUnitarioNum;
                nuevoCostoPromedio = (valorExistente + valorEntrante) / saldoResultante;
            }
        } else if (esSalida) {
            if (saldoAnterior < cantidad) {
                throw AppError.reglaNegocio(
                    "Stock insuficiente para realizar la salida de inventario",
                    [`Stock físico disponible: ${saldoAnterior}, cantidad requerida: ${cantidad}`]
                );
            }
            saldoResultante = saldoAnterior - cantidad;
        }

        // 3. Actualizar el registro de existencia
        await existencia.update(
            {
                cantidad_fisica: saldoResultante,
                costo_promedio: nuevoCostoPromedio
            },
            { transaction: t }
        );

        // 4. Crear el registro inmutable de Kardex
        const movimiento = await db.movimiento_inventario.create(
            {
                tipo,
                cantidad,
                costo_unitario: costo_unitario || null,
                saldo_anterior: saldoAnterior,
                saldo_resultante: saldoResultante,
                referencia_tipo: referencia_tipo || null,
                referencia_id: referencia_id || null,
                comprobante_id: comprobante_id || null,
                motivo: motivo || null,
                variante_id,
                sucursal_id,
                usuario_id
            },
            { transaction: t }
        );

        return movimiento;
    });
};

module.exports = { listar, obtener, crear };