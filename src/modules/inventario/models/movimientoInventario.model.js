// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "movimiento_inventario"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const MovimientoInventario = sequelize.define("movimiento_inventario", {
    tipo: {
      // ENUM restringe los valores permitidos; la cantidad siempre es positiva y el tipo da el signo
      type: Sequelize.ENUM(
        "ENTRADA_COMPRA",
        "ENTRADA_DEVOLUCION",
        "ENTRADA_TRASLADO",
        "SALDO_INICIAL",
        "AJUSTE_POSITIVO",
        "SALIDA_VENTA",
        "SALIDA_MERMA",
        "SALIDA_DEVOLUCION",
        "SALIDA_TRASLADO",
        "AJUSTE_NEGATIVO"
      ),
      allowNull: false
    },
    cantidad: {
      // Siempre positiva; el tipo de movimiento determina si suma o resta
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    costo_unitario: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    },
    saldo_anterior: {
      // Snapshot del stock antes de este movimiento para auditoría
      type: Sequelize.INTEGER,
      allowNull: false
    },
    saldo_resultante: {
      // Snapshot del stock después de este movimiento para auditoría
      type: Sequelize.INTEGER,
      allowNull: false
    },
    referencia_tipo: {
      // Tipo del documento que originó el movimiento (p. ej. "pedido", "traslado")
      type: Sequelize.STRING(30),
      allowNull: true
    },
    referencia_id: {
      // ID del documento que originó el movimiento
      type: Sequelize.INTEGER,
      allowNull: true
    },
    motivo: {
      // Obligatorio en merma y ajuste; se valida en el servicio, no aquí
      type: Sequelize.STRING(250),
      allowNull: true
    },
    fecha: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  }, {
    // El registro de movimiento nunca se modifica: es la fuente de verdad del historial
    updatedAt: false,
    name: { singular: "movimiento_inventario", plural: "movimiento_inventarios" },
    indexes: [
      {
        fields: ["variante_id", "sucursal_id", "fecha"]
      }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  MovimientoInventario.associate = (db) => {
    // Un movimiento afecta a una variante específica
    MovimientoInventario.belongsTo(db.variante, { foreignKey: "variante_id" });
    // Un movimiento ocurre en una sucursal específica
    MovimientoInventario.belongsTo(db.sucursal, { foreignKey: "sucursal_id" });
    // Un movimiento puede estar respaldado por un comprobante formal
    MovimientoInventario.belongsTo(db.comprobante, { foreignKey: "comprobante_id" });
    // Un movimiento fue ejecutado por un usuario
    MovimientoInventario.belongsTo(db.usuario, { foreignKey: "usuario_id" });
  };

  return MovimientoInventario;
};
