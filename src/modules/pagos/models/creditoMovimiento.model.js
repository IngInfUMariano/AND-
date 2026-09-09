// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "credito_movimiento"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const CreditoMovimiento = sequelize.define("credito_movimiento", {
    tipo: {
      // CARGO aumenta la deuda del cliente; ABONO la reduce
      type: Sequelize.ENUM("CARGO", "ABONO"),
      allowNull: false
    },
    monto: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    saldo_resultante: {
      // Snapshot del crédito utilizado después de este movimiento, para auditoría
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    referencia: {
      // Número de documento externo que originó el movimiento (p. ej. número de transferencia)
      type: Sequelize.STRING(100),
      allowNull: true
    },
    fecha: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  }, {
    // El movimiento de crédito nunca se modifica: es la fuente de verdad del saldo
    updatedAt: false,
    name: { singular: "credito_movimiento", plural: "credito_movimientos" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  CreditoMovimiento.associate = (db) => {
    // Un movimiento de crédito pertenece a un cliente
    CreditoMovimiento.belongsTo(db.cliente, { foreignKey: "cliente_id" });
    // Un movimiento puede estar originado por un pedido
    CreditoMovimiento.belongsTo(db.pedido, { foreignKey: "pedido_id" });
    // Un movimiento puede haber sido registrado por un usuario del sistema
    CreditoMovimiento.belongsTo(db.usuario, { foreignKey: "usuario_id" });
  };

  return CreditoMovimiento;
};
