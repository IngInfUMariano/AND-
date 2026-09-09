// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "traslado_detalle"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const TrasladoDetalle = sequelize.define("traslado_detalle", {
    cantidad_despachada: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    cantidad_recibida: {
      // Null hasta que la sucursal destino confirme recepción
      type: Sequelize.INTEGER,
      allowNull: true
    },
    observacion_diferencia: {
      // Describe faltantes o daños detectados al recibir el traslado
      type: Sequelize.STRING(250),
      allowNull: true
    }
  }, {
    name: { singular: "traslado_detalle", plural: "traslado_detalles" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  TrasladoDetalle.associate = (db) => {
    // Un detalle pertenece a un traslado
    TrasladoDetalle.belongsTo(db.traslado, { foreignKey: "traslado_id" });
    // Un detalle corresponde a una variante específica trasladada
    TrasladoDetalle.belongsTo(db.variante, { foreignKey: "variante_id" });
  };

  return TrasladoDetalle;
};
