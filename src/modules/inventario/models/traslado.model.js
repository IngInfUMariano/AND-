// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "traslado"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Traslado = sequelize.define("traslado", {
    numero: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    estado: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM("EN_TRANSITO", "RECIBIDO", "ANULADO"),
      defaultValue: "EN_TRANSITO"
    },
    fecha_despacho: {
      type: Sequelize.DATE,
      allowNull: false
    },
    fecha_recepcion: {
      type: Sequelize.DATE,
      allowNull: true
    },
    observaciones: {
      type: Sequelize.STRING(250),
      allowNull: true
    }
  }, {
    name: { singular: "traslado", plural: "traslados" },
    indexes: [
      { unique: true, fields: ["numero"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Traslado.associate = (db) => {
    // Un traslado sale de una sucursal de origen
    Traslado.belongsTo(db.sucursal, { foreignKey: "sucursal_origen_id", as: "sucursalOrigen" });
    // Un traslado llega a una sucursal de destino distinta a la de origen
    Traslado.belongsTo(db.sucursal, { foreignKey: "sucursal_destino_id", as: "sucursalDestino" });
    // Un traslado fue despachado por un usuario
    Traslado.belongsTo(db.usuario, { foreignKey: "despachado_por", as: "despachador" });
    // Un traslado puede haber sido recibido por un usuario
    Traslado.belongsTo(db.usuario, { foreignKey: "recibido_por", as: "receptor" });
    // Un traslado tiene muchas líneas de detalle (variantes trasladadas)
    Traslado.hasMany(db.traslado_detalle, { foreignKey: "traslado_id" });
  };

  return Traslado;
};
