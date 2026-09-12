"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["numero", "fecha_despacho", "fecha_recepcion", "estado", "created_at"];

// Generador auxiliar de número correlativo de traslado (ej. TR-2026-00001)
const generarNumeroTraslado = async (transaction) => {
    const anioActual = new Date().getFullYear();
    const ultimo = await db.traslado.findOne({
        where: { numero: { [Op.iLike]: `TR-${anioActual}-%` } },
        order: [["id", "DESC"]],
        transaction
    });

    let secuencia = 1;
    if (ultimo && ultimo.numero) {
        const partes = ultimo.numero.split("-");
        if (partes.length === 3) {
            secuencia = parseInt(partes[2], 10) + 1;
        }
    }

    return `TR-${anioActual}-${String(secuencia).padStart(5, "0")}`;
};

//  listar 
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.q) where.numero = { [Op.iLike]: `%${query.q}%` };
    if (query.estado) where.estado = query.estado;
    if (query.sucursal_origen_id) where.sucursal_origen_id = query.sucursal_origen_id;
    if (query.sucursal_destino_id) where.sucursal_destino_id = query.sucursal_destino_id;

    const { rows, count } = await db.traslado.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["fecha_despacho", "desc"]],
        include: [
            { model: db.sucursal, as: "sucursalOrigen", attributes: ["id", "codigo", "nombre"] },
            { model: db.sucursal, as: "sucursalDestino", attributes: ["id", "codigo", "nombre"] },
            { model: db.usuario, as: "despachador", attributes: ["id", "nombre", "correo"] },
            { model: db.usuario, as: "receptor", attributes: ["id", "nombre", "correo"] }
        ]
    });

    return { rows, count, page, limit };
};

//  obtener 
const obtener = async (id) => {
    const traslado = await db.traslado.findByPk(id, {
        include: [
            { model: db.sucursal, as: "sucursalOrigen", attributes: ["id", "codigo", "nombre"] },
            { model: db.sucursal, as: "sucursalDestino", attributes: ["id", "codigo", "nombre"] },
            { model: db.usuario, as: "despachador", attributes: ["id", "nombre", "correo"] },
            { model: db.usuario, as: "receptor", attributes: ["id", "nombre", "correo"] },
            {
                model: db.traslado_detalle,
                include: [
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
            }
        ]
    });

    if (!traslado) throw new AppError("Traslado no encontrado", 404);
    return traslado;
};

//  crear (Despachar Traslado) 
const crear = async (datos, despachado_por) => {
    const { sucursal_origen_id, sucursal_destino_id, observaciones, detalles } = datos;

    if (sucursal_origen_id === sucursal_destino_id) {
        throw AppError.reglaNegocio("La sucursal de origen y destino deben ser diferentes");
    }

    return db.sequelize.transaction(async (t) => {
        const sucursalOrigen = await db.sucursal.findByPk(sucursal_origen_id, { transaction: t });
        const sucursalDestino = await db.sucursal.findByPk(sucursal_destino_id, { transaction: t });

        if (!sucursalOrigen || !sucursalOrigen.activo) throw new AppError("Sucursal de origen no válida o inactiva", 400);
        if (!sucursalDestino || !sucursalDestino.activo) throw new AppError("Sucursal de destino no válida o inactiva", 400);

        const numero = await generarNumeroTraslado(t);

        const traslado = await db.traslado.create(
            {
                numero,
                estado: "EN_TRANSITO",
                fecha_despacho: new Date(),
                observaciones: observaciones || null,
                sucursal_origen_id,
                sucursal_destino_id,
                despachado_por
            },
            { transaction: t }
        );

        for (const item of detalles) {
            const { variante_id, cantidad } = item;

            // 1. Verificar existencia en sucursal de origen
            const existenciaOrigen = await db.existencia.findOne({
                where: { variante_id, sucursal_id: sucursal_origen_id },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            const stockFisico = existenciaOrigen ? existenciaOrigen.cantidad_fisica : 0;
            if (stockFisico < cantidad) {
                throw AppError.reglaNegocio(
                    "Stock insuficiente en sucursal de origen para despachar el traslado",
                    [`Variante ID: ${variante_id}, Stock disponible: ${stockFisico}, Requerido: ${cantidad}`]
                );
            }

            const saldoAnterior = stockFisico;
            const saldoResultante = saldoAnterior - cantidad;

            // 2. Descuento de stock en Origen
            await existenciaOrigen.update(
                { cantidad_fisica: saldoResultante },
                { transaction: t }
            );

            // 3. Kardex de Salida por Traslado en Origen
            await db.movimiento_inventario.create(
                {
                    tipo: "SALIDA_TRASLADO",
                    cantidad,
                    saldo_anterior: saldoAnterior,
                    saldo_resultante: saldoResultante,
                    referencia_tipo: "traslado",
                    referencia_id: traslado.id,
                    motivo: `Traslado saliente N° ${numero} hacia sucursal ID ${sucursal_destino_id}`,
                    variante_id,
                    sucursal_id: sucursal_origen_id,
                    usuario_id: despachado_por
                },
                { transaction: t }
            );

            // 4. Detalle del traslado
            await db.traslado_detalle.create(
                {
                    traslado_id: traslado.id,
                    variante_id,
                    cantidad
                },
                { transaction: t }
            );
        }

        return traslado;
    });
};

//  recibir 
const recibir = async (id, recibido_por, observaciones) => {
    return db.sequelize.transaction(async (t) => {
        const traslado = await db.traslado.findByPk(id, {
            include: [{ model: db.traslado_detalle }],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!traslado) throw new AppError("Traslado no encontrado", 404);
        if (traslado.estado !== "EN_TRANSITO") {
            throw AppError.reglaNegocio(`No se puede recibir un traslado en estado ${traslado.estado}`);
        }

        // 1. Actualizar estado del traslado
        await traslado.update(
            {
                estado: "RECIBIDO",
                fecha_recepcion: new Date(),
                recibido_por,
                observaciones: observaciones ? `${traslado.observaciones || ""}\n[Recepción]: ${observaciones}`.trim() : traslado.observaciones
            },
            { transaction: t }
        );

        // 2. Incrementar stock en sucursal destino
        for (const detalle of traslado.traslado_detalle) {
            let existenciaDestino = await db.existencia.findOne({
                where: { variante_id: detalle.variante_id, sucursal_id: traslado.sucursal_destino_id },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!existenciaDestino) {
                existenciaDestino = await db.existencia.create(
                    {
                        variante_id: detalle.variante_id,
                        sucursal_id: traslado.sucursal_destino_id,
                        cantidad_fisica: 0,
                        cantidad_comprometida: 0,
                        costo_promedio: 0
                    },
                    { transaction: t }
                );
            }

            const saldoAnterior = existenciaDestino.cantidad_fisica;
            const saldoResultante = saldoAnterior + detalle.cantidad;

            await existenciaDestino.update(
                { cantidad_fisica: saldoResultante },
                { transaction: t }
            );

            // Kardex de Entrada por Traslado en Destino
            await db.movimiento_inventario.create(
                {
                    tipo: "ENTRADA_TRASLADO",
                    cantidad: detalle.cantidad,
                    saldo_anterior: saldoAnterior,
                    saldo_resultante: saldoResultante,
                    referencia_tipo: "traslado",
                    referencia_id: traslado.id,
                    motivo: `Traslado entrante N° ${traslado.numero} desde sucursal ID ${traslado.sucursal_origen_id}`,
                    variante_id: detalle.variante_id,
                    sucursal_id: traslado.sucursal_destino_id,
                    usuario_id: recibido_por
                },
                { transaction: t }
            );
        }

        return traslado;
    });
};

//  anular 
const anular = async (id, usuario_id, observaciones) => {
    return db.sequelize.transaction(async (t) => {
        const traslado = await db.traslado.findByPk(id, {
            include: [{ model: db.traslado_detalle }],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!traslado) throw new AppError("Traslado no encontrado", 404);
        if (traslado.estado !== "EN_TRANSITO") {
            throw AppError.reglaNegocio(`No se puede anular un traslado en estado ${traslado.estado}`);
        }

        // 1. Cambiar estado a ANULADO
        await traslado.update(
            {
                estado: "ANULADO",
                observaciones: observaciones ? `${traslado.observaciones || ""}\n[Anulación]: ${observaciones}`.trim() : traslado.observaciones
            },
            { transaction: t }
        );

        // 2. Reversar salidas restableciendo stock en origen
        for (const detalle of traslado.traslado_detalle) {
            const existenciaOrigen = await db.existencia.findOne({
                where: { variante_id: detalle.variante_id, sucursal_id: traslado.sucursal_origen_id },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            const saldoAnterior = existenciaOrigen ? existenciaOrigen.cantidad_fisica : 0;
            const saldoResultante = saldoAnterior + detalle.cantidad;

            await existenciaOrigen.update(
                { cantidad_fisica: saldoResultante },
                { transaction: t }
            );

            // Kardex de Reversión en Origen
            await db.movimiento_inventario.create(
                {
                    tipo: "ENTRADA_TRASLADO",
                    cantidad: detalle.cantidad,
                    saldo_anterior: saldoAnterior,
                    saldo_resultante: saldoResultante,
                    referencia_tipo: "traslado",
                    referencia_id: traslado.id,
                    motivo: `Reversión por anulación de traslado N° ${traslado.numero}`,
                    variante_id: detalle.variante_id,
                    sucursal_id: traslado.sucursal_origen_id,
                    usuario_id
                },
                { transaction: t }
            );
        }

        return traslado;
    });
};

module.exports = { listar, obtener, crear, recibir, anular };