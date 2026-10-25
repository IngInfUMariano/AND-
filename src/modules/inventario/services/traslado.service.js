"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");
const CorrelativoService = require("../../recibos/services/correlativo.service");

const SORTABLES = ["numero", "fecha_despacho", "fecha_recepcion", "estado", "created_at"];

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

const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);
    const where = {};

    if (query.q) where.numero = { [Op.iLike]: `%${query.q}%` };
    if (query.estado) where.estado = query.estado;
    if (query.sucursal_origen_id) where.sucursal_origen_id = query.sucursal_origen_id;
    if (query.sucursal_destino_id) where.sucursal_destino_id = query.sucursal_destino_id;

    const { rows, count } = await db.traslado.findAndCountAll({
        where, limit, offset,
        order: order.length ? order : [["createdAt", "desc"]],
        include: [
            { model: db.sucursal, as: "sucursalOrigen", attributes: ["id", "codigo", "nombre"] },
            { model: db.sucursal, as: "sucursalDestino", attributes: ["id", "codigo", "nombre"] },
            { model: db.usuario, as: "despachador", attributes: ["id", "email"] },
            { model: db.usuario, as: "receptor", attributes: ["id", "email"] }
        ]
    });

    return { rows, count, page, limit };
};

const obtener = async (id) => {
    const traslado = await db.traslado.findByPk(id, {
        include: [
            { model: db.sucursal, as: "sucursalOrigen", attributes: ["id", "codigo", "nombre"] },
            { model: db.sucursal, as: "sucursalDestino", attributes: ["id", "codigo", "nombre"] },
            { model: db.usuario, as: "despachador", attributes: ["id", "email"] },
            { model: db.usuario, as: "receptor", attributes: ["id", "email"] },
            {
                model: db.traslado_detalle,
                include: [{
                    model: db.variante, attributes: ["id", "sku", "codigo_barras"],
                    include: [
                        { model: db.producto, attributes: ["id", "nombre"] },
                        { model: db.talla, attributes: ["id", "codigo"] },
                        { model: db.color, attributes: ["id", "nombre"] }
                    ]
                }]
            }
        ]
    });

    if (!traslado) throw new AppError("Traslado no encontrado", 404);
    return traslado;
};

const crear = async (datos, solicitado_por) => {
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
            { numero, estado: "PENDIENTE", fecha_despacho: new Date(), observaciones: observaciones || null, sucursal_origen_id, sucursal_destino_id, despachado_por: solicitado_por },
            { transaction: t }
        );

        for (const item of detalles) {
            await db.traslado_detalle.create(
                { traslado_id: traslado.id, variante_id: item.variante_id, cantidad_despachada: item.cantidad },
                { transaction: t }
            );
        }

        return traslado;
    });
};

const despachar = async (id, datosUsuario) => {
    // Extraemos el usuario_id de forma segura (soporta tanto si pasan el ID directo como un objeto req.body)
    const usuario_id = typeof datosUsuario === 'object'
        ? (datosUsuario.usuario_id || datosUsuario.id)
        : datosUsuario;

    return db.sequelize.transaction(async (t) => {
        const traslado = await db.traslado.findByPk(id, {
            include: [{ model: db.traslado_detalle, include: [{ model: db.variante }] }],
            transaction: t
        });

        if (!traslado) throw new AppError("Traslado no encontrado", 404);
        if (traslado.estado !== "PENDIENTE") {
            throw AppError.reglaNegocio(`El traslado ya se encuentra en estado ${traslado.estado}`);
        }

        const { documentoCompleto } = await CorrelativoService.generarSiguienteNumero(
            traslado.sucursal_origen_id,
            "SALIDA",
            t
        );

        let totalComprobante = 0;
        const detallesComprobante = [];

        for (const detalle of traslado.traslado_detalles) {
            const costoUnitario = Number(detalle.variante?.costo_promedio || 0);
            const subtotal = Number(detalle.cantidad_despachada) * costoUnitario;
            totalComprobante += subtotal;

            detallesComprobante.push({
                variante_id: detalle.variante_id,
                sku: detalle.variante?.sku || "N/A",
                descripcion: detalle.variante?.producto?.nombre || "Producto Traslado",
                cantidad: detalle.cantidad_despachada,
                costo_unitario: costoUnitario,
                subtotal
            });
        }

        // Creación del comprobante de salida vinculado al traslado y al usuario correcto
        const comprobante = await db.comprobante.create({
            numero: documentoCompleto,
            tipo: "SALIDA",
            subtipo: "TRASLADO",
            total: totalComprobante,
            estado: "EMITIDO",
            sucursal_id: traslado.sucursal_origen_id,
            usuario_id: usuario_id || null, // Evita fallos si el usuario no estuviese autenticado en la peticion
            traslado_id: traslado.id,
            observaciones: `Despacho de traslado N° ${traslado.numero} hacia sucursal ID ${traslado.sucursal_destino_id}`
        }, { transaction: t });

        const renglonesComprobante = detallesComprobante.map(d => ({
            ...d,
            comprobante_id: comprobante.id
        }));
        await db.comprobante_detalle.bulkCreate(renglonesComprobante, { transaction: t });

        for (const detalle of traslado.traslado_detalles) {
            const existenciaOrigen = await db.existencia.findOne({
                where: { variante_id: detalle.variante_id, sucursal_id: traslado.sucursal_origen_id },
                transaction: t, lock: t.LOCK.UPDATE
            });

            const stockFisico = existenciaOrigen ? existenciaOrigen.cantidad_fisica : 0;
            if (stockFisico < detalle.cantidad_despachada) {
                throw AppError.reglaNegocio(`Stock insuficiente en sucursal de origen para la variante ID ${detalle.variante_id}. Disponible: ${stockFisico}, Requerido: ${detalle.cantidad_despachada}`);
            }

            const saldoAnterior = stockFisico;
            const saldoResultante = saldoAnterior - detalle.cantidad_despachada;

            await existenciaOrigen.update({ cantidad_fisica: saldoResultante }, { transaction: t });

            await db.movimiento_inventario.create({
                tipo: "SALIDA_TRASLADO",
                cantidad: detalle.cantidad_despachada,
                saldo_anterior: saldoAnterior,
                saldo_resultante: saldoResultante,
                referencia_type: "comprobante", // Ajustado por compatibilidad si tu modelo usa _type o _tipo
                referencia_tipo: "comprobante",
                referencia_id: comprobante.id,
                comprobante_id: comprobante.id,
                motivo: `Despacho de traslado N° ${traslado.numero} hacia sucursal ID ${traslado.sucursal_destino_id}`,
                variante_id: detalle.variante_id,
                sucursal_id: traslado.sucursal_origen_id,
                usuario_id: usuario_id || null
            }, { transaction: t });
        }

        await traslado.update({ estado: "EN_TRANSITO", fecha_despacho: new Date(), despachado_por: usuario_id || null }, { transaction: t });
        return traslado;
    });
};

const recibir = async (id, recibido_por, observaciones) => {
    return db.sequelize.transaction(async (t) => {
        const traslado = await db.traslado.findByPk(id, {
            include: [{ model: db.traslado_detalle, include: [{ model: db.variante }] }],
            transaction: t
        });

        if (!traslado) throw new AppError("Traslado no encontrado", 404);
        if (traslado.estado !== "EN_TRANSITO") {
            throw AppError.reglaNegocio(`No se puede recibir un traslado en estado ${traslado.estado}`);
        }

        const { documentoCompleto } = await CorrelativoService.generarSiguienteNumero(
            traslado.sucursal_destino_id,
            "ENTRADA",
            t
        );

        let totalComprobante = 0;
        const detallesComprobante = [];

        for (const detalle of traslado.traslado_detalles) {
            const costoUnitario = Number(detalle.variante?.costo_promedio || 0);
            const subtotal = Number(detalle.cantidad_despachada) * costoUnitario;
            totalComprobante += subtotal;

            detallesComprobante.push({
                variante_id: detalle.variante_id,
                sku: detalle.variante?.sku || "N/A",
                descripcion: detalle.variante?.producto?.nombre || "Producto Traslado",
                cantidad: detalle.cantidad_despachada,
                costo_unitario: costoUnitario,
                subtotal
            });
        }

        const comprobante = await db.comprobante.create({
            numero: documentoCompleto,
            tipo: "ENTRADA",
            subtipo: "TRASLADO",
            total: totalComprobante,
            estado: "EMITIDO",
            sucursal_id: traslado.sucursal_destino_id,
            usuario_id: recibido_por,
            traslado_id: traslado.id,
            observaciones: `Recepción de traslado N° ${traslado.numero} desde sucursal ID ${traslado.sucursal_origen_id}`
        }, { transaction: t });

        const renglonesComprobante = detallesComprobante.map(d => ({
            ...d,
            comprobante_id: comprobante.id
        }));
        await db.comprobante_detalle.bulkCreate(renglonesComprobante, { transaction: t });

        await traslado.update(
            { estado: "RECIBIDO", fecha_recepcion: new Date(), recibido_por, observaciones: observaciones ? `${traslado.observaciones || ""}\n[Recepción]: ${observaciones}`.trim() : traslado.observaciones },
            { transaction: t }
        );

        for (const detalle of traslado.traslado_detalles) {
            let existenciaDestino = await db.existencia.findOne({
                where: { variante_id: detalle.variante_id, sucursal_id: traslado.sucursal_destino_id },
                transaction: t, lock: t.LOCK.UPDATE
            });

            if (!existenciaDestino) {
                existenciaDestino = await db.existencia.create({ variante_id: detalle.variante_id, sucursal_id: traslado.sucursal_destino_id, cantidad_fisica: 0, cantidad_comprometida: 0, costo_promedio: 0 }, { transaction: t });
            }

            const saldoAnterior = existenciaDestino.cantidad_fisica;
            const saldoResultante = saldoAnterior + detalle.cantidad_despachada;

            await existenciaDestino.update({ cantidad_fisica: saldoResultante }, { transaction: t });

            await db.movimiento_inventario.create({
                tipo: "ENTRADA_TRASLADO",
                cantidad: detalle.cantidad_despachada,
                saldo_anterior: saldoAnterior,
                saldo_resultante: saldoResultante,
                referencia_tipo: "comprobante",
                referencia_id: comprobante.id,
                comprobante_id: comprobante.id,
                motivo: `Traslado entrante N° ${traslado.numero} desde sucursal ID ${traslado.sucursal_origen_id}`,
                variante_id: detalle.variante_id,
                sucursal_id: traslado.sucursal_destino_id,
                usuario_id: recibido_por
            }, { transaction: t });
        }

        return traslado;
    });
};

const anular = async (id, usuario_id, observaciones) => {
    return db.sequelize.transaction(async (t) => {
        const traslado = await db.traslado.findByPk(id, {
            include: [{ model: db.traslado_detalle, include: [{ model: db.variante }] }],
            transaction: t
        });

        if (!traslado) throw new AppError("Traslado no encontrado", 404);
        if (traslado.estado !== "EN_TRANSITO" && traslado.estado !== "PENDIENTE") {
            throw AppError.reglaNegocio(`No se puede anular un traslado en estado ${traslado.estado}`);
        }

        const estabaEnTransito = traslado.estado === "EN_TRANSITO";

        await traslado.update(
            { estado: "ANULADO", observaciones: observaciones ? `${traslado.observaciones || ""}\n[Anulación]: ${observaciones}`.trim() : traslado.observaciones },
            { transaction: t }
        );

        if (estabaEnTransito) {
            const { documentoCompleto } = await CorrelativoService.generarSiguienteNumero(
                traslado.sucursal_origen_id,
                "ENTRADA",
                t
            );

            let totalComprobante = 0;
            const detallesComprobante = [];

            for (const detalle of traslado.traslado_detalles) {
                const costoUnitario = Number(detalle.variante?.costo_promedio || 0);
                const subtotal = Number(detalle.cantidad_despachada) * costoUnitario;
                totalComprobante += subtotal;

                detallesComprobante.push({
                    variante_id: detalle.variante_id,
                    sku: detalle.variante?.sku || "N/A",
                    descripcion: detalle.variante?.producto?.nombre || "Producto Traslado",
                    cantidad: detalle.cantidad_despachada,
                    costo_unitario: costoUnitario,
                    subtotal
                });
            }

            const comprobante = await db.comprobante.create({
                numero: documentoCompleto,
                tipo: "ENTRADA",
                subtipo: "AJUSTE",
                total: totalComprobante,
                estado: "EMITIDO",
                sucursal_id: traslado.sucursal_origen_id,
                usuario_id: usuario_id,
                traslado_id: traslado.id,
                observaciones: `Reversión por anulación de traslado N° ${traslado.numero}`
            }, { transaction: t });

            const renglonesComprobante = detallesComprobante.map(d => ({
                ...d,
                comprobante_id: comprobante.id
            }));
            await db.comprobante_detalle.bulkCreate(renglonesComprobante, { transaction: t });

            for (const detalle of traslado.traslado_detalles) {
                const existenciaOrigen = await db.existencia.findOne({
                    where: { variante_id: detalle.variante_id, sucursal_id: traslado.sucursal_origen_id },
                    transaction: t, lock: t.LOCK.UPDATE
                });

                const saldoAnterior = existenciaOrigen ? existenciaOrigen.cantidad_fisica : 0;
                const saldoResultante = saldoAnterior + detalle.cantidad_despachada;

                await existenciaOrigen.update({ cantidad_fisica: saldoResultante }, { transaction: t });

                await db.movimiento_inventario.create({
                    tipo: "ENTRADA_TRASLADO",
                    cantidad: detalle.cantidad_despachada,
                    saldo_anterior: saldoAnterior,
                    saldo_resultante: saldoResultante,
                    referencia_tipo: "comprobante",
                    referencia_id: comprobante.id,
                    comprobante_id: comprobante.id,
                    motivo: `Reversión por anulación de traslado N° ${traslado.numero}`,
                    variante_id: detalle.variante_id,
                    sucursal_id: traslado.sucursal_origen_id,
                    usuario_id
                }, { transaction: t });
            }
        }

        return traslado;
    });
};

module.exports = { listar, obtener, crear, despachar, recibir, anular };