"use strict";

const { Op } = require("sequelize");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");
const CorrelativoService = require("./correlativo.service");

const SORTABLES = ["numero", "tipo", "subtipo", "total", "fecha", "created_at"];
const TIPOS_PERMITIDOS = ["ENTRADA", "SALIDA"];
const SUBTIPOS_PERMITIDOS = ["COMPRA", "MERMA", "VENTA", "TRASLADO", "DEVOLUCION", "AJUSTE"];

//  listar 
const listar = async (query) => {
    const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

    const where = {};

    if (query.sucursal_id) where.sucursal_id = query.sucursal_id;
    if (query.tipo) where.tipo = query.tipo;
    if (query.subtipo) where.subtipo = query.subtipo;
    if (query.anulado !== undefined) where.anulado = query.anulado === "true";
    if (query.numero) where.numero = { [Op.iLike]: `%${query.numero}%` };
    if (query.documento_externo) where.documento_externo = { [Op.iLike]: `%${query.documento_externo}%` };

    if (query.fecha_desde || query.fecha_hasta) {
        where.fecha = {};
        if (query.fecha_desde) where.fecha[Op.gte] = new Date(query.fecha_desde);
        if (query.fecha_hasta) where.fecha[Op.lte] = new Date(query.fecha_hasta);
    }

    const { rows, count } = await db.comprobante.findAndCountAll({
        where,
        limit,
        offset,
        order: order.length ? order : [["fecha", "DESC"]],
        include: [
            { model: db.sucursal, attributes: ["id", "codigo", "nombre"] },
            { model: db.proveedor, attributes: ["id", "nombre_comercial"] },
            { model: db.cliente, attributes: ["id", "nombre"] },
            { model: db.usuario, as: "creador", attributes: ["id", "email"] }
        ]
    });

    return { rows, count, page, limit };
};

//  obtener
const obtener = async (id, transaction) => {
    const comprobante = await db.comprobante.findByPk(id, {
        ...(transaction ? { transaction } : {}),
        include: [
            { model: db.sucursal, attributes: ["id", "codigo", "nombre"] },
            { model: db.proveedor, attributes: ["id", "nit", "nombre_comercial"] },
            { model: db.cliente, attributes: ["id", "nit", "nombre"] },
            { model: db.pedido, attributes: ["id", "numero", "total"] },
            { model: db.traslado, attributes: ["id", "estado"] },
            { model: db.usuario, as: "creador", attributes: ["id", "email"] },
            { model: db.usuario, as: "anulador", attributes: ["id", "email"] },
            {
                model: db.comprobante_detalle,
                include: [{ model: db.variante, attributes: ["id", "sku", "codigo_barras"] }]
            }
        ]
    });

    if (!comprobante) throw new AppError("Comprobante no encontrado", 404);
    return comprobante;
};

//  crear 
const crear = async (datos, usuario_id) => {
    const {
        sucursal_id,
        tipo,
        subtipo,
        documento_externo,
        observaciones,
        proveedor_id,
        cliente_id,
        pedido_id,
        traslado_id,
        detalles
    } = datos;

    if (!TIPOS_PERMITIDOS.includes(tipo)) {
        throw AppError.validacion(`El tipo debe ser uno de: ${TIPOS_PERMITIDOS.join(", ")}`);
    }

    if (!SUBTIPOS_PERMITIDOS.includes(subtipo)) {
        throw AppError.validacion(`El subtipo debe ser uno de: ${SUBTIPOS_PERMITIDOS.join(", ")}`);
    }

    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
        throw AppError.validacion("El comprobante debe contener al menos un ítem en el detalle");
    }

    return await db.sequelize.transaction(async (t) => {
        const sucursal = await db.sucursal.findByPk(sucursal_id, { transaction: t });
        if (!sucursal) throw new AppError("La sucursal especificada no existe", 404);

        // 1. Generación atómica del número consecutivo oficial
        const { documentoCompleto } = await CorrelativoService.generarSiguienteNumero(
            sucursal_id,
            tipo,
            t
        );

        // 2. Cálculo del total general desde el detalle
        let totalComprobante = 0;
        const detallesProcesados = detalles.map((item) => {
            const subtotal = Number(item.cantidad) * Number(item.costo_unitario);
            totalComprobante += subtotal;

            return {
                variante_id: item.variante_id,
                sku: item.sku,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                costo_unitario: item.costo_unitario,
                subtotal
            };
        });

        // 3. Crear cabecera de comprobante
        const comprobante = await db.comprobante.create(
            {
                numero: documentoCompleto,
                tipo,
                subtipo,
                documento_externo: documento_externo || null,
                total: totalComprobante,
                observaciones: observaciones || null,
                sucursal_id,
                proveedor_id: proveedor_id || null,
                cliente_id: cliente_id || null,
                pedido_id: pedido_id || null,
                traslado_id: traslado_id || null,
                usuario_id
            },
            { transaction: t }
        );

        // 4. Crear renglones del detalle
        const renglonesConId = detallesProcesados.map((d) => ({
            ...d,
            comprobante_id: comprobante.id
        }));

        await db.comprobante_detalle.bulkCreate(renglonesConId, { transaction: t });

        // 5. Generar movimientos de inventario (Kardex) y actualizar existencias
        for (const item of detallesProcesados) {
            const esEntrada = tipo === "ENTRADA";

            let existencia = await db.existencia.findOne({
                where: { variante_id: item.variante_id, sucursal_id },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!existencia) {
                existencia = await db.existencia.create(
                    { variante_id: item.variante_id, sucursal_id, cantidad_fisica: 0, cantidad_comprometida: 0, costo_promedio: 0 },
                    { transaction: t }
                );
            }

            const saldoAnterior = existencia.cantidad_fisica;
            const saldoResultante = esEntrada ? saldoAnterior + item.cantidad : saldoAnterior - item.cantidad;

            await existencia.update({ cantidad_fisica: saldoResultante }, { transaction: t });

            const TIPO_KARDEX_MAP = {
                COMPRA: "ENTRADA_COMPRA", DEVOLUCION: esEntrada ? "ENTRADA_DEVOLUCION" : "SALIDA_DEVOLUCION",
                VENTA: "SALIDA_VENTA", MERMA: "SALIDA_MERMA", TRASLADO: esEntrada ? "ENTRADA_TRASLADO" : "SALIDA_TRASLADO",
                AJUSTE: esEntrada ? "AJUSTE_POSITIVO" : "AJUSTE_NEGATIVO"
            };
            const tipoKardex = TIPO_KARDEX_MAP[subtipo] || (esEntrada ? "ENTRADA_COMPRA" : "SALIDA_VENTA");

            await db.movimiento_inventario.create(
                {
                    tipo: tipoKardex,
                    cantidad: item.cantidad,
                    saldo_anterior: saldoAnterior,
                    saldo_resultante: saldoResultante,
                    referencia_tipo: "comprobante",
                    referencia_id: comprobante.id,
                    motivo: `Comprobante ${comprobante.numero} — ${subtipo}`,
                    variante_id: item.variante_id,
                    sucursal_id,
                    usuario_id
                },
                { transaction: t }
            );
        }

        return await obtener(comprobante.id, t);
    });
};

//  anular 
const anular = async (id, datosAnulacion, usuario_id) => {
    const { motivo_anulacion } = datosAnulacion;

    if (!motivo_anulacion || motivo_anulacion.trim().length === 0) {
        throw AppError.validacion("Debe proporcionar un motivo para la anulación");
    }

    return await db.sequelize.transaction(async (t) => {
        const comprobante = await db.comprobante.findByPk(id, {
            include: [{ model: db.comprobante_detalle,
                required: true // Asegura que se obtengan los detalles
             }],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!comprobante) throw new AppError("Comprobante no encontrado", 404);

        if (comprobante.anulado) {
            throw AppError.reglaNegocio(`El comprobante '${comprobante.numero}' ya se encuentra anulado`);
        }

        // 1. Reversión de Kardex / Movimientos de Inventario
        for (const item of comprobante.comprobante_detalles) {
            const eraEntrada = comprobante.tipo === "ENTRADA";

            const existencia = await db.existencia.findOne({
                where: { variante_id: item.variante_id, sucursal_id: comprobante.sucursal_id },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (existencia) {
                const saldoAnterior = existencia.cantidad_fisica;
                // Revertir: si era ENTRADA restamos, si era SALIDA sumamos
                const saldoResultante = eraEntrada ? saldoAnterior - item.cantidad : saldoAnterior + item.cantidad;

                await existencia.update({ cantidad_fisica: saldoResultante }, { transaction: t });

                await db.movimiento_inventario.create(
                    {
                        tipo: eraEntrada ? "AJUSTE_NEGATIVO" : "AJUSTE_POSITIVO",
                        cantidad: item.cantidad,
                        saldo_anterior: saldoAnterior,
                        saldo_resultante: saldoResultante,
                        referencia_tipo: "comprobante",
                        referencia_id: comprobante.id,
                        motivo: `Reversión por anulación de comprobante ${comprobante.numero}`,
                        variante_id: item.variante_id,
                        sucursal_id: comprobante.sucursal_id,
                        usuario_id
                    },
                    { transaction: t }
                );
            }
        }

        // 2. Marcar comprobante como anulado
        await comprobante.update(
            {
                anulado: true,
                motivo_anulacion: motivo_anulacion.trim(),
                fecha_anulacion: new Date(),
                anulado_por: usuario_id
            },
            { transaction: t }
        );

        return comprobante;
    });
};

module.exports = {
    listar,
    obtener,
    crear,
    anular
};