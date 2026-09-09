// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "transaccion_pago"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  // NUNCA almacena número de tarjeta, vencimiento ni CVV
  const TransaccionPago = sequelize.define("transaccion_pago", {
    proveedor: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM("STRIPE", "PAYPAL"),
      allowNull: false
    },
    id_externo: {
      // ID generado por el proveedor de pagos; sirve para reconciliación y reembolsos
      type: Sequelize.STRING(120),
      allowNull: false
    },
    tipo: {
      // PAGO inicial o REEMBOLSO total/parcial de una transacción anterior
      type: Sequelize.ENUM("PAGO", "REEMBOLSO"),
      defaultValue: "PAGO"
    },
    monto: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    moneda: {
      type: Sequelize.STRING(3),
      defaultValue: "GTQ"
    },
    estado: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM("PENDIENTE", "EXITOSA", "RECHAZADA", "REEMBOLSADA"),
      defaultValue: "PENDIENTE"
    },
    mensaje_proveedor: {
      // Mensaje de error o confirmación devuelto por el proveedor de pagos
      type: Sequelize.STRING(250),
      allowNull: true
    },
    respuesta_cruda: {
      // Payload completo del webhook o respuesta del proveedor, para soporte y auditoría
      type: Sequelize.JSONB,
      allowNull: true
    },
    motivo: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    fecha: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  }, {
    // El registro financiero nunca se modifica (salvo el campo estado que actualiza el webhook)
    updatedAt: false,
    name: { singular: "transaccion_pago", plural: "transaccion_pagos" },
    indexes: [
      { unique: true, fields: ["id_externo"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  TransaccionPago.associate = (db) => {
    // Una transacción pertenece a un pedido
    TransaccionPago.belongsTo(db.pedido, { foreignKey: "pedido_id" });
    // Autorreferencia: un reembolso apunta a la transacción de pago original
    TransaccionPago.belongsTo(db.transaccion_pago, { foreignKey: "transaccion_origen_id", as: "transaccionOrigen" });
    // Una transacción de pago puede originar muchos reembolsos parciales
    TransaccionPago.hasMany(db.transaccion_pago, { foreignKey: "transaccion_origen_id", as: "reembolsos" });
  };

  return TransaccionPago;
};
