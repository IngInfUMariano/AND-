// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "pedido_historial"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const PedidoHistorial = sequelize.define("pedido_historial", {
    estado_anterior: {
      // Null al crear el pedido: no hay estado previo
      type: Sequelize.ENUM(
        "REGISTRADO",
        "PENDIENTE_PAGO",
        "PAGADO",
        "EN_PREPARACION",
        "DESPACHADO",
        "ENTREGADO",
        "ANULADO"
      ),
      allowNull: true
    },
    estado_nuevo: {
      type: Sequelize.ENUM(
        "REGISTRADO",
        "PENDIENTE_PAGO",
        "PAGADO",
        "EN_PREPARACION",
        "DESPACHADO",
        "ENTREGADO",
        "ANULADO"
      ),
      allowNull: false
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
    // El historial de estados nunca se modifica: es la traza de auditoría del pedido
    updatedAt: false,
    name: { singular: "pedido_historial", plural: "pedido_historiales" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  PedidoHistorial.associate = (db) => {
    // Un registro de historial pertenece a un pedido
    PedidoHistorial.belongsTo(db.pedido, { foreignKey: "pedido_id" });
    // El cambio de estado puede haber sido hecho por un usuario (null si fue automático)
    PedidoHistorial.belongsTo(db.usuario, { foreignKey: "usuario_id" });
  };

  return PedidoHistorial;
};
